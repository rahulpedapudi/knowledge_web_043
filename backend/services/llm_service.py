"""
LLM Service for analyzing text and extracting causal relationships.
Uses Groq API for high-performance inference.
"""

import json
import os
from typing import Dict, Any, List
from groq import Groq, RateLimitError
from config import get_settings
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

settings = get_settings()

# Initialize Groq client
client = None
if settings.groq_api_key:
    client = Groq(api_key=settings.groq_api_key)

SYSTEM_PROMPT = """
You are an expert causal reasoning engine. Your task is to analyze the provided text and extract causal relationships between concepts.
You must output ONLY valid JSON matching the specified schema.

Extraction Rules:
1. EXHAUSTIVELY extract concepts. Do not limit to just the main ones. Look for details, sub-components, and related attributes. Aim for 20-40 concepts if the text allows.
2. Structure concepts hierarchically using `depth_level` (0-3):
   - Level 0 (Core): The main 3-5 central topics of the text.
   - Level 1 (Primary): Major sub-topics or direct attributes of core concepts.
   - Level 2 (Secondary): Specific details, examples, or minor components.
   - Level 3 (Detail): Very specific values, minor nuances, or granular data points (these will only appear when zooming in).
3. Connect concepts CAPILLARY-STYLE:
   - Level 0 should connect to Level 1.
   - Level 1 should connect to Level 2, etc.
   - This ensures the graph expands logically as the user zooms in.
4. For each concept, determine:
   - abstraction_level: 0-10 scale (0=very concrete/specific, 10=very abstract/general/foundational)
   - depth_level: 0-3 scale as defined above.
   - category: semantic grouping (e.g., "economics", "physics", "biology", "psychology")
   - semantic_type: one of "variable", "law", "process", "entity"
   - parent_concepts: list of IDs of the IMMEDIATE parent level concept (e.g. Level 2 node should have Level 1 parent).

Output Schema:
{
    "concepts": [
        {
            "id": "concept_id_snake_case",
            "label": "Human Readable Label",
            "description": "Brief description",
            "unit": "unit if variable",
            "min_value": 0,
            "max_value": 100,
            "default_value": 50,
            "abstraction_level": 5,
            "depth_level": 1,
            "category": "physics",
            "semantic_type": "variable",
            "parent_concepts": ["core_concept_id"]
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

FOCUSED_SYSTEM_PROMPT = """
You are an expert causal reasoning engine. Your task is to analyze the provided text and extract causal relationships SPECIFICALLY FOCUSED on the user's learning goals.

The user wants to learn about specific concepts. You must:
1. PRIORITIZE extraction of the specified focus concepts and all related concepts
2. Build a knowledge graph centered around these focus concepts
3. Extract supporting concepts that help understand the focus concepts
4. Include prerequisites, consequences, and related details of the focus concepts

Extraction Rules:
1. The FOCUS CONCEPTS provided by the user should be at depth_level 0 (Core)
2. Direct relationships and immediate details of focus concepts should be at depth_level 1 (Primary)
3. Supporting information and examples should be at depth_level 2-3
4. Extract 15-30 concepts total, ensuring comprehensive coverage of the focus areas
5. Every concept extracted should have a clear path connecting to at least one focus concept

