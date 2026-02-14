# Project Requirements: Synapse

## 1. Introduction

Synapse is an intelligent learning platform designed to transform static educational content (textbooks, PDFs) into interactive and dynamic learning experiences. By leveraging AI, it extracts concepts and relationships to generate knowledge graphs, quizzes, flashcards, and simulations.

---

## 2. Functional Requirements

### 2.1 User Authentication

* **Registration:** Users shall be able to create an account using email and password.
* **Login:** Users shall be able to log in using email/password.
* **OAuth:** Users shall be able to sign in using their Google account.
* **Session Management:** The system shall maintain user sessions using JWT tokens stored securely.

### 2.2 Document Management

* **PDF Upload:** Users shall be able to upload PDF documents (e.g., textbooks).
* **Text Input:** Users shall be able to paste raw text for analysis.
* **Document List:** Users shall be able to view a list of uploaded/generated documents.
* **Document Details:** Users shall be able to view metadata and processing status.

### 2.3 Knowledge Extraction & Processing

* **Text Extraction:** The system shall extract text from uploaded PDFs.
* **AI Analysis:** The system shall use an LLM (Groq) to identify:

  * Concepts (key terms, definitions, units, and values)
  * Relationships (causal links, equations)
* **Chunking:** Documents shall be split into manageable chunks for processing and retrieval.

### 2.4 Data Visualization (Knowledge Graph)

* **3D Visualization:** Concepts and relationships shall be displayed as a 3D interactive graph.
* **Node Details:** Clicking a node shall display detailed properties (description, unit, etc.).
* **Edge Details:** Clicking an edge shall display relationship details (direct/inverse, equations).

### 2.5 Learning Tools

* **Chat Interface:** Users shall be able to chat with an AI assistant using document context (RAG).
* **Flashcards:** The system shall automatically generate flashcards from document content.
* **Quizzes:** The system shall generate multiple-choice quizzes.
* **Simulations:**

  * The system shall identify mathematical relationships between concepts.
  * Users shall be able to adjust variables (sliders/inputs) to observe real-time effects.

---

## 3. Non-Functional Requirements

### 3.1 Performance

* Graph rendering and interactions should remain smooth (target ~60 FPS).
* Large PDF files should upload without timing out (processing may be asynchronous).

### 3.2 Security

* User documents must remain private and accessible only to the uploader.
* Passwords must be hashed securely.
* OAuth and JWT tokens must be handled securely.

### 3.3 Usability

* UI/UX should be modern, intuitive, and responsive.
* Navigation between dashboard, graph view, and learning tools should be seamless.

### 3.4 Technology Constraints

* **Frontend:** React, TypeScript, Three.js
* **Backend:** Python (FastAPI)
* **Database:** MongoDB
* **AI Service:** Groq API

---

## 4. System Prerequisites

Before running the application, ensure the following:

* **Node.js:** Version 18.0.0 or higher
* **Python:** Version 3.10 or higher
* **Database:** MongoDB (Local v5.0+ or Atlas Cloud)

---

## 5. Backend Dependencies (Python)

### Framework & Server

* fastapi
* uvicorn[standard]

### Database

* motor (Async MongoDB driver)

### AI & LLM

* groq

### Authentication & Security

* authlib
* python-jose
* passlib

### Data Processing

* pdfplumber (PDF extraction)

---

## 6. Frontend Dependencies (Node / React)

### Core

* react (v19)
* vite

### Visualization

* three
* @react-three/fiber
* @react-three/drei
* react-force-graph

### Styling

* tailwindcss

### API Client

* axios

---

## 7. Environment Variables

### Backend (`/backend/.env`)

* `MONGO_URI` — MongoDB connection string
* `DATABASE_NAME` — Database name (e.g., synapse)
* `GROQ_API_KEY` — API key for Groq LLM
* `GOOGLE_CLIENT_ID` — OAuth client ID
* `GOOGLE_CLIENT_SECRET` — OAuth secret
* `SECRET_KEY` — JWT signing key

### Frontend (`/frontend/.env`)

* `VITE_API_URL` — Backend API URL (default: http://localhost:8000)
* `VITE_GOOGLE_CLIENT_ID` — Public Google OAuth client ID

---

## 8. Current Implementation Scope

### 8.1 Authentication

* Email/password authentication and Google OAuth.
* JWT-based session handling.

### 8.2 Document Processing

* PDF upload support with text extraction.
* Processing pipeline: Upload → Extraction → Chunking → LLM Analysis.

### 8.3 Knowledge Visualization

* 3D force-directed graph visualization.
* Nodes represent concepts; edges represent relationships.

### 8.4 AI Features

* RAG-based chat using Groq.
* Simulation logic for dynamic relationship updates.
