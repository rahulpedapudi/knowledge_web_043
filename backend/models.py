from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field
from bson import ObjectId


class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, handler):
        if isinstance(v, ObjectId):
            return str(v)
        return str(v)


# ============ Document Models ============

class DocumentBase(BaseModel):
    title: str
    source_type: Literal["pdf", "text"]
    raw_text: str


class DocumentCreate(DocumentBase):
    pass


class Document(DocumentBase):
    id: str = Field(alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    processed: bool = False

    class Config:
        populate_by_name = True


# ============ Chunk Models ============

class ChunkBase(BaseModel):
    document_id: str
    text: str
    sentence_index: int
    is_causal: bool = False


class Chunk(ChunkBase):
    id: str = Field(alias="_id")

    class Config:
        populate_by_name = True


# ============ Concept Models ============

class ConceptBase(BaseModel):
    document_id: str
    label: str
    description: Optional[str] = None
    unit: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    default_value: Optional[float] = None


class ConceptCreate(ConceptBase):
    pass


class Concept(ConceptBase):
    id: str = Field(alias="_id")

    class Config:
        populate_by_name = True


# ============ Relationship Models ============

class RelationshipBase(BaseModel):
    document_id: str
    source_concept_id: str
    target_concept_id: str
    relationship_type: Literal["direct", "inverse"]
    description: str
    equation: Optional[str] = None  # e.g., "y = 0.5 * x + 10"
    coefficient: float = 1.0  # Multiplier for simulation


class RelationshipCreate(RelationshipBase):
    pass


class Relationship(RelationshipBase):
    id: str = Field(alias="_id")

    class Config:
        populate_by_name = True


# ============ Graph Response Models ============

class ConceptNode(BaseModel):
    id: str
    label: str
    description: Optional[str] = None
    unit: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    default_value: Optional[float] = None


class RelationshipEdge(BaseModel):
    id: str
    source: str
    target: str
    relationship_type: Literal["direct", "inverse"]
    description: str
    equation: Optional[str] = None
    has_simulation: bool = True


class GraphData(BaseModel):
    concepts: list[ConceptNode]
    relationships: list[RelationshipEdge]


# ============ Simulation Models ============

class SimulationConfig(BaseModel):
    relationship_id: str
    source_concept: ConceptNode
    target_concept: ConceptNode
    relationship_type: Literal["direct", "inverse"]
    equation: Optional[str] = None
    coefficient: float = 1.0


class SimulationRequest(BaseModel):
    relationship_id: str
    input_value: float


class SimulationResult(BaseModel):
    input_value: float
    output_value: float
    relationship_type: Literal["direct", "inverse"]
    description: str


# ============ User/Auth Models ============

class UserCreate(BaseModel):
    email: str
    password: Optional[str] = None  # Optional for OAuth users
    name: str
    google_id: Optional[str] = None  # Google OAuth user ID


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime
    google_id: Optional[str] = None  # Include for OAuth users


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ============ Quiz Models ============

class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    correct_index: int
    explanation: str


class Quiz(BaseModel):
    id: str = Field(alias="_id")
    concept_id: str
    document_id: Optional[str] = None
    questions: list[QuizQuestion]
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True

# ============ Flashcard Models ============

class Flashcard(BaseModel):
    front: str  # Question or term
    back: str   # Answer or definition


class FlashcardSet(BaseModel):
    id: str = Field(alias="_id")
    concept_id: str
    document_id: Optional[str] = None
    cards: list[Flashcard]
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
