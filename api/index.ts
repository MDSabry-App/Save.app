import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: JSON.stringify({ code: 'RATE_LIMIT', message: 'Too many requests, try again later' }),
});
app.use('/api/', limiter);

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// Import routes (from copied files)
import authRoutes from './routes/auth.js';
import dataRoutes from './routes/data.js';
import { safeLogError } from './errorHandler.js';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  safeLogError(err, { method: req.method, path: req.path });
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'An error occurred' : err.message,
  });
});

// Export for Vercel
export default function (req: Request, res: Response, next: NextFunction) {
  return app(req, res);
}
