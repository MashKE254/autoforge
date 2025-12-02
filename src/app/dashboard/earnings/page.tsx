/**
 * Creator Earnings Dashboard
 * 
 * File: src/app/dashboard/earnings/page.tsx
 * 
 * Shows revenue analytics, transaction history, and payout information.
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Calendar,
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react';

interface EarningsData {
  totalRevenue: number;
  monthlyRevenue: number;
  weeklyRevenue: number;
  todayRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
}

interface Transaction {
  id: string;
  appName: string;
  type: string;
  grossAmount: number;
  netAmount: number;
  status: string;
  customerEmail: string;
  createdAt: string;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  arrivedAt?: string;
}

export default function EarningsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [balance, setBalance] = useState({ available: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transactions' | 'payouts'>('transactions');

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (authStatus === 'authenticated') {
      fetchData();
    }
  }, [authStatus, router]);

  const fetchData = async () => {
    try {
      const [earningsRes, transactionsRes, payoutsRes, balanceRes] = await Promise.all([
        fetch('/api/creator/earnings'),
        fetch('/api/creator/transactions?limit=20'),
        fetch('/api/creator/payouts?limit=10'),
        fetch('/api/creator/balance'),
      ]);

      if (earningsRes.ok) {
        const data = await earningsRes.json();
        setEarnings(data);
      }

      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        setTransactions(data.transactions || []);
      }

      if (payoutsRes.ok) {
        const data = await payoutsRes.json();
        setPayouts(data.payouts || []);
      }

      if (balanceRes.ok) {
        const data = await balanceRes.json();
        setBalance(data);
      }
    } catch (error) {
      console.error('Failed to fetch earnings data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading || authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Earnings</h1>
            <p className="text-gray-400">
              Track your revenue and payouts
            </p>
          </div>
          <Link
            href="/dashboard/billing"
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Billing Settings
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <DollarSign className="w-4 h-4 text-green-400" />
              </div>
              <span className="text-sm text-gray-400">Total Earnings</span>
            </div>
            <p className="text-2xl font-bold">
              {formatCurrency(earnings?.totalRevenue || 0)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Lifetime revenue
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-violet-500/20">
                <TrendingUp className="w-4 h-4 text-violet-400" />
              </div>
              <span className="text-sm text-gray-400">This Month</span>
            </div>
            <p className="text-2xl font-bold">
              {formatCurrency(earnings?.monthlyRevenue || 0)}
            </p>
            <div className="flex items-center gap-1 text-sm mt-1">
              <ArrowUpRight className="w-4 h-4 text-green-400" />
              <span className="text-green-400">+12%</span>
              <span className="text-gray-500">vs last month</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-sm text-gray-400">Transactions</span>
            </div>
            <p className="text-2xl font-bold">
              {earnings?.totalTransactions || 0}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Avg: {formatCurrency(earnings?.averageTransactionValue || 0)}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-yellow-500/20">
                <Calendar className="w-4 h-4 text-yellow-400" />
              </div>
              <span className="text-sm text-gray-400">Available</span>
            </div>
            <p className="text-2xl font-bold">
              {formatCurrency(balance.available)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {formatCurrency(balance.pending)} pending
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'transactions'
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'payouts'
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Payouts
          </button>
        </div>

        {/* Transactions Table */}
        {activeTab === 'transactions' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-sm font-medium text-gray-400">Date</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-400">App</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-400">Customer</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-400">Type</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-400">Amount</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-400">Net</th>
                    <th className="text-center p-4 text-sm font-medium text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500">
                        No transactions yet. Publish an app to start earning!
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-4 text-sm">{formatDate(tx.createdAt)}</td>
                        <td className="p-4 text-sm font-medium">{tx.appName}</td>
                        <td className="p-4 text-sm text-gray-400">{tx.customerEmail}</td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            tx.type === 'SUBSCRIPTION_PAYMENT'
                              ? 'bg-violet-500/20 text-violet-400'
                              : tx.type === 'ONE_TIME_PAYMENT'
                              ? 'bg-blue-500/20 text-blue-400'
                              : tx.type === 'REFUND'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {tx.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-right">
                          {formatCurrency(tx.grossAmount)}
                        </td>
                        <td className="p-4 text-sm text-right font-medium">
                          <span className={tx.netAmount >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {tx.netAmount >= 0 ? '+' : ''}{formatCurrency(tx.netAmount)}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            tx.status === 'SUCCEEDED'
                              ? 'bg-green-500/20 text-green-400'
                              : tx.status === 'PENDING'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payouts Table */}
        {activeTab === 'payouts' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-sm font-medium text-gray-400">Date</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-400">Amount</th>
                    <th className="text-center p-4 text-sm font-medium text-gray-400">Status</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-400">Arrived</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        No payouts yet. Payouts are processed weekly.
                      </td>
                    </tr>
                  ) : (
                    payouts.map((payout) => (
                      <tr key={payout.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-4 text-sm">{formatDate(payout.createdAt)}</td>
                        <td className="p-4 text-sm text-right font-medium">
                          {formatCurrency(payout.amount)}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            payout.status === 'PAID'
                              ? 'bg-green-500/20 text-green-400'
                              : payout.status === 'IN_TRANSIT'
                              ? 'bg-blue-500/20 text-blue-400'
                              : payout.status === 'PENDING'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {payout.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-400">
                          {payout.arrivedAt ? formatDate(payout.arrivedAt) : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20">
          <h3 className="font-semibold mb-2">How payouts work</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>• Payouts are processed automatically every week (Fridays)</li>
            <li>• Funds typically arrive in your bank within 2-3 business days</li>
            <li>• Minimum payout amount is $10</li>
            <li>• Platform fee (8%) is deducted from each transaction</li>
          </ul>
          <Link
            href="/docs/payouts"
            className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300 text-sm mt-4"
          >
            Learn more about payouts
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
