'use client';

/**
 * AutoForge Header - v0.dev/bolt.new Style
 * 
 * File: src/components/header.tsx
 * 
 * Sleek, minimal header with glass effect
 * Updated with Recommender link and monetization links (Billing, Earnings)
 */

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import {
  Menu,
  X,
  ChevronDown,
  LogOut,
  Settings,
  CreditCard,
  HelpCircle,
  DollarSign,
  Sparkles,
  Lightbulb,
} from 'lucide-react';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/recommend', label: 'Recommender', icon: Lightbulb },
  { href: '/projects', label: 'Projects' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
];

export default function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Don't show header on landing page
  if (pathname === '/') return null;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0A0A0B]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Image 
                src="/BASED IN.png" 
                alt="AutoForge Logo" 
                width={50} 
                height={50} 
                className="rounded-lg" 
              />
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
                const IconComponent = 'icon' in link ? link.icon : null;
                
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                      isActive
                        ? 'text-white bg-white/10'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    } ${link.href === '/recommend' ? 'text-violet-400 hover:text-violet-300' : ''}`}
                  >
                    {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {session ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-sm font-medium text-white">
                    {session.user?.name?.[0] || session.user?.email?.[0] || 'U'}
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setUserMenuOpen(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-[#1A1A1C] border border-white/10 rounded-xl shadow-2xl z-50 py-2 animate-scale-in origin-top-right">
                      {/* User Info */}
                      <div className="px-4 py-2 border-b border-white/10">
                        <p className="text-sm font-medium text-white truncate">
                          {session.user?.name || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {session.user?.email}
                        </p>
                      </div>

                      {/* Main Links */}
                      <div className="py-1">
                        <Link
                          href="/recommend"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-violet-400 hover:text-violet-300 hover:bg-white/5"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Lightbulb className="w-4 h-4" />
                          Software Recommender
                        </Link>
                        <Link
                          href="/settings"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="w-4 h-4" />
                          Settings
                        </Link>
                        <Link
                          href="/dashboard/billing"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <CreditCard className="w-4 h-4" />
                          Billing
                        </Link>
                        <Link
                          href="/dashboard/earnings"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <DollarSign className="w-4 h-4" />
                          Earnings
                        </Link>
                        <Link
                          href="/help"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <HelpCircle className="w-4 h-4" />
                          Help
                        </Link>
                      </div>

                      {/* Upgrade CTA (show if not subscribed) */}
                      <div className="border-t border-white/10 py-1">
                        <Link
                          href="/pricing"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-violet-400 hover:text-violet-300 hover:bg-white/5"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Sparkles className="w-4 h-4" />
                          Upgrade Plan
                        </Link>
                      </div>

                      {/* Sign Out */}
                      <div className="border-t border-white/10 py-1">
                        <button
                          onClick={() => signOut()}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/5"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signin"
                  className="px-4 py-1.5 text-sm font-medium bg-white text-black rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0A0A0B]">
          <nav className="px-4 py-4 space-y-1">
            {navLinks.map((link) => {
              const IconComponent = 'icon' in link ? link.icon : null;
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    pathname === link.href || pathname.startsWith(link.href + '/')
                      ? 'text-white bg-white/10'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  } ${link.href === '/recommend' ? 'text-violet-400' : ''}`}
                >
                  {IconComponent && <IconComponent className="w-4 h-4" />}
                  {link.label}
                </Link>
              );
            })}
            
            {/* Mobile-only links when logged in */}
            {session && (
              <>
                <div className="border-t border-white/10 my-2 pt-2">
                  <Link
                    href="/recommend"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-violet-400 hover:text-violet-300 hover:bg-white/5"
                  >
                    <Lightbulb className="w-4 h-4" />
                    Software Recommender
                  </Link>
                  <Link
                    href="/dashboard/billing"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
                  >
                    <CreditCard className="w-4 h-4" />
                    Billing
                  </Link>
                  <Link
                    href="/dashboard/earnings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
                  >
                    <DollarSign className="w-4 h-4" />
                    Earnings
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </div>
                <div className="border-t border-white/10 my-2 pt-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut();
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-white/5"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}