/**
 * PARTNER/FRANCHISE PROGRAM
 *
 * File: src/app/partners/page.tsx
 *
 * Three-tier partner program:
 * 1. Affiliate - Earn referral commissions (20%)
 * 2. Agency - White-label for clients (30% revenue share)
 * 3. Reseller - Own branded instance (40% revenue share + white-label)
 */

import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  Sparkles,
  TrendingUp,
  Users,
  DollarSign,
  Check,
  ArrowRight,
  Rocket,
  Star,
  Building2,
  Globe,
  Zap,
  Code,
  BarChart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import PartnerSignupButton from '@/components/partners/PartnerSignupButton';

export const metadata = {
  title: 'Partner Program - Earn with AutoForge',
  description: 'Join our partner program and earn revenue by promoting AutoForge',
};

interface PartnerTier {
  id: 'affiliate' | 'agency' | 'reseller';
  name: string;
  tagline: string;
  icon: any;
  commission: string;
  color: string;
  gradient: string;
  features: string[];
  bestFor: string;
  earnings: string;
}

const PARTNER_TIERS: PartnerTier[] = [
  {
    id: 'affiliate',
    name: 'Affiliate',
    tagline: 'Earn by referring',
    icon: TrendingUp,
    commission: '20%',
    color: 'blue',
    gradient: 'from-blue-600 to-cyan-600',
    features: [
      'Unique referral link',
      '20% recurring commission',
      'Real-time analytics dashboard',
      'Marketing materials provided',
      'No approval needed',
      'Instant payouts',
    ],
    bestFor: 'Content creators, influencers, bloggers',
    earnings: 'Earn $9.80/mo per referral on STARTER plan',
  },
  {
    id: 'agency',
    name: 'Agency',
    tagline: 'Build for clients',
    icon: Building2,
    commission: '30%',
    color: 'purple',
    gradient: 'from-purple-600 to-pink-600',
    features: [
      'White-label client delivery',
      '30% revenue share on client apps',
      'Priority support & training',
      'Client management dashboard',
      'Custom branding options',
      'Dedicated account manager',
    ],
    bestFor: 'Development agencies, consultants, freelancers',
    earnings: 'Earn $14.70/mo per client app on STARTER plan',
  },
  {
    id: 'reseller',
    name: 'Reseller',
    tagline: 'Own branded platform',
    icon: Globe,
    commission: '40%',
    color: 'green',
    gradient: 'from-green-600 to-emerald-600',
    features: [
      'Fully white-labeled instance',
      '40% revenue share on all sales',
      'Custom domain & branding',
      'Full control over pricing',
      'Dedicated infrastructure',
      'Enterprise support',
    ],
    bestFor: 'Enterprises, platforms, educators',
    earnings: 'Earn $19.60/mo per customer on STARTER plan',
  },
];

