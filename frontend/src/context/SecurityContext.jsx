import React, { createContext, useContext, useState, useEffect } from 'react';

const SecurityContext = createContext();

export const useSecurity = () => useContext(SecurityContext);

export const SecurityProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('security_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [stats, setStats] = useState({
    total_sessions: 0,
    active_alerts: 0,
    critical_alerts: 0,
    high_alerts: 0,
    risk_distribution: { Low: 0, Medium: 0, High: 0, Critical: 0 },
    threat_intel: { last_updated: '', blocked_ips_count: 0, flagged_countries_count: 0 }
  });
  
  const [sessions, setSessions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [threatIntel, setThreatIntel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

  // Login handler
  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Login failed');
      }
      
      const data = await response.json();
      setUser(data.user);
      localStorage.setItem('security_user', JSON.stringify(data.user));
      localStorage.setItem('security_token', data.token);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = () => {
    setUser(null);
    localStorage.removeItem('security_user');
    localStorage.removeItem('security_token');
  };

  // Fetch Dashboard Stats
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/dashboard/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  // Fetch Live Sessions
  const fetchSessions = async () => {
    try {
      const response = await fetch(`${API_URL}/sessions/live`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (err) {
      console.error("Error fetching sessions:", err);
    }
  };

  // Fetch Suspicious Alerts
  const fetchAlerts = async () => {
    try {
      const response = await fetch(`${API_URL}/alerts`);
      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
      }
    } catch (err) {
      console.error("Error fetching alerts:", err);
    }
  };

  // Fetch Threat Intel
  const fetchThreatIntel = async () => {
    try {
      const response = await fetch(`${API_URL}/threat-intel`);
      if (response.ok) {
        const data = await response.json();
        setThreatIntel(data);
      }
    } catch (err) {
      console.error("Error fetching threat intel:", err);
    }
  };

  // Evaluate Custom / Mock Session (useful for simulation)
  const evaluateSession = async (sessionData) => {
    try {
      const response = await fetch(`${API_URL}/sessions/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });
      if (response.ok) {
        const newSession = await response.json();
        // Update local session list (prepended)
        setSessions(prev => [newSession, ...prev.slice(0, 49)]);
        // Refresh stats and alerts
        fetchStats();
        fetchAlerts();
        return newSession;
      }
    } catch (err) {
      console.error("Error evaluating session:", err);
    }
    return null;
  };

  // Update Alert Status
  const resolveAlert = async (alertId, status, notes) => {
    try {
      const response = await fetch(`${API_URL}/alerts/${alertId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes })
      });
      if (response.ok) {
        // Refresh alert list and stats
        fetchAlerts();
        fetchStats();
        return true;
      }
    } catch (err) {
      console.error("Error resolving alert:", err);
    }
    return false;
  };

  // Operator Action Override (Allow/Block/MFA)
  const overrideSession = async (sessionId, action, operatorNotes) => {
    try {
      const response = await fetch(`${API_URL}/sessions/${sessionId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, operator_notes: operatorNotes })
      });
      if (response.ok) {
        // Update local sessions state
        setSessions(prev => prev.map(s => 
          s._id === sessionId 
            ? { ...s, action_taken: action, override_action: action, override_notes: operatorNotes } 
            : s
        ));
        // Refresh alerts and stats
        fetchAlerts();
        fetchStats();
        return true;
      }
    } catch (err) {
      console.error("Error overriding session:", err);
    }
    return false;
  };

  // Refresh Threat Intel
  const refreshIntel = async () => {
    try {
      const response = await fetch(`${API_URL}/threat-intel/refresh`, { method: 'POST' });
      if (response.ok) {
        fetchThreatIntel();
        fetchStats();
        return true;
      }
    } catch (err) {
      console.error("Error refreshing threat intel:", err);
    }
    return false;
  };

  // Auto-refresh stats and records periodically
  useEffect(() => {
    if (user) {
      fetchStats();
      fetchSessions();
      fetchAlerts();
      fetchThreatIntel();
      
      const interval = setInterval(() => {
        fetchStats();
        fetchSessions();
        fetchAlerts();
      }, 5000); // Poll every 5s
      
      return () => clearInterval(interval);
    }
  }, [user]);

  const value = {
    user,
    stats,
    sessions,
    alerts,
    threatIntel,
    loading,
    error,
    login,
    logout,
    evaluateSession,
    resolveAlert,
    overrideSession,
    refreshIntel,
    refreshData: () => {
      fetchStats();
      fetchSessions();
      fetchAlerts();
      fetchThreatIntel();
    }
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};
