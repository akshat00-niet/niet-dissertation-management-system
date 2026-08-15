import { redirect } from 'next/navigation';
import { getCurrentAuthUser } from '@/lib/auth/session';

export default async function HomePage() {
  const authUser = await getCurrentAuthUser();

  if (authUser) {
    redirect('/app');
  } else {
    redirect('/login');
  }
}
