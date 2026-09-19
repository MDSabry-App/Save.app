# Security Configuration Guide

## Environment Variables

### Backend (server/.env)
```env
# REQUIRED - Your PostgreSQL connection string
DATABASE_URL="postgresql://user:password@localhost:5432/devdesk_db?schema=public"

# REQUIRED - Random 256-bit secret for JWT signing
JWT_SECRET="a63f5e72a94181d4b5e5a5c5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5"

# REQUIRED - Allowed frontend origin(s)
FRONTEND_URL="https://your-app.vercel.app"

# OPTIONAL - Server port (default: 3001)
PORT=3001

# OPTIONAL - Environment (development | production)
NODE_ENV="production"
```

### Frontend (.env)
```env
# REQUIRED - Backend API URL (with protocol)
VITE_API_URL="https://your-api.railway.app"
```

## 🔑 Secret Generation

### Generate Strong JWT Secret
```bash
# On Windows (PowerShell):
Get-Random -Maximum 9999999999999999 -Minimum 1000000000000000 | ConvertTo-Json

# On Mac/Linux:
openssl rand -base64 64

# Or use a secure random generator:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Database Password (PostgreSQL)
```bash
# Generate random password:
openssl rand -base64 24
```

## 🛡️ Hardening Checklist

### Backend Security
- [ ] Environment variables not in code
- [ ] CORS restricted to specific origins
- [ ] Rate limiting enabled (100 req/15min)
- [ ] Helmet security headers applied
- [ ] HTTPS enforced in production
- [ ] Database connections use SSL

### Frontend Security
- [ ] HTTPS only (no HTTP mixed content)
- [ ] API URL configurable via .env
- [ ] Sensitive data encrypted before storage
- [ ] Session tokens not persisted to disk

### Database Security
- [ ] Non-root database user
- [ ] Connection pooling configured
- [ ] IP whitelist (if cloud-hosted)
- [ ] Regular encrypted backups
- [ ] SSL required for connections

## 🔐 Production Deployment

### Railway/Render Deployment
1. Add environment variables through dashboard
2. Use managed PostgreSQL service
3. Enable automatic deploys from Git
4. Set NODE_ENV=production

### Vercel/Netlify Deployment
1. Build output: `dist/` folder
2. Add `VITE_API_URL` environment variable
3. Set auto-HTTPS (default)
4. Enable preview deployments

### Self-Hosted (VPS)
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Run backend with environment
docker run -d \
  -p 3001:3001 \
  -e DATABASE_URL="..." \
  -e JWT_SECRET="..." \
  -e FRONTEND_URL="..." \
  -e NODE_ENV="production" \
  your-backend-image

# Run with PM2 for process management
pm2 start dist/index.js --name devdesk-backend
```

## 🚨 Security Alerts

### Enable Monitoring
```javascript
// backend/src/index.ts - Add monitoring middleware
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Log failed auth attempts
app.post('/api/auth/login', async (req, res) => {
  // ... auth logic
  
  if (!validCredentials) {
    logger.warn(`Failed login attempt: ${req.body.email}`);
  }
});
```

### Rate Limiting Alert
```javascript
// Monitor rate limit violations
const violations = new Map();
app.use((req, res, next) => {
  // If rate limit exceeded
  if (res.statusCode === 429) {
    logger.warn(`Rate limit exceeded: ${req.ip}`);
    violations.set(req.ip, (violations.get(req.ip) || 0) + 1);
  }
});
```

---

**Remember:** Security is a process, not a one-time setup. Regularly review and update.
