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

from database import get_database
from services.llm_service import chat_with_context

router = APIRouter()

class ChatRequest(BaseModel):
    document_id: str
    concept_id: str
    message: str
    history: List[Dict[str, str]] = []  # List of {"role": "user"|"assistant", "content": "..."}

class ChatResponse(BaseModel):
    response: str
    context_used: List[str]

@router.post("/message", response_model=ChatResponse)
async def chat_message(request: ChatRequest):
    """
    Send a message to the chat assistant for a specific concept.
    Retrieves context chunks based on the concept label.
    """
    db = get_database()
    
    # 1. Get Concept details to find its label
    try:
        concept = await db.concepts.find_one({"_id": ObjectId(request.concept_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid concept ID")
        
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")
    
    concept_label = concept["label"]
    
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

    # 3. Construct Structured Context
    structured_context = []
    
    # Section: Concept Profile
    structured_context.append(f"### Concept Profile: {concept_label}")
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
    structured_context.append(f"\n### Causal Relationships for {concept_label}")
    
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
    structured_context.append(f"\n### Source Document Excerpts for {concept_label}")
    
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
    context_str = "\n".join(structured_context)
        
    # 5. Call LLM
    response = chat_with_context(
        context=context_str,
        message=request.message,
        history=request.history
    )
    
    return ChatResponse(
        response=response,
        context_used=list(added_chunks) if added_chunks else ["Generated from Graph Structure"]
    )

@router.get("/history")
async def get_chat_history():
    """Get list of recent chat sessions (linked to documents)."""
    db = get_database()
    cursor = db.chats.find().sort("created_at", -1).limit(50)
    
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
async def get_chat_session(chat_id: str):
    """Get chat session details including linked document ID."""
    db = get_database()
    try:
        chat = await db.chats.find_one({"_id": ObjectId(chat_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid chat ID")
        
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    return {
        "id": str(chat["_id"]),
        "title": chat.get("title", "Untitled Chat"),
        "document_id": chat.get("document_id"),
        "created_at": chat.get("created_at"),
        "messages": chat.get("messages", [])
    }
