import React, { useState } from 'react';
import { Check, Shield, Zap, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

const PricingPage: React.FC = () => {
  const { token, subscriptionStatus } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const { url } = await api.createCheckoutSession(token);
      window.location.href = url;
    } catch (err: any) {
      console.error('Failed to create checkout session:', err);
      setError(err.message || 'Failed to initiate checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isSubscribed = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

  return (
    <div className="min-h-full bg-slate-950 px-6 py-12 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-base font-semibold leading-7 text-indigo-400">Pricing</h2>
        <p className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Everything you need to grow your channel
        </p>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          Transform your long-form content into viral shorts with AI-powered transcription, analysis, and framing.
        </p>
      </div>

      <div className="mx-auto mt-16 max-w-lg rounded-3xl bg-slate-900 ring-1 ring-slate-800 p-8 sm:mt-20 lg:mx-0 lg:flex lg:max-w-none lg:items-center">
        <div className="p-8 sm:p-10 lg:flex-auto">
          <h3 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Pro Plan
            <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2 py-1 text-xs font-medium text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
              Popular
            </span>
          </h3>
          <p className="mt-6 text-base leading-7 text-slate-300">
            Perfect for content creators looking to maximize their reach across TikTok, Reels, and Shorts.
          </p>
          <div className="mt-10 flex items-center gap-x-4">
            <h4 className="flex-none text-sm font-semibold leading-6 text-indigo-400">What's included</h4>
            <div className="h-px flex-auto bg-slate-800" />
          </div>
          <ul role="list" className="mt-8 grid grid-cols-1 gap-4 text-sm leading-6 text-slate-300 sm:grid-cols-2 sm:gap-6">
            <li className="flex gap-x-3">
              <Check className="h-6 w-5 flex-none text-indigo-400" />
              Unlimited AI Transcriptions
            </li>
            <li className="flex gap-x-3">
              <Check className="h-6 w-5 flex-none text-indigo-400" />
              Viral Moment Analysis
            </li>
            <li className="flex gap-x-3">
              <Check className="h-6 w-5 flex-none text-indigo-400" />
              Smart 9:16 Reframing
            </li>
            <li className="flex gap-x-3">
              <Check className="h-6 w-5 flex-none text-indigo-400" />
              Auto-Captioning & Burn-in
            </li>
            <li className="flex gap-x-3">
              <Check className="h-6 w-5 flex-none text-indigo-400" />
              YouTube URL Import
            </li>
            <li className="flex gap-x-3">
              <Check className="h-6 w-5 flex-none text-indigo-400" />
              High-Quality Exports
            </li>
          </ul>
        </div>
        <div className="-mt-2 p-2 lg:mt-0 lg:w-full lg:max-w-md lg:shrink-0">
          <div className="rounded-2xl bg-slate-800/50 py-10 text-center ring-1 ring-inset ring-slate-700/50 lg:flex lg:flex-col lg:justify-center lg:py-16">
            <div className="mx-auto max-w-xs px-8">
              <p className="text-base font-semibold text-slate-300">Monthly subscription</p>
              <p className="mt-6 flex items-baseline justify-center gap-x-2">
                <span className="text-5xl font-bold tracking-tight text-white">$29</span>
                <span className="text-sm font-semibold leading-6 tracking-wide text-slate-400">/month</span>
              </p>
              {error && (
                <p className="mt-4 text-sm text-red-400">{error}</p>
              )}
              <button
                onClick={handleSubscribe}
                disabled={isLoading || isSubscribed}
                className={`mt-10 block w-full rounded-md px-3 py-2 text-center text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-all ${
                  isSubscribed 
                    ? 'bg-emerald-600 cursor-default' 
                    : 'bg-indigo-600 hover:bg-indigo-500 focus-visible:outline-indigo-600'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Processing...
                  </div>
                ) : isSubscribed ? (
                  'Already Subscribed'
                ) : (
                  'Get access now'
                )}
              </button>
              <p className="mt-6 text-xs leading-5 text-slate-400">
                Secure payment via Stripe. Cancel anytime.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
        <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
          <div className="flex flex-col">
            <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-white">
              <Shield className="h-5 w-5 flex-none text-indigo-400" />
              Secure Infrastructure
            </dt>
            <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-400">
              <p className="flex-auto">Your content and data are protected with industry-standard encryption and security practices.</p>
            </dd>
          </div>
          <div className="flex flex-col">
            <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-white">
              <Zap className="h-5 w-5 flex-none text-indigo-400" />
              Fast Processing
            </dt>
            <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-400">
              <p className="flex-auto">Our distributed worker nodes handle video processing in minutes, not hours.</p>
            </dd>
          </div>
          <div className="flex flex-col">
            <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-white">
              <Star className="h-5 w-5 flex-none text-indigo-400" />
              Pro Features
            </dt>
            <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-slate-400">
              <p className="flex-auto">Access advanced AI models for better viral scores and highly accurate transcriptions.</p>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
};

export default PricingPage;
