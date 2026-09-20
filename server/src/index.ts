import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import dataRoutes from './routes/data.js';
import { safeLogError } from './errorHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// === SECURITY MIDDLEWARE ===

// Helmet - Security headers
app.use(helmet());

// Rate limiting - Prevent brute force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: JSON.stringify({ code: 'RATE_LIMIT', message: 'Too many requests, try again later' }),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration - Only allow authorized origins
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);

// JSON parsing with size limit
app.use(express.json({ limit: '10kb' }));

// === ROUTES ===
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);

// === HEALTH CHECK ===
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// === ERROR HANDLER ===
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  safeLogError(err, { method: req.method, path: req.path });
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`
    ╔═══════════════════════════════════════╗
    ║     SaveDesk Secure Backend Server    ║
    ╚═══════════════════════════════════════╝
    
    Mode: ${process.env.NODE_ENV || 'development'}
    Port: ${PORT}
    CORS: ${allowedOrigin}
    
    Security Features:
    ✓ End-to-End Encryption (AES-256-GCM)
    ✓ JWT Authentication
    ✓ Rate Limiting
    ✓ Input Validation
    ✓ Security Headers (Helmet)
    
    🚀 Server ready at http://localhost:${PORT}
  `.trim());
});
