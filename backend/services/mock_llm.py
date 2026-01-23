"""
Mock LLM Service

This service provides mock responses that simulate what an LLM would return
for causal analysis. In production, this would call OpenAI/Groq APIs.

The mock data covers common physics and economics concepts for demo purposes.
"""

import re
from typing import Optional

# Pre-defined causal patterns and their concept mappings
CAUSAL_PATTERNS = {
    # Physics - Gas Laws
    r"temperature.*(?:increase|rise|higher).*pressure": {
        "concepts": [
            {
                "id": "temperature",
                "label": "Temperature",
                "unit": "°C",
                "min_value": 0,
                "max_value": 100,
                "default_value": 25,
                "description": "The measure of thermal energy in a system"
            },
            {
                "id": "pressure",
                "label": "Pressure",
                "unit": "kPa",
                "min_value": 50,
                "max_value": 200,
                "default_value": 101.3,
                "description": "Force exerted per unit area"
            }
        ],
        "relationship": {
            "source": "temperature",
            "target": "pressure",
            "type": "direct",
            "equation": "y = 0.34 * x + 92.8",
            "coefficient": 0.34,
            "description": "As temperature increases, pressure increases (Gay-Lussac's Law)"
        }
    },

    # Physics - Altitude and Pressure
    r"(?:altitude|height).*(?:increase|higher).*pressure.*(?:decrease|lower|drop)": {
        "concepts": [
            {
                "id": "altitude",
                "label": "Altitude",
                "unit": "m",
                "min_value": 0,
                "max_value": 10000,
                "default_value": 0,
                "description": "Height above sea level"
            },
            {
                "id": "atm_pressure",
                "label": "Atmospheric Pressure",
                "unit": "kPa",
                "min_value": 20,
                "max_value": 101.3,
                "default_value": 101.3,
                "description": "Pressure exerted by the atmosphere"
            }
        ],
        "relationship": {
            "source": "altitude",
            "target": "atm_pressure",
            "type": "inverse",
            "equation": "y = 101.3 * exp(-x/8500)",
            "coefficient": -0.012,
            "description": "As altitude increases, atmospheric pressure decreases exponentially"
        }
    },

    # Economics - Supply and Demand
    r"demand.*(?:increase|rise|higher).*price.*(?:increase|rise|higher)": {
        "concepts": [
            {
                "id": "demand",
                "label": "Demand",
                "unit": "units",
                "min_value": 0,
                "max_value": 1000,
                "default_value": 500,
                "description": "Consumer desire and ability to purchase goods"
            },
            {
                "id": "price",
                "label": "Market Price",
                "unit": "$",
                "min_value": 0,
                "max_value": 100,
                "default_value": 50,
                "description": "The selling price of a good or service"
            }
        ],
        "relationship": {
            "source": "demand",
            "target": "price",
            "type": "direct",
            "equation": "y = 0.1 * x",
            "coefficient": 0.1,
            "description": "As demand increases, market price tends to increase"
        }
    },

    # Economics - Supply and Price
    r"supply.*(?:increase|rise|higher).*price.*(?:decrease|lower|drop|fall)": {
        "concepts": [
            {
                "id": "supply",
                "label": "Supply",
                "unit": "units",
                "min_value": 0,
                "max_value": 1000,
                "default_value": 500,
                "description": "Quantity of goods available in the market"
            },
            {
                "id": "market_price",
                "label": "Market Price",
                "unit": "$",
                "min_value": 0,
                "max_value": 100,
                "default_value": 50,
                "description": "The selling price determined by market forces"
            }
        ],
        "relationship": {
            "source": "supply",
            "target": "market_price",
            "type": "inverse",
            "equation": "y = 100 - 0.1 * x",
            "coefficient": -0.1,
            "description": "As supply increases, market price tends to decrease"
        }
    },

    # Physics - Volume and Pressure (Boyle's Law)
    r"volume.*(?:increase|rise|higher|expand).*pressure.*(?:decrease|lower|drop)": {
        "concepts": [
            {
                "id": "volume",
                "label": "Volume",
                "unit": "L",
                "min_value": 1,
                "max_value": 10,
                "default_value": 5,
                "description": "The space occupied by a gas"
            },
            {
                "id": "gas_pressure",
                "label": "Gas Pressure",
                "unit": "atm",
                "min_value": 0.1,
                "max_value": 10,
                "default_value": 1,
                "description": "Pressure exerted by gas molecules"
            }
        ],
        "relationship": {
            "source": "volume",
            "target": "gas_pressure",
            "type": "inverse",
            "equation": "y = 5 / x",
            "coefficient": -1,
            "description": "As volume increases, pressure decreases (Boyle's Law: PV = constant)"
        }
    },

    # Biology - Exercise and Heart Rate
    r"exercise.*(?:increase|more|intense).*heart.*rate.*(?:increase|rise|higher|faster)": {
        "concepts": [
            {
                "id": "exercise_intensity",
                "label": "Exercise Intensity",
                "unit": "%",
                "min_value": 0,
                "max_value": 100,
                "default_value": 50,
                "description": "The level of physical exertion"
            },
            {
                "id": "heart_rate",
                "label": "Heart Rate",
                "unit": "bpm",
                "min_value": 60,
                "max_value": 200,
                "default_value": 70,
                "description": "Number of heartbeats per minute"
            }
        ],
        "relationship": {
            "source": "exercise_intensity",
            "target": "heart_rate",
            "type": "direct",
            "equation": "y = 60 + 1.4 * x",
            "coefficient": 1.4,
            "description": "As exercise intensity increases, heart rate increases"
        }
    }
}

