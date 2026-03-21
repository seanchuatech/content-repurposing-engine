import {
  Download,
  Film,
  FolderOpen,
  LayoutDashboard,
  Settings,
  Upload,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects', icon: FolderOpen, label: 'Projects' },
    { to: '/downloader', icon: Download, label: 'Downloader' },
    { to: '/upload', icon: Upload, label: 'Upload' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Film className="w-6 h-6 text-white" />
        </div>
        <span className="font-bold text-xl tracking-tight text-white">ClipEngine</span>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(79,70,229,0.1)]'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100 border border-transparent'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-zinc-800/50">
        {user && (
          <div className="mb-4 px-3 py-3 rounded-xl bg-zinc-800/30 border border-zinc-800/50">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                <UserIcon className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-100 truncate">{user.name || 'User'}</p>
                <p className="text-xs text-zinc-500 truncate">{user.email}</p>
              </div>
            </div>
            
            {user.role === 'user' && (
              <button 
                type="button"
                className="w-full py-2 mb-2 px-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-lg shadow-indigo-500/20 cursor-pointer"
              >
                Upgrade to Pro
              </button>
            )}

            <button 
              type="button"
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 px-3 py-2 text-xs text-zinc-500">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          <span className="font-medium">System Online</span>
        </div>
      </div>
    </aside>
  );
}
