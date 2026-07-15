import React from 'react';
import { useSecurity } from '../context/SecurityContext';
import { 
  ShieldAlert, 
  LayoutDashboard, 
  Activity, 
  BellRing, 
  ShieldCheck,
  LogOut 
} from 'lucide-react';

export default function Sidebar({ currentPage, setCurrentPage }) {
  const { logout, stats, user } = useSecurity();

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'activity', name: 'Live Activity', icon: Activity },
    { id: 'alerts', name: 'Suspicious Alerts', icon: BellRing, badge: stats.active_alerts },
    { id: 'threat-intel', name: 'Threat Intel Feed', icon: ShieldAlert },
  ];

  return (
    <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200 gap-3">
        <ShieldCheck className="h-8 w-8 text-blue-600 drop-shadow-sm" />
        <div>
          <span className="font-bold text-base text-slate-800 tracking-wider">GUARD</span>
          <span className="font-light text-blue-600 text-xs block -mt-1 tracking-widest">INSIDER SEC</span>
        </div>
      </div>

      {/* Operator Info */}
      <div className="p-4 border-b border-slate-200 bg-slate-100 bg-opacity-60">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-sm font-semibold text-white">
            {user?.name?.split(' ').map(n => n[0]).join('') || 'OP'}
          </div>
          <div className="overflow-hidden">
            <span className="font-semibold text-xs text-slate-700 block truncate">{user?.name || 'Security Operator'}</span>
            <span className="text-slate-500 text-[10px] block truncate uppercase tracking-wider font-semibold">{user?.role || 'Analyst'}</span>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 ${
                isActive 
                  ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200 hover:bg-opacity-50'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-blue-700' : 'text-slate-500'}`} />
              <span>{item.name}</span>
              
              {/* Dynamic Badge */}
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  stats.critical_alerts > 0 
                    ? 'bg-red-600 text-white animate-cyber-pulse' 
                    : 'bg-amber-500 text-slate-950'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / Logout */}
      <div className="p-4 border-t border-slate-200">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-all duration-150"
        >
          <LogOut className="h-4.5 w-4.5 text-slate-500" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
