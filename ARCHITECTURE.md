# System Architecture & Documentation

## Overview

**GenZ Pulse** (Synapse) is an interactive knowledge exploration platform that transforms static text (PDFs or raw text) into dynamic, causal 3D knowledge graphs. It allows users to visualize relationships between concepts, simulate changes, and interact with the content through AI-driven chat and quizzes.

## Tech Stack

### Frontend

- **Framework:** React 19 (via Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4, Lucide React (Icons)
- **Visualization:**
  - **Three.js** (`@react-three/fiber`, `@react-three/drei`) for 3D graph rendering.
  - **D3.js** for force-directed layout algorithms and data calculations.
- **State Management:** React Context API + Local State.
- **Routing:** React Router v7.

### Backend

- **Framework:** FastAPI (Python)
- **Database:** MongoDB (AsyncIO via `motor`)
- **Authentication:** OAuth2 (Google) + JWT
- **AI/LLM Provider:** Groq API (High-performance inference)
- **PDF Processing:** `pdfplumber`
- **Key Libraries:** `pydantic`, `uvicorn`, `python-multipart`

## Application Architecture

### High-Level System Design

```mermaid
graph TD
    User[User] -->|Interact| Frontend[React Frontend]

    subgraph "Frontend Layer"
        Frontend -->|API Calls| API[FastAPI Backend]
        Frontend -->|3D Rendering| ThreeJS[Three.js Canvas]
    end

    subgraph "Backend Layer"
        API -->|Auth| Auth[Google OAuth / JWT]
        API -->|Data Access| DB[(MongoDB)]
        API -->|Inference| LLM_Service[LLM Service]
        API -->|Parse| PDF_Service[PDF Extractor]
    end

    subgraph "External Services"
        LLM_Service -->|Prompt| Groq[Groq API]
        Groq -->|JSON| LLM_Service
        Auth -->|Verify| Google[Google Identity]
    end
```

## Data Flow

### 1. Document Processing Pipeline

When a user uploads a PDF or pastes text, the following pipeline processes the data:

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant BE as Backend
    participant LLM as LLM Service (Groq)
    participant DB as MongoDB

    U->>FE: Upload PDF / Paste Text
    FE->>BE: POST /api/documents/upload
    BE->>BE: Extract Text (pdfplumber)
    BE->>LLM: JSON Extraction Prompt (Concepts/Relations)
    LLM->>BE: Structured JSON Response
    BE->>DB: Store Document
    BE->>DB: Store Concepts (Nodes)
    BE->>DB: Store Relationships (Edges)
    BE->>DB: Store Chunks (Vector/Text)
    BE-->>FE: Return Document ID & Graph Stats
```

### 2. Visualization & Interaction

Once processed, the user explores the data structure:

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant BE as Backend
    participant DB as MongoDB

    FE->>BE: GET /api/documents/{id}/graph
    BE->>DB: Fetch Concepts & Relationships
    DB-->>BE: Return Data
    BE-->>FE: Return GraphData (Nodes + Edges)
    FE->>FE: Calculate D3 Force Layout
    FE->>FE: Render 3D Scene (Three.js)

    Note over FE: User clicks a Node
    FE->>FE: Update UI State (Sidebar/Panel)
    FE->>BE: GET /api/simulations/{rel_id} (If simulating)
```

## Database Schema (MongoDB)

The application uses a document-oriented model with these primary collections:

```mermaid
erDiagram
    Document ||--|{ Concept : contains
    Document ||--|{ Relationship : contains
    Document ||--|{ Chunk : contains
    Document ||--|| Chat : has
    Concept ||--o{ Relationship : "source/target"
    Concept ||--o{ Quiz : generates
    Concept ||--o{ Flashcard : generates

    Document {
        ObjectId _id
        string title
        string raw_text
        bool processed
        datetime created_at
    }

    Concept {
        ObjectId _id
        ObjectId document_id
        string label
        string description
        string category
        float value
        int depth_level
    }

    Relationship {
        ObjectId _id
        ObjectId source_id
        ObjectId target_id
        string type
        string equation
        float coefficient
    }

    Chunk {
        ObjectId _id
        ObjectId document_id
        string text
        bool is_causal
    }
```

## Core Features Breakdown

### 1. **Causal Graph Generation**

- **Trigger:** Document upload or text paste.
- **Process:** The `llm_service.py` constructs a system prompt for the Groq API to strictly output JSON containing `concepts` (nodes) and `relationships` (edges). It specifically asks for properties like `depth_level` to handle hierarchical zooming (LOD) and `equation` coefficients for simulations.

### 2. **3D Interactive Graph (`ConceptGraph3D.tsx`)**

- **Rendering:** Uses `@react-three/fiber` to render nodes as spheres and edges as lines/arches.
- **Layout:** D3's force simulation runs in the background to calculate stable node positions based on connection density.
- **Parallax & Glow:** Custom shaders and post-processing effects create the "premium" aesthetic with glowing nodes and floating particles.

### 3. **Smart Chat (`ChatPanel.tsx`)**

- **Context:** When a user chats, the system pulls the relevant document context. If a specific node is selected, the context is prioritized around that concept.
- **LLM:** The backend (`chat.py` / `llm_service.py`) acts as an orchestrator, appending the retrieved context to the system prompt before sending the user's query to Groq.

### 4. **Simulations (`simulations.py`)**

- Allows users to change the value of a "Source" node.
- Validates the relationship equation (e.g., `Direct`, `Inverse`, or linear `$y = mx + b$`).
- Propagates changes to connected nodes to visualize "what-if" scenarios.

### 5. **Quiz & Flashcards**

- On-demand generation based on specific concepts.
- `quiz.py` sends the concept context to the LLM to generate 10 structured multiple-choice questions or flashcards.
