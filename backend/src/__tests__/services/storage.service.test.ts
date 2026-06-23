import { uploadPDFToStorage, deletePDFFromStorage } from '../../services/storage.service.js';

describe('storage.service', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('uploadPDFToStorage', () => {
    it('returns a placeholder URL when Supabase is not configured', async () => {
      const url = await uploadPDFToStorage('notes.pdf', Buffer.from('data'), 'lecture-42');

      expect(url).toBe('https://storage.example.com/lecture-42.pdf');
    });
  });

  describe('deletePDFFromStorage', () => {
    it('returns true for non-Supabase URLs', async () => {
      const result = await deletePDFFromStorage('https://storage.example.com/lecture-42.pdf');

      expect(result).toBe(true);
    });

    it('returns true for empty URLs', async () => {
      const result = await deletePDFFromStorage('');

      expect(result).toBe(true);
    });
  });
});
