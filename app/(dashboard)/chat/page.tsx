import 'server-only';
import ChatComponent from './components/Chat';
import { cookies } from 'next/headers';
import DocumentViewer from './components/PDFViewer';
import WebsiteWiever from './components/WebsiteWiever';
import { v4 as uuidv4 } from 'uuid';
import { getUserInfo } from '@/lib/server/supabase';
import { createServerSupabaseClient } from '@/lib/server/server';
import { decodeBase64 } from '@/utils/base64';

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

export default async function ChatPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const selectedOption = cookieStore.get('selectedOption')?.value ?? 'gpt-5';
  const createChatId = uuidv4();

  return (
    <div className="flex w-full">
      <div className="flex-1">
        <ChatComponent
          chatId={createChatId}
          initialSelectedOption={selectedOption}
        />
      </div>
      {searchParams.url ? (
        <WebsiteWiever url={decodeURIComponent(searchParams.url)} />
      ) : searchParams.pdf ? (
        <DocumentComponent fileName={searchParams.pdf} />
      ) : null}
    </div>
  );
}

async function DocumentComponent({ fileName }: { fileName: string }) {
  const session = await getUserInfo();
  const userId = session?.id;

  let signedUrl = null;

  console.log('[PDF Debug] userId:', userId);
  console.log('[PDF Debug] fileName (base64):', fileName);

  if (userId) {
    try {
      const supabase = await createServerSupabaseClient();
      const decodedFileName = decodeBase64(fileName);
      const filePath = `${userId}/${decodedFileName}`;

      console.log('[PDF Debug] decodedFileName:', decodedFileName);
      console.log('[PDF Debug] filePath:', filePath);

      const { data, error } = await supabase.storage
        .from('userfiles')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      console.log('[PDF Debug] signedUrl result:', { data, error });

      if (!error && data) {
        signedUrl = data.signedUrl;
      } else if (error) {
        console.error('[PDF Debug] Supabase error:', error.message);
      }
    } catch (error) {
      console.error('[PDF Debug] Error creating signed URL:', error);
    }
  } else {
    console.log('[PDF Debug] No userId found');
  }

  return <DocumentViewer fileName={fileName} signedUrl={signedUrl} />;
}
