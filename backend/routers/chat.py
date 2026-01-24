"""
Chat Router
Handles node-centric chat interactions.
"""

import logging
from typing import List, Dict, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from bson import ObjectId
import re

from datetime import datetime
from database import get_database
from services.llm_service import chat_with_context
from auth import get_current_user_id
from models import ConceptChat

router = APIRouter()

class ChatRequest(BaseModel):
    document_id: str
    concept_id: str
    message: str
    # History is now optional/redundant for API input as we fetch from DB, 
    # but kept for compatibility or stateless overrides if needed.
    history: List[Dict[str, str]] = [] 

class ChatResponse(BaseModel):
    response: str
    context_used: List[str]

@router.get("/concept/{concept_id}")
async def get_concept_chat_history(
    concept_id: str,
    document_id: str, # Required to verify ownership/context
    user_id: str = Depends(get_current_user_id)
):
    """Get chat history for a specific concept node."""
    db = get_database()
    
    # Find existing chat
    chat = await db.concept_chats.find_one({
        "concept_id": concept_id,
        "document_id": document_id,
        "user_id": user_id
    })
    
    if not chat:
        return []
        
    return chat.get("messages", [])


@router.post("/message", response_model=ChatResponse)
async def chat_message(
    request: ChatRequest,
    user_id: str = Depends(get_current_user_id)
):
    """
    Send a message to the chat assistant for a specific concept.
    Saves history to persistent ConceptChat storage.
    """
    db = get_database()
    
    # Verify user owns the document
    try:
        document = await db.documents.find_one({"_id": ObjectId(request.document_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied to this document")
    
    # 1. Get Concept details to find its label
    try:
        concept = await db.concepts.find_one({"_id": ObjectId(request.concept_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid concept ID")
        
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")
    
    concept_label = concept["label"]

    # --- Fetch Persistent History ---
    concept_chat = await db.concept_chats.find_one({
        "concept_id": request.concept_id,
        "document_id": request.document_id,
        "user_id": user_id
    })

    # Prepare history for LLM context
    # Use DB history if available, otherwise fall back to request history (or empty)
    # We convert DB model format to LLM format
    llm_history = []
    if concept_chat and "messages" in concept_chat:
        for msg in concept_chat["messages"]:
            llm_history.append({"role": msg["role"], "content": msg["content"]})
    elif request.history:
        llm_history = request.history
    
    # 2. Get Relationship Context (Incoming and Outgoing)
    cursor = db.relationships.find({
        "$or": [
            {"source_concept_id": request.concept_id},
            {"target_concept_id": request.concept_id}
        ]
    })
    
    relationships = []
    async for rel in cursor:
        relationships.append(rel)
        
    # Get labels for related concepts
    related_concept_ids = set()
    for rel in relationships:
        related_concept_ids.add(rel["source_concept_id"])
        related_concept_ids.add(rel["target_concept_id"])
    
    related_concepts = {}
    if related_concept_ids:
        rc_cursor = db.concepts.find({"_id": {"$in": [ObjectId(cid) for cid in related_concept_ids]}})
        async for rc in rc_cursor:
            related_concepts[str(rc["_id"])] = rc["label"]

    # 3. Get ALL available concepts in the document for abbreviation matching
    all_concepts = []
    all_concepts_cursor = db.concepts.find({"document_id": request.document_id})
    async for concept_doc in all_concepts_cursor:
        all_concepts.append(concept_doc.get("label", "Unknown"))
    
    # Create abbreviation mapping
    concept_abbreviations = "\n".join([f"- {c}" for c in sorted(all_concepts)])

    # 4. Construct Structured Context
    structured_context = []
    
    # Section: Available Concepts
    structured_context.append("### Available Concepts in this Document:")
    structured_context.append(concept_abbreviations)
    
    # Section: Concept Profile
    structured_context.append(f"\n### Concept Profile: {concept_label}")
    if concept.get("description"):
        structured_context.append(f"Description: {concept['description']}")
    if concept.get("unit"):
        structured_context.append(f"Unit: {concept['unit']}")
    
    val_str = []
    if concept.get("min_value") is not None: val_str.append(f"Min: {concept['min_value']}")
    if concept.get("max_value") is not None: val_str.append(f"Max: {concept['max_value']}")
    if val_str:
        structured_context.append(f"Range: {', '.join(val_str)}")

    # Section: Causal Relationships
    structured_context.append(f"\\n### Causal Relationships for {concept_label}")
    
    has_relations = False
    for rel in relationships:
        # Outgoing
        if rel["source_concept_id"] == request.concept_id:
            target_name = related_concepts.get(rel["target_concept_id"], "Unknown")
            rel_desc = f"- AFFECTS {target_name} ({rel['relationship_type']})"
            if rel.get("description"):
                rel_desc += f": {rel['description']}"
            structured_context.append(rel_desc)
            has_relations = True
            
        # Incoming
        elif rel["target_concept_id"] == request.concept_id:
            source_name = related_concepts.get(rel["source_concept_id"], "Unknown")
            rel_desc = f"- AFFECTED BY {source_name} ({rel['relationship_type']})"
            if rel.get("description"):
                rel_desc += f": {rel['description']}"
            structured_context.append(rel_desc)
            has_relations = True
            
    if not has_relations:
        structured_context.append("No direct causal relationships defined.")

    # 4. Find relevant chunks (Textual Context)
    structured_context.append(f"\\n### Source Document Excerpts for {concept_label}")
    
    chunks_cursor = db.chunks.find({
        "document_id": request.document_id,
        "text": {"$regex": re.escape(concept_label), "$options": "i"}
    }).limit(10)
    
    text_chunks = []
    async for chunk in chunks_cursor:
        text_chunks.append(chunk["text"])
        
    if not text_chunks:
        # Fallback to general causal chunks
        fallback_cursor = db.chunks.find({
            "document_id": request.document_id,
            "is_causal": True
        }).limit(5)
        async for chunk in fallback_cursor:
            text_chunks.append(chunk["text"])
    
    # Deduplicate and add
    added_chunks = set()
    for chunk in text_chunks:
        if chunk not in added_chunks:
            structured_context.append(f"- {chunk}")
            added_chunks.add(chunk)

    # Final Context String
    context_str = "\\n".join(structured_context)
        
    # 5. Call LLM
    response = chat_with_context(
        context=context_str,
        message=request.message,
        history=llm_history # Pass the full history we retrieved/constructed
    )

    # --- SAVE to Persistence ---
    new_messages = [
        {"role": "user", "content": request.message, "timestamp": datetime.utcnow()},
        {"role": "assistant", "content": response, "timestamp": datetime.utcnow()}
    ]

    await db.concept_chats.update_one(
        {
            "concept_id": request.concept_id,
            "document_id": request.document_id,
            "user_id": user_id
        },
        {
            "$push": {"messages": {"$each": new_messages}},
            "$set": {"last_updated": datetime.utcnow()}
        },
        upsert=True
    )
    
    return ChatResponse(
        response=response,
        context_used=list(added_chunks) if added_chunks else ["Generated from Graph Structure"]
    )

@router.get("/history")
async def get_chat_history(user_id: str = Depends(get_current_user_id)):
    """Get list of recent chat sessions for the authenticated user."""
    db = get_database()
    
    # First get user's documents
    user_docs_cursor = db.documents.find({"user_id": user_id})
    user_doc_ids = [str(doc["_id"]) async for doc in user_docs_cursor]
    
    if not user_doc_ids:
        return []
    
    # Then get chats for those documents
    cursor = db.chats.find({"document_id": {"$in": user_doc_ids}}).sort("created_at", -1).limit(50)
    
    chats = []
    async for chat in cursor:
        chats.append({
            "id": str(chat["_id"]),
            "title": chat.get("title", "Untitled Chat"),
            "document_id": chat.get("document_id"),
            "created_at": chat.get("created_at")
        })
    return chats


@router.get("/{chat_id}")
async def get_chat_session(chat_id: str, user_id: str = Depends(get_current_user_id)):
    """Get chat session details including linked document ID."""
    db = get_database()
    try:
        chat = await db.chats.find_one({"_id": ObjectId(chat_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid chat ID")
        
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Verify user owns the document linked to this chat
    document = await db.documents.find_one({"_id": ObjectId(chat.get("document_id"))})
    if not document or document.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied to this chat session")
        
    return {
        "id": str(chat["_id"]),
        "title": chat.get("title", "Untitled Chat"),
        "document_id": chat.get("document_id"),
        "created_at": chat.get("created_at"),
        "messages": chat.get("messages", [])
    }

@router.delete("/{chat_id}")
async def delete_chat_session(chat_id: str, user_id: str = Depends(get_current_user_id)):
    """Delete a chat session."""
    db = get_database()
    try:
        chat = await db.chats.find_one({"_id": ObjectId(chat_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid chat ID")
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    # Verify user owns the document linked to this chat
    document = await db.documents.find_one({"_id": ObjectId(chat.get("document_id"))})
    if not document or document.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Access denied to this chat session")
    
    result = await db.chats.delete_one({"_id": ObjectId(chat_id)})
    
    return {"status": "success", "message": "Chat session deleted"}
