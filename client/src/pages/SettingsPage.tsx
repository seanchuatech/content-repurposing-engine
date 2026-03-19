import { useState, useEffect } from 'react';
import { Save, Shield, Cpu, Sparkles, Sliders } from 'lucide-react';

const API_BASE_URL = 'http://localhost:3000/api';

const LLM_MODELS = {
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o (Most Capable)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cheap)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  ollama: [
    { value: 'phi3:latest', label: 'Phi-3 Mini (Fastest / Recommended)' },
    { value: 'mistral', label: 'Mistral 7B (Good Balance)' },
    { value: 'llama3', label: 'Llama 3 8B (Smartest / Slower)' },
    { value: 'gemma:2b', label: 'Gemma 2B (Very Light)' },
    { value: 'qwen2:1.5b', label: 'Qwen 2 1.5B (Ultra Fast)' },
  ],
};

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    whisperModel: 'base',
    llmBackend: 'openai' as 'openai' | 'ollama',
    llmModel: 'gpt-4o',
    exportQuality: 'high',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch(`${API_BASE_URL}/settings`);
        if (response.ok) {
          const data = await response.json();
          setSettings({
            whisperModel: data.whisperModel,
            llmBackend: data.llmBackend as 'openai' | 'ollama',
            llmModel: data.llmModel,
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
  }, []);

  const handleProviderChange = (provider: 'openai' | 'ollama') => {
    const defaultModel = LLM_MODELS[provider][0].value;
    setSettings({
      ...settings,
      llmBackend: provider,
      llmModel: defaultModel,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-zinc-400">Configure global AI models and processing parameters.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            <Shield className="w-5 h-5" />
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Transcription Settings */}
          <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              Transcription
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Whisper Model</label>
                <select 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:border-indigo-500 outline-none transition-colors"
                  value={settings.whisperModel}
                  onChange={(e) => setSettings({ ...settings, whisperModel: e.target.value })}
                >
                  <option value="tiny">Tiny (Fastest, CPU friendly)</option>
                  <option value="base">Base (Balanced)</option>
                  <option value="small">Small (Better accuracy)</option>
                  <option value="medium">Medium (High accuracy)</option>
                  <option value="large-v3">Large v3 (Professional quality)</option>
                </select>
                <p className="mt-2 text-[10px] text-zinc-500 italic">
                  Note: Larger models require more RAM and CPU/GPU resources.
                </p>
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
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">LLM Provider</label>
                <select 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:border-indigo-500 outline-none transition-colors"
                  value={settings.llmBackend}
                  onChange={(e) => handleProviderChange(e.target.value as 'openai' | 'ollama')}
                >
                  <option value="openai">OpenAI (Cloud)</option>
                  <option value="ollama">Ollama (Local)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Model Name</label>
                <select 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:border-indigo-500 outline-none transition-colors"
                  value={settings.llmModel}
                  onChange={(e) => setSettings({ ...settings, llmModel: e.target.value })}
                >
                  {LLM_MODELS[settings.llmBackend].map((model) => (
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
  );
}
