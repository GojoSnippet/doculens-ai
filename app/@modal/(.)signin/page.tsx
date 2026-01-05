import SignInCard from './SignInCard';
import Content from '@/app/(frontpage)/components/auth/Content';
import ModalWrapper from './ModalWrapper';
import { getSession } from '@/lib/server/supabase';

export const dynamic = 'force-dynamic';

export default async function SignInModal() {
  const session = await getSession();

  if (session) {
    return null;
  }

  return (
    <ModalWrapper>
      <div className="flex flex-col md:flex-row justify-center items-center w-full gap-4">
        {/* Left side (Content) - Hidden on mobile */}
        <div className="hidden md:flex w-full md:w-[40%] justify-center items-center">
          <Content />
        </div>

        {/* Right side (SignInCard) */}
        <div className="w-full md:w-[55%]">
          <SignInCard />
        </div>
      </div>
    </ModalWrapper>
  );
}
