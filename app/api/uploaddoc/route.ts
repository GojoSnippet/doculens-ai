import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/server/supabase';
import { createAdminClient } from '@/lib/server/admin';

export const dynamic = 'force-dynamic';

export const maxDuration = 120;

// Retry helper for transient network failures
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 2,
  delay = 1000
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      const isLastAttempt = attempt === retries;
      const isRetryableError =
        error instanceof Error &&
        (error.message.includes('fetch failed') ||
          error.message.includes('ECONNRESET') ||
          error.message.includes('socket'));

      if (isLastAttempt || !isRetryableError) {
        throw error;
      }

      console.log(`Retry attempt ${attempt + 1}/${retries} after ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  throw new Error('Max retries exceeded');
}

export async function POST(req: NextRequest) {
  const supabaseAdmin = createAdminClient();

  try {
    // Check for Llama Cloud API key
    if (!process.env.LLAMA_CLOUD_API_KEY) {
      console.error('LLAMA_CLOUD_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Server configuration error: LLAMA_CLOUD_API_KEY is missing' },
        { status: 500 }
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 401 }
      );
    }

    const { uploadedFiles } = await req.json();

    if (!Array.isArray(uploadedFiles) || uploadedFiles.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const results = [];

    for (const file of uploadedFiles) {
      try {
        const { data, error } = await supabaseAdmin.storage
          .from('userfiles')
          .download(file.path);

        if (error) {
          console.error('Error downloading file from storage:', error);
          results.push({
            file: file.name,
            status: 'error',
            message: `Failed to download file: ${error.message}`
          });
          continue;
        }

        const formData = new FormData();
        formData.append('file', new Blob([data]), file.name);

        const uploadResponse = await fetchWithRetry(
          'https://api.cloud.llamaindex.ai/api/v1/parsing/upload',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.LLAMA_CLOUD_API_KEY}`,
              Accept: 'application/json'
            },
            body: formData
          }
        );

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('LlamaCloud API error:', errorText);
          throw new Error(
            `LlamaCloud API error (${uploadResponse.status}): ${errorText || uploadResponse.statusText}`
          );
        }

        const uploadResult = await uploadResponse.json();

        if (!uploadResult.id) {
          console.error('LlamaCloud response missing job ID:', uploadResult);
          throw new Error('LlamaCloud did not return a job ID');
        }

        results.push({
          file: file.name,
          status: 'success',
          jobId: uploadResult.id
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing file ${file.name}:`, errorMessage);
        results.push({
          file: file.name,
          status: 'error',
          message: errorMessage
        });
      }
    }

    // If all files failed, return error status
    const allFailed = results.every((r) => r.status === 'error');
    if (allFailed) {
      return NextResponse.json(
        { error: results[0]?.message || 'All files failed to process', results },
        { status: 500 }
      );
    }

    return NextResponse.json({ results });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in POST request:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
