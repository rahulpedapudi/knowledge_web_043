# Synapse - Technical Documentation

> **Synapse** is an AI-powered knowledge graph platform that transforms textbook content into interactive causal structures for enhanced learning.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Use Case Diagram](#use-case-diagram)
4. [Technology Stack](#technology-stack)
5. [Backend Architecture](#backend-architecture)
6. [Frontend Architecture](#frontend-architecture)
7. [Data Models](#data-models)
8. [API Reference](#api-reference)
9. [Authentication Flow](#authentication-flow)
10. [File Structure](#file-structure)

---

## Project Overview

**Synapse** is a full-stack educational platform that:
- Extracts causal relationships from PDF documents or pasted text
- Generates interactive 3D knowledge graphs
- Provides AI-powered contextual chat about concepts
- Generates quizzes and flashcards for learning reinforcement
- Simulates cause-effect relationships between concepts

---

## Architecture Diagram

```mermaid
flowchart TB
    subgraph Client["Frontend (React + Vite)"]
        UI["React Components"]
        AuthCtx["Auth Context"]
        API["Axios API Client"]
        Three["Three.js/React-Three-Fiber"]
        D3["D3.js Visualization"]
    end

    subgraph Server["Backend (FastAPI)"]
        Main["FastAPI App"]
        
        subgraph Routers["API Routers"]
            AuthR["Auth Router"]
            GoogleR["Google OAuth Router"]
            DocsR["Documents Router"]
            ChatR["Chat Router"]
            QuizR["Quiz Router"]
            SimR["Simulations Router"]
        end
        
        subgraph Services["Services"]
            LLM["LLM Service (Groq)"]
            PDF["PDF Extractor"]
            MockLLM["Mock LLM"]
        end
        
        AuthMod["Auth Module (JWT)"]
        Config["Config (Pydantic Settings)"]
    end

    subgraph External["External Services"]
        Groq["Groq API (LLM)"]
        MongoDB["MongoDB Atlas"]
        GoogleAuth["Google OAuth 2.0"]
    end

    UI --> API
    AuthCtx --> API
    API --> Main
    Three --> UI
    D3 --> UI
    
    Main --> Routers
    AuthR --> AuthMod
    GoogleR --> AuthMod
    GoogleR --> GoogleAuth
    DocsR --> LLM
    DocsR --> PDF
    ChatR --> LLM
    QuizR --> LLM
    SimR --> MockLLM
    
    LLM --> Groq
    Routers --> MongoDB
    AuthMod --> Config
```

---

## Use Case Diagram

```mermaid
flowchart LR
    subgraph Actors
        User((User))
        Guest((Guest))
    end

    subgraph Authentication["Authentication"]
        UC1["Sign Up with Email"]
        UC2["Login with Email"]
        UC3["Login with Google OAuth"]
        UC4["View Profile"]
        UC5["Logout"]
    end

    subgraph Document_Management["Document Management"]
        UC6["Upload PDF"]
        UC7["Paste Text"]
        UC8["Generate from Topics"]
        UC9["View Demo"]
        UC10["List My Documents"]
    end

    subgraph Knowledge_Graph["Knowledge Graph"]
        UC11["View 3D Knowledge Graph"]
        UC12["Click Node for Info"]
        UC13["Double-Click for Chat"]
        UC14["Explore Relationships"]
    end

    subgraph Learning_Tools["Learning Tools"]
        UC15["Chat with AI about Concept"]
        UC16["Generate Quiz"]
        UC17["Generate Flashcards"]
        UC18["Run Cause-Effect Simulation"]
    end

    subgraph Chat_History["Session Management"]
        UC19["View Chat History"]
        UC20["Resume Previous Session"]
        UC21["Delete Chat Session"]
    end

    Guest --> UC9
    User --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7
    User --> UC8
    User --> UC10
    User --> UC11
    User --> UC12
    User --> UC13
    User --> UC14
    User --> UC15
    User --> UC16
    User --> UC17
    User --> UC18
    User --> UC19
    User --> UC20
    User --> UC21
```

---

## Technology Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **FastAPI** | Web framework with async support |
| **Python 3.x** | Backend language |
| **Motor** | Async MongoDB driver |
| **Pydantic** | Data validation/settings |
| **PyJWT** | JWT authentication |
| **Groq API** | LLM inference (Llama models) |
| **PyMuPDF** | PDF text extraction |
| **Passlib + Bcrypt** | Password hashing |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 19** | UI framework |
| **Vite 7** | Build tool |
| **TypeScript** | Type-safe JavaScript |
| **Tailwind CSS 4** | Styling |
| **React-Three-Fiber** | 3D visualization |
| **D3.js** | Graph visualization |
| **Axios** | HTTP client |
| **React Router 7** | Client-side routing |
| **Lucide React** | Icons |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| **MongoDB Atlas** | Cloud database |
| **Google OAuth 2.0** | Social authentication |
| **Docker** | Containerization |
| **Vercel** | Frontend deployment |
| **Cloud Run** | Backend deployment |

---

## Backend Architecture

### Directory Structure
```
backend/
├── main.py              # FastAPI app entry point
├── config.py            # Pydantic settings configuration
├── database.py          # MongoDB connection (Motor)
├── models.py            # Pydantic data models
├── auth.py              # JWT authentication utilities
├── requirements.txt     # Python dependencies
├── Dockerfile           # Container configuration
├── routers/
│   ├── auth.py          # Email signup/login
│   ├── google_oauth.py  # Google OAuth flow
│   ├── documents.py     # Document upload/processing
│   ├── chat.py          # AI chat endpoint
│   ├── quiz.py          # Quiz & flashcard generation
│   └── simulations.py   # Cause-effect simulations
└── services/
    ├── llm_service.py   # Groq LLM integration
    ├── mock_llm.py      # Mock data & demo content
    └── pdf_extractor.py # PDF text extraction
```

### Core Modules

#### main.py
FastAPI application with:
- CORS middleware configuration
- MongoDB lifecycle management
- Router registration for all API endpoints
- Health check endpoint

#### config.py
Pydantic settings for:
- MongoDB connection (`MONGO_URI`, database name)
- JWT configuration (secret, algorithm, expiry)
- Groq API key
- Google OAuth credentials
- CORS origins

#### database.py
Async MongoDB connection using Motor driver with:
- Connection pooling
- Graceful shutdown handling

---

## Frontend Architecture

### Directory Structure
```
frontend/src/
├── App.tsx                  # Main app component with routing
├── main.tsx                 # React entry point
├── index.css                # Global styles
├── api/
│   └── client.ts            # Axios API client with auth interceptors
├── components/
│   ├── AuthPage.tsx         # Login/Signup forms
│   ├── GoogleCallback.tsx   # OAuth callback handler
│   ├── Sidebar.tsx          # Navigation sidebar
│   ├── DocumentUpload.tsx   # PDF/text upload interface
│   ├── KnowledgeGraphPage.tsx    # Main graph view
│   ├── ConceptGraph3D.tsx   # 3D Three.js graph
│   ├── EnhancedConceptGraph.tsx  # D3 2D graph
│   ├── ChatPanel.tsx        # AI chat interface
│   ├── RightPanel.tsx       # Info/exploration panel
│   ├── ExplorePanel.tsx     # Concept exploration
│   ├── SimulationPanel.tsx  # Cause-effect simulator
│   ├── QuizDialog.tsx       # Quiz interface
│   ├── FlashcardDialog.tsx  # Flashcard interface
│   └── ui/                  # Reusable UI components
├── context/
│   └── AuthContext.tsx      # Authentication state management
├── types/
│   └── index.ts             # TypeScript interfaces
└── lib/
    └── utils.ts             # Utility functions
```

---

## Data Models

### MongoDB Collections

```mermaid
erDiagram
    users {
        ObjectId _id PK
        string email UK
        string password_hash
        string name
        string google_id
        datetime created_at
    }
    
    documents {
        ObjectId _id PK
        string title
        string source_type
        string raw_text
        array focus_concepts
        boolean processed
        string user_id FK
    }
    
    concepts {
        ObjectId _id PK
        string document_id FK
        string label
        string description
        string unit
        float min_value
        float max_value
        float default_value
        int abstraction_level
        int depth_level
        string category
        string semantic_type
        array parent_concepts
    }
    
    relationships {
        ObjectId _id PK
        string document_id FK
        string source_concept_id FK
        string target_concept_id FK
        string relationship_type
        string description
        string equation
        float coefficient
    }
    
    chunks {
        ObjectId _id PK
        string document_id FK
        string text
        int sentence_index
        boolean is_causal
    }
    
    chats {
        ObjectId _id PK
        string document_id FK
        string title
        datetime created_at
        array messages
    }
    
    quizzes {
        ObjectId _id PK
        string concept_id FK
        string document_id FK
        array questions
        datetime created_at
    }
    
    flashcards {
        ObjectId _id PK
        string concept_id FK
        string document_id FK
        array cards
        datetime created_at
    }

    users ||--o{ documents : "owns"
    documents ||--o{ concepts : "contains"
    documents ||--o{ relationships : "contains"
    documents ||--o{ chunks : "contains"
    documents ||--o{ chats : "has"
    concepts ||--o{ relationships : "source_of"
    concepts ||--o{ relationships : "target_of"
    concepts ||--o{ quizzes : "tested_by"
    concepts ||--o{ flashcards : "studied_with"
```

---

## API Reference

### Authentication Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/auth/signup` | Register new user | No |
| `POST` | `/api/auth/login` | Email/password login | No |
| `GET` | `/api/auth/profile` | Get current user | Yes |
| `GET` | `/api/auth/google/login` | Get Google OAuth URL | No |
| `GET` | `/api/auth/google/callback` | Handle OAuth callback | No |

### Document Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/documents/upload` | Upload PDF | Yes |
| `POST` | `/api/documents/paste` | Submit pasted text | Yes |
| `POST` | `/api/documents/generate` | Generate from topics | Yes |
| `POST` | `/api/documents/demo` | Create demo document | Optional |
| `GET` | `/api/documents/` | List user's documents | Yes |
| `GET` | `/api/documents/{id}` | Get document details | Yes |
| `GET` | `/api/documents/{id}/graph` | Get knowledge graph | Yes |

### Chat Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/chat/message` | Send chat message | Yes |
| `GET` | `/api/chat/history` | Get chat sessions | Yes |
| `GET` | `/api/chat/{id}` | Get chat session | Yes |
| `DELETE` | `/api/chat/{id}` | Delete chat session | Yes |

### Quiz Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/quiz/generate` | Generate quiz for concept | Yes |
| `POST` | `/api/quiz/flashcards/generate` | Generate flashcards | Yes |

### Simulation Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/simulations/{relationship_id}` | Get simulation config | Yes |
| `POST` | `/api/simulations/calculate` | Calculate simulation | Yes |

---

## Authentication Flow

### Email Authentication
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as MongoDB

    U->>F: Enter email/password
    F->>B: POST /api/auth/signup (or /login)
    B->>B: Hash password (bcrypt)
    B->>DB: Save/verify user
    DB-->>B: User data
    B->>B: Generate JWT token
    B-->>F: {access_token, user}
    F->>F: Store token in localStorage
    F-->>U: Redirect to dashboard
```

### Google OAuth
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant G as Google
    participant DB as MongoDB

    U->>F: Click "Sign in with Google"
    F->>B: GET /api/auth/google/login
    B-->>F: Google OAuth URL
    F->>G: Redirect to Google consent
    U->>G: Authorize app
    G-->>B: Callback with auth code
    B->>G: Exchange code for tokens
    G-->>B: User info + tokens
    B->>DB: Create/update user
    B->>B: Generate JWT token
    B-->>F: Redirect with token in URL
    F->>F: Extract and store token
    F-->>U: Show dashboard
```

---

## File Structure

```
knowledge_web_043/
├── .env                     # Environment variables
├── .gitignore               # Git ignore rules
├── README.md                # Project readme
├── ARCHITECTURE.md          # Architecture docs
├── DEPLOYMENT.md            # Deployment guide
├── VERCEL_DEPLOYMENT.md     # Vercel-specific guide
│
├── backend/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Settings configuration
│   ├── database.py          # MongoDB connection
│   ├── models.py            # Pydantic models
│   ├── auth.py              # JWT auth utilities
│   ├── requirements.txt     # Python dependencies
│   ├── Dockerfile           # Backend container
│   ├── routers/             # API route handlers
│   └── services/            # Business logic
│
└── frontend/
    ├── index.html           # HTML entry
    ├── package.json         # Node dependencies
    ├── vite.config.ts       # Vite configuration
    ├── tsconfig.json        # TypeScript config
    ├── vercel.json          # Vercel deployment
    ├── Dockerfile           # Frontend container
    └── src/                 # React source code
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URI` | MongoDB connection string | Yes |
| `JWT_SECRET_KEY` | Secret for JWT signing | Yes |
| `GROQ_API_KEY` | Groq API key for LLM | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | Yes |
| `GOOGLE_REDIRECT_URI` | OAuth callback URL | Yes |
| `CORS_ORIGINS` | Allowed frontend origins | Yes |
| `FRONTEND_URL` | Frontend URL for redirects | Yes |

---

## Running Locally

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Access the application at `http://localhost:5173`

---

*Documentation generated on 2026-01-24*
