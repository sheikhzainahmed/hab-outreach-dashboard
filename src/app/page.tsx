import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role === 'OWNER') {
    redirect('/owner');
  } else if (user.role === 'MANAGER') {
    redirect('/manager');
  } else if (user.role === 'OPERATIONS') {
    redirect('/operations');
  } else {
    redirect('/executor');
  }
}
