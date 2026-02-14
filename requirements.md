# Project Requirements: Synapse

## 1. Introduction
Synapse is an intelligent learning platform designed to transform static educational content (textbooks, PDFs) into interactive, dynamic learning experiences. By leveraging AI, it extracts concepts and relationships to create knowledge graphs, quizzes, flashcards, and simulations.

## 2. Functional Requirements

### 2.1 User Authentication
- **Registration**: Users shall be able to create an account using email and password.
- **Login**: Users shall be able to log in using email/password.
- **OAuth**: Users shall be able to sign in using their Google account.
- **Session Management**: The system shall maintain user sessions using JWT tokens stored securely.

### 2.2 Document Management
- **PDF Upload**: Users shall be able to upload PDF documents (e.g., textbooks).
- **Text Input**: Users shall be able to paste raw text for analysis.
- **Document List**: Users shall be able to view a list of their uploaded/generated documents.
- **Document Details**: Users shall be able to view metadata and status of processed documents.

### 2.3 Knowledge Extraction & processing
- **Text Extraction**: The system shall extract text from uploaded PDFs.
- **AI Analysis**: The system shall use an LLM (Groq) to analyze text and identify:
  - **Concepts**: Key terms, definitions, units, and values.
  - **Relationships**: Connections between concepts, including causal links and equations.
- **Chunking**: The system shall break down documents into manageable chunks for processing and retrieval.

### 2.4 Data Visualization (Knowledge Graph)
- **3D Visualization**: The system shall visualize concepts and relationships as a 3D interactive graph.
- **Node Details**: Clicking a node (concept) shall display its detailed properties (description, unit, etc.).
- **Edge Details**: Clicking an edge (relationship) shall display the nature of the connection (direct/inverse, equations).

### 2.5 Learning Tools
- **Chat Interface**: Users shall be able to chat with an AI assistant that has context of the specific document (RAG).
- **Flashcards**: The system shall automatically generate flashcards for review based on the document content.
- **Quizzes**: The system shall generate multiple-choice quizzes to test user understanding of concepts.
- **Simulations**:
  - The system shall identify mathematical relationships between concepts.
  - Users shall be able to interact with variables (sliders/inputs) to see how changes affect related concepts in real-time.

## 3. Non-Functional Requirements

### 3.1 Performance
- **Response Time**: Graph rendering and interactions should be smooth (target 60fps for 3D).
- **Scalability**: The system should handle large PDF files without timing out during upload (though processing may be asynchronous).

### 3.2 Security
- **Data Privacy**: User documents should be private and accessible only to the uploader.
- **Authentication**: Passwords must be hashed. OAuth tokens must be handled securely.

### 3.3 Usability
- **Interface**: The UI/UX should be modern, intuitive, and responsive (using Glassmorphism/premium aesthetic).
- **Navigation**: Easy transition between the dashboard, graph view, and learning tools.

### 3.4 Technology Constraints
- **Frontend**: React, TypeScript, Three.js.
- **Backend**: Python (FastAPI).
- **Database**: MongoDB.
- **AI**: Groq API.
