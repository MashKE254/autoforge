/**
 * APP ACTIVATED PAGE
 *
 * File: src/app/apps/activated/page.tsx
 *
 * Success page after Stripe checkout - tells user to check email
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { CheckCircle, Mail, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Suspense } from 'react';

function ActivatedContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  return (
    <div className="min-h-screen text-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Success Icon */}
        <div className="relative inline-flex items-center justify-center w-32 h-32 mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full blur-3xl opacity-50 animate-pulse" />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-5xl md:text-6xl font-bold mb-4">
          Payment Successful!
        </h1>

        <p className="text-2xl text-gray-400 mb-12">
          Your app is being activated right now
        </p>

        {/* What happens next */}
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-8 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold">Check your email</h2>
          </div>

          <p className="text-gray-400 mb-6 leading-relaxed">
            We're sending you a magic link to access your app. It should arrive within 1 minute.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-white/[0.05] border border-white/10 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center mx-auto mb-3">
                <span className="font-bold text-violet-400">1</span>
              </div>
              <p className="text-gray-300">
                Email arrives in your inbox
              </p>
            </div>

            <div className="p-4 bg-white/[0.05] border border-white/10 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
                <span className="font-bold text-blue-400">2</span>
              </div>
              <p className="text-gray-300">
                Click the magic link
              </p>
            </div>

            <div className="p-4 bg-white/[0.05] border border-white/10 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-gray-300">
                Start using your app
              </p>
            </div>
          </div>
        </div>

        {/* Info boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="p-6 bg-white/[0.02] border border-white/10 rounded-xl text-left">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="font-semibold mb-2">No Password Needed</h3>
            <p className="text-sm text-gray-400">
              We use magic links for security. Just click the link in your email to log in.
            </p>
          </div>

          <div className="p-6 bg-white/[0.02] border border-white/10 rounded-xl text-left">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
              <CheckCircle className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="font-semibold mb-2">Instant Access</h3>
            <p className="text-sm text-gray-400">
              Your app is already set up and ready. Click the email link to start using it immediately.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-4">
          <Link href="/marketplace">
            <Button size="lg" variant="outline" className="border-white/10 hover:bg-white/[0.05]">
              Browse More Apps
            </Button>
          </Link>

          {sessionId && (
            <p className="text-xs text-gray-500">
              Transaction ID: {sessionId.slice(0, 20)}...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AppActivatedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
      <ActivatedContent />
    </Suspense>
  );
}
