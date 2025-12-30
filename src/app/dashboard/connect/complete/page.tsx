'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

export default function ConnectCompletePage() {
  const router = useRouter();

  useEffect(() => {
    // Check for pending monetization
    const pending = sessionStorage.getItem('monetize_pending');
    if (pending) {
      sessionStorage.removeItem('monetize_pending');
      // Resume monetization flow
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Stripe Connected!
        </h1>
        <p className="text-gray-400 mb-6">
          Your account is now set up to receive payments.
        </p>
        <button
          onClick={() => router.push('/dashboard/billing')}
          className="px-6 py-3 bg-violet-600 rounded-lg text-white font-medium"
        >
          Continue to Dashboard
        </button>
      </div>
    </div>
  );
}