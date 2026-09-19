import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// --- Middleware ---
const authMiddleware = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// --- Routes ---

// 1. Register
router.post('/register', async (req: any, res: any) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'User already exists' });

    // Generate Salt for E2EE
    const salt = crypto.randomUUID();

    // Hash password for server auth
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, salt },
    });

    // JWT
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '24h' });

    res.json({ token, salt: user.salt });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// 2. Login
router.post('/login', async (req: any, res: any) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // JWT
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET!, { expiresIn: '24h' });

    res.json({ token, salt: user.salt });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// 3. Get User Salt (Client-side encryption setup)
router.get('/salt', authMiddleware, async (req: any, res: any) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { salt: true } });
    res.json({ salt: user?.salt });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch salt' });
  }
});

export default router;
