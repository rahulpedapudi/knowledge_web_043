from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Body
from typing import Optional, List
import json
from bson import ObjectId
from io import BytesIO
from datetime import datetime
from pydantic import BaseModel

from database import get_database
from models import (
    Document, DocumentCreate,
    Concept, ConceptNode,
    Relationship, RelationshipEdge,
    GraphData
)
from services.pdf_extractor import extract_sentences_from_pdf, extract_sentences_from_text
from services.llm_service import analyze_text_with_llm, generate_chat_title, generate_from_topics
from services.mock_llm import DEMO_TEXT

router = APIRouter()


class TopicGenerateRequest(BaseModel):
    topics: List[str]


@router.post("/generate", response_model=dict)
async def generate_from_topic(request: TopicGenerateRequest):
    """Generate a knowledge graph from topics without a document."""
    if not request.topics or len(request.topics) == 0:
        raise HTTPException(
            status_code=400, detail="At least one topic is required")

    # Clean up topics
    topics = [t.strip() for t in request.topics if t.strip()]
    if not topics:
        raise HTTPException(
            status_code=400, detail="At least one valid topic is required")

    db = get_database()

    # Generate knowledge graph from topics
    analysis = generate_from_topics(topics)

    # Create a virtual document to store the generated content
    doc_data = {
        "title": ", ".join(topics[:3]) + ("..." if len(topics) > 3 else ""),
        "source_type": "generated",
        "raw_text": f"Generated knowledge graph for topics: {', '.join(topics)}",
        "focus_concepts": topics,
        "processed": True
    }

    result = await db.documents.insert_one(doc_data)
    doc_id = str(result.inserted_id)

    # Store concepts
    concept_id_map = {}
    for concept in analysis["concepts"]:
        concept_data = {
            "document_id": doc_id,
            "label": concept["label"],
            "description": concept.get("description"),
            "unit": concept.get("unit"),
            "min_value": concept.get("min_value"),
            "max_value": concept.get("max_value"),
            "default_value": concept.get("default_value"),
            "abstraction_level": concept.get("abstraction_level"),
            "depth_level": concept.get("depth_level"),
            "category": concept.get("category"),
            "semantic_type": concept.get("semantic_type"),
            "parent_concepts": concept.get("parent_concepts", [])
        }
        result = await db.concepts.insert_one(concept_data)
        concept_id_map[concept["id"]] = str(result.inserted_id)

    # Store relationships
    for rel in analysis["relationships"]:
        source_id = concept_id_map.get(rel["source"])
        target_id = concept_id_map.get(rel["target"])

        if source_id and target_id:
            rel_data = {
                "document_id": doc_id,
                "source_concept_id": source_id,
                "target_concept_id": target_id,
                "relationship_type": rel["type"],
                "description": rel["description"],
                "equation": rel.get("equation"),
                "coefficient": rel.get("coefficient", 1.0)
            }
            await db.relationships.insert_one(rel_data)

    # Create chat session
    chat_title = f"Learn: {', '.join(topics[:2])}" + \
        ("..." if len(topics) > 2 else "")
    chat_data = {
        "document_id": doc_id,
        "title": chat_title,
        "created_at": datetime.utcnow(),
        "messages": []
    }
    chat_result = await db.chats.insert_one(chat_data)

    return {
        "document_id": doc_id,
        "chat_id": str(chat_result.inserted_id),
        "title": doc_data["title"],
        "total_sentences": 0,
        "causal_sentences": 0,
        "concepts_extracted": len(analysis["concepts"]),
        "relationships_found": len(analysis["relationships"]),
        "generated_from_topics": topics
    }


