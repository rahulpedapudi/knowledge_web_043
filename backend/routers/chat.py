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
    
    # 2. Find relevant chunks (Context Retrieval)
    # Strategy: Find chunks in this document that contain the concept label (case-insensitive)
    # This is a simple but effective "retrieval" without a vector DB
    chunks_cursor = db.chunks.find({
        "document_id": request.document_id,
        "text": {"$regex": re.escape(concept_label), "$options": "i"}
    }).limit(10)  # Limit to 10 most relevant chunks
    
    relevant_chunks = []
    async for chunk in chunks_cursor:
        relevant_chunks.append(chunk["text"])
    
    if not relevant_chunks:
        # Fallback: if no specific mentions found (rare if concept was extracted), 
        # maybe just grab the chunks marked as causal? or just tell the user.
        # Let's try to get adjacent chunks or just warn.
        # For now, let's grab causal chunks as a broader context fallback
        fallback_cursor = db.chunks.find({
            "document_id": request.document_id,
            "is_causal": True
        }).limit(5)
        async for chunk in fallback_cursor:
            relevant_chunks.append(chunk["text"])
            
    # Deduplicate chunks
    relevant_chunks = list(set(relevant_chunks))
    
    # 3. Construct Context String
    context_str = "\n---\n".join(relevant_chunks)
    
    if not context_str:
        context_str = "No specific text found for this concept."
        
    # 4. Call LLM
    response = chat_with_context(
        context=context_str,
        message=request.message,
        history=request.history
    )
    
    return ChatResponse(
        response=response,
        context_used=relevant_chunks
    )
