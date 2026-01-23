from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime

from database import get_database
from models import Quiz, QuizQuestion
from services.llm_service import generate_quiz

router = APIRouter()

class QuizRequest(BaseModel):
    concept_id: str
    document_id: str

class QuizResponse(BaseModel):
    id: str
    concept_id: str
    questions: list[QuizQuestion]

@router.post("/generate", response_model=QuizResponse)
async def generate_quiz_endpoint(request: QuizRequest):
    db = get_database()

    # 1. Check if quiz already exists for this concept
    existing_quiz = await db.quizzes.find_one({"concept_id": request.concept_id})
    if existing_quiz:
        return QuizResponse(
            id=str(existing_quiz["_id"]),
            concept_id=existing_quiz["concept_id"],
            questions=existing_quiz["questions"]
        )

    # 2. Fetch Concept Details
    try:
        concept = await db.concepts.find_one({"_id": ObjectId(request.concept_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid concept ID")
    
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")

    concept_label = concept["label"]

    # 3. Build Context from Relationships (similar to chat)
    context_parts = []
    
    # Relationships
    cursor = db.relationships.find({
        "$or": [
            {"source_concept_id": request.concept_id},
            {"target_concept_id": request.concept_id}
        ]
    })
    
    relationships = []
    async for rel in cursor:
        relationships.append(rel)

    # Get related concept names
    related_ids = set()
    for rel in relationships:
        related_ids.add(rel["source_concept_id"])
        related_ids.add(rel["target_concept_id"])
    
    related_map = {}
    if related_ids:
        r_cursor = db.concepts.find({"_id": {"$in": [ObjectId(cid) for cid in related_ids]}})
        async for r in r_cursor:
            related_map[str(r["_id"])] = r["label"]

    for rel in relationships:
        if rel["source_concept_id"] == request.concept_id:
            target = related_map.get(rel["target_concept_id"], "Unknown")
            context_parts.append(f"{concept_label} affects {target} ({rel['relationship_type']})")
        else:
            source = related_map.get(rel["source_concept_id"], "Unknown")
            context_parts.append(f"{concept_label} is affected by {source} ({rel['relationship_type']})")

    # 4. Generate Quiz via LLM
    context_str = "\n".join(context_parts)
    llm_result = generate_quiz(concept_label, context_str)
    
    questions_data = llm_result.get("questions", [])
    
    if not questions_data:
        raise HTTPException(status_code=500, detail="Failed to generate quiz")

    # 5. Save to DB
    quiz_doc = {
        "concept_id": request.concept_id,
        "document_id": request.document_id,
        "questions": questions_data,
        "created_at": datetime.utcnow()
    }
    
    result = await db.quizzes.insert_one(quiz_doc)
    
    return QuizResponse(
        id=str(result.inserted_id),
        concept_id=request.concept_id,
        questions=questions_data
    )


# ============ Flashcard Endpoints ============

from models import Flashcard, FlashcardSet
from services.llm_service import generate_flashcards

class FlashcardResponse(BaseModel):
    id: str
    concept_id: str
    cards: list[Flashcard]

@router.post("/flashcards/generate", response_model=FlashcardResponse)
async def generate_flashcards_endpoint(request: QuizRequest):
    """Generate or fetch cached flashcards for a concept."""
    db = get_database()

    # Check cache
    existing = await db.flashcards.find_one({"concept_id": request.concept_id})
    if existing:
        return FlashcardResponse(
            id=str(existing["_id"]),
            concept_id=existing["concept_id"],
            cards=existing["cards"]
        )

    # Fetch concept
    try:
        concept = await db.concepts.find_one({"_id": ObjectId(request.concept_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid concept ID")
    
    if not concept:
        raise HTTPException(status_code=404, detail="Concept not found")

    concept_label = concept["label"]

    # Build context
    context_parts = []
    cursor = db.relationships.find({
        "$or": [
            {"source_concept_id": request.concept_id},
            {"target_concept_id": request.concept_id}
        ]
    })
    
    async for rel in cursor:
        context_parts.append(rel.get("description", ""))

    context_str = "\n".join(context_parts)
    
    # Generate via LLM
    llm_result = generate_flashcards(concept_label, context_str)
    cards_data = llm_result.get("cards", [])
    
    if not cards_data:
        raise HTTPException(status_code=500, detail="Failed to generate flashcards")

    # Save to DB
    flashcard_doc = {
        "concept_id": request.concept_id,
        "document_id": request.document_id,
        "cards": cards_data,
        "created_at": datetime.utcnow()
    }
    
    result = await db.flashcards.insert_one(flashcard_doc)
    
    return FlashcardResponse(
        id=str(result.inserted_id),
        concept_id=request.concept_id,
        cards=cards_data
    )