@router.post("/upload", response_model=dict)
async def upload_pdf(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    focus_concepts: Optional[str] = Form(None)
):
    """Upload a PDF file and extract causal relationships focused on specific concepts."""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(
            status_code=400, detail="Only PDF files are supported")

    db = get_database()

    # Parse focus concepts from JSON string
    concepts_list: List[str] = []
    if focus_concepts:
        try:
            concepts_list = json.loads(focus_concepts)
        except json.JSONDecodeError:
            # Fallback: treat as comma-separated
            concepts_list = [c.strip()
                             for c in focus_concepts.split(',') if c.strip()]

    # Read file content
    content = await file.read()
    file_io = BytesIO(content)

    # Extract sentences
    try:
        sentences = extract_sentences_from_pdf(file_io)
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Failed to extract text from PDF: {str(e)}")

    if not sentences:
        raise HTTPException(status_code=400, detail="No text found in PDF")

    raw_text = " ".join(sentences)

    # Create document
    doc_data = {
        "title": title or file.filename,
        "source_type": "pdf",
        "raw_text": raw_text,
        "focus_concepts": concepts_list,
        "processed": False
    }

    result = await db.documents.insert_one(doc_data)
    doc_id = str(result.inserted_id)

    # Analyze text for causal relationships with focus concepts
    analysis = analyze_text_with_llm(sentences, focus_concepts=concepts_list)

    # Store chunks
    for i, sentence in enumerate(sentences):
        is_causal = sentence in analysis["causal_sentences"]
        chunk_data = {
            "document_id": doc_id,
            "text": sentence,
            "sentence_index": i,
            "is_causal": is_causal
        }
        await db.chunks.insert_one(chunk_data)

    # Store concepts
    concept_id_map = {}  # Map concept labels to MongoDB IDs
    for concept in analysis["concepts"]:
        concept_data = {
            "document_id": doc_id,
            "label": concept["label"],
            "description": concept.get("description"),
            "unit": concept.get("unit"),
            "min_value": concept.get("min_value"),
            "max_value": concept.get("max_value"),
            "default_value": concept.get("default_value")
        }
        result = await db.concepts.insert_one(concept_data)
        concept_id_map[concept["id"]] = str(result.inserted_id)

    # Store relationships
    for rel in analysis["relationships"]:
        source_id = concept_id_map.get(rel["source"])
        target_id = concept_id_map.get(rel["target"])

        if source_id and target_id:
            rel_data = {
                "document_id": doc_id,
                "source_concept_id": source_id,
                "target_concept_id": target_id,
                "relationship_type": rel["type"],
                "description": rel["description"],
                "equation": rel.get("equation"),
                "coefficient": rel.get("coefficient", 1.0)
            }
            await db.relationships.insert_one(rel_data)

    # Mark document as processed
    await db.documents.update_one(
        {"_id": ObjectId(doc_id)},
        {"$set": {"processed": True}}
    )

    # Generate title for chat - with fallback
    try:
        chat_title = generate_chat_title(raw_text)
        if not chat_title or not chat_title.strip():
            chat_title = doc_data["title"]
    except Exception as e:
        print(f"Chat title generation failed: {str(e)}")
        chat_title = doc_data["title"]
    
    # Final fallback
    if not chat_title or len(chat_title.strip()) == 0:
        chat_title = "New Chat"

    # Create chat session linked to this document
    chat_data = {
        "document_id": doc_id,
        "title": chat_title,
        "created_at": datetime.utcnow(),
        "messages": []
    }
    chat_result = await db.chats.insert_one(chat_data)

    return {
        "document_id": doc_id,
        "chat_id": str(chat_result.inserted_id),
        "title": doc_data["title"],
        "total_sentences": analysis["total_sentences"],
        "causal_sentences": analysis["causal_count"],
        "concepts_extracted": len(analysis["concepts"]),
        "relationships_found": len(analysis["relationships"])
    }


