"""
LLM Service for analyzing text and extracting causal relationships.
Uses Groq API for high-performance inference.
"""

import json
import os
from typing import Dict, Any, List
from groq import Groq
from config import get_settings

settings = get_settings()

# Initialize Groq client
client = None
if settings.groq_api_key:
    client = Groq(api_key=settings.groq_api_key)

SYSTEM_PROMPT = """
You are an expert causal reasoning engine. Your task is to analyze the provided text and extract causal relationships between concepts.
You must output ONLY valid JSON matching the specified schema.

Extraction Rules:
1. Identify key concepts (variables that can change, e.g., "temperature", "pressure", "price", "demand").
2. Identify causal relationships where a change in one concept causes a change in another.
3. Determine the relationship type: "direct" (both move same direction) or "inverse" (move opposite directions).
4. Estimate a mathematical equation if possible, or provide a coefficient (positive for direct, negative for inverse).
5. Extract specific sentences that contain the causal assertion.

Output Schema:
{
    "concepts": [
        {
            "id": "concept_id_snake_case",
            "label": "Human Readable Label",
            "description": "Brief description",
            "unit": "unit if variable (e.g., m/s, $)",
            "min_value": 0,
            "max_value": 100,
            "default_value": 50
        }
    ],
    "relationships": [
        {
            "source": "source_concept_id",
            "target": "target_concept_id",
            "type": "direct" | "inverse",
            "description": "Explanation of the relationship",
            "equation": "y = mx + b format (optional)", 
            "coefficient": 1.0 (approximated strength)
        }
    ],
    "causal_sentences": ["exact sentence from text"]
}
"""

def analyze_text_with_llm(sentences: List[str]) -> Dict[str, Any]:
    """
    Analyze text using Groq LLM to extract causal structure.
    """
    global client
    if not client and settings.groq_api_key:
        client = Groq(api_key=settings.groq_api_key)
        
    if not client:
        print("Warning: Groq API key not found, falling back to mock")
        from services.mock_llm import analyze_text
        return analyze_text(sentences)

    # Combine sentences into text block
    full_text = " ".join(sentences)
    
    # Truncate if too long (rough token estimation)
    if len(full_text) > 15000:
        full_text = full_text[:15000] + "..."

    model_name = "openai/gpt-oss-120b"  # Using a supported Groq model
    
    # Log analysis attempt
    print(f"Starting LLM analysis on {len(sentences)} sentences ({len(full_text)} chars) with model: {model_name}")
    
    # Log the input text
    print("-" * 40 + " LLM INPUT TEXT " + "-" * 40)
    print(full_text[:500] + "..." if len(full_text) > 500 else full_text)
    print("-" * 96)

    try:
        completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": f"Analyze this text and extract causal structure:\n\n{full_text}"
                }
            ],
            model=model_name,
            temperature=0.1,
            response_format={"type": "json_object"}
        )

        response_content = completion.choices[0].message.content
        print(f"LLM Response received ({len(response_content)} chars)")
        
        # Log the raw response for debugging
        print("-" * 40 + " RAW LLM OUTPUT " + "-" * 40)
        print(response_content)
        print("-" * 100)

        try:
            result = json.loads(response_content)
        except json.JSONDecodeError as je:
            print(f"JSON Parsing Error: {str(je)}")
            print(f"Invalid JSON Content: {response_content}")
            raise je
        
        # Post-process to match expected format
        concepts = result.get("concepts", [])
        relationships = result.get("relationships", [])
        causal_sentences = result.get("causal_sentences", [])
        
        print(f"Extraction results: {len(concepts)} concepts, {len(relationships)} relationships")
        
        return {
            "concepts": concepts,
            "relationships": relationships,
            "causal_sentences": causal_sentences,
            "total_sentences": len(sentences),
            "causal_count": len(causal_sentences)
        }

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"LLM Analysis failed: {str(e)}")
        print(f"Detailed Traceback: {error_trace}")
        
        # Fallback to mock on error
        from services.mock_llm import analyze_text
        return analyze_text(sentences)
