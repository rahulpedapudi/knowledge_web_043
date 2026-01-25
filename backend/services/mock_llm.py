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
    # Parse standardized equations
    # Supports: +, -, *, /, exp(), log(), sqrt(), pow(), abs()
    # Format: y = expression(x)
    if equation:
        try:
            import math
            
            # 1. Normalize equation
            # Remove "y =" prefix if present
            eq_body = getattr(equation, "lower", lambda: str(equation))().split("=")[-1].strip()
            
            # 2. Replace logical tokens with python math
            # Replace 'x' with actual value
            # Note: We prioritize 'exp' over 'x' to avoid replacing occurrences inside function names
            safe_env = {
                "x": input_value,
                "exp": math.exp,
                "log": math.log,
                "sqrt": math.sqrt,
                "pow": math.pow,
                "abs": abs,
                "sin": math.sin,
                "cos": math.cos,
                "tan": math.tan,
                "pi": math.pi,
                "e": math.e
            }

            # 3. Safe Evaluation
            # We use eval() with a restricted environment. 
            # In a real production system, consider using `simpleeval` or a parser library.
            # Here we restrict access to __builtins__ for basic safety.
            result = eval(eq_body, {"__builtins__": {}}, safe_env)
            
            if isinstance(result, (int, float)):
                return float(result)

        except Exception as e:
            # Fallback for simple linear parsing if complex eval fails
            print(f"Equation parsing failed for '{equation}': {str(e)}")

    # Fallback to simple linear logic if no equation or parsing failed
    delta = input_value - source_default
    if relationship_type == "inverse":
        return target_default - (coefficient * delta)
    
    # Default direct
    return target_default + (coefficient * delta)