@router.post("/paste", response_model=dict)
async def paste_text(
    text: str = Form(...),
    title: Optional[str] = Form(None),
    focus_concepts: Optional[str] = Form(None)
):
    """Submit pasted text and extract causal relationships focused on specific concepts."""
    if not text or len(text.strip()) < 20:
        raise HTTPException(status_code=400, detail="Text is too short")

    db = get_database()

    # Parse focus concepts from JSON string
    concepts_list: List[str] = []
    if focus_concepts:
        try:
            concepts_list = json.loads(focus_concepts)
        except json.JSONDecodeError:
            # Fallback: treat as comma-separated
            concepts_list = [c.strip()
                             for c in focus_concepts.split(',') if c.strip()]

    # Extract sentences
    sentences = extract_sentences_from_text(text)

    if not sentences:
        raise HTTPException(status_code=400, detail="No valid sentences found")

    # Create document
    doc_data = {
        "title": title or "Pasted Text",
        "source_type": "text",
        "raw_text": text,
        "focus_concepts": concepts_list,
        "processed": False
    }

    result = await db.documents.insert_one(doc_data)
    doc_id = str(result.inserted_id)

    # Analyze text for causal relationships with focus concepts
    analysis = analyze_text_with_llm(sentences, focus_concepts=concepts_list)

    # Store chunks
    for i, sentence in enumerate(sentences):
        is_causal = sentence in analysis["causal_sentences"]
        chunk_data = {
            "document_id": doc_id,
            "text": sentence,
            "sentence_index": i,
            "is_causal": is_causal
        }
        await db.chunks.insert_one(chunk_data)

    # Store concepts
    concept_id_map = {}
    for concept in analysis["concepts"]:
        concept_data = {
            "document_id": doc_id,
            "label": concept["label"],
            "description": concept.get("description"),
            "unit": concept.get("unit"),
            "min_value": concept.get("min_value"),
            "max_value": concept.get("max_value"),
            "default_value": concept.get("default_value")
        }
        result = await db.concepts.insert_one(concept_data)
        concept_id_map[concept["id"]] = str(result.inserted_id)

    # Store relationships
    for rel in analysis["relationships"]:
        source_id = concept_id_map.get(rel["source"])
        target_id = concept_id_map.get(rel["target"])

        if source_id and target_id:
            rel_data = {
                "document_id": doc_id,
                "source_concept_id": source_id,
                "target_concept_id": target_id,
                "relationship_type": rel["type"],
                "description": rel["description"],
                "equation": rel.get("equation"),
                "coefficient": rel.get("coefficient", 1.0)
            }
            await db.relationships.insert_one(rel_data)

    # Mark document as processed
    await db.documents.update_one(
        {"_id": ObjectId(doc_id)},
        {"$set": {"processed": True}}
    )

    # Generate title for chat - with fallback
    try:
        chat_title = generate_chat_title(text)
        if not chat_title or not chat_title.strip():
            chat_title = "Learn: " + text[:50].replace('\n', ' ')
    except Exception as e:
        print(f"Chat title generation failed: {str(e)}")
        chat_title = "Learn: " + text[:50].replace('\n', ' ')
    
    # Clean up title
    if not chat_title or len(chat_title.strip()) == 0:
        chat_title = "New Chat"

    # Create chat session linked to this document
    chat_data = {
        "document_id": doc_id,
        "title": chat_title,
        "created_at": datetime.utcnow(),
        "messages": []
    }
    chat_result = await db.chats.insert_one(chat_data)

    return {
        "document_id": doc_id,
        "chat_id": str(chat_result.inserted_id),
        "title": chat_title,
        "total_sentences": analysis["total_sentences"],
        "causal_sentences": analysis["causal_count"],
        "concepts_extracted": len(analysis["concepts"]),
        "relationships_found": len(analysis["relationships"])
    }