Output Schema:
{
    "concepts": [
        {
            "id": "concept_id_snake_case",
            "label": "Human Readable Label",
            "description": "Brief description",
            "unit": "unit if variable",
            "min_value": 0,
            "max_value": 100,
            "default_value": 50,
            "abstraction_level": 5,
            "depth_level": 0,
            "category": "biology",
            "semantic_type": "variable",
            "parent_concepts": []
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
    "causal_sentences": ["exact sentence from text that mentions focus concepts"]
}
"""

TOPIC_GENERATION_PROMPT = """
You are an expert knowledge graph generator and educator. Your task is to generate a comprehensive knowledge graph about the topics the user wants to learn.

You must CREATE educational content from your knowledge - you are NOT analyzing existing text.

Generation Rules:
1. The user's TOPICS should become depth_level 0 (Core) concepts
2. Generate 20-35 concepts total covering:
   - The main topics (depth_level 0)
   - Key sub-topics and components (depth_level 1)  
   - Important details, examples, and applications (depth_level 2)
   - Specific facts, formulas, or granular details (depth_level 3)
3. Create meaningful relationships showing how concepts connect:
   - Cause-effect relationships
   - Part-whole relationships
   - Prerequisite relationships
   - Application relationships
4. Ensure the graph is educational and helps the user learn progressively
5. Include practical examples and real-world applications where relevant

Output Schema:
{
    "concepts": [
        {
            "id": "concept_id_snake_case",
            "label": "Human Readable Label",
            "description": "Clear educational description (2-3 sentences)",
            "unit": "unit if applicable (e.g., 'meters', 'seconds', '%')",
            "min_value": null,
            "max_value": null,
            "default_value": null,
            "abstraction_level": 5,
            "depth_level": 0,
            "category": "topic_category",
            "semantic_type": "variable" | "law" | "process" | "entity",
            "parent_concepts": []
        }
    ],
    "relationships": [
        {
            "source": "source_concept_id",
            "target": "target_concept_id",
            "type": "direct" | "inverse",
            "description": "Clear explanation of how these concepts relate",
            "equation": null,
            "coefficient": 1.0
        }
    ],
    "causal_sentences": []
}
"""


def analyze_text_with_llm(sentences: List[str], focus_concepts: List[str] = None) -> Dict[str, Any]:
    """
    Analyze text using Groq LLM to extract causal structure.
    If focus_concepts are provided, the extraction will be centered around those concepts.
    """
    global client
    if not client and settings.groq_api_key:
        client = Groq(api_key=settings.groq_api_key)

    if not client:
        print("Warning: Groq API key not found, falling back to mock")
        from services.mock_llm import analyze_text
        return analyze_text(sentences, focus_concepts)

    # Combine sentences into text block
    full_text = " ".join(sentences)

    # Truncate if too long (rough token estimation)
    if len(full_text) > 15000:
        full_text = full_text[:15000] + "..."

    model_name = "openai/gpt-oss-120b"  # Using a supported Groq model

    # Choose prompt based on whether focus concepts are provided or if it's a topic request
    if focus_concepts and len(focus_concepts) > 0:
        system_prompt = FOCUSED_SYSTEM_PROMPT
        focus_str = ", ".join(focus_concepts)
        user_message = f"""FOCUS CONCEPTS (these are what the user wants to learn):
{focus_str}

Analyze this text and extract a knowledge graph centered on the above focus concepts.
Return your response as a JSON object.

{full_text}"""
        print(
            f"Starting FOCUSED LLM analysis on {len(sentences)} sentences, focusing on: {focus_str}")

    elif len(sentences) < 3 or len(full_text) < 200:
        # Topic Generation Mode
        system_prompt = TOPIC_GENERATION_PROMPT
        user_message = f"""Generate a comprehensive knowledge graph about the following topic:
{full_text}

Return your response as a JSON object."""
        print(f"Starting TOPIC GENERATION for: {full_text}")

    else:
        system_prompt = SYSTEM_PROMPT
        user_message = f"Analyze this text and extract causal structure. Return your response as a JSON object.\n\n{full_text}"
        print(
            f"Starting LLM analysis on {len(sentences)} sentences ({len(full_text)} chars)")

    # Log the input text
    print("-" * 40 + " LLM INPUT TEXT " + "-" * 40)
    print(full_text[:500] + "..." if len(full_text) > 500 else full_text)
    print("-" * 96)

    @retry(
        retry=retry_if_exception_type(RateLimitError),
        wait=wait_exponential(multiplier=1, min=4, max=60),
        stop=stop_after_attempt(5)
    )
    def call_gemini_with_retry(messages, model, temperature, response_format):
        print("Calling Groq API...")
        return client.chat.completions.create(
            messages=messages,
            model=model,
            temperature=temperature,
            response_format=response_format
        )

    try:
        completion = call_gemini_with_retry(
            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": user_message
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

        print(
            f"Extraction results: {len(concepts)} concepts, {len(relationships)} relationships")

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


def generate_from_topics(topics: List[str]) -> Dict[str, Any]:
    """
    Generate a knowledge graph from topics without any source document.
    Uses LLM's knowledge to create educational content.
    """
    global client
    if not client and settings.groq_api_key:
        client = Groq(api_key=settings.groq_api_key)

    if not client:
        print("Warning: Groq API key not found, falling back to mock")
        from services.mock_llm import generate_mock_topics
        return generate_mock_topics(topics)

    model_name = "openai/gpt-oss-120b"
    topics_str = ", ".join(topics)

    user_message = f"""Generate a comprehensive knowledge graph for learning about these topics:

TOPICS: {topics_str}

Create an educational knowledge graph that will help someone learn and understand these topics thoroughly. Include:
- The main concepts as core nodes
- Prerequisites and foundational concepts
- Key sub-topics and components
- Real-world applications and examples
- Important relationships between concepts

Return your response as a valid JSON object following the schema in the system prompt."""

    print(f"Starting TOPIC GENERATION for: {topics_str}")

    @retry(
        retry=retry_if_exception_type(RateLimitError),
        wait=wait_exponential(multiplier=1, min=4, max=60),
        stop=stop_after_attempt(5)
    )
    def call_topic_gen_with_retry():
        print("Calling Groq API for topic generation...")
        return client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": TOPIC_GENERATION_PROMPT
                },
                {
                    "role": "user",
                    "content": user_message
                }
            ],
            model=model_name,
            temperature=0.3,
            response_format={"type": "json_object"}
        )

    try:
        completion = call_topic_gen_with_retry()

        response_content = completion.choices[0].message.content
        print(f"LLM Response received ({len(response_content)} chars)")

        # Log the raw response for debugging
        print("-" * 40 + " RAW LLM OUTPUT " + "-" * 40)
        print(response_content[:1000] +
              "..." if len(response_content) > 1000 else response_content)
        print("-" * 100)

        try:
            result = json.loads(response_content)
        except json.JSONDecodeError as je:
            print(f"JSON Parsing Error: {str(je)}")
            print(f"Invalid JSON Content: {response_content}")
            raise je

        concepts = result.get("concepts", [])
        relationships = result.get("relationships", [])

        print(
            f"Generation results: {len(concepts)} concepts, {len(relationships)} relationships")

        return {
            "concepts": concepts,
            "relationships": relationships,
            "causal_sentences": [],
            "total_sentences": 0,
            "causal_count": 0,
            "generated_from_topics": topics
        }

    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Topic Generation failed: {str(e)}")
        print(f"Detailed Traceback: {error_trace}")

        # Fallback to mock on error
        from services.mock_llm import generate_mock_topics
        return generate_mock_topics(topics)


def chat_with_context(context: str, message: str, history: List[Dict[str, str]] = None) -> str:
    """
    Chat with the LLM using provided context.
    """
    global client
    if not client and settings.groq_api_key:
        client = Groq(api_key=settings.groq_api_key)

    if not client:
        return "Error: AI service not available. Please check API key configuration."

    # Prepare messages
    messages = [
        {
            "role": "system",
            "content": f"""You are a helpful assistant analyzing a document. 
            Use the following context to answer the user's question. 
            If the answer is not in the context, say so politely.
            Keep answers concise and relevant to the specific concept being discussed.
            
            Context:
            {context}"""
        }
    ]

    # Add history
    if history:
        for msg in history:
            messages.append({"role": msg["role"], "content": msg["content"]})

    # Add current message
    messages.append({"role": "user", "content": message})

    model_name = "openai/gpt-oss-120b"

    print(
        f"Starting Chat with context ({len(context)} chars) - Query: {message}")

    @retry(
        retry=retry_if_exception_type(RateLimitError),
        wait=wait_exponential(multiplier=1, min=4, max=60),
        stop=stop_after_attempt(5)
    )
    def call_chat_with_retry():
        return client.chat.completions.create(
            messages=messages,
            model=model_name,
            temperature=0.7,
            max_tokens=1000
        )

    try:
        completion = call_chat_with_retry()

        response = completion.choices[0].message.content
        print(f"Chat Response: {response[:100]}...")
        return response

    except Exception as e:
        print(f"Chat failed: {str(e)}")
        return "I apologize, but I encountered an error determining the answer. Please try again."


def generate_chat_title(text_content: str) -> str:
    """
    Generate a short, concise 3-5 word title for a chat based on the document content or query.
    """
    global client
    if not client and settings.groq_api_key:
        client = Groq(api_key=settings.groq_api_key)

    if not client:
        return "New Chat"

    # Truncate content for title generation
    preview_text = text_content[:1000]

    try:
        completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant. Generate a very short, concise 3-5 word title for a chat that discusses the following text. Do not use quotes. Return ONLY the title."
                },
                {
                    "role": "user",
                    "content": f"Text: {preview_text}"
                }
            ],
            model="openai/gpt-oss-120b",
            temperature=0.5,
            max_tokens=20
        )

        title = completion.choices[0].message.content.strip().replace('"', '')
        return title

    except Exception as e:
        print(f"Title generation failed: {str(e)}")
        return "New Chat"


QUIZ_GENERATION_PROMPT = """
You are an expert educator and exam creator. Your task is to generate a challenging and educational multiple-choice quiz about specific concepts.

You will be provided with:
1. FOCUS CONCEPTS: The main topics to test.
2. CONTEXT: Excerpts from a source document (if available).
3. RELATIONSHIPS: Causal connections involving the concepts.

Generation Rules:
1. **Use Your Knowledge**: Do NOT limit yourself to the provided context. Use your own comprehensive knowledge about the concepts to create high-quality, accurate questions. The context is a starting point, but you should expand upon it.
2. **Question Count**: Generate exactly 10 questions.
3. **Difficulty**: Mix foundation questions with deeper conceptual questions that test understanding of causal relationships.
4. **Format**: Valid JSON matching the schema.
5. **Educational Value**: Each explanation should teach the user why the answer is correct and add extra context.

Output Schema:
{
    "questions": [
        {
            "question": "The question text",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_index": 0,
            "explanation": "Detailed explanation of the correct answer."
        }
    ]
}
"""

def generate_quiz(concept_label: str, context: str) -> Dict[str, Any]:
    """
    Generate a quiz for a specific concept using LLM knowledge + context.
    """
    global client
    if not client and settings.groq_api_key:
        client = Groq(api_key=settings.groq_api_key)

    if not client:
        # Fallback to mock if no client
        return {
            "questions": [
                {
                    "question": f"What is the primary characteristic of {concept_label}?",
                    "options": ["Is blue", "Is fast", "Is complex", "Is fundamental"],
                    "correct_index": 3,
                    "explanation": f"This is a mock question about {concept_label}."
                }
            ] * 10
        }

    user_message = f"""Generate a 10-question quiz about: {concept_label}

CONTEXT FROM DOCUMENT:
{context}

Remember to use your own knowledge to supplement this context and create a comprehensive quiz."""

    print(f"Starting Quiz Generation for: {concept_label}")

    try:
        completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": QUIZ_GENERATION_PROMPT
                },
                {
                    "role": "user",
                    "content": user_message
                }
            ],
            model="openai/gpt-oss-120b",
            temperature=0.4,
            response_format={"type": "json_object"}
        )

        response_content = completion.choices[0].message.content
        result = json.loads(response_content)
        return result


    except Exception as e:
        print(f"Quiz generation failed: {str(e)}")
        # Return empty/mock on failure to avoid crashing
        return {"questions": []}


FLASHCARD_GENERATION_PROMPT = """
You are an expert educator. Generate educational flashcards for studying a specific concept.

Generation Rules:
1. **Use Your Knowledge**: Use your comprehensive knowledge about the topic to create high-quality flashcards.
2. **Card Count**: Generate exactly 12 flashcards.
3. **Variety**: Mix different types of cards:
   - Definitions
   - Key facts
   - Cause-effect relationships
   - Examples
4. **Format**: Front should be a clear question or term. Back should be a concise but complete answer.

Output Schema:
{
    "cards": [
        {
            "front": "What is [term]?",
            "back": "Concise definition or explanation"
        }
    ]
}
"""

def generate_flashcards(concept_label: str, context: str) -> Dict[str, Any]:
    """
    Generate flashcards for a specific concept using LLM knowledge + context.
    """
    global client
    if not client and settings.groq_api_key:
        client = Groq(api_key=settings.groq_api_key)

    if not client:
        return {
            "cards": [
                {"front": f"What is {concept_label}?", "back": f"This is a mock flashcard about {concept_label}."}
            ] * 12
        }

    user_message = f"""Generate 12 flashcards about: {concept_label}

CONTEXT:
{context}

Use your own knowledge to supplement and create comprehensive flashcards.
Return your response as a JSON object with a "cards" array."""

    print(f"Starting Flashcard Generation for: {concept_label}")

    try:
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": FLASHCARD_GENERATION_PROMPT},
                {"role": "user", "content": user_message}
            ],
            model="openai/gpt-oss-120b",
            temperature=0.4,
            response_format={"type": "json_object"}
        )

        response_content = completion.choices[0].message.content
        result = json.loads(response_content)
        return result

    except Exception as e:
        print(f"Flashcard generation failed: {str(e)}")
        return {"cards": []}
