import { validatePDFFile, extractTextFromPDF } from '../../services/pdf.service.js';
import type { Express } from 'express';

jest.mock('pdf-parse/lib/pdf-parse.js', () => jest.fn());

import pdf from 'pdf-parse/lib/pdf-parse.js';

const mockedPdf = jest.mocked(pdf);

function createMockFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'notes.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    destination: '',
    filename: 'notes.pdf',
    path: '',
    buffer: Buffer.from('pdf'),
    stream: null as never,
    ...overrides,
  };
}

describe('pdf.service', () => {
  describe('validatePDFFile', () => {
    it('throws when no file is provided', () => {
      expect(() => validatePDFFile(undefined as unknown as Express.Multer.File)).toThrow(
        'No file provided'
      );
    });

    it('throws when the file is not a PDF', () => {
      const file = createMockFile({ mimetype: 'image/png' });

      expect(() => validatePDFFile(file)).toThrow('File must be a PDF');
    });

    it('throws when the file exceeds 50MB', () => {
      const file = createMockFile({ size: 51 * 1024 * 1024 });

      expect(() => validatePDFFile(file)).toThrow('File too large (max 50MB)');
    });

    it('accepts a valid PDF file', () => {
      const file = createMockFile();

      expect(() => validatePDFFile(file)).not.toThrow();
    });
  });

  describe('extractTextFromPDF', () => {
    let setTimeoutSpy: jest.SpiedFunction<typeof setTimeout>;

    beforeEach(() => {
      mockedPdf.mockReset();
      setTimeoutSpy = jest.spyOn(global, 'setTimeout').mockImplementation(
        ((handler: TimerHandler, timeout?: number) => {
          if (timeout === 30000) {
            return 0 as unknown as ReturnType<typeof setTimeout>;
          }
          return jest.requireActual<typeof setTimeout>('timers').setTimeout(handler, timeout);
        }) as typeof setTimeout
      );
    });

    afterEach(() => {
      setTimeoutSpy.mockRestore();
    });

    it('throws for an empty buffer', async () => {
      await expect(extractTextFromPDF(Buffer.alloc(0))).rejects.toThrow(
        'PDF extraction failed: Empty file'
      );
    });

    it('throws when the buffer exceeds 50MB', async () => {
      const largeBuffer = Buffer.alloc(51 * 1024 * 1024);

      await expect(extractTextFromPDF(largeBuffer)).rejects.toThrow(
        'PDF extraction failed: File too large (max 50MB)'
      );
    });

    it('returns extracted text for a valid PDF', async () => {
      const longText = 'A'.repeat(150);
      mockedPdf.mockResolvedValue({ text: longText } as never);

      const result = await extractTextFromPDF(Buffer.from('pdf-data'));

      expect(result).toBe(longText);
      expect(mockedPdf).toHaveBeenCalled();
    });

    it('throws when extracted text is too short', async () => {
      mockedPdf.mockResolvedValue({ text: 'short' } as never);

      await expect(extractTextFromPDF(Buffer.from('pdf-data'))).rejects.toThrow(
        'PDF extraction failed: This PDF appears to be scanned'
      );
    });

    it('wraps parser errors with a descriptive message', async () => {
      mockedPdf.mockRejectedValue(new Error('corrupt pdf'));

      await expect(extractTextFromPDF(Buffer.from('pdf-data'))).rejects.toThrow(
        'PDF extraction failed: corrupt pdf'
      );
    });
  });
});