@router.post("/demo", response_model=dict)
async def create_demo():
    """Create a demo document with pre-defined content."""
    db = get_database()

    sentences = extract_sentences_from_text(DEMO_TEXT)

    # Create document
    doc_data = {
        "title": "Physics & Economics Demo",
        "source_type": "text",
        "raw_text": DEMO_TEXT,
        "processed": False
    }

    result = await db.documents.insert_one(doc_data)
    doc_id = str(result.inserted_id)

    # Analyze
    # Changed from analyze_text to use LLM service if available
    analysis = analyze_text_with_llm(sentences)

    # Store chunks
    for i, sentence in enumerate(sentences):
        is_causal = sentence in analysis["causal_sentences"]
        await db.chunks.insert_one({
            "document_id": doc_id,
            "text": sentence,
            "sentence_index": i,
            "is_causal": is_causal
        })

    # Store concepts and relationships
    concept_id_map = {}
    for concept in analysis["concepts"]:
        result = await db.concepts.insert_one({
            "document_id": doc_id,
            "label": concept["label"],
            "description": concept.get("description"),
            "unit": concept.get("unit"),
            "min_value": concept.get("min_value"),
            "max_value": concept.get("max_value"),
            "default_value": concept.get("default_value")
        })
        concept_id_map[concept["id"]] = str(result.inserted_id)

    for rel in analysis["relationships"]:
        source_id = concept_id_map.get(rel["source"])
        target_id = concept_id_map.get(rel["target"])
        if source_id and target_id:
            await db.relationships.insert_one({
                "document_id": doc_id,
                "source_concept_id": source_id,
                "target_concept_id": target_id,
                "relationship_type": rel["type"],
                "description": rel["description"],
                "equation": rel.get("equation"),
                "coefficient": rel.get("coefficient", 1.0)
            })

    await db.documents.update_one(
        {"_id": ObjectId(doc_id)},
        {"$set": {"processed": True}}
    )

    # Create chat session linked to this document
    chat_data = {
        "document_id": doc_id,
        "title": "Physics & Economics Demo",
        "created_at": datetime.utcnow(),
        "messages": []
    }
    chat_result = await db.chats.insert_one(chat_data)

    return {
        "document_id": doc_id,
        "chat_id": str(chat_result.inserted_id),
        "title": doc_data["title"],
        "concepts_extracted": len(analysis["concepts"]),
        "relationships_found": len(analysis["relationships"])
    }


@router.get("/{document_id}")
async def get_document(document_id: str):
    """Get document details by ID."""
    db = get_database()

    try:
        doc = await db.documents.find_one({"_id": ObjectId(document_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc["_id"] = str(doc["_id"])
    return doc


@router.get("/{document_id}/graph", response_model=GraphData)
async def get_document_graph(document_id: str):
    """Get concepts and relationships for graph visualization."""
    db = get_database()

    # Verify document exists
    try:
        doc = await db.documents.find_one({"_id": ObjectId(document_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Get concepts
    concepts_cursor = db.concepts.find({"document_id": document_id})
    concepts = []
    async for concept in concepts_cursor:
        concepts.append(ConceptNode(
            id=str(concept["_id"]),
            label=concept["label"],
            description=concept.get("description"),
            unit=concept.get("unit"),
            min_value=concept.get("min_value"),
            max_value=concept.get("max_value"),
            default_value=concept.get("default_value")
        ))

    # Get relationships
    rels_cursor = db.relationships.find({"document_id": document_id})
    relationships = []
    async for rel in rels_cursor:
        relationships.append(RelationshipEdge(
            id=str(rel["_id"]),
            source=rel["source_concept_id"],
            target=rel["target_concept_id"],
            relationship_type=rel["relationship_type"],
            description=rel["description"],
            equation=rel.get("equation"),
            has_simulation=True
        ))

    return GraphData(concepts=concepts, relationships=relationships)


@router.get("/", response_model=list)
async def list_documents():
    """List all documents."""
    db = get_database()

    docs = []
    cursor = db.documents.find().sort("_id", -1).limit(20)
    async for doc in cursor:
        docs.append({
            "id": str(doc["_id"]),
            "title": doc["title"],
            "source_type": doc["source_type"],
            "processed": doc.get("processed", False)
        })

    return docs
