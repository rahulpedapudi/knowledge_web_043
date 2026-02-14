# System Design: Synapse

## 1. High-Level Architecture
Synapse follows a client-server architecture with a clear separation of concerns.

- **Frontend (Client)**: A Single Page Application (SPA) built with React and TypeScript, responsible for the user interface, 3D visualizations, and user interactions.
- **Backend (Server)**: A RESTful API built with FastAPI (Python), responsible for business logic, data processing, AI integration, and database management.
- **Database**: MongoDB for storing unstructured data (documents, graph structures, user data).
- **AI Service**: Groq API for Large Language Model capabilities (text analysis, chat, content generation).

## 2. Component Design

### 2.1 Frontend Components
The frontend is structured using a component-based architecture.

| Component | Responsibility |
|-----------|----------------|
| `App.tsx` | Main application container and routing logic. |
| `Sidebar` | Navigation menu for accessing different modules (Upload, Graph, etc.). |
| `DocumentUpload` | Handles file selection and upload progress. |
| `KnowledgeGraphPage` | The core view, orchestrating the 3D graph and side panels. |
| `ConceptGraph3D` | Renders the 3D force-directed graph using `react-force-graph-3d` or Three.js. |
| `ChatPanel` | UI for the AI chat interface. |
| `ExplorePanel` | detailed view for selected nodes/concepts. |
| `SimulationPanel` | Interface for running simulations on identified relationships. |
| `QuizDialog` / `FlashcardDialog` | Modals for learning activities. |

### 2.2 Backend Modules
The backend is organized by feature set (Routers).

| Module | Responsibility |
|--------|----------------|
| `main.py` | App entry point, middleware (CORS), and exception handling. |
| `routers/documents.py` | endpoints for uploading PDFs, processing text, and retrieving graph data. |
| `routers/chat.py` | Endpoints for the chat interface, handling context retrieval and LLM prompting. |
| `routers/simulations.py` | Logic for calculating simulation results based on relationship equations. |
| `routers/auth.py` | Handles user registration, login, and JWT token issuance. |
| `services/llm_service.py` | Abstraction layer for interacting with the Groq API. |
| `services/pdf_extractor.py` | Utility for extracting clean text from PDF files. |

## 3. Data Model (MongoDB Schema)

### 3.1 Collections
- **`users`**: Stores user credentials and profile info.
- **`documents`**: Metadata for uploaded files (title, raw_text, status).
- **`chunks`**: Text segments for granular retrieval and analysis.
- **`concepts` (Nodes)**:
  - `label`: Name of the concept.
  - `description`: Definition.
  - `min_value`, `max_value`, `unit`: For simulations.
  - `document_id`: Reference to parent document.
- **`relationships` (Edges)**:
  - `source_concept_id`: Reference to start node.
  - `target_concept_id`: Reference to end node.
  - `type`: "direct", "inverse", etc.
  - `equation`: Mathematical representation (if applicable).
  - `coefficient`: Strength of relationship.

## 4. Key Workflows

### 4.1 Document Processing
1. User uploads PDF.
2. Backend streams file to `pdf_extractor` to get text.
3. Text is sent to `llm_service` with a prompt to extract "Concepts" and "Causal Relationships".
4. Extracted data is structured and saved to `concepts` and `relationships` collections.
5. `documents` status is updated to "processed".

### 4.2 Simulation Logic
1. User selects a relationship edge in the graph.
2. Frontend requests simulation config for that edge.
3. User adjusts an input slider (e.g., "Increase Interest Rate").
4. Backend receives `input_value` and `relationship_id`.
5. Backend applies the stored `equation` or logic (e.g., `Output = Input * Coefficient`).
6. Result is returned and Frontend updates the target node visually.

## 5. Deployment
- **Containerization**: Dockerfiles for both Frontend and Backend.
- **Orchestration**: Docker Compose (implied for local dev).
- **Environment**: Configuration via `.env` files.
