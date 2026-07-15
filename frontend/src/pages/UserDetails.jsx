import React, { useState, useEffect } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine 
} from 'recharts';
import { 
  ArrowLeft, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle,
  Fingerprint,
  RotateCcw
} from 'lucide-react';

export default function UserDetails({ userId, sessionId, setCurrentPage }) {
  const { overrideSession } = useSecurity();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [overrideAction, setOverrideAction] = useState('Block');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [overrideSuccess, setOverrideSuccess] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/users/${userId}`);
        if (response.ok) {
          const data = await response.json();
          setUserData(data);
          
          if (sessionId) {
            const found = data.history.find(h => h._id === sessionId);
            setActiveSession(found || data.history[0]);
          } else {
            setActiveSession(data.history[0]);
          }
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    if (userId) {
      fetchUserData();
    }
  }, [userId, sessionId, overrideSuccess]);

  const handleApplyOverride = async () => {
    if (!activeSession) return;
    if (!overrideNotes.trim()) {
      alert("Please provide analyst notes explaining the override action.");
      return;
    }
    const success = await overrideSession(activeSession._id, overrideAction, overrideNotes);
    if (success) {
      setOverrideSuccess(`Override applied: ${overrideAction.toUpperCase()}`);
      setOverrideNotes('');
      setTimeout(() => setOverrideSuccess(''), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
        <RotateCcw className="h-6 w-6 animate-spin text-blue-600 mb-2" />
        <span className="text-xs font-semibold">Loading operator profile telemetry...</span>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="p-8 text-center text-slate-400">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <span className="text-xs font-bold block">Security Decryption Failed</span>
        <button onClick={() => setCurrentPage('dashboard')} className="mt-3 text-xs text-blue-600 hover:underline">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const { profile, history, baselines } = userData;

  // Prepare SHAP values for plotting
  const shapData = [];
  if (activeSession && activeSession.attributions) {
    const labelMapping = {
      anomaly_score: 'Anomaly Index',
      admin_commands_executed: 'Admin Commands',
      sensitive_files_accessed: 'Sensitive Accessed',
      failed_login_attempts: 'Failed Logins',
      location_changed: 'Location Changed',
      device_changed: 'Device Changed',
      login_hour: 'Login Hour',
      files_downloaded: 'Files Downloaded',
      privilege_level: 'Privilege Level'
    };

    Object.entries(activeSession.attributions).forEach(([key, val]) => {
      shapData.push({
        name: labelMapping[key] || key,
        value: val
      });
    });
    
    // Sort so largest positive is on top
    shapData.sort((a, b) => b.value - a.value);
  }

  const getRiskColor = (risk) => {
    const colors = {
      Low: 'text-teal-700 bg-teal-50 border border-teal-100 px-3 py-1 rounded-full text-xs font-bold uppercase',
      Medium: 'text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1 rounded-full text-xs font-bold uppercase',
      High: 'text-red-700 bg-red-50 border border-red-100 px-3 py-1 rounded-full text-xs font-bold uppercase',
      Critical: 'text-purple-700 bg-purple-50 border border-purple-100 px-3 py-1 rounded-full text-xs font-bold uppercase shadow-xs animate-pulse'
    };
    return colors[risk] || 'text-slate-600';
  };

  return (
    <div className="p-8 space-y-8 overflow-y-auto max-h-[calc(100vh-4rem)]">
      
      {/* Header and Navigation */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setCurrentPage('activity')}
          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-blue-600 shadow-xs transition-colors"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span>Investigative Session Assessment: {profile.employee_name}</span>
            <span className="font-mono text-xs text-slate-400">({profile.user_id})</span>
          </h2>
          <span className="text-slate-500 text-xs">{profile.employee_role} | Access Level {profile.privilege_level}</span>
        </div>
      </div>

      {/* Grid Layout: Profile & Baselines (Left), Timeline (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Profile Card & Telemetry Details */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Gauge Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
              <span className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Session Risk Level</span>
              <div className="mt-3">
                <span className={getRiskColor(activeSession?.risk_level || 'Low')}>
                  {activeSession?.risk_level || 'Low'}
                </span>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
              <span className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Anomaly Score</span>
              <span className="text-2xl font-extrabold text-slate-700 mt-2.5 font-mono">
                {activeSession?.anomaly_score || 0.05}
              </span>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
              <span className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Historical Violations</span>
              <span className={`text-2xl font-extrabold mt-2.5 ${profile.high_risk_incidents > 0 ? 'text-red-600 animate-cyber-pulse' : 'text-emerald-700'}`}>
                {profile.high_risk_incidents}
              </span>
            </div>
          </div>

          {/* Explainable AI (SHAP) Attribution Panel */}
          {activeSession && (
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div>
                <h3 className="text-slate-800 font-bold text-sm flex items-center gap-1.5">
                  <Fingerprint className="h-4.5 w-4.5 text-blue-600" />
                  <span>Explainable AI (SHAP Feature Attributions)</span>
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  How each session metric pushed predictions towards high risk (+) or normal baseline (-).
                </p>
              </div>

              {/* Attributions Bar Chart */}
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={shapData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" stroke="#94a3b8" fontSize={10} domain={[-0.6, 0.9]} />
                    <YAxis dataKey="name" type="category" stroke="#475569" fontSize={10} width={120} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px' }}
                      formatter={(value) => [`${value > 0 ? '+' : ''}${value}`, 'Risk Contribution']}
                    />
                    <ReferenceLine x={0} stroke="#cbd5e1" strokeWidth={1.5} />
                    <Bar dataKey="value" fill="#8884d8">
                      {shapData.map((entry, index) => {
                        const isPositive = entry.value > 0;
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={isPositive ? '#DC2626' : '#0D9488'} 
                            fillOpacity={0.8}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Recommendation Box */}
              <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                activeSession.risk_level === 'Critical' 
                  ? 'border-red-200 bg-red-50' 
                  : activeSession.risk_level === 'High' 
                  ? 'border-amber-200 bg-amber-50' 
                  : 'border-slate-200 bg-slate-50'
              }`}>
                <div className="space-y-0.5">
                  <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-wider">AI Security Action Recommendation</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-bold uppercase ${
                      activeSession.action_taken === 'Block' 
                        ? 'text-red-700' 
                        : activeSession.action_taken === 'MFA' 
                        ? 'text-amber-700 animate-pulse' 
                        : 'text-teal-800'
                    }`}>
                      {activeSession.action_taken}
                    </span>
                    <span className="text-slate-600 text-xs font-medium">
                      {activeSession.action_taken === 'Block' 
                        ? '— Instantly revoke session cookies & lock Active Directory.' 
                        : activeSession.action_taken === 'MFA' 
                        ? '— Request immediate biometric hardware key confirmation.' 
                        : '— Allow session connection to pass through baseline.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reasons list */}
              <div className="space-y-3 pt-2">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Decision Rationale</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {activeSession.reasons?.map((reason, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2.5 shadow-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-2 shrink-0"></span>
                      <span className="text-xs text-slate-700 leading-relaxed font-medium">{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Baseline Comparisons */}
          {activeSession && (
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-slate-800 font-bold text-sm">Historical Behavior Baseline Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                      <th className="py-2.5 px-4">Metric Parameter</th>
                      <th className="py-2.5 px-4 text-center">This Session Value</th>
                      <th className="py-2.5 px-4 text-center">User Historical Avg</th>
                      <th className="py-2.5 px-4 text-right">Deviation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-700">Session Length (Minutes)</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">{activeSession.session_duration}m</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-500">{baselines.avg_session_duration}m</td>
                      <td className="py-3 px-4 text-right font-bold">
                        {activeSession.session_duration > baselines.avg_session_duration * 1.5 
                          ? <span className="text-amber-700">Elevated</span> 
                          : <span className="text-emerald-700">Normal</span>}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-700">File Download Volume</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">{activeSession.files_downloaded} files</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-500">{baselines.avg_files_downloaded} files</td>
                      <td className="py-3 px-4 text-right font-bold">
                        {activeSession.files_downloaded > baselines.avg_files_downloaded * 2 
                          ? <span className="text-red-700">Anomaly (Critical)</span> 
                          : <span className="text-emerald-700">Normal</span>}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-700">Sensitive DB Accesses</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">{activeSession.sensitive_files_accessed} queries</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-500">{baselines.avg_sensitive_files} queries</td>
                      <td className="py-3 px-4 text-right font-bold">
                        {activeSession.sensitive_files_accessed > baselines.avg_sensitive_files * 1.8 
                          ? <span className="text-red-700">Anomaly (High)</span> 
                          : <span className="text-emerald-700">Normal</span>}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-700">Admin Command Executions</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">{activeSession.admin_commands_executed} cmds</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-500">{baselines.avg_admin_cmds} cmds</td>
                      <td className="py-3 px-4 text-right font-bold">
                        {activeSession.admin_commands_executed > baselines.avg_admin_cmds * 2 
                          ? <span className="text-purple-700">Abnormal Commands</span> 
                          : <span className="text-emerald-700">Normal</span>}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Incident Timeline (Right) */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col h-full">
            <h3 className="text-slate-800 font-bold text-sm mb-6 flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-purple-600" />
              <span>User Session Timeline</span>
            </h3>

            <div className="relative border-l border-slate-200 ml-4 space-y-6 pr-2 max-h-[600px] overflow-y-auto">
              {history.map((session, idx) => (
                <div 
                  key={session._id}
                  onClick={() => setActiveSession(session)}
                  className={`relative pl-7 cursor-pointer transition-all group ${
                    activeSession?._id === session._id ? 'scale-[1.01]' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  {/* Timeline bullet indicator */}
                  <span className={`absolute -left-2.5 top-1.5 h-5 w-5 rounded-full border border-white flex items-center justify-center transition-all ${
                    activeSession?._id === session._id 
                      ? 'bg-blue-600 scale-110 shadow-sm' 
                      : session.risk_level === 'Critical' 
                      ? 'bg-red-500' 
                      : session.risk_level === 'High' 
                      ? 'bg-amber-500' 
                      : 'bg-slate-400'
                  }`}>
                    {session.risk_level === 'Low' ? (
                      <ShieldCheck className="h-3 w-3 text-white" />
                    ) : (
                      <ShieldAlert className="h-3 w-3 text-white" />
                    )}
                  </span>

                  <div className={`p-4 rounded-lg border transition-all ${
                    activeSession?._id === session._id 
                      ? 'bg-slate-50 border-slate-300 shadow-xs' 
                      : 'bg-white border-slate-100 hover:bg-slate-50'
                  }`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] text-slate-500 font-bold font-mono">{session.login_time}</span>
                      <span className={`text-[8px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                        session.risk_level === 'Critical' 
                          ? 'bg-red-50 text-red-700 border-red-100' 
                          : session.risk_level === 'High' 
                          ? 'bg-amber-50 text-amber-700 border-amber-100' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {session.risk_level}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                      {session.threat_scenario === 'Normal' ? 'Authorized Session' : session.threat_scenario}
                    </span>
                    <div className="text-[10px] text-slate-500 mt-1">
                      IP: {session.login_ip || '127.0.0.1'} ({session.login_country})
                    </div>
                    
                    {/* Override status indicator */}
                    {session.override_action && (
                      <div className="mt-2 text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded p-1">
                        Override: {session.override_action.toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
