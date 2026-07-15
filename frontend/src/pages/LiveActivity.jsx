import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { 
  Play, 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  Filter, 
  Server, 
  Lock, 
  Terminal 
} from 'lucide-react';

export default function LiveActivity({ setCurrentPage, setSelectedUserId, setSelectedSessionId }) {
  const { sessions, evaluateSession, loading } = useSecurity();
  const [filterRole, setFilterRole] = useState('All');
  const [filterRisk, setFilterRisk] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [simulatorStatus, setSimulatorStatus] = useState('');

  const rolesList = ['All', 'System Admin', 'DBA', 'Manager', 'Teller', 'Vendor'];
  const risksList = ['All', 'Low', 'Medium', 'High', 'Critical'];

  // Simulator Handler: triggers live POST requests to evaluate mock data
  const triggerSimulation = async (type) => {
    setSimulatorStatus(`Constructing simulated ${type} payload...`);
    
    // Scenarios based on CMU CERT profiles
    let payload = {};
    
    if (type === 'normal_teller') {
      payload = {
        user_id: `EMP1022`,
        employee_name: "Sarah Jenkins",
        employee_role: "Teller",
        privilege_level: 1,
        login_hour: 10,
        login_country: "US",
        login_ip: "192.168.12.44",
        device_id: "DEV_82736",
        device_changed: 0,
        location_changed: 0,
        session_duration: 240.0,
        failed_login_attempts: 0,
        files_downloaded: 3,
        sensitive_files_accessed: 8,
        admin_commands_executed: 0,
        usb_usage: 0,
        previous_incidents: 0
      };
    } else if (type === 'normal_admin') {
      payload = {
        user_id: `EMP1003`,
        employee_name: "Richard Davis",
        employee_role: "System Admin",
        privilege_level: 4,
        login_hour: 14,
        login_country: "US",
        login_ip: "192.168.1.12",
        device_id: "DEV_44192",
        device_changed: 0,
        location_changed: 0,
        session_duration: 380.0,
        failed_login_attempts: 0,
        files_downloaded: 12,
        sensitive_files_accessed: 4,
        admin_commands_executed: 8,
        usb_usage: 0,
        previous_incidents: 0
      };
    } else if (type === 'sabotage') {
      payload = {
        user_id: `EMP1009`,
        employee_name: "Charles Moore",
        employee_role: "DBA",
        privilege_level: 4,
        login_hour: 2,
        login_country: "US",
        login_ip: "192.168.99.10",
        device_id: "DEV_39201",
        device_changed: 0,
        location_changed: 0,
        session_duration: 18.0,
        failed_login_attempts: 1,
        files_downloaded: 45,
        sensitive_files_accessed: 50,
        admin_commands_executed: 35,
        usb_usage: 1,
        previous_incidents: 1
      };
    } else if (type === 'exfiltration') {
      payload = {
        user_id: `EMP1015`,
        employee_name: "Jessica Taylor",
        employee_role: "Teller",
        privilege_level: 1,
        login_hour: 23,
        login_country: "US",
        login_ip: "198.51.100.42",
        device_id: "DEV_88203",
        device_changed: 1,
        location_changed: 0,
        session_duration: 480.0,
        failed_login_attempts: 0,
        files_downloaded: 95,
        sensitive_files_accessed: 110,
        admin_commands_executed: 0,
        usb_usage: 1,
        previous_incidents: 0
      };
    } else if (type === 'compromised') {
      payload = {
        user_id: `EMP1034`,
        employee_name: "James Wilson",
        employee_role: "Vendor",
        privilege_level: 2,
        login_hour: 4,
        login_country: "KP",
        login_ip: "185.220.101.5",
        device_id: "DEV_99182",
        device_changed: 1,
        location_changed: 1,
        session_duration: 8.5,
        failed_login_attempts: 4,
        files_downloaded: 35,
        sensitive_files_accessed: 42,
        admin_commands_executed: 12,
        usb_usage: 0,
        previous_incidents: 0
      };
    }

    try {
      const result = await evaluateSession(payload);
      if (result) {
        setSimulatorStatus(`Alert! Evaluation complete. Flagged: ${result.risk_level} Risk`);
        setTimeout(() => setSimulatorStatus(''), 4000);
      }
    } catch (err) {
      setSimulatorStatus('Simulation evaluation failed.');
      setTimeout(() => setSimulatorStatus(''), 3000);
    }
  };

  const handleRowClick = (session) => {
    setSelectedUserId(session.user_id);
    setSelectedSessionId(session._id);
    setCurrentPage('user-details');
  };

  // Filter Logic
  const filteredSessions = sessions.filter(session => {
    const matchesSearch = 
      session.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.login_country?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesRole = filterRole === 'All' || session.employee_role === filterRole;
    const matchesRisk = filterRisk === 'All' || session.risk_level === filterRisk;
    
    return matchesSearch && matchesRole && matchesRisk;
  });

  const getRiskBadge = (risk) => {
    const badgeColors = {
      Low: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
      Medium: 'bg-amber-50 text-amber-700 border border-amber-100',
      High: 'bg-red-50 text-red-700 border border-red-100',
      Critical: 'bg-purple-50 text-purple-700 border border-purple-100 shadow-sm animate-pulse'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeColors[risk] || ''}`}>
        {risk}
      </span>
    );
  };

  return (
    <div className="p-8 space-y-8 overflow-y-auto max-h-[calc(100vh-4rem)]">
      
      {/* Interactive Threat Simulator Panel for Live Demo */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-slate-800 font-bold text-sm mb-1.5 flex items-center gap-2">
          <Terminal className="h-4.5 w-4.5 text-blue-600" />
          <span>Hackathon Demo Simulation Deck</span>
        </h3>
        <p className="text-slate-500 text-xs mb-6">
          Trigger live insider threat scenarios to simulate abnormal behaviors and verify real-time ML risk calculations.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <button
            onClick={() => triggerSimulation('normal_teller')}
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition-all"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Simulate Normal Teller</span>
          </button>
          
          <button
            onClick={() => triggerSimulation('normal_admin')}
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition-all"
          >
            <Server className="h-4 w-4 text-blue-600" />
            <span>Simulate Normal Admin</span>
          </button>
          
          <button
            onClick={() => triggerSimulation('sabotage')}
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 hover:bg-amber-50 text-slate-800 border border-amber-200 text-xs font-semibold rounded-lg transition-all"
          >
            <Play className="h-4 w-4 text-amber-600" />
            <span>IT Sabotage (DBA)</span>
          </button>
          
          <button
            onClick={() => triggerSimulation('exfiltration')}
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 hover:bg-red-50 text-slate-800 border border-red-200 text-xs font-semibold rounded-lg transition-all"
          >
            <ShieldAlert className="h-4 w-4 text-red-600" />
            <span>Data Exfil (USB)</span>
          </button>
          
          <button
            onClick={() => triggerSimulation('compromised')}
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 hover:bg-purple-50 text-slate-800 border border-purple-200 text-xs font-semibold rounded-lg transition-all"
          >
            <Lock className="h-4 w-4 text-purple-600" />
            <span>Compromised Intel IP</span>
          </button>
        </div>

        {simulatorStatus && (
          <div className="mt-4 text-xs font-mono text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 animate-pulse">
            {simulatorStatus}
          </div>
        )}
      </div>

      {/* Filters and List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
        <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-slate-800 font-bold text-sm">Live Employee Activity Logs</h3>
          
          <div className="flex flex-wrap items-center gap-4">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search User ID or Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-4 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Filter Role */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">Role:</span>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg py-1.5 px-3 focus:outline-none"
              >
                {rolesList.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            {/* Filter Risk */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">Risk:</span>
              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-lg py-1.5 px-3 focus:outline-none"
              >
                {risksList.map(risk => (
                  <option key={risk} value={risk}>{risk}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Live Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3 px-6">User ID</th>
                <th className="py-3 px-6">Employee</th>
                <th className="py-3 px-6">Role</th>
                <th className="py-3 px-6">Login Time</th>
                <th className="py-3 px-6">IP / Country</th>
                <th className="py-3 px-6 text-center">Failed Logins</th>
                <th className="py-3 px-6">Files Dw / Sens</th>
                <th className="py-3 px-6 text-center">Admin Cmds</th>
                <th className="py-3 px-6">Anomaly Score</th>
                <th className="py-3 px-6 text-center">Threat Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-12 text-slate-400 font-medium">
                    No sessions match active filters
                  </td>
                </tr>
              ) : (
                filteredSessions.map((session) => (
                  <tr 
                    key={session._id} 
                    onClick={() => handleRowClick(session)}
                    className={`hover:bg-slate-50 cursor-pointer transition-all ${
                      session.risk_level === 'Critical' 
                        ? 'bg-red-50 bg-opacity-40' 
                        : session.risk_level === 'High' 
                        ? 'bg-amber-50 bg-opacity-40' 
                        : ''
                    }`}
                  >
                    <td className="py-3.5 px-6 font-mono font-semibold text-slate-700">{session.user_id}</td>
                    <td className="py-3.5 px-6 font-semibold text-slate-800">{session.employee_name}</td>
                    <td className="py-3.5 px-6 text-slate-600">{session.employee_role}</td>
                    <td className="py-3.5 px-6 text-slate-500 font-mono">{session.login_time}</td>
                    <td className="py-3.5 px-6 text-slate-600">
                      <span className="font-mono">{session.login_ip || '192.168.1.x'}</span>
                      <span className="ml-1.5 px-1 bg-slate-100 border border-slate-200 text-[10px] rounded text-slate-600 font-semibold">{session.login_country}</span>
                    </td>
                    <td className="py-3.5 px-6 font-mono text-center">
                      <span className={session.failed_login_attempts > 0 ? 'text-amber-700 font-bold' : 'text-slate-400'}>
                        {session.failed_login_attempts}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-500 font-mono">
                      <span>{session.files_downloaded}</span>
                      <span className="text-slate-300 px-1">/</span>
                      <span className={session.sensitive_files_accessed > 20 ? 'text-red-600 font-bold' : ''}>
                        {session.sensitive_files_accessed}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 font-mono text-center">
                      <span className={session.admin_commands_executed > 10 ? 'text-purple-700 font-bold' : 'text-slate-400'}>
                        {session.admin_commands_executed}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 font-mono">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                          <div 
                            className={`h-full rounded-full ${
                              session.anomaly_score > 0.7 
                                ? 'bg-red-500' 
                                : session.anomaly_score > 0.4 
                                ? 'bg-amber-500' 
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${session.anomaly_score * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-slate-700 text-[11px] font-bold">{session.anomaly_score}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-center">{getRiskBadge(session.risk_level)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
