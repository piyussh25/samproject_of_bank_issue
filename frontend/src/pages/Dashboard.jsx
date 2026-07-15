import React from 'react';
import { useSecurity } from '../context/SecurityContext';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Users, 
  Bell, 
  AlertOctagon, 
  Globe, 
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';

export default function Dashboard({ setCurrentPage, setSelectedUserId, setSelectedSessionId }) {
  const { stats, alerts, threatIntel } = useSecurity();

  // Prepare chart data for risk distribution
  const pieData = [
    { name: 'Low Risk', value: stats.risk_distribution?.Low || 0, color: '#0F766E' },
    { name: 'Medium Risk', value: stats.risk_distribution?.Medium || 0, color: '#B45309' },
    { name: 'High Risk', value: stats.risk_distribution?.High || 0, color: '#B91C1C' },
    { name: 'Critical Risk', value: stats.risk_distribution?.Critical || 0, color: '#6D28D9' }
  ].filter(item => item.value > 0);

  // Fallback pie data if stats not loaded yet
  const displayPieData = pieData.length > 0 ? pieData : [
    { name: 'Low Risk', value: 95, color: '#0F766E' },
    { name: 'Medium Risk', value: 3, color: '#B45309' },
    { name: 'High Risk', value: 1, color: '#B91C1C' },
    { name: 'Critical Risk', value: 1, color: '#6D28D9' }
  ];

  // Mock trend data based on alerts list
  const trendData = [
    { name: '07/10', Low: 25, Med: 1, High: 0, Crit: 0 },
    { name: '07/11', Low: 32, Med: 2, High: 1, Crit: 0 },
    { name: '07/12', Low: 28, Med: 1, High: 0, Crit: 1 },
    { name: '07/13', Low: 35, Med: 3, High: 1, Crit: 0 },
    { name: '07/14', Low: 40, Med: 4, High: 2, Crit: 1 }
  ];

  const statCards = [
    { title: 'Total Checked Sessions', value: stats.total_sessions || 150, icon: Users, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { title: 'Active Incidents', value: stats.active_alerts || 0, icon: Bell, color: 'text-amber-600 bg-amber-50 border-amber-100' },
    { title: 'Critical Threats Flagged', value: stats.critical_alerts || 0, icon: AlertOctagon, color: 'text-red-600 bg-red-50 border-red-100 animate-pulse' },
    { title: 'Blocked Threat IPs', value: stats.threat_intel?.blocked_ips_count || 9, icon: Globe, color: 'text-purple-600 bg-purple-50 border-purple-100' }
  ];

  const handleViewAlert = (alert) => {
    setSelectedUserId(alert.user_id);
    setSelectedSessionId(alert.session_id);
    setCurrentPage('user-details');
  };

  return (
    <div className="p-8 space-y-8 overflow-y-auto max-h-[calc(100vh-4rem)]">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-slate-500 text-[10px] uppercase tracking-wider block font-bold">{card.title}</span>
                <span className="text-2xl font-bold text-slate-800 block mt-1">{card.value}</span>
              </div>
              <div className={`h-11 w-11 rounded-lg flex items-center justify-center border ${card.color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-slate-800 font-bold text-sm mb-6 flex items-center gap-1.5">
            <Zap className="h-4.5 w-4.5 text-blue-600" />
            <span>Privileged User Risk Profile Timeline</span>
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Line type="monotone" dataKey="Low" name="Normal (Low)" stroke="#0F766E" strokeWidth={2} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Med" name="Suspicious (Medium)" stroke="#B45309" strokeWidth={2} />
                <Line type="monotone" dataKey="High" name="High Risk" stroke="#B91C1C" strokeWidth={2} />
                <Line type="monotone" dataKey="Crit" name="Critical Block" stroke="#6D28D9" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Share Pie Chart */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-slate-800 font-bold text-sm mb-6">User Risk Composition</h3>
          <div className="h-60 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {displayPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} sessions`, 'Session Count']} contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Summary Label */}
            <div className="absolute text-center">
              <span className="text-slate-500 text-[10px] uppercase tracking-wider block font-bold">Scanned logs</span>
              <span className="text-xl font-bold text-slate-800">{stats.total_sessions || 150}</span>
            </div>
          </div>
          
          {/* Custom Legends */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {displayPieData.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></span>
                <span className="text-slate-600 truncate">{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts & Threat Intel Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Alert Center */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-slate-800 font-bold text-sm flex items-center gap-2">
              <Bell className="h-4.5 w-4.5 text-amber-500" />
              <span>Real-Time Security Incident Feed</span>
            </h3>
            <button 
              onClick={() => setCurrentPage('alerts')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 hover:underline"
            >
              <span>View All Incident Logs</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {alerts.filter(a => a.status === 'OPEN' || a.status === 'INVESTIGATING').length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-lg">
                <ShieldCheck className="h-8 w-8 text-emerald-500 opacity-60 mb-2" />
                <span className="text-xs font-semibold">No open security anomalies flagged</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Continuous monitoring active</span>
              </div>
            ) : (
              alerts.filter(a => a.status === 'OPEN' || a.status === 'INVESTIGATING').map((alert) => (
                <div 
                  key={alert._id} 
                  className={`p-4 rounded-lg border flex items-start justify-between gap-4 bg-slate-50 hover:bg-slate-100 hover:bg-opacity-80 transition-all cursor-pointer ${
                    alert.risk_level === 'Critical' 
                      ? 'border-red-200 hover:border-red-300' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => handleViewAlert(alert)}
                >
                  <div className="space-y-1 truncate">
                    <div className="flex items-center gap-2.5">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                        alert.risk_level === 'Critical' ? 'bg-red-600 animate-pulse' : 'bg-amber-500'
                      }`}></span>
                      <span className="font-semibold text-xs text-slate-700">{alert.employee_name} ({alert.user_id})</span>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded shrink-0 ${
                        alert.risk_level === 'Critical' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {alert.risk_level}
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs truncate font-mono">
                      {alert.reasons?.[0] || 'Behavioral anomaly detected'}
                    </p>
                    <div className="text-[9px] text-slate-500">
                      Timestamp: {alert.timestamp} | Role: {alert.employee_role}
                    </div>
                  </div>
                  
                  <button className="text-slate-400 hover:text-blue-600 shrink-0 p-1 bg-white border border-slate-200 rounded">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Scraped Cyber Threat Intel */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-slate-800 font-bold text-sm mb-4 flex items-center gap-2">
            <Globe className="h-4.5 w-4.5 text-purple-600" />
            <span>OSINT Threat Intelligence Feed</span>
          </h3>
          <span className="text-[10px] text-slate-500 block -mt-2.5 mb-4">
            Scraped from CISA Advisories and Spamhaus lists
          </span>
          
          <div className="flex-1 space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {threatIntel?.recent_advisories?.map((adv, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-1 hover:border-purple-300 transition-all">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs font-bold text-slate-700 line-clamp-1">{adv.title}</span>
                  <a href={adv.link} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-purple-600">
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-normal">
                  {adv.summary}
                </p>
                <div className="flex justify-between items-center mt-2 flex-wrap">
                  <div className="flex gap-1">
                    {adv.indicators?.slice(0, 1).map((ind, i) => (
                      <span key={i} className="text-[9px] font-mono font-bold bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded border border-purple-100">
                        {ind}
                      </span>
                    ))}
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">{adv.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