def generate_mock_topics(topics: list[str]) -> dict:
    """
    Generate a mock knowledge graph for topics when LLM is not available.
    Creates a rich graph structure with multiple levels of depth and cross-connections.
    """
    concepts = []
    relationships = []
    
    # Track all concept IDs for cross-referencing
    all_concept_ids = []

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
            "priority": 1,
            "category": "general",
            "semantic_type": "entity",
            "parent_concepts": []
        })
        all_concept_ids.append(topic_id)

        # Level 1: Primary sub-concepts (direct children of topic)
        level1_concepts = [
            (f"{topic_id}_fundamentals", f"{topic} Fundamentals", "Core principles and foundational concepts"),
            (f"{topic_id}_applications", f"{topic} Applications", "Practical applications and real-world use cases"),
            (f"{topic_id}_techniques", f"{topic} Techniques", "Methods and approaches used"),
            (f"{topic_id}_benefits", f"{topic} Benefits", "Key advantages and positive outcomes"),
            (f"{topic_id}_challenges", f"{topic} Challenges", "Common obstacles and difficulties"),
        ]

        level1_ids = []
        for sub_id, sub_label, sub_desc in level1_concepts:
            concepts.append({
                "id": sub_id,
                "label": sub_label,
                "description": sub_desc,
                "unit": None,
                "min_value": None,
                "max_value": None,
                "default_value": None,
                "abstraction_level": 5,
                "depth_level": 1,
                "priority": 2,
                "category": "general",
                "semantic_type": "entity",
                "parent_concepts": [topic_id]
            })
            all_concept_ids.append(sub_id)
            level1_ids.append(sub_id)

            # Create relationship from parent to child
            relationships.append({
                "source": topic_id,
                "target": sub_id,
                "type": "direct",
                "description": f"{topic} encompasses {sub_label}",
                "equation": None,
                "coefficient": 1.0
            })

        # Level 2: Secondary sub-concepts (children of level 1)
        level2_map = {
            f"{topic_id}_fundamentals": [
                (f"{topic_id}_theory", f"{topic} Theory", "Theoretical foundations"),
                (f"{topic_id}_principles", f"{topic} Principles", "Guiding principles"),
                (f"{topic_id}_history", f"{topic} History", "Historical development"),
            ],
            f"{topic_id}_applications": [
                (f"{topic_id}_use_cases", f"{topic} Use Cases", "Specific use case examples"),
                (f"{topic_id}_industry", f"{topic} in Industry", "Industry applications"),
                (f"{topic_id}_examples", f"{topic} Examples", "Practical examples"),
            ],
            f"{topic_id}_techniques": [
                (f"{topic_id}_methods", f"{topic} Methods", "Specific methodologies"),
                (f"{topic_id}_tools", f"{topic} Tools", "Tools and resources"),
                (f"{topic_id}_best_practices", f"{topic} Best Practices", "Recommended approaches"),
            ],
            f"{topic_id}_benefits": [
                (f"{topic_id}_advantages", f"{topic} Advantages", "Key advantages"),
                (f"{topic_id}_value", f"{topic} Value Proposition", "Value and impact"),
            ],
            f"{topic_id}_challenges": [
                (f"{topic_id}_limitations", f"{topic} Limitations", "Known limitations"),
                (f"{topic_id}_solutions", f"{topic} Solutions", "Solutions to challenges"),
            ],
        }

        level2_ids = []
        for parent_id, children in level2_map.items():
            for child_id, child_label, child_desc in children:
                concepts.append({
                    "id": child_id,
                    "label": child_label,
                    "description": child_desc,
                    "unit": None,
                    "min_value": None,
                    "max_value": None,
                    "default_value": None,
                    "abstraction_level": 3,
                    "depth_level": 2,
                    "priority": 3,
                    "category": "general",
                    "semantic_type": "entity",
                    "parent_concepts": [parent_id]
                })
                all_concept_ids.append(child_id)
                level2_ids.append(child_id)

                # Create relationship from level 1 parent to level 2 child
                relationships.append({
                    "source": parent_id,
                    "target": child_id,
                    "type": "direct",
                    "description": f"{parent_id.replace('_', ' ').title()} includes {child_label}",
                    "equation": None,
                    "coefficient": 1.0
                })

        # Cross-connect level 1 concepts (benefits relates to applications, etc.)
        if len(level1_ids) >= 2:
            # Connect benefits to applications
            relationships.append({
                "source": f"{topic_id}_benefits",
                "target": f"{topic_id}_applications",
                "type": "direct",
                "description": f"Benefits drive {topic} Applications",
                "equation": None,
                "coefficient": 0.7
            })
            # Connect challenges to techniques (techniques solve challenges)
            relationships.append({
                "source": f"{topic_id}_techniques",
                "target": f"{topic_id}_challenges",
                "type": "direct",
                "description": f"Techniques address {topic} Challenges",
                "equation": None,
                "coefficient": 0.6
            })
            # Connect fundamentals to techniques
            relationships.append({
                "source": f"{topic_id}_fundamentals",
                "target": f"{topic_id}_techniques",
                "type": "direct",
                "description": f"Fundamentals underpin {topic} Techniques",
                "equation": None,
                "coefficient": 0.8
            })

    # Connect topics if there are multiple (bidirectional relationships)
    if len(topics) > 1:
        for i in range(len(topics)):
            for j in range(i + 1, len(topics)):
                topic_id_1 = topics[i].lower().replace(" ", "_").replace("-", "_")
                topic_id_2 = topics[j].lower().replace(" ", "_").replace("-", "_")
                relationships.append({
                    "source": topic_id_1,
                    "target": topic_id_2,
                    "type": "direct",
                    "description": f"{topics[i]} relates to {topics[j]}",
                    "equation": None,
                    "coefficient": 0.5
                })
                # Also connect their sub-concepts
                relationships.append({
                    "source": f"{topic_id_1}_applications",
                    "target": f"{topic_id_2}_applications",
                    "type": "direct",
                    "description": f"{topics[i]} Applications connect with {topics[j]} Applications",
                    "equation": None,
                    "coefficient": 0.4
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
