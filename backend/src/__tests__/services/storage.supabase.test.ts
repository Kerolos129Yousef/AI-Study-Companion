const mocks = {
  upload: jest.fn(),
  getPublicUrl: jest.fn(),
  remove: jest.fn(),
  from: jest.fn(),
  createClient: jest.fn(),
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mocks.createClient(...args),
}));

describe('storage.service with Supabase configured', () => {
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    mocks.from.mockReturnValue({
      upload: mocks.upload,
      getPublicUrl: mocks.getPublicUrl,
      remove: mocks.remove,
    });
    mocks.createClient.mockReturnValue({ storage: { from: mocks.from } });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://test.supabase.co/storage/v1/lecture-pdfs/lec-1/notes.pdf' },
    });
    mocks.remove.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    process.env.SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    jest.restoreAllMocks();
  });

  async function loadStorageService() {
    return import('../../services/storage.service.js');
  }

  it('uploads a PDF and returns the public URL', async () => {
    const { uploadPDFToStorage } = await loadStorageService();
    const buffer = Buffer.from('pdf-data');

    const url = await uploadPDFToStorage('notes.pdf', buffer, 'lec-1');

    expect(mocks.from).toHaveBeenCalledWith('lecture-pdfs');
    expect(mocks.upload).toHaveBeenCalledWith(
      'lec-1/notes.pdf',
      buffer,
      expect.objectContaining({ contentType: 'application/pdf', upsert: true })
    );
    expect(url).toBe('https://test.supabase.co/storage/v1/lecture-pdfs/lec-1/notes.pdf');
  });

  it('falls back to placeholder URL when upload fails', async () => {
    mocks.upload.mockResolvedValue({ error: new Error('upload failed') });
    const { uploadPDFToStorage } = await loadStorageService();

    const url = await uploadPDFToStorage('notes.pdf', Buffer.from('data'), 'lec-2');

    expect(url).toBe('https://storage.example.com/lec-2.pdf');
  });

  it('deletes a file from Supabase storage', async () => {
    const { deletePDFFromStorage } = await loadStorageService();
    const fileUrl =
      'https://test.supabase.co/storage/v1/object/public/lecture-pdfs/lec-1/notes.pdf';

    const result = await deletePDFFromStorage(fileUrl);

    expect(mocks.remove).toHaveBeenCalledWith(['lec-1/notes.pdf']);
    expect(result).toBe(true);
  });

  it('returns false when Supabase delete fails', async () => {
    mocks.remove.mockResolvedValue({ error: new Error('delete failed') });
    const { deletePDFFromStorage } = await loadStorageService();
    const fileUrl =
      'https://test.supabase.co/storage/v1/object/public/lecture-pdfs/lec-1/notes.pdf';

    const result = await deletePDFFromStorage(fileUrl);

    expect(result).toBe(false);
  });
});
