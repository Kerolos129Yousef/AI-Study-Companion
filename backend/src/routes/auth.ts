import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../middleware/errorHandler.js';
import { prisma } from '../lib/prisma.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

interface ValidationError {
  field: string;
  message: string;
}

function validateRegisterInput(raw: RegisterRequest): ValidationError[] {
  const errors: ValidationError[] = [];

  const name = (raw.name ?? '').trim();
  const email = (raw.email ?? '').trim().toLowerCase();
  const password = raw.password ?? '';

  if (!name) {
    errors.push({ field: 'name', message: 'Full name is required.' });
  } else if (name.length < 3) {
    errors.push({ field: 'name', message: 'Full name must be at least 3 characters.' });
  } else if (!/^[a-zA-Z\s]+$/.test(name)) {
    errors.push({ field: 'name', message: 'Full name may only contain letters and spaces.' });
  }

  if (!email) {
    errors.push({ field: 'email', message: 'Email is required.' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: 'email', message: 'Please enter a valid email address.' });
  }

  if (!password) {
    errors.push({ field: 'password', message: 'Password is required.' });
  } else if (password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters.' });
  } else if (!/[A-Z]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one uppercase letter.' });
  } else if (!/[a-z]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one lowercase letter.' });
  } else if (!/[0-9]/.test(password)) {
    errors.push({ field: 'password', message: 'Password must contain at least one number.' });
  }

  return errors;
}

interface LoginRequest {
  email: string;
  password: string;
}

// Register
router.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const raw = req.body as RegisterRequest;

      const validationErrors = validateRegisterInput(raw);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: validationErrors[0].message,
          errors: validationErrors,
        });
      }

      const name = raw.name.trim();
      const email = raw.email.trim().toLowerCase();
      const { password } = raw;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      // Hash password with bcrypt (cost factor 10) before storing
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await prisma.user.create({
        data: { email, name, password: hashedPassword },
      });

      // Issue a signed JWT (7-day expiry) with user ID as the subject claim
      const token = jwt.sign({ sub: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

      res.status(201).json({
        data: {
          token,
          user: { id: newUser.id, email: newUser.email, name: newUser.name },
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: `Server error: ${error.message}` });
    }
  })
);

// Login
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body as LoginRequest;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

      res.json({
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name
          }
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: `Server error: ${error.message}` });
    }
  })
);

// Logout
router.post('/logout', (req: Request, res: Response) => {
  res.json({ success: true });
});

export default router;
