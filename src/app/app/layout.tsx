import { requireAuthenticatedUser } from '@/lib/auth/guards';
import { AppShell } from '@/components/shell/AppShell';

export default async function ApplicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side guard: Guarantees authenticated session and resolves AppSession
  const session = await requireAuthenticatedUser();

  return <AppShell session={session}>{children}</AppShell>;
}
