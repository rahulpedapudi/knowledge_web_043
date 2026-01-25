"""
Simulation Service
Handles the logic for generating and calculating simulations.
detailed simulation parameters using LLM when they are missing.
"""

import math
import json
from typing import Optional, Dict, Any
from groq import Groq
from config import get_settings
from models import SimulationResult, ConceptNode
from database import get_database
from bson import ObjectId

settings = get_settings()

SIMULATION_GENERATION_PROMPT = """
You are an expert educational designer and scientific modeler.
Your task is to create a "Pedagogical Micro-Simulation" for a relationship between two concepts.
This simulation should tell a story and teach the user via cause-and-effect.

Input:
- Source Concept: {source_label} ({source_desc})
- Target Concept: {target_label} ({target_desc})
- Relationship: {rel_desc} ({rel_type})

You must generate:
1. A Mathematical Model (Equation) relating Source (x) to Target (y).
2. A "Scenario Context" (1-2 sentences): Set the scene. e.g., "Imagine you are a network admin..." or "You are a virus trying to infect a host..."
3. A "Variable Explainer": What does the input variable represent in this story?
4. "Feedback Rules": A list of text feedback that appears as the user changes the input value.
   - Example: Low value -> "The system is stable but slow."
   - High value -> "WARNING: Overload imminent! Packet loss occurring."
5. A "Visual Theme": Suggest a theme (e.g., "danger", "growth", "balance", "efficiency").

Output Schema (JSON):
{
    "equation": "valid python expression for eval() e.g. 5 * x + 10",
    "source_min": float,
    "source_max": float,
    "source_unit": "string",
    "target_unit": "string",
    "scenario_context": "string",
    "variable_explainer": "string",
    "visual_theme": "string",
    "feedback_rules": [
        {
            "min_value": float,
            "max_value": float,
            "feedback_text": "string",
            "sentiment": "positive" | "neutral" | "negative" | "warning"
        }
    ],
    "explanation": "Brief explanation of the math model"
}
"""

async def generate_simulation_params(
    relationship_id: str,
    source: ConceptNode,
    target: ConceptNode,
    rel_type: str,
    rel_desc: str
) -> Dict[str, Any]:
    """
    Generate simulation parameters using LLM if missing.
    """
    client = None
    if settings.groq_api_key:
        client = Groq(api_key=settings.groq_api_key)
    
    if not client:
        # Fallback if no LLM
        return _get_fallback_params(rel_type)

    prompt = SIMULATION_GENERATION_PROMPT.format(
        source_label=source.label,
        source_desc=source.description or "",
        target_label=target.label,
        target_desc=target.description or "",
        rel_desc=rel_desc,
        rel_type=rel_type
    )

    try:
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a physics and logic engine. Output JSON only."},
                {"role": "user", "content": prompt}
            ],
            model="openai/gpt-oss-120b", # Using supported model
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        
        result = json.loads(completion.choices[0].message.content)
        return result
    except Exception as e:
        print(f"Simulation generation failed: {e}")
        return _get_fallback_params(rel_type)

def _get_fallback_params(rel_type: str) -> Dict[str, Any]:
    """Return safe defaults if generation fails."""
    base = {
        "source_min": 0,
        "source_max": 100,
        "source_unit": "Units",
        "target_unit": "Units",
        "scenario_context": "Explore how changing the input affects the output.",
        "variable_explainer": "Input Variable",
        "visual_theme": "default",
        "feedback_rules": [],
        "explanation": "Standard relationship model."
    }
    
    if rel_type == "inverse":
        return {
            **base,
            "equation": "100 - x",
            "explanation": "Inverse relationship: As input increases, output decreases."
        }
    return {
        **base,
        "equation": "x",
        "explanation": "Direct relationship: As input increases, output increases."
    }

def calculate_simulation_result(
    input_value: float,
    equation: str,
    relationship_type: str,
    coefficient: float = 1.0,
    source_default: float = 0,
    target_default: float = 0
) -> float:
    """
    Calculate output using the equation or fallback linear logic.
    """
    if equation:
        try:
            # Safe evaluation environment
            safe_env = {
                "x": input_value,
                "math": math,
                "exp": math.exp,
                "log": math.log,
                "sqrt": math.sqrt,
                "pow": math.pow,
                "abs": abs,
                "sin": math.sin,
                "cos": math.cos
            }
            
            # Clean equation
            eq_body = equation.lower().split("=")[-1].strip()
            
            # Check for unsafe characters
            if any(char in eq_body for char in ["__", "import", "lambda", ";"]):
                raise ValueError("Unsafe characters in equation")

            result = eval(eq_body, {"__builtins__": {}}, safe_env)
            return float(result)
        except Exception as e:
            print(f"Equation eval failed: {e}, falling back to linear.")
    
    # Fallback Linear Logic
    delta = input_value - source_default
    if relationship_type == "inverse":
        return target_default - (coefficient * delta)
    return target_default + (coefficient * delta)