export default async function PartnersPage() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen text-white">
      {/* Hero Section */}
      <section className="relative border-b border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 w-1/2 h-full bg-gradient-to-br from-violet-500/20 to-transparent rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-1/2 -left-1/4 w-1/2 h-full bg-gradient-to-tr from-cyan-500/20 to-transparent rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="container mx-auto px-6 max-w-6xl py-24 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-400 text-sm mb-8">
              <Star className="w-4 h-4" />
              <span>Earn Passive Income</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Turn <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">AutoForge</span> Into
              <br />
              Your Revenue Stream
            </h1>

            <p className="text-xl md:text-2xl text-gray-400 mb-12 leading-relaxed">
              Join our partner program and earn recurring revenue by promoting AutoForge.
              <br className="hidden md:block" />
              Choose from three tiers based on your business model.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl">
                <div className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-2">
                  $2.4M+
                </div>
                <p className="text-gray-400">Paid to partners in 2024</p>
              </div>

              <div className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl">
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                  2,400+
                </div>
                <p className="text-gray-400">Active partners worldwide</p>
              </div>

              <div className="p-6 bg-white/[0.02] border border-white/10 rounded-2xl">
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                  40%
                </div>
                <p className="text-gray-400">Up to 40% commission</p>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="#tiers">
                <Button size="lg" className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-lg px-8">
                  <Rocket className="w-5 h-5 mr-2" />
                  Become a Partner
                </Button>
              </Link>

              <a href="#how-it-works">
                <Button size="lg" variant="outline" className="border-white/10 hover:bg-white/[0.05] text-lg px-8">
                  How It Works
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Tiers */}
      <section id="tiers" className="py-24 scroll-mt-20">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Choose Your Partner Tier
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Each tier is designed for different business models. Start as an affiliate and upgrade anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PARTNER_TIERS.map((tier, index) => (
              <div
                key={tier.id}
                className={`group relative ${
                  index === 1 ? 'md:scale-105' : ''
                }`}
              >
                {/* Popular badge */}
                {index === 1 && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <div className="px-4 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold rounded-full">
                      Most Popular
                    </div>
                  </div>
                )}

                {/* Glow effect */}
                <div className={`absolute -inset-0.5 bg-gradient-to-r ${tier.gradient} rounded-3xl opacity-0 blur transition-all duration-500 group-hover:opacity-75`} />

                {/* Card */}
                <div className="relative h-full bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:border-white/20 transition-all">
                  {/* Icon */}
                  <div className={`w-16 h-16 bg-gradient-to-br ${tier.gradient} rounded-2xl flex items-center justify-center mb-6`}>
                    <tier.icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Header */}
                  <h3 className="text-3xl font-bold mb-2">{tier.name}</h3>
                  <p className="text-gray-400 mb-6">{tier.tagline}</p>

                  {/* Commission */}
                  <div className="mb-8">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className={`text-5xl font-bold bg-gradient-to-r ${tier.gradient} bg-clip-text text-transparent`}>
                        {tier.commission}
                      </span>
                      <span className="text-gray-500">commission</span>
                    </div>
                    <p className="text-sm text-gray-400">{tier.earnings}</p>
                  </div>

                  {/* Features */}
                  <div className="space-y-4 mb-8">
                    {tier.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${tier.gradient} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Best for */}
                  <div className="p-4 bg-white/[0.05] border border-white/10 rounded-xl mb-8">
                    <p className="text-xs text-gray-500 mb-1">Best for:</p>
                    <p className="text-sm text-gray-300">{tier.bestFor}</p>
                  </div>

                  {/* CTA */}
                  <PartnerSignupButton
                    tier={tier.id}
                    tierName={tier.name}
                    isAuthenticated={!!session}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 border-t border-white/10 bg-white/[0.01] scroll-mt-20">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              How It Works
            </h2>
            <p className="text-xl text-gray-400">
              Start earning in 3 simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <h3 className="text-2xl font-semibold mb-4">Sign Up</h3>
              <p className="text-gray-400">
                Choose your tier and create your partner account in minutes
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <h3 className="text-2xl font-semibold mb-4">Promote</h3>
              <p className="text-gray-400">
                Share your unique link or build apps for clients
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h3 className="text-2xl font-semibold mb-4">Earn</h3>
              <p className="text-gray-400">
                Get paid monthly via Stripe Connect or bank transfer
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24 border-t border-white/10">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Why Partner With AutoForge?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-8 bg-white/[0.02] border border-white/10 rounded-2xl">
              <div className="w-14 h-14 rounded-xl bg-violet-500/20 flex items-center justify-center mb-6">
                <DollarSign className="w-7 h-7 text-violet-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Recurring Revenue</h3>
              <p className="text-gray-400">
                Earn monthly commissions as long as your referrals stay subscribed
              </p>
            </div>

            <div className="p-8 bg-white/[0.02] border border-white/10 rounded-2xl">
              <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center mb-6">
                <BarChart className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Real-Time Analytics</h3>
              <p className="text-gray-400">
                Track clicks, conversions, and earnings in your dashboard
              </p>
            </div>

            <div className="p-8 bg-white/[0.02] border border-white/10 rounded-2xl">
              <div className="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center mb-6">
                <Zap className="w-7 h-7 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Fast Payouts</h3>
              <p className="text-gray-400">
                Get paid on the 1st of every month via Stripe Connect
              </p>
            </div>

            <div className="p-8 bg-white/[0.02] border border-white/10 rounded-2xl">
              <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center mb-6">
                <Code className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Marketing Materials</h3>
              <p className="text-gray-400">
                Access banners, landing pages, and email templates
              </p>
            </div>

            <div className="p-8 bg-white/[0.02] border border-white/10 rounded-2xl">
              <div className="w-14 h-14 rounded-xl bg-pink-500/20 flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-pink-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Dedicated Support</h3>
              <p className="text-gray-400">
                Partner success team to help you maximize earnings
              </p>
            </div>

            <div className="p-8 bg-white/[0.02] border border-white/10 rounded-2xl">
              <div className="w-14 h-14 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-6">
                <Star className="w-7 h-7 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">No Limits</h3>
              <p className="text-gray-400">
                Unlimited referrals, unlimited earnings potential
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 border-t border-white/10 bg-white/[0.01]">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              What Partners Say
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-white/[0.02] border border-white/10 rounded-2xl">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                ))}
              </div>
              <p className="text-gray-300 mb-6 italic">
                "I've made over $12,000 in my first 3 months as an affiliate. The dashboard makes it easy to track everything."
              </p>
              <p className="font-semibold">Sarah Johnson</p>
              <p className="text-sm text-gray-500">Tech YouTuber</p>
            </div>

            <div className="p-8 bg-white/[0.02] border border-white/10 rounded-2xl">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                ))}
              </div>
              <p className="text-gray-300 mb-6 italic">
                "As an agency, we build apps for clients using AutoForge. The white-label option is perfect and we keep 30%."
              </p>
              <p className="font-semibold">Michael Chen</p>
              <p className="text-sm text-gray-500">Agency Owner</p>
            </div>

            <div className="p-8 bg-white/[0.02] border border-white/10 rounded-2xl">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                ))}
              </div>
              <p className="text-gray-300 mb-6 italic">
                "The reseller program lets us offer AutoForge to our enterprise clients under our brand. Game changer."
              </p>
              <p className="font-semibold">Lisa Martinez</p>
              <p className="text-sm text-gray-500">Platform Director</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-white/10 bg-gradient-to-b from-transparent to-violet-500/5">
        <div className="container mx-auto px-6 max-w-4xl py-24 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Start Earning?
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Join 2,400+ partners earning passive income with AutoForge
          </p>

          <Link href="#tiers">
            <Button size="lg" className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-lg px-12 py-6">
              <Rocket className="w-5 h-5 mr-2" />
              Become a Partner Today
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>

          <p className="text-sm text-gray-500 mt-6">
            No application fee • No monthly minimums • Cancel anytime
          </p>
        </div>
      </section>
    </div>
  );
}
