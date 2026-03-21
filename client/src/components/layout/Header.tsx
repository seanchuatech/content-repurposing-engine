import { Bell, User } from 'lucide-react';

export default function Header() {
  return (
    <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-widest">
          Content Repurposing Engine
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <button type="button" className="p-2 text-zinc-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
          <User className="w-5 h-5" />
        </div>
      </div>
    </header>
  );
}