# Additional reverse patterns
CAUSAL_PATTERNS.update({
    r"pressure.*(?:decrease|lower|drop).*altitude.*(?:increase|higher)":
        CAUSAL_PATTERNS[r"(?:altitude|height).*(?:increase|higher).*pressure.*(?:decrease|lower|drop)"],
    r"price.*(?:increase|rise).*demand.*(?:increase|higher)":
        CAUSAL_PATTERNS[r"demand.*(?:increase|rise|higher).*price.*(?:increase|rise|higher)"],
})


def classify_sentence(sentence: str) -> dict:
    """
    Classify a sentence as causal or non-causal.
    Returns concepts and relationships if causal.
    """
    sentence_lower = sentence.lower()

    # Check against known patterns
    for pattern, data in CAUSAL_PATTERNS.items():
        if re.search(pattern, sentence_lower):
            return {
                "is_causal": True,
                "concepts": data["concepts"],
                "relationship": data["relationship"],
                "original_sentence": sentence
            }

    # Check for generic causal keywords
    causal_keywords = [
        r"causes?\b", r"leads?\s+to", r"results?\s+in",
        r"increases?\b", r"decreases?\b", r"affects?\b",
        r"when.*then", r"if.*then", r"because\b",
        r"therefore\b", r"consequently\b", r"hence\b"
    ]

    for keyword in causal_keywords:
        if re.search(keyword, sentence_lower):
            # Generic causal sentence detected but no specific pattern match
            return {
                "is_causal": True,
                "concepts": None,  # Would need LLM to extract
                "relationship": None,
                "original_sentence": sentence,
                "needs_llm": True
            }

    return {
        "is_causal": False,
        "concepts": None,
        "relationship": None,
        "original_sentence": sentence
    }


def analyze_text(sentences: list[str], focus_concepts: list[str] = None) -> dict:
    """
    Analyze a list of sentences and extract causal relationships.
    If focus_concepts are provided, prioritize those concepts in the extraction.
    Returns aggregated concepts and relationships.
    """
    all_concepts = {}
    all_relationships = []
    causal_sentences = []

    # Convert focus concepts to lowercase for matching
    focus_lower = [c.lower() for c in focus_concepts] if focus_concepts else []

    for sentence in sentences:
        result = classify_sentence(sentence)

        # If we have focus concepts, also check if the sentence mentions them
        sentence_lower = sentence.lower()
        mentions_focus = any(
            fc in sentence_lower for fc in focus_lower) if focus_lower else False

        if result["is_causal"] and result["concepts"]:
            causal_sentences.append(result["original_sentence"])

            # Merge concepts (avoid duplicates)
            for concept in result["concepts"]:
                concept_id = concept["id"]
                if concept_id not in all_concepts:
                    all_concepts[concept_id] = concept

            # Add relationship
            if result["relationship"]:
                rel = result["relationship"]
                # Check for duplicate relationships
                rel_key = f"{rel['source']}-{rel['target']}"
                if not any(r["source"] == rel["source"] and r["target"] == rel["target"]
                           for r in all_relationships):
                    all_relationships.append(rel)
        elif mentions_focus:
            # Even if not traditionally causal, include if it mentions focus concepts
            causal_sentences.append(sentence)

    return {
        "concepts": list(all_concepts.values()),
        "relationships": all_relationships,
        "causal_sentences": causal_sentences,
        "total_sentences": len(sentences),
        "causal_count": len(causal_sentences),
        "focus_concepts": focus_concepts or []
    }


