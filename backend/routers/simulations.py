from fastapi import APIRouter, HTTPException
from bson import ObjectId

from database import get_database
from models import SimulationConfig, SimulationRequest, SimulationResult, ConceptNode
from services.mock_llm import calculate_simulation

router = APIRouter()


@router.get("/{relationship_id}", response_model=SimulationConfig)
async def get_simulation_config(relationship_id: str):
    """Get simulation configuration for a relationship."""
    db = get_database()
    
    try:
        rel = await db.relationships.find_one({"_id": ObjectId(relationship_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid relationship ID")
    
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")
    
    # Get source and target concepts
    source = await db.concepts.find_one({"_id": ObjectId(rel["source_concept_id"])})
    target = await db.concepts.find_one({"_id": ObjectId(rel["target_concept_id"])})
    
    if not source or not target:
        raise HTTPException(status_code=404, detail="Concepts not found")
    
    return SimulationConfig(
        relationship_id=str(rel["_id"]),
        source_concept=ConceptNode(
            id=str(source["_id"]),
            label=source["label"],
            description=source.get("description"),
            unit=source.get("unit"),
            min_value=source.get("min_value"),
            max_value=source.get("max_value"),
            default_value=source.get("default_value")
        ),
        target_concept=ConceptNode(
            id=str(target["_id"]),
            label=target["label"],
            description=target.get("description"),
            unit=target.get("unit"),
            min_value=target.get("min_value"),
            max_value=target.get("max_value"),
            default_value=target.get("default_value")
        ),
        relationship_type=rel["relationship_type"],
        equation=rel.get("equation"),
        coefficient=rel.get("coefficient", 1.0)
    )


@router.post("/calculate", response_model=SimulationResult)
async def calculate(request: SimulationRequest):
    """Calculate the effect of changing an input variable."""
    db = get_database()
    
    try:
        rel = await db.relationships.find_one({"_id": ObjectId(request.relationship_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid relationship ID")
    
    if not rel:
        raise HTTPException(status_code=404, detail="Relationship not found")
    
    # Get source and target defaults
    source = await db.concepts.find_one({"_id": ObjectId(rel["source_concept_id"])})
    target = await db.concepts.find_one({"_id": ObjectId(rel["target_concept_id"])})
    
    source_default = source.get("default_value", 0) if source else 0
    target_default = target.get("default_value", 0) if target else 0
    
    # Calculate output
    output_value = calculate_simulation(
        input_value=request.input_value,
        relationship_type=rel["relationship_type"],
        equation=rel.get("equation"),
        coefficient=rel.get("coefficient", 1.0),
        source_default=source_default,
        target_default=target_default
    )
    
    return SimulationResult(
        input_value=request.input_value,
        output_value=round(output_value, 2),
        relationship_type=rel["relationship_type"],
        description=rel["description"]
    )
