"""
Google OAuth 2.0 authentication router.
Handles OAuth flow: login initiation and callback handling.
"""

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from datetime import datetime
from bson import ObjectId

from config import get_settings
from database import get_database
from models import UserResponse, TokenResponse
from auth import create_access_token

settings = get_settings()
router = APIRouter()

# Initialize OAuth
oauth = OAuth()
oauth.register(
    name='google',
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)


@router.get("/google/login")
async def google_login():
    """
    Initiate Google OAuth flow.
    Redirects user to Google's OAuth consent screen.
    """
    if not settings.google_client_id or settings.google_client_id == "your-google-client-id-here":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file."
        )

    import urllib.parse

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent"
    }

    authorization_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params)}"

    return {"url": authorization_url}


@router.get("/google/callback/")
@router.get("/google/callback")
async def google_callback(
    code: str = None,
    error: str = None,
    scope: str = None,
    authuser: str = None,
    prompt: str = None
):
    """
    Handle Google OAuth callback.
    Exchange authorization code for tokens and user info.
    Creates or updates user in database.
    """
    print(
        f"OAuth Callback received - code: {code[:20] if code else 'None'}..., error: {error}")

    if error:
        # User denied access or other error
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth error: {error}"
        )

    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization code not provided"
        )

    try:
        # Exchange code for tokens
        import httpx

        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "code": code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": settings.google_redirect_uri,
            "grant_type": "authorization_code"
        }

        async with httpx.AsyncClient() as client:
            token_response = await client.post(token_url, data=token_data)
            token_response.raise_for_status()
            tokens = token_response.json()

            # Get user info
            userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
            headers = {"Authorization": f"Bearer {tokens['access_token']}"}
            userinfo_response = await client.get(userinfo_url, headers=headers)
            userinfo_response.raise_for_status()
            user_info = userinfo_response.json()

        # Extract user data
        google_id = user_info.get("id")
        email = user_info.get("email")
        name = user_info.get("name", email.split("@")[0])

        if not google_id or not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user information from Google"
            )

        # Create or update user in database
        db = get_database()

        # Check if user exists (by email or google_id)
        existing_user = await db.users.find_one({
            "$or": [
                {"email": email.lower()},
                {"google_id": google_id}
            ]
        })

        if existing_user:
            # Update existing user with google_id if not set
            if not existing_user.get("google_id"):
                await db.users.update_one(
                    {"_id": existing_user["_id"]},
                    {"$set": {"google_id": google_id}}
                )

            user_id = str(existing_user["_id"])
            user_doc = existing_user
        else:
            # Create new user
            user_doc = {
                "email": email.lower(),
                "name": name,
                "google_id": google_id,
                "created_at": datetime.utcnow(),
            }

            result = await db.users.insert_one(user_doc)
            user_id = str(result.inserted_id)

        # Create access token
        access_token = create_access_token(data={"sub": user_id})

        # Redirect to frontend with token
        frontend_url = settings.cors_origins[0] if settings.cors_origins else "http://localhost:5173"
        redirect_url = f"{frontend_url}/auth/callback?token={access_token}"

        return RedirectResponse(url=redirect_url)

    except httpx.HTTPError as e:
        # Log the actual error response for debugging
        error_detail = f"Failed to exchange authorization code: {str(e)}"
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_body = e.response.json()
                error_detail += f" - Error from Google: {error_body}"
            except:
                error_detail += f" - Response text: {e.response.text}"

        print(f"OAuth Error: {error_detail}")  # Print to server logs

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_detail
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OAuth authentication failed: {str(e)}"
        )
