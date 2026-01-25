from fastapi import APIRouter, HTTPException
from bson import ObjectId

from database import get_database
from models import SimulationConfig, SimulationRequest, SimulationResult, ConceptNode
from services.simulation_service import calculate_simulation_result, generate_simulation_params

router = APIRouter()


@router.get("/{relationship_id}", response_model=SimulationConfig)
async def get_simulation_config(relationship_id: str):
    """
    Get simulation configuration for a relationship.
    If configuration is missing/invalid, it triggers JIT generation.
    """
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
    
    source_node = ConceptNode(
        id=str(source["_id"]),
        label=source["label"],
        description=source.get("description"),
        unit=source.get("unit"),
        min_value=source.get("min_value"),
        max_value=source.get("max_value"),
        default_value=source.get("default_value")
    )

    target_node = ConceptNode(
        id=str(target["_id"]),
        label=target["label"],
        description=target.get("description"),
        unit=target.get("unit"),
        min_value=target.get("min_value"),
        max_value=target.get("max_value"),
        default_value=target.get("default_value")
    )

    # Check if we have valid simulation data (equation + new pedagogical fields)
    if not rel.get("equation") or not rel.get("scenario_context"):
        # Trigger JIT Generation
        print(f"Generating JIT simulation for {relationship_id}...")
        generated = await generate_simulation_params(
            relationship_id, 
            source_node, 
            target_node, 
            rel["relationship_type"],
            rel["description"]
        )
        
        # Save generated params to DB
        await db.relationships.update_one(
            {"_id": rel["_id"]},
            {"$set": {
                "equation": generated["equation"],
                "explanation": generated.get("explanation"),
                "scenario_context": generated.get("scenario_context"),
                "variable_explainer": generated.get("variable_explainer"),
                "feedback_rules": generated.get("feedback_rules"),
                "visual_theme": generated.get("visual_theme")
            }}
        )

        
        # Update source concept limits if generated
        if generated.get("source_min") is not None:
             await db.concepts.update_one(
                {"_id": source["_id"]},
                {"$set": {
                    "min_value": generated["source_min"],
                    "max_value": generated["source_max"],
                    "unit": generated.get("source_unit") or source.get("unit")
                }}
             )
             # Update local object
             source_node.min_value = generated["source_min"]
             source_node.max_value = generated["source_max"]
             source_node.unit = generated.get("source_unit") or source_node.unit

        # Update local rel object for response
        rel["equation"] = generated["equation"]
        rel["scenario_context"] = generated.get("scenario_context")
        rel["variable_explainer"] = generated.get("variable_explainer")
        rel["feedback_rules"] = generated.get("feedback_rules")
        rel["visual_theme"] = generated.get("visual_theme")

    return SimulationConfig(
        relationship_id=str(rel["_id"]),
        source_concept=source_node,
        target_concept=target_node,
        relationship_type=rel["relationship_type"],
        equation=rel.get("equation"),
        coefficient=rel.get("coefficient", 1.0),
        scenario_context=rel.get("scenario_context"),
        variable_explainer=rel.get("variable_explainer"),
        feedback_rules=rel.get("feedback_rules"),
        visual_theme=rel.get("visual_theme")
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
    
    # Get source and target
    source = await db.concepts.find_one({"_id": ObjectId(rel["source_concept_id"])})
    target = await db.concepts.find_one({"_id": ObjectId(rel["target_concept_id"])})
    
    source_default = source.get("default_value", 0) if source else 0
    target_default = target.get("default_value", 0) if target else 0
    
    # Calculate output using service
    output_value = calculate_simulation_result(
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
