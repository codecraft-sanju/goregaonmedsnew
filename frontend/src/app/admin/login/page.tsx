//src/app/admin/login/page.tsx
import { Suspense } from 'react';
import { LoginForm } from '@/components/admin/LoginForm';
import { Skeleton } from '@/components/ui/Skeleton';

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(60%_50%_at_50%_0%,#d8f3e8_0%,transparent_70%)] px-4">
      <Suspense fallback={<Skeleton className="h-96 w-full max-w-sm rounded-3xl" />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