def calculate_simulation(
    input_value: float,
    relationship_type: str,
    equation: Optional[str] = None,
    coefficient: float = 1.0,
    source_default: float = 0,
    target_default: float = 0
) -> float:
    """
    Calculate the output value based on input and relationship.
    Uses the equation if available, otherwise uses coefficient.
    """
    if equation:
        # Parse simple linear equations like "y = 0.34 * x + 92.8"
        try:
            if "exp(" in equation:
                # Exponential: y = 101.3 * exp(-x/8500)
                import math
                # Extract parameters
                match = re.search(
                    r'([\d.]+)\s*\*\s*exp\(([-\d./x]+)\)', equation)
                if match:
                    base = float(match.group(1))
                    exp_part = match.group(2).replace('x', str(input_value))
                    return base * math.exp(eval(exp_part))
            elif "/" in equation and "x" in equation.split("/")[1]:
                # Inverse proportion: y = 5 / x
                match = re.search(r'([\d.]+)\s*/\s*x', equation)
                if match:
                    constant = float(match.group(1))
                    # Avoid division by zero
                    return constant / max(input_value, 0.1)
            else:
                # Linear: y = mx + b
                match = re.search(
                    r'y\s*=\s*([-\d.]+)\s*\*\s*x\s*([+-]\s*[\d.]+)?', equation)
                if match:
                    m = float(match.group(1))
                    b = float(match.group(2).replace(
                        " ", "")) if match.group(2) else 0
                    return m * input_value + b

                # Simple form: y = 100 - 0.1 * x
                match = re.search(
                    r'y\s*=\s*([\d.]+)\s*([+-])\s*([\d.]+)\s*\*\s*x', equation)
                if match:
                    b = float(match.group(1))
                    sign = 1 if match.group(2) == '+' else -1
                    m = sign * float(match.group(3))
                    return b + m * input_value
        except Exception:
            pass

    # Fallback: simple linear relationship using coefficient
    delta = input_value - source_default
    if relationship_type == "direct":
        return target_default + (coefficient * delta)
    else:  # inverse
        return target_default - (coefficient * delta)


def generate_mock_topics(topics: list[str]) -> dict:
    """
    Generate a mock knowledge graph for topics when LLM is not available.
    Creates a simple graph structure based on the input topics.
    """
    concepts = []
    relationships = []

    # Create core concepts from topics
    for i, topic in enumerate(topics):
        topic_id = topic.lower().replace(" ", "_").replace("-", "_")
        concepts.append({
            "id": topic_id,
            "label": topic,
            "description": f"Core concept: {topic}",
            "unit": None,
            "min_value": None,
            "max_value": None,
            "default_value": None,
            "abstraction_level": 8,
            "depth_level": 0,
            "category": "general",
            "semantic_type": "entity",
            "parent_concepts": []
        })

        # Add some sub-concepts for each topic
        sub_concepts = [
            (f"{topic_id}_basics", f"{topic} Basics",
             "Fundamental concepts and principles", 1),
            (f"{topic_id}_applications", f"{topic} Applications",
             "Practical applications and use cases", 1),
            (f"{topic_id}_details", f"{topic} Details",
             "Detailed information and specifics", 2),
        ]

        for sub_id, sub_label, sub_desc, depth in sub_concepts:
            concepts.append({
                "id": sub_id,
                "label": sub_label,
                "description": sub_desc,
                "unit": None,
                "min_value": None,
                "max_value": None,
                "default_value": None,
                "abstraction_level": 5 - depth,
                "depth_level": depth,
                "category": "general",
                "semantic_type": "entity",
                "parent_concepts": [topic_id]
            })

            # Create relationship from parent to child
            relationships.append({
                "source": topic_id,
                "target": sub_id,
                "type": "direct",
                "description": f"{topic} includes {sub_label}",
                "equation": None,
                "coefficient": 1.0
            })

    # Connect topics if there are multiple
    if len(topics) > 1:
        for i in range(len(topics) - 1):
            topic_id_1 = topics[i].lower().replace(" ", "_").replace("-", "_")
            topic_id_2 = topics[i + 1].lower().replace(" ",
                                                       "_").replace("-", "_")
            relationships.append({
                "source": topic_id_1,
                "target": topic_id_2,
                "type": "direct",
                "description": f"{topics[i]} relates to {topics[i + 1]}",
                "equation": None,
                "coefficient": 0.5
            })

    return {
        "concepts": concepts,
        "relationships": relationships,
        "causal_sentences": [],
        "total_sentences": 0,
        "causal_count": 0,
        "generated_from_topics": topics
    }


# Demo text for testing
DEMO_TEXT = """
When temperature increases in a closed container, pressure also increases proportionally.
This relationship is known as Gay-Lussac's Law.

As altitude increases, atmospheric pressure decreases because there is less air above.
Mountain climbers often experience this as they ascend to higher elevations.

In economics, when demand for a product increases, the market price tends to rise.
Conversely, when supply increases significantly, prices typically fall.

Exercise causes the heart rate to increase as the body needs more oxygen.
More intense exercise leads to a higher heart rate.

As the volume of a gas increases while temperature remains constant, 
the pressure decreases according to Boyle's Law.
"""
