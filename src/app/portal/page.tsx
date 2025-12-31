/**
 * CUSTOMER PORTAL - My Apps
 *
 * File: src/app/portal/page.tsx
 *
 * Where end-users manage their purchased apps
 * NO JARGON. Simple interface: "My Apps" → Click → Use
 */

import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import {
  ExternalLink,
  Settings,
  Calendar,
  DollarSign,
  Check,
  AlertCircle,
  Sparkles,
  CreditCard,
  User,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: 'My Apps - Customer Portal | AutoForge',
  description: 'Manage your purchased applications',
};

export default async function CustomerPortal() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect('/login?from=/portal');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect('/login');
  }

  // Get user's subscriptions
  const subscriptions = await prisma.appSubscription.findMany({
    where: {
      userId: user.id,
    },
    include: {
      publishedApp: {
        include: {
          user: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      },
    },
    orderBy: {
      startedAt: 'desc',
    },
  });

  const activeSubscriptions = subscriptions.filter(s => s.status === 'ACTIVE');
  const cancelledSubscriptions = subscriptions.filter(s => s.status === 'CANCELLED');

  return (
    <div className="min-h-screen text-white">
      {/* Header */}
      <section className="border-b border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="container mx-auto px-6 max-w-6xl py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">My Apps</h1>
              <p className="text-xl text-gray-400">
                {activeSubscriptions.length} {activeSubscriptions.length === 1 ? 'app' : 'apps'} ready to use
              </p>
            </div>

            {/* Account */}
            <div className="flex items-center gap-4">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name || 'User'}
                  width={48}
                  height={48}
                  className="rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="text-right">
                <p className="font-semibold">{user.name || 'User'}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Purchase success banner */}
      <Suspense>
        <PurchaseSuccessBanner />
      </Suspense>

      {/* Main Content */}
      <section className="py-12">
        <div className="container mx-auto px-6 max-w-6xl">
          {/* Active Apps */}
          {activeSubscriptions.length > 0 ? (
            <div className="mb-16">
              <h2 className="text-2xl font-bold mb-8">Your Apps</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeSubscriptions.map((subscription) => {
                  const app = subscription.publishedApp;

                  return (
                    <div
                      key={subscription.id}
                      className="group relative bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden hover:bg-white/[0.05] hover:border-white/20 transition-all"
                    >
                      {/* App preview */}
                      {app.logoUrl || app.screenshotUrls?.[0] ? (
                        <div className="h-48 bg-gradient-to-br from-violet-500/10 to-purple-500/10 overflow-hidden">
                          <img
                            src={app.logoUrl || app.screenshotUrls?.[0]}
                            alt={app.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-48 bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center">
                          <Sparkles className="w-16 h-16 text-violet-400" />
                        </div>
                      )}

                      {/* Content */}
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-1">{app.name}</h3>
                            <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                              {app.description}
                            </p>
                          </div>

                          {/* Status badge */}
                          <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-400 ml-3">
                            <Check className="w-3 h-3" />
                            Active
                          </div>
                        </div>

                        {/* Pricing info */}
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 pb-4 border-b border-white/10">
                          <DollarSign className="w-4 h-4" />
                          {app.pricingModel === 'FREE' ? (
                            'Free'
                          ) : app.pricingModel === 'SUBSCRIPTION' ? (
                            `$${app.monthlyPrice}/mo`
                          ) : (
                            `$${app.oneTimePrice} one-time`
                          )}
                          <span className="mx-2">•</span>
                          <Calendar className="w-4 h-4" />
                          Since {new Date(subscription.startedAt).toLocaleDateString()}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          {app.deploymentUrl && (
                            <a
                              href={app.deploymentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold hover:from-violet-500 hover:to-purple-500 transition-all"
                            >
                              <Zap className="w-4 h-4" />
                              Open App
                            </a>
                          )}

                          <Link
                            href={`/portal/app/${app.id}`}
                            className="px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl hover:bg-white/[0.10] hover:border-white/20 transition-all"
                          >
                            <Settings className="w-5 h-5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-white/[0.05] border border-white/10 mb-6">
                <Sparkles className="w-12 h-12 text-gray-500" />
              </div>
              <h3 className="text-2xl font-bold mb-3">No apps yet</h3>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                Browse the marketplace to find apps that help you work faster
              </p>
              <Link href="/marketplace">
                <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Browse Marketplace
                </Button>
              </Link>
            </div>
          )}

          {/* Account Management */}
          {activeSubscriptions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              <div className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center mb-4">
                  <CreditCard className="w-6 h-6 text-violet-400" />
                </div>
                <h3 className="font-semibold mb-2">Billing</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Manage your payment methods and invoices
                </p>
                <Link href="/portal/billing">
                  <Button variant="outline" size="sm" className="w-full border-white/10 hover:bg-white/[0.05]">
                    View Billing
                  </Button>
                </Link>
              </div>

              <div className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                  <Settings className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="font-semibold mb-2">Account Settings</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Update your profile and preferences
                </p>
                <Link href="/settings">
                  <Button variant="outline" size="sm" className="w-full border-white/10 hover:bg-white/[0.05]">
                    Settings
                  </Button>
                </Link>
              </div>

              <div className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
                  <Sparkles className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="font-semibold mb-2">Get More Apps</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Discover new tools in the marketplace
                </p>
                <Link href="/marketplace">
                  <Button variant="outline" size="sm" className="w-full border-white/10 hover:bg-white/[0.05]">
                    Browse Apps
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Cancelled subscriptions */}
          {cancelledSubscriptions.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-6 text-gray-400">Cancelled</h2>

              <div className="space-y-4">
                {cancelledSubscriptions.map((subscription) => {
                  const app = subscription.publishedApp;

                  return (
                    <div
                      key={subscription.id}
                      className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/10 rounded-xl"
                    >
                      <div className="flex items-center gap-4">
                        {app.logoUrl ? (
                          <img
                            src={app.logoUrl}
                            alt={app.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-gray-500" />
                          </div>
                        )}

                        <div>
                          <h3 className="font-semibold text-gray-300">{app.name}</h3>
                          <p className="text-sm text-gray-500">
                            Cancelled on{' '}
                            {subscription.endedAt
                              ? new Date(subscription.endedAt).toLocaleDateString()
                              : 'Unknown'}
                          </p>
                        </div>
                      </div>

                      <Link href={`/marketplace/${app.slug}`}>
                        <Button variant="outline" size="sm" className="border-white/10">
                          Reactivate
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// Success banner component
function PurchaseSuccessBanner() {
  // Check for success query param
  if (typeof window === 'undefined') return null;

  const searchParams = new URLSearchParams(window.location.search);
  const purchaseStatus = searchParams.get('purchase');

  if (purchaseStatus !== 'success') return null;

  return (
    <div className="bg-green-500/10 border-y border-green-500/20">
      <div className="container mx-auto px-6 max-w-6xl py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <Check className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold text-green-400">Purchase successful!</h3>
            <p className="text-sm text-gray-400">Your new app is ready to use</p>
          </div>
        </div>
      </div>
    </div>
  );
}
