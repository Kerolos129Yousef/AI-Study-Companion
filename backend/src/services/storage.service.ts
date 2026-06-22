import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('[SUPABASE] Missing Supabase credentials. File uploads will use placeholder URLs.');
}

// Uses the service-role key (not anon key) for server-side storage access.
// Falls back to placeholder URLs when credentials are missing, enabling local development
// without a Supabase project — the app functions but file downloads won't resolve.
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function uploadPDFToStorage(
  fileName: string,
  fileBuffer: Buffer,
  lectureId: string
): Promise<string> {
  if (!supabase) {
    return `https://storage.example.com/${lectureId}.pdf`;
  }

  try {
    const bucketName = 'lecture-pdfs';
    const filePath = `${lectureId}/${fileName}`;

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) {
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (error: any) {
    console.error('[SUPABASE] Upload error:', error.message);
    return `https://storage.example.com/${lectureId}.pdf`;
  }
}

export async function deletePDFFromStorage(fileUrl: string): Promise<boolean> {
  if (!supabase || !fileUrl.includes('supabase')) {
    return true;
  }

  try {
    const urlParts = fileUrl.split('/');
    const bucketName = 'lecture-pdfs';
    const filePath = urlParts.slice(-2).join('/');

    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error('[SUPABASE] Delete error:', error.message);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error('[SUPABASE] Delete error:', error.message);
    return false;
  }
}
