import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { RefreshCw, Search, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';

export default function Navbar({ title }) {
  const { refreshData, stats, refreshIntel, loading } = useSecurity();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    await refreshIntel();
    setRefreshing(false);
  };

  const getSystemStatus = () => {
    if (stats.critical_alerts > 0) {
      return {
        text: 'System Threat Level: CRITICAL',
        color: 'text-red-700 bg-red-50 border border-red-200 shadow-sm',
        icon: ShieldAlert
      };
    } else if (stats.high_alerts > 0) {
      return {
        text: 'System Threat Level: ELEVATED',
        color: 'text-amber-700 bg-amber-50 border border-amber-200 shadow-sm',
        icon: Shield
      };
    }
    return {
      text: 'System Status: SECURE',
      color: 'text-emerald-700 bg-emerald-50 border border-emerald-100',
      icon: ShieldCheck
    };
  };

  const status = getSystemStatus();
  const StatusIcon = status.icon;

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <h1 className="text-base font-bold text-slate-800">{title}</h1>
        
        {/* Dynamic Threat Level Indicator */}
        <div className={`flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold ${status.color}`}>
          <StatusIcon className="h-3.5 w-3.5" />
          <span>{status.text}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Search employee profiles..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-4 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
        </div>

        {/* Global Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3.5 py-2 rounded-lg border border-slate-200 transition-all font-semibold disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          <span>{refreshing ? 'Syncing...' : 'Sync System'}</span>
        </button>
      </div>
    </header>
  );
}
