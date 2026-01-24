# Frontend Deployment to Vercel

## Prerequisites

- Vercel account (free tier works fine)
- Vercel CLI installed (optional): `npm i -g vercel`
- Backend deployed to Cloud Run (get the URL)

## Quick Deploy (Recommended)

### 1. Connect to Vercel (Web UI)

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository: `rahulpedapudi/knowledge_web_043`
4. Select the `frontend` directory as the root directory
5. Vercel will auto-detect Vite settings

### 2. Configure Environment Variables

In Vercel project settings, add this environment variable:

**Variable Name:** `VITE_API_URL`  
**Value:** `https://your-backend-url.a.run.app` (your Cloud Run backend URL)

> ⚠️ **Important:** Remove the trailing `/api` - just use the base backend URL

### 3. Deploy

Click "Deploy" - Vercel will:

- Install dependencies
- Build your app with the API URL
- Deploy to a global CDN
- Give you a URL like `https://your-app.vercel.app`

## Deploy via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (from frontend directory)
cd frontend
vercel

# Set environment variable
vercel env add VITE_API_URL production
# Enter your backend URL when prompted

# Deploy to production
vercel --prod
```

## Environment Variables

| Variable       | Value                           | Notes                                       |
| -------------- | ------------------------------- | ------------------------------------------- |
| `VITE_API_URL` | `https://backend-url.a.run.app` | Your Cloud Run backend URL (without `/api`) |

## After Deployment

### 1. Update Backend CORS

Your backend needs to allow your Vercel domain. Update Cloud Run env vars:

```bash
gcloud run services update synapse-backend \
  --region asia-south1 \
  --set-env-vars "CORS_ORIGINS=https://your-app.vercel.app,https://your-app-git-main.vercel.app" \
  --set-env-vars "FRONTEND_URL=https://your-app.vercel.app"
```

### 2. Update Google OAuth

In Google Cloud Console, add your Vercel URL to:

- Authorized JavaScript origins: `https://your-app.vercel.app`
- Authorized redirect URIs: `https://your-app.vercel.app/auth/callback`

### 3. Test Your Deployment

1. Visit your Vercel URL
2. Try logging in with Google
3. Upload a document
4. Verify the graph loads

## Custom Domain (Optional)

1. In Vercel project settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update CORS and OAuth settings with new domain

## Troubleshooting

### API calls failing

**Check:**

- `VITE_API_URL` is set correctly in Vercel
- Backend CORS includes your Vercel URL
- Backend is actually running (visit `/health` endpoint)

### OAuth not working

**Check:**

- Vercel URL added to Google OAuth authorized origins
- `FRONTEND_URL` set correctly on backend
- `GOOGLE_REDIRECT_URI` matches your backend URL

### Build failing

**Check:**

- All dependencies in `package.json`
- No TypeScript errors: `npm run build` locally
- Node version compatible (Vercel uses Node 18+ by default)

## Automatic Deployments

Vercel automatically deploys:

- **Production**: Every push to `main` branch
- **Preview**: Every pull request

Each gets its own URL for testing!

## Monitoring

View deployment logs and analytics in Vercel dashboard:

- Build logs
- Runtime logs
- Traffic analytics
- Performance insights
