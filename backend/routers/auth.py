from fastapi import APIRouter, HTTPException, status
from datetime import datetime
from bson import ObjectId

from database import get_database
from models import UserCreate, UserLogin, UserResponse, TokenResponse
from auth import hash_password, verify_password, create_access_token

router = APIRouter()


@router.post("/signup", response_model=TokenResponse)
async def signup(user_data: UserCreate):
    """Register a new user."""
    db = get_database()
    
    # Check if email already exists
    existing_user = await db.users.find_one({"email": user_data.email.lower()})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Validate email format (basic)
    if "@" not in user_data.email or "." not in user_data.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )
    
    # Validate password length
    if len(user_data.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters"
        )
    
    # Create user document
    user_doc = {
        "email": user_data.email.lower(),
        "password_hash": hash_password(user_data.password),
        "name": user_data.name.strip(),
        "created_at": datetime.utcnow(),
    }
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    # Create access token
    access_token = create_access_token(data={"sub": user_id})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user_id,
            email=user_doc["email"],
            name=user_doc["name"],
            created_at=user_doc["created_at"]
        )
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Authenticate a user and return a token."""
    db = get_database()
    
    # Find user by email
    user = await db.users.find_one({"email": credentials.email.lower()})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    user_id = str(user["_id"])
    
    # Create access token
    access_token = create_access_token(data={"sub": user_id})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user_id,
            email=user["email"],
            name=user["name"],
            created_at=user["created_at"]
        )
    )


from fastapi import Depends
from auth import get_current_user_id


@router.get("/profile", response_model=UserResponse)
async def get_profile(user_id: str = Depends(get_current_user_id)):
    """Get the current authenticated user's profile."""
    db = get_database()
    
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user ID"
        )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        name=user["name"],
        created_at=user["created_at"]
    )
