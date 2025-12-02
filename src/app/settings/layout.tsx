'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, CreditCard, DollarSign, Key, Settings } from 'lucide-react';

const navItems = [
  { icon: User, label: 'Profile', href: '/settings' },
  { icon: CreditCard, label: 'Billing', href: '/settings/billing' },
  { icon: DollarSign, label: 'Monetization', href: '/settings/monetization' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full md:w-64 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </aside>

          {/* Main Content */}
          <div className="flex-1 bg-[#1A1A1C] border border-white/10 rounded-xl p-6 md:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}