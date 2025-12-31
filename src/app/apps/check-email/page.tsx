/**
 * CHECK EMAIL PAGE
 *
 * File: src/app/apps/check-email/page.tsx
 *
 * Shown after free app activation - tells user to check email
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { Mail, ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Suspense } from 'react';

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const appName = searchParams.get('app');

  return (
    <div className="min-h-screen text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="relative inline-flex items-center justify-center w-24 h-24 mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full blur-2xl opacity-50" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 flex items-center justify-center">
            <Mail className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Check Your Email
        </h1>

        <p className="text-xl text-gray-400 mb-8">
          We sent a magic link to
          <br />
          <span className="text-white font-semibold">{email || 'your email'}</span>
        </p>

        {/* Steps */}
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-8 mb-8 text-left">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-bold text-violet-400">1</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Check your inbox</h3>
                <p className="text-sm text-gray-400">
                  Look for an email from AutoForge
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-bold text-blue-400">2</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Click the link</h3>
                <p className="text-sm text-gray-400">
                  It's valid for 15 minutes
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Start using {appName || 'your app'}</h3>
                <p className="text-sm text-gray-400">
                  Instant access - no password needed
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Didn't receive */}
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl mb-8">
          <p className="text-sm text-yellow-200">
            Didn't receive the email? Check your spam folder or{' '}
            <button className="underline hover:text-yellow-100">
              send again
            </button>
          </p>
        </div>

        {/* Back to marketplace */}
        <Link href="/marketplace">
          <Button variant="outline" className="border-white/10 hover:bg-white/[0.05]">
            <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            Back to Marketplace
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
      <CheckEmailContent />
    </Suspense>
  );
}
