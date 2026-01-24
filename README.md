# Synapse

An intelligent learning platform that transforms textbook content into interactive knowledge graphs, flashcards, quizzes, and simulations using AI-powered analysis.

## 🌟 Features

- **Document Upload & Processing**: Upload PDF textbooks and automatically extract structured knowledge
- **Interactive Knowledge Graphs**: Visualize concepts and their relationships in 2D and 3D
- **AI-Powered Chat**: Discuss concepts and ask questions about uploaded documents
- **Flashcards**: Auto-generated flashcards for efficient learning
- **Quizzes**: Interactive quizzes to test understanding
- **Simulations**: Explore concepts through interactive simulations
- **Google OAuth**: Secure authentication with Google Sign-In
- **Document Management**: Upload, view, and manage multiple documents

## 🏗️ Architecture

This is a full-stack application with:

- **Frontend**: React + TypeScript + Vite + Three.js for 3D visualizations
- **Backend**: FastAPI (Python) with MongoDB for data storage
- **AI**: Integration with Groq LLM for intelligent content analysis

## 📁 Project Structure

```
GENZPULSE/
├── frontend/               # React + TypeScript frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── context/       # React context providers
│   │   ├── api/           # API client
│   │   └── types/         # TypeScript types
│   └── package.json
│
├── backend/               # FastAPI backend
│   ├── routers/          # API route handlers
│   ├── services/         # Business logic services
│   ├── main.py           # Application entry point
│   ├── models.py         # Data models
│   ├── database.py       # MongoDB connection
│   └── requirements.txt
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- MongoDB (local or cloud instance)
- Groq API key (for LLM features)
- Google OAuth credentials (for authentication)

### Environment Variables

Create a `.env` file in the `backend/` directory:

```env
MONGO_URI=mongodb://localhost:27017
DATABASE_NAME=synapse
GROQ_API_KEY=your_groq_api_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FRONTEND_URL=http://localhost:5173
SECRET_KEY=your_secret_key_for_jwt
```

Create a `.env` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 🐳 Docker Deployment

Both frontend and backend include Dockerfiles for containerized deployment.

### Backend Docker

```bash
cd backend
docker build -t genzpulse-backend .
docker run -p 8000:8000 --env-file .env genzpulse-backend
```

### Frontend Docker

```bash
cd frontend
docker build -t genzpulse-frontend .
docker run -p 80:80 genzpulse-frontend
```

## 📚 API Documentation

Once the backend is running, visit:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Key API Endpoints

- `POST /api/documents/upload` - Upload a PDF document
- `GET /api/documents/` - List all documents
- `GET /api/documents/{id}` - Get document details
- `POST /api/chat/` - Send a chat message
- `GET /api/quiz/generate/{document_id}` - Generate quiz
- `POST /api/simulations/generate` - Generate simulation
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/google/login` - Google OAuth login

## 🛠️ Technology Stack

### Frontend

- React 19
- TypeScript
- Vite
- Three.js & React Three Fiber (3D visualizations)
- D3.js (2D visualizations)
- Tailwind CSS
- Radix UI
- Axios
- React Router

### Backend

- FastAPI
- Motor (async MongoDB driver)
- PDFPlumber (PDF processing)
- Groq (LLM integration)
- Authlib (OAuth)
- Pydantic (data validation)
- Python-JOSE (JWT tokens)
- Passlib (password hashing)

### Database

- MongoDB

## 🔐 Authentication

The application supports two authentication methods:

1. **Email/Password**: Traditional registration and login
2. **Google OAuth**: Sign in with Google account

Authentication uses JWT tokens stored in localStorage.

## 📖 Usage

1. **Sign In**: Create an account or sign in with Google
2. **Upload Document**: Upload a PDF textbook or educational material
3. **Explore**: View the generated knowledge graph
4. **Learn**: Use flashcards, quizzes, and simulations
5. **Chat**: Ask questions about the content using AI chat

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues or questions, please open an issue on the GitHub repository.

---