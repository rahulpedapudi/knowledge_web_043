# Google Cloud Run Deployment Guide

## Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed and authenticated
- Docker installed locally (for testing)
- Project ID from Google Cloud Console

## Environment Setup

### 1. Update Your `.env` File

Copy `.env.example` to `.env` and fill in all required values:

```bash
cd backend
cp .env.example .env
```

**Required environment variables:**

- `MONGO_URI` - Your MongoDB connection string
- `JWT_SECRET_KEY` - Generate with: `openssl rand -hex 32`
- `GROQ_API_KEY` - From Groq console
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- `GOOGLE_REDIRECT_URI` - Your backend URL + `/api/auth/google/callback`
- `CORS_ORIGINS` - Comma-separated list of frontend URLs
- `FRONTEND_URL` - Your primary frontend URL

### 2. Configure Google Cloud Project

```bash
# Set your project ID
export PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

## Building and Deploying

### Local Testing (Optional)

Test the Docker image locally before deploying:

```bash
# Build the image
docker build -t synapse-backend ./backend

# Run locally with .env file
docker run -p 8080:8080 --env-file backend/.env synapse-backend

# Test the health endpoint
curl http://localhost:8080/health
```

### Deploy to Cloud Run

#### Option 1: Direct Deploy (Easiest)

```bash
cd backend

gcloud run deploy synapse-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "DATABASE_NAME=genzpulse" \
  --set-env-vars "JWT_ALGORITHM=HS256" \
  --set-env-vars "API_HOST=0.0.0.0" \
  --memory 1Gi \
  --timeout 120
```

**Note:** Don't set secrets as env vars! Use the Cloud Console or gcloud to set secrets after initial deployment.

#### Option 2: Build and Push to Artifact Registry

```bash
# Set variables
export REGION=us-central1
export REPO_NAME=cloud-run-source-deploy

# Build and submit
cd backend
gcloud builds submit --tag gcr.io/$PROJECT_ID/synapse-backend

# Deploy
gcloud run deploy synapse-backend \
  --image gcr.io/$PROJECT_ID/synapse-backend \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 1Gi \
  --timeout 120
```

### Setting Environment Variables

After the initial deployment, set your environment variables:

```bash
# Set secrets using Cloud Run secrets (RECOMMENDED)
gcloud run services update synapse-backend \
  --region us-central1 \
  --update-secrets=MONGO_URI=mongo_uri:latest,\
JWT_SECRET_KEY=jwt_secret:latest,\
GROQ_API_KEY=groq_key:latest,\
GOOGLE_CLIENT_SECRET=google_secret:latest

# Set non-sensitive env vars
gcloud run services update synapse-backend \
  --region us-central1 \
  --set-env-vars "GOOGLE_CLIENT_ID=your-client-id" \
  --set-env-vars "GOOGLE_REDIRECT_URI=https://your-backend-url.run.app/api/auth/google/callback" \
  --set-env-vars "CORS_ORIGINS=https://your-frontend.app,https://www.your-frontend.app" \
  --set-env-vars "FRONTEND_URL=https://your-frontend.app"
```

### Create Secrets (First Time Only)

```bash
# Create secrets from your local .env values
echo -n "your-mongo-uri" | gcloud secrets create mongo_uri --data-file=-
echo -n "your-jwt-secret" | gcloud secrets create jwt_secret --data-file=-
echo -n "your-groq-key" | gcloud secrets create groq_key --data-file=-
echo -n "your-google-secret" | gcloud secrets create google_secret --data-file=-

# Grant Cloud Run service account access to secrets
gcloud secrets add-iam-policy-binding mongo_uri \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Repeat for other secrets...
```

## Verification

```bash
# Get your service URL
gcloud run services describe synapse-backend \
  --region us-central1 \
  --format="value(status.url)"

# Test the health endpoint
curl https://your-backend-url.run.app/health

# Expected output: {"status":"healthy"}
```

## Monitoring and Logs

```bash
# View logs
gcloud run services logs read synapse-backend --region us-central1

# View logs in real-time
gcloud run services logs tail synapse-backend --region us-central1
```

## Updating the Deployment

```bash
# After making code changes, redeploy:
cd backend
gcloud run deploy synapse-backend --source .
```

## Troubleshooting

### Check container logs

```bash
gcloud run services logs read --limit=50
```

### Common issues:

1. **503 errors**: Usually means the container failed to start. Check logs for startup errors.
2. **Missing env vars**: Cloud Run will show validation errors if required env vars are missing.
3. **CORS errors**: Make sure `CORS_ORIGINS` includes your frontend URL with the correct protocol (https).
4. **OAuth redirect issues**: Ensure `GOOGLE_REDIRECT_URI` matches exactly what's configured in Google Cloud Console.

## Cost Optimization

Cloud Run charges based on:

- CPU and memory usage during request handling
- Number of requests
- Egress (outbound bandwidth)

To minimize costs:

- Use `--min-instances 0` (default) to scale to zero when idle
- Set appropriate `--memory` and `--cpu` limits
- Enable CPU throttling: `--cpu-throttling` (default)

## Security Checklist

- ✓ Secrets stored in Secret Manager (not env vars)
- ✓ HTTPS only (Cloud Run enforces this)
- ✓ CORS configured for specific origins
- ✓ Container runs as non-root user
- ✓ JWT keys are strong and rotated periodically
- ✓ MongoDB connection uses TLS
