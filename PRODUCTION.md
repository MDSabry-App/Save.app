# Production Deployment Setup

## 1. Database Setup

### PostgreSQL (Cloud)
```bash
# Option A: Neon (Serverless PostgreSQL)
# Visit: https://neon.tech
# Create project → Get connection string

# Option B: Supabase
# Visit: https://supabase.com
# Create project → Connection string (Pooler mode recommended)

# Option C: Railway/Render
# Visit: https://railway.app or https://render.com
# Add PostgreSQL service → Get DATABASE_URL
```

## 2. Backend Deployment

### Railway Deployment
```bash
# 1. Login
railway login

# 2. Create project
railway init

# 3. Add variables
railway vars set DATABASE_URL="postgresql://..."
railway vars set JWT_SECRET="..."
railway vars set FRONTEND_URL="https://yourapp.vercel.app"
railway vars set NODE_ENV="production"

# 4. Deploy
railway up
```

### Render Deployment
1. **New Web Service** → Connect your GitHub repo
2. **Environment Variables:**
   ```
   DATABASE_URL=postgresql://...
   JWT_SECRET=...
   FRONTEND_URL=https://yourapp.vercel.app
   NODE_ENV=production
   ```
3. **Build Command:** `npm run build`
4. **Start Command:** `npm run start`

## 3. Frontend Deployment

### Vercel Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Set environment variable
vercel env add VITE_API_URL production "https://your-backend.onrender.com"
```

### Netlify Deployment
```bash
# Deploy via Netlify CLI
netlify login
netlify deploy --prod --dir=dist

# Set environment variable via UI
# Site settings → Build & deploy → Environment
# VITE_API_URL: https://your-backend.onrender.com
```

## 4. Domain & SSL

### Automatic SSL (Vercel/Netlify/Render)
- SSL certificates provisioned automatically
- HTTPS enforced by default
- No manual configuration needed

### Custom Domain (If Needed)
```bash
# Vercel
vercel domains add yourdomain.com

# Render
# Dashboard → Settings → Custom Domains → Add domain
```

## 5. Testing Deployment

```bash
# Check backend health
curl https://your-backend.onrender.com/health

# Check frontend
https://yourapp.vercel.app

# Verify HTTPS (look for padlock icon)
```

## 6. Post-Deployment Checklist

- [ ] HTTPS enforced on all domains
- [ ] CORS allows only your frontend domain
- [ ] Database uses connection pooling
- [ ] Environment variables set (not hardcoded)
- [ ] Error monitoring configured
- [ ] Automated backups enabled
- [ ] DNS records point to correct services

## 7. Monitoring

### Uptime Monitoring
```bash
# Use UptimeRobot (free)
# https://uptimerobot.com
# Monitor:
# - https://your-backend.onrender.com/health
# - https://yourapp.vercel.app
```

### Error Tracking
```bash
# Use Sentry (free tier available)
# https://sentry.io
# Frontend + Backend error tracking
```

---

**Estimated deployment time:** 30-60 minutes
**Cost:** $0-25/month (depending on services used)
