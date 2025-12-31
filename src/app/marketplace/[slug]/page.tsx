/**
 * APP DETAIL PAGE - One-Click Purchase
 *
 * File: src/app/marketplace/[slug]/page.tsx
 *
 * Simple, non-technical app purchase page
 * NO JARGON. Just: "Try it → Buy it"
 */

import { Suspense } from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { notFound } from 'next/navigation';
import {
  Sparkles,
  Check,
  Users,
  TrendingUp,
  Shield,
  Zap,
  ExternalLink,
  User,
  ArrowRight,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import PurchaseButton from '@/components/marketplace/PurchaseButton';

interface AppDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: AppDetailPageProps) {
  const { slug } = await params;
  const app = await getAppBySlug(slug);

  if (!app) {
    return {
      title: 'App Not Found',
    };
  }

  return {
    title: `${app.name} - AutoForge Marketplace`,
    description: app.description,
  };
}

export default async function AppDetailPage({ params }: AppDetailPageProps) {
  const { slug } = await params;
  const app = await getAppBySlug(slug);
  const session = await getServerSession(authOptions);

  if (!app) {
    notFound();
  }

  // Check if user already owns this app
  const userOwnsApp = session?.user?.email
    ? await checkUserOwnsApp(session.user.email, app.id)
    : false;

  const priceDisplay = app.pricingModel === 'FREE'
    ? 'Free'
    : app.pricingModel === 'SUBSCRIPTION'
    ? `$${app.monthlyPrice}/mo`
    : `$${app.oneTimePrice} one-time`;

  return (
    <div className="min-h-screen text-white">
      {/* Hero Section */}
      <section className="border-b border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="container mx-auto px-6 max-w-6xl py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Info */}
            <div>
              {/* Category badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-400 text-sm mb-6">
                <Sparkles className="w-4 h-4" />
                <span>AI-Built App</span>
              </div>

              <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                {app.name}
              </h1>

              <p className="text-xl text-gray-400 mb-8 leading-relaxed">
                {app.description}
              </p>

              {/* Stats */}
              <div className="flex items-center gap-8 mb-8">
                <div className="flex items-center gap-2 text-gray-400">
                  <Users className="w-5 h-5" />
                  <span className="text-lg font-semibold text-white">
                    {app.totalCustomers}
                  </span>
                  <span className="text-sm">users</span>
                </div>

                <div className="flex items-center gap-2 text-gray-400">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="text-lg font-semibold text-white">4.8</span>
                  <span className="text-sm">(127 reviews)</span>
                </div>
              </div>

              {/* Creator */}
              <div className="flex items-center gap-3 mb-10 pb-10 border-b border-white/10">
                {app.creator.image ? (
                  <Image
                    src={app.creator.image}
                    alt={app.creator.name}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Created by</p>
                  <p className="font-semibold">{app.creator.name}</p>
                </div>
              </div>

              {/* Purchase CTA */}
              {userOwnsApp ? (
                <div className="space-y-4">
                  <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-2xl">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Check className="w-6 h-6 text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">You own this app</h3>
                        <p className="text-sm text-gray-400">Access it anytime</p>
                      </div>
                    </div>
                    <Link href="/dashboard">
                      <Button className="w-full bg-green-600 hover:bg-green-700">
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Go to My Apps
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Price */}
                  <div className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl">
                    <div className="flex items-baseline gap-3 mb-2">
                      <span className="text-5xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                        {priceDisplay}
                      </span>
                      {app.pricingModel === 'SUBSCRIPTION' && (
                        <span className="text-gray-500">per month</span>
                      )}
                    </div>
                    {app.pricingModel === 'SUBSCRIPTION' && (
                      <p className="text-sm text-gray-500">
                        Cancel anytime • Instant access
                      </p>
                    )}
                  </div>

                  {/* Purchase button */}
                  <PurchaseButton
                    appId={app.id}
                    appName={app.name}
                    price={app.pricingModel === 'SUBSCRIPTION' ? app.monthlyPrice : app.oneTimePrice}
                    pricingModel={app.pricingModel}
                    isAuthenticated={!!session}
                  />

                  {/* Trust badges */}
                  <div className="grid grid-cols-3 gap-3 text-center text-xs text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-green-400" />
                      </div>
                      <span>Secure</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-blue-400" />
                      </div>
                      <span>Instant</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                        <Users className="w-4 h-4 text-purple-400" />
                      </div>
                      <span>24/7 Support</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Preview */}
            <div className="relative">
              {/* Preview frame */}
              <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02] shadow-2xl">
                {app.previewImageUrl ? (
                  <Image
                    src={app.previewImageUrl}
                    alt={`${app.name} preview`}
                    width={800}
                    height={600}
                    className="w-full h-auto"
                  />
                ) : app.deploymentUrl ? (
                  <iframe
                    src={app.deploymentUrl}
                    className="w-full h-[500px] bg-white"
                    title={`${app.name} preview`}
                    sandbox="allow-scripts allow-same-origin"
                  />
                ) : (
                  <div className="w-full h-[500px] flex items-center justify-center bg-gradient-to-br from-violet-500/10 to-purple-500/10">
                    <div className="text-center">
                      <Sparkles className="w-16 h-16 text-violet-400 mx-auto mb-4" />
                      <p className="text-gray-400">Preview coming soon</p>
                    </div>
                  </div>
                )}

                {/* Live demo button */}
                {app.deploymentUrl && (
                  <div className="absolute top-4 right-4">
                    <a
                      href={app.deploymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg text-sm font-medium hover:bg-black/80 transition-colors"
                    >
                      Try Live Demo
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 border-b border-white/10">
        <div className="container mx-auto px-6 max-w-6xl">
          <h2 className="text-3xl font-bold mb-12">What's included</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {app.features.map((feature: string, index: number) => (
              <div
                key={index}
                className="flex items-start gap-4 p-6 bg-white/[0.02] border border-white/10 rounded-xl hover:bg-white/[0.05] transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <Check className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <p className="text-gray-200">{feature}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 border-b border-white/10 bg-white/[0.01]">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How it works</h2>
            <p className="text-xl text-gray-400">Get started in 3 simple steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Choose Your Plan</h3>
              <p className="text-gray-400">
                Select the pricing that works for you
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Instant Access</h3>
              <p className="text-gray-400">
                Start using the app immediately after purchase
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Customize & Scale</h3>
              <p className="text-gray-400">
                Add your branding and grow your business
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="container mx-auto px-6 max-w-3xl">
          <h2 className="text-3xl font-bold mb-12 text-center">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="p-6 bg-white/[0.02] border border-white/10 rounded-xl">
              <h3 className="font-semibold text-lg mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-gray-400">
                Yes! Cancel your subscription at any time from your dashboard. No questions asked.
              </p>
            </div>

            <div className="p-6 bg-white/[0.02] border border-white/10 rounded-xl">
              <h3 className="font-semibold text-lg mb-2">
                Do I get updates?
              </h3>
              <p className="text-gray-400">
                Yes! All apps receive automatic updates with new features and improvements.
              </p>
            </div>

            <div className="p-6 bg-white/[0.02] border border-white/10 rounded-xl">
              <h3 className="font-semibold text-lg mb-2">
                Can I customize the app?
              </h3>
              <p className="text-gray-400">
                Absolutely! Add your branding, customize features, and make it yours.
              </p>
            </div>

            <div className="p-6 bg-white/[0.02] border border-white/10 rounded-xl">
              <h3 className="font-semibold text-lg mb-2">
                What if I need help?
              </h3>
              <p className="text-gray-400">
                Our support team is available 24/7 to help you get the most out of your app.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      {!userOwnsApp && (
        <section className="border-t border-white/10 bg-gradient-to-b from-transparent to-violet-500/5">
          <div className="container mx-auto px-6 max-w-4xl py-20 text-center">
            <h2 className="text-4xl font-bold mb-6">
              Ready to get started?
            </h2>
            <p className="text-xl text-gray-400 mb-10">
              Join {app.totalCustomers} others using {app.name}
            </p>

            <PurchaseButton
              appId={app.id}
              appName={app.name}
              price={app.pricingModel === 'SUBSCRIPTION' ? app.monthlyPrice : app.oneTimePrice}
              pricingModel={app.pricingModel}
              isAuthenticated={!!session}
              size="lg"
            />

            <p className="text-sm text-gray-500 mt-6">
              30-day money-back guarantee • Secure checkout • Instant access
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

// ============================================================================
// DATA FETCHING
// ============================================================================

async function getAppBySlug(slug: string) {
  const app = await prisma.publishedApp.findFirst({
    where: {
      slug,
      status: 'PUBLISHED',
    },
    include: {
      user: {
        select: {
          name: true,
          image: true,
          email: true,
        },
      },
    },
  });

  if (!app) {
    return null;
  }

  // Parse features from description or metadata
  const features = app.featuresJson
    ? JSON.parse(app.featuresJson)
    : [
        'Full source code access',
        'Regular updates included',
        'Priority support',
        'Customizable branding',
        'No hidden fees',
        'Cancel anytime',
      ];

  return {
    id: app.id,
    name: app.name,
    slug: app.slug,
    description: app.description,
    logoUrl: app.logoUrl,
    previewImageUrl: app.screenshotUrls?.[0],
    deploymentUrl: app.deploymentUrl,
    pricingModel: app.pricingModel,
    monthlyPrice: app.monthlyPrice || 0,
    oneTimePrice: app.oneTimePrice || 0,
    totalCustomers: app.totalCustomers,
    features,
    creator: {
      name: app.user.name || 'Anonymous',
      image: app.user.image,
      email: app.user.email,
    },
  };
}

async function checkUserOwnsApp(email: string, appId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) return false;

  const subscription = await prisma.appSubscription.findFirst({
    where: {
      userId: user.id,
      publishedAppId: appId,
      status: 'ACTIVE',
    },
  });

  return !!subscription;
}
