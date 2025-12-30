'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ConnectRefreshPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect back to billing to restart onboarding
    router.push('/dashboard/billing');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Redirecting...</p>
      </div>
    </div>
  );
}