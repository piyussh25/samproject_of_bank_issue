import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { 
  BellRing, 
  UserCheck, 
  ChevronRight, 
  CheckCircle,
  Clock,
  ExternalLink
} from 'lucide-react';

export default function Alerts({ setCurrentPage, setSelectedUserId, setSelectedSessionId }) {
  const { alerts, resolveAlert, overrideSession, loading } = useSecurity();
  const [selectedAlertId, setSelectedAlertId] = useState(alerts[0]?._id || null);
  const [filterStatus, setFilterStatus] = useState('OPEN');
  const [overrideAction, setOverrideAction] = useState('Block');
  const [analystNotes, setAnalystNotes] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const selectedAlert = alerts.find(a => a._id === selectedAlertId) || alerts[0];

  const handleResolveAlert = async (status) => {
    if (!selectedAlert) return;
    const success = await resolveAlert(selectedAlert._id, status, analystNotes || "Resolved by Security Analyst.");
    if (success) {
      setActionSuccess(`Alert marked as ${status}`);
      setAnalystNotes('');
      setTimeout(() => setActionSuccess(''), 3000);
    }
  };

  const handleOverride = async () => {
    if (!selectedAlert) return;
    if (!analystNotes.trim()) {
      alert("Please provide analyst notes justifying the override action.");
      return;
    }
    const success = await overrideSession(selectedAlert.session_id, overrideAction, analystNotes);
    if (success) {
      setActionSuccess(`Session Override executed: ${overrideAction.toUpperCase()}`);
      setAnalystNotes('');
      setTimeout(() => setActionSuccess(''), 3000);
    }
  };

  // Filter Alerts
  const filteredAlerts = alerts.filter(alert => {
    if (filterStatus === 'All') return true;
    return alert.status === filterStatus;
  });

  const getStatusBadge = (status) => {
    const colors = {
      OPEN: 'bg-red-50 text-red-700 border border-red-200',
      INVESTIGATING: 'bg-amber-50 text-amber-700 border border-amber-200',
      RESOLVED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      DISMISSED: 'bg-slate-100 text-slate-600 border border-slate-200'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${colors[status] || ''}`}>
        {status}
      </span>
    );
  };

  const getRiskBadge = (risk) => {
    const colors = {
      Low: 'text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-[10px]',
      Medium: 'text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded text-[10px]',
      High: 'text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded text-[10px]',
      Critical: 'text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded text-[10px] animate-pulse'
    };
    return <span className={`font-bold ${colors[risk] || ''}`}>{risk}</span>;
  };

  return (
    <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-4rem)] overflow-hidden">
      
      {/* Left Column: Alert List */}
      <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 flex flex-col h-full overflow-hidden shadow-sm">
        
        {/* Header and Filter */}
        <div className="p-5 border-b border-slate-200 space-y-4 shrink-0">
          <h3 className="text-slate-800 font-bold text-sm flex items-center gap-2">
            <BellRing className="h-4.5 w-4.5 text-red-500" />
            <span>Incident Alert Center</span>
          </h3>
          
          {/* Status Tabs */}
          <div className="grid grid-cols-4 gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            {['OPEN', 'INVESTIGATING', 'RESOLVED', 'All'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`py-1 text-[10px] font-bold rounded uppercase transition-all ${
                  filterStatus === status 
                    ? 'bg-white text-slate-800 border border-slate-200 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* List Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-2">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No alerts found in this category.
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert._id}
                onClick={() => setSelectedAlertId(alert._id)}
                className={`p-4 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                  selectedAlertId === alert._id 
                    ? 'bg-slate-50 border-slate-300' 
                    : 'bg-white border-slate-100 hover:bg-slate-50'
                }`}
              >
                <div className="space-y-1 truncate">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${
                      alert.risk_level === 'Critical' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'
                    }`}></span>
                    <span className="font-semibold text-xs text-slate-700">{alert.employee_name}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    ID: {alert.user_id} | Risk: {alert.risk_level}
                  </div>
                  <div className="text-[9px] text-slate-400">{alert.timestamp}</div>
                </div>
                
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {getStatusBadge(alert.status)}
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Columns: Alert Details Panel */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 flex flex-col h-full overflow-hidden shadow-sm">
        {selectedAlert ? (
          <div className="flex flex-col h-full overflow-hidden">
            
            {/* Detail Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
              <div>
                <h3 className="text-slate-800 font-bold text-sm">{selectedAlert.employee_name}</h3>
                <span className="text-[10px] text-slate-500 font-mono">Incident ID: {selectedAlert._id}</span>
              </div>
              <button 
                onClick={() => {
                  setSelectedUserId(selectedAlert.user_id);
                  setSelectedSessionId(selectedAlert.session_id);
                  setCurrentPage('user-details');
                }}
                className="text-xs bg-white hover:bg-slate-50 text-blue-600 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1 font-semibold transition-all"
              >
                <span>Deep Profile & SHAP</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>

            {/* Scrollable details */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Alert Status Banner */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                  <span className="text-slate-500 text-[9px] uppercase block tracking-wider font-bold">Threat Level</span>
                  <span className="block mt-1 font-bold">{getRiskBadge(selectedAlert.risk_level)}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                  <span className="text-slate-500 text-[9px] uppercase block tracking-wider font-bold">Anomaly Index</span>
                  <span className="text-sm font-extrabold text-slate-700 block mt-1.5 font-mono">{selectedAlert.anomaly_score}</span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                  <span className="text-slate-500 text-[9px] uppercase block tracking-wider font-bold">Resolution</span>
                  <span className="block mt-1.5">{getStatusBadge(selectedAlert.status)}</span>
                </div>
              </div>

              {/* Threat Indicators / Reasons */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trigger Highlights</h4>
                <ul className="space-y-1.5">
                  {selectedAlert.reasons?.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-normal">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5 shrink-0"></span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Operational Action Panel */}
              <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <UserCheck className="h-4.5 w-4.5 text-blue-600" />
                    <span>Operator Intervention Deck</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">Recommendation: {selectedAlert.action_taken}</span>
                </div>

                {/* Feedback message */}
                {actionSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg p-2.5 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>{actionSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Status management */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Update Incident Status</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleResolveAlert('INVESTIGATING')}
                        disabled={loading}
                        className="py-1.5 bg-white hover:bg-slate-100 text-amber-700 border border-slate-200 text-xs font-bold rounded-lg transition-all"
                      >
                        Investigate
                      </button>
                      <button
                        onClick={() => handleResolveAlert('RESOLVED')}
                        disabled={loading}
                        className="py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>

                  {/* Override Session Control */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Execute Session Override</span>
                    <div className="flex gap-2">
                      <select
                        value={overrideAction}
                        onChange={(e) => setOverrideAction(e.target.value)}
                        className="bg-white border border-slate-200 text-xs text-slate-700 rounded-lg px-2 py-1.5 focus:outline-none"
                      >
                        <option value="Allow">Allow Session</option>
                        <option value="MFA">Force MFA challenge</option>
                        <option value="Block">Block Session</option>
                      </select>
                      <button
                        onClick={handleOverride}
                        disabled={loading}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all uppercase tracking-wider shadow-xs"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notes Input */}
                <div className="space-y-2 pt-1">
                  <label className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Analyst Logged Notes</label>
                  <textarea
                    rows="3"
                    value={analystNotes}
                    onChange={(e) => setAnalystNotes(e.target.value)}
                    placeholder="Provide operator logs explaining the override justification..."
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              
              {/* Prior Assessment Logs */}
              {selectedAlert.notes && (
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                    <Clock className="h-4 w-4" />
                    <span>Prior Operator Log:</span>
                  </div>
                  <p className="text-xs text-slate-700 font-mono bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                    {selectedAlert.notes}
                  </p>
                </div>
              )}

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <BellRing className="h-10 w-10 text-slate-300 mb-3 animate-pulse" />
            <span>Select an alert in the list to investigate</span>
          </div>
        )}
      </div>
    </div>
  );
}
