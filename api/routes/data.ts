import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// Middleware (copied from auth.ts for simplicity in demo)
const authMiddleware = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Save Data (Client must encrypt data before sending)
// Server stores only ciphertext
router.post('/save', authMiddleware, async (req: any, res: any) => {
  try {
    const { type, data, iv } = req.body; // data and iv come encrypted from client

    if (!type || !data || !iv) {
      return res.status(400).json({ error: 'Missing data' });
    }

    // Check if block exists
    const existing = await prisma.dataBlock.findFirst({
      where: { userId: req.userId, type },
    });

    let result;
    if (existing) {
      result = await prisma.dataBlock.update({
        where: { id: existing.id },
        data: { data, iv },
      });
    } else {
      result = await prisma.dataBlock.create({
        data: { userId: req.userId, type, data, iv },
      });
    }

    res.json({ success: true, id: result.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Get Data (Client must decrypt after receiving)
router.get('/:type', authMiddleware, async (req: any, res: any) => {
  try {
    const { type } = req.params;
    const block = await prisma.dataBlock.findFirst({
      where: { userId: req.userId, type },
    });

    if (!block) {
      return res.json({ data: null });
    }

    res.json({ data: block.data, iv: block.iv });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

export default router;
