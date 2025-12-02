'use client';

import { CheckCircle2, Zap } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: '0',
    description: 'Perfect for trying out the platform',
    features: ['10 AI Generations / month', 'Basic App Templates', 'Community Support', 'Subdomain Hosting'],
    current: true,
  },
  {
    name: 'Pro',
    price: '49',
    description: 'For serious builders and startups',
    features: ['Unlimited Generations', 'Advanced Agents & Workflows', 'Custom Domain Export', 'Priority Support', 'Remove Branding'],
    current: false,
    recommended: true,
  },
];

export default function BillingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-1">Subscription & Billing</h2>
        <p className="text-sm text-gray-400">Manage your AutoForge subscription plan</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <div 
            key={plan.name}
            className={`relative p-6 rounded-xl border ${
              plan.recommended 
                ? 'bg-violet-500/10 border-violet-500/50' 
                : 'bg-[#0A0A0B] border-white/10'
            }`}
          >
            {plan.recommended && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-violet-500 text-white text-xs font-bold rounded-full">
                RECOMMENDED
              </span>
            )}
            
            <div className="mb-4">
              <h3 className="text-lg font-bold">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-bold">${plan.price}</span>
                <span className="text-gray-500">/mo</span>
              </div>
              <p className="text-sm text-gray-400 mt-2">{plan.description}</p>
            </div>

            <ul className="space-y-3 mb-8">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className={`w-4 h-4 mt-0.5 ${plan.recommended ? 'text-violet-400' : 'text-gray-500'}`} />
                  <span className="text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              disabled={plan.current}
              className={`w-full py-2.5 rounded-lg font-medium transition-all ${
                plan.current
                  ? 'bg-white/10 text-gray-400 cursor-default'
                  : 'bg-white text-black hover:bg-gray-100 hover:scale-[1.02]'
              }`}
            >
              {plan.current ? 'Current Plan' : 'Upgrade Now'}
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-4">
        <div className="p-2 bg-blue-500/20 rounded-lg h-fit">
          <Zap className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h4 className="font-medium text-blue-400 mb-1">Enterprise Needs?</h4>
          <p className="text-sm text-gray-400 mb-2">
            Need on-premise deployment, SLA support, or custom model fine-tuning?
          </p>
          <button className="text-sm font-medium text-white underline decoration-blue-400 underline-offset-4 hover:text-blue-400 transition-colors">
            Contact Sales
          </button>
        </div>
      </div>
    </div>
  );
}