import { Cpu, Save, Shield, Sliders, Sparkles, CreditCard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

const WHISPER_MODELS = {
  groq: [
    { value: 'whisper-large-v3', label: 'Whisper Large V3 (Best Accuracy)' },
    {
      value: 'whisper-large-v3-turbo',
      label: 'Whisper Large V3 Turbo (Fastest)',
    },
  ],
};

const LLM_MODELS = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o (Most Capable)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cheap)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  gemini: [
    {
      value: 'gemini-2.5-flash-lite',
      label: 'Gemini 2.5 Flash-Lite (Highest Free Limits)',
    },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Best Balance)' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Max Reasoning)' },
  ],
};

export default function SettingsPage() {
  const { token, subscriptionStatus } = useAuth();
  const [settings, setSettings] = useState({
    whisperModel: 'whisper-large-v3',
    llmBackend: 'openai' as 'openai' | 'gemini',
    llmModel: 'gpt-4o',
    exportQuality: 'high',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      if (!token) return;
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/settings`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setSettings({
            whisperModel: data.whisperModel,
            llmBackend:
              data.llmBackend === 'ollama'
                ? 'openai'
                : (data.llmBackend as 'openai' | 'gemini'),
            llmModel: data.llmBackend === 'ollama' ? 'gpt-4o' : data.llmModel,
            exportQuality: data.exportQuality,
          });
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, [token]);

  const handleProviderChange = (provider: 'openai' | 'gemini') => {
    const defaultModel = LLM_MODELS[provider][0].value;
    setSettings({
      ...settings,
      llmBackend: provider,
      llmModel: defaultModel,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/settings`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully' });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpgrade = async () => {
    if (!token) return;
    setBillingLoading(true);
    try {
      const { url } = await api.createCheckoutSession(token);
      window.location.href = url;
    } catch (err) {
      console.error('Failed to create checkout session:', err);
    } finally {
      setBillingLoading(false);
    }
  };

  const handlePortal = async () => {
    if (!token) return;
    setBillingLoading(true);
    try {
      const { url } = await api.createPortalSession(token);
      window.location.href = url;
    } catch (err) {
      console.error('Failed to create portal session:', err);
    } finally {
      setBillingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isSubscribed = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-zinc-400">
          Configure global AI models and processing parameters.
        </p>
      </div>

      <div className="space-y-6">
        {message && (
          <div
            className={`p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}
          >
            <Shield className="w-5 h-5" />
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        {/* Subscription Section */}
        <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            Subscription
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-400">Status:</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                  isSubscribed
                    ? 'bg-green-500/10 text-green-400 ring-green-500/20'
                    : 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/20'
                }`}>
                  {isSubscribed ? 'Pro Active' : 'Basic Tier'}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {isSubscribed ? 'You have full access to all AI features.' : 'Upgrade to Pro to unlock AI transcription and reframing.'}
              </p>
            </div>
            <button
              onClick={isSubscribed ? handlePortal : handleUpgrade}
              disabled={billingLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50"
            >
              {billingLoading ? 'Loading...' : isSubscribed ? 'Manage Billing' : 'Upgrade to Pro'}
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Transcription Settings */}
            <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-400" />
                Transcription
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
                    Backend
                  </label>
                  <select
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:border-indigo-500 outline-none transition-colors opacity-70 cursor-not-allowed"
                    value="groq"
                    disabled
                  >
                    <option value="groq">Groq (Cloud / Free Tier)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
                    Model
                  </label>
                  <select
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:border-indigo-500 outline-none transition-colors"
                    value={settings.whisperModel}
                    onChange={(e) =>
                      setSettings({ ...settings, whisperModel: e.target.value })
                    }
                  >
                    {(
                      WHISPER_MODELS['groq'] || []
                    ).map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* AI Analysis Settings */}
            <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                AI Analysis
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
                    LLM Provider
                  </label>
                  <select
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:border-indigo-500 outline-none transition-colors"
                    value={settings.llmBackend}
                    onChange={(e) =>
                      handleProviderChange(e.target.value as 'openai' | 'gemini')
                    }
                  >
                    <option value="openai">OpenAI (Cloud)</option>
                    <option value="gemini">Gemini (Cloud / Free Tier)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">
                    Model Name
                  </label>
                  <select
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:border-indigo-500 outline-none transition-colors"
                    value={settings.llmModel}
                    onChange={(e) =>
                      setSettings({ ...settings, llmModel: e.target.value })
                    }
                  >
                    {(
                      LLM_MODELS[
                        settings.llmBackend as keyof typeof LLM_MODELS
                      ] || []
                    ).map((model: any) => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Export Settings */}
            <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-6 md:col-span-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                Export Quality
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['low', 'medium', 'high'].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setSettings({ ...settings, exportQuality: q })}
                    className={`p-4 rounded-xl border font-bold capitalize transition-all ${
                      settings.exportQuality === q
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                    }`}
                  >
                    {q} Quality
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3 bg-white hover:bg-zinc-200 text-zinc-950 rounded-xl font-bold shadow-xl transition-all disabled:opacity-50"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
