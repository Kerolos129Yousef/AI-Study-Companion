import { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import { generateSummary } from '../services/claude.service.js';
import { extractTextFromPDF, validatePDFFile } from '../services/pdf.service.js';
import { uploadPDFToStorage, deletePDFFromStorage } from '../services/storage.service.js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get all lectures for a course
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { courseId } = req.query;

    if (!courseId) {
      return res.status(400).json({ error: 'courseId is required' });
    }

    const lectures = await prisma.lecture.findMany({
      where: { courseId: courseId as string, userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: lectures });
  })
);

// Upload PDF and create lecture.
// Pipeline: validate PDF → extract raw text via pdf-parse → upload file to Supabase Storage → persist lecture record.
// Raw text is stored in the DB for downstream AI generation (summaries, flashcards, quizzes).
router.post(
  '/upload',
  upload.single('file'),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    validatePDFFile(req.file);

    const { courseId, title } = req.body;

    if (!courseId || !title) {
      return res.status(400).json({ error: 'courseId and title are required' });
    }

    // Verify course belongs to user
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course || course.userId !== req.userId) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Extract text from PDF
    const rawText = await extractTextFromPDF(req.file.buffer);

    // Generate unique lecture ID for storage
    const lectureId = uuidv4();

    // Upload to Supabase Storage
    const fileUrl = await uploadPDFToStorage(req.file.originalname || 'lecture.pdf', req.file.buffer, lectureId);

    // Create lecture
    const lecture = await prisma.lecture.create({
      data: {
        courseId,
        userId: req.userId!,
        title,
        fileUrl,
        rawText,
      },
    });

    res.status(201).json(lecture);
  })
);

// Get lecture by ID
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const lecture = await prisma.lecture.findUnique({
      where: { id: req.params.id },
      include: { flashcards: true },
    });

    if (!lecture || lecture.userId !== req.userId) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    res.json({ data: lecture });
  })
);

// Update lecture
router.patch(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const lecture = await prisma.lecture.findUnique({ where: { id: req.params.id } });

    if (!lecture || lecture.userId !== req.userId) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    const updated = await prisma.lecture.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json({ data: updated });
  })
);

// Get or generate lecture summary. Implements a lazy-generation pattern:
// returns cached summary if valid, or generates one via LLM from the lecture's raw text.
// Invalid cached summaries (containing "Unable to generate") are cleared and retried.
router.get(
  '/:id/summary',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const lecture = await prisma.lecture.findUnique({ where: { id: req.params.id } });

    if (!lecture || lecture.userId !== req.userId) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    // If summary already exists, check if it's valid (not an error state)
    if (lecture.summary) {
      const parsedSummary = JSON.parse(lecture.summary);
      if (!parsedSummary.title.includes('Unable to generate')) {
        return res.json({ data: parsedSummary });
      }
      // Delete invalid cached summary
      await prisma.lecture.update({
        where: { id: req.params.id },
        data: { summary: null },
      });
    }

    // Generate summary
    const summary = await generateSummary(lecture.rawText);

    // Save summary
    await prisma.lecture.update({
      where: { id: req.params.id },
      data: { summary: JSON.stringify(summary) },
    });

    res.json({ data: summary });
  })
);

// Delete lecture
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const lecture = await prisma.lecture.findUnique({ where: { id: req.params.id } });

    if (!lecture || lecture.userId !== req.userId) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    // Delete from Supabase Storage
    await deletePDFFromStorage(lecture.fileUrl);

    // Delete from database
    await prisma.lecture.delete({ where: { id: req.params.id } });

    res.json({ success: true });
  })
);

export default router;
