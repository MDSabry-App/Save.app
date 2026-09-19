# 🔐 Secure Backend Setup

## Prerequisites
- Node.js 20+
- PostgreSQL database (local or cloud-hosted)

## Step 1: Backend Configuration

```bash
# Navigate to server folder
cd server

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your database credentials:
# DATABASE_URL="postgresql://user:password@localhost:5432/devdesk_db"
# JWT_SECRET="generate-a-very-long-random-string-here"
# FRONTEND_URL="http://localhost:5173"
```

## Step 2: Initialize Database

```bash
# Run Prisma to create database tables
npx prisma db push
```

## Step 3: Start Backend

```bash
npm run dev
# Backend runs on http://localhost:3001
```

---

# 🚀 Deployment Guide

## Option A: Self-Hosted Cloud (Recommended for Web Access)

### Backend Deployment
1. **PostgreSQL**: Use [Neon](https://neon.tech) or [Supabase](https://supabase.com)
2. **Backend**: Deploy `server/` folder to:
   - [Railway](https://railway.app) (Node.js)
   - [Render](https://render.com) (Node.js)
   - [Fly.io](https://fly.io)

Environment Variables for Cloud:
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secure-secret"
FRONTEND_URL="https://yourapp.vercel.app"
PORT=3001
NODE_ENV="production"
```

### Frontend Deployment
1. Build frontend: `npm run build`
2. Deploy `dist/` folder to:
   - [Vercel](https://vercel.com)
   - [Netlify](https://netlify.com)
   - [Cloudflare Pages](https://pages.cloudflare.com)

Update `.env`:
```env
VITE_API_URL="https://your-backend.railway.app"
```

---

## Option B: Desktop-Only (Maximum Security)

Keep everything local on your machine - data never leaves your computer.

1. Run backend locally: `cd server && npm run dev`
2. Run frontend locally: `npm run dev`
3. Build Electron installer: `npm run dist:win`

---

## 🔐 Security Checklist

- [ ] Generate strong, unique JWT_SECRET
- [ ] Set DATABASE_URL with secure credentials
- [ ] Use HTTPS in production
- [ ] Update CORS whitelist (FRONTEND_URL)
- [ ] Rate limiting enabled (default: 100 requests/15min)
- [ ] Helmet security headers enabled
- [ ] Input validation with Zod
- [ ] Environment variables not in code

---

## 📱 User Workflow

1. **First Time**: Register with email & password
2. **Login**: Enter credentials → JWT token issued
3. **Use**: All data encrypted client-side before upload
4. **Logout**: Clear session tokens

---

## 🛠️ Maintenance

### Backup
The encrypted data is stored in PostgreSQL. Regularly backup your database.

### Recovery
If you lose your password, data cannot be recovered (E2EE design). Save your recovery codes.

### Audit
Check server logs regularly. Rate limiting helps prevent abuse.
