import React, { useState } from 'react';
import { SecurityProvider, useSecurity } from './context/SecurityContext';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LiveActivity from './pages/LiveActivity';
import Alerts from './pages/Alerts';
import UserDetails from './pages/UserDetails';
import ThreatIntel from './pages/ThreatIntel';

function AppContent() {
  const { user } = useSecurity();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  // Unauthenticated operators are redirected to Login
  if (!user) {
    return <Login />;
  }

  // Get human-friendly page titles
  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard': return 'Command Security Operations Center';
      case 'activity': return 'Privileged User Session Stream';
      case 'alerts': return 'Suspicious Anomalies & Alert Center';
      case 'threat-intel': return 'Cyber Threat Intelligence OSINT Feed';
      case 'user-details': return 'Analyst Behavioral Investigation';
      default: return 'Security Portal';
    }
  };

  return (
    <div className="flex h-screen bg-cyber-bg overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />

      {/* Main Console Interface */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Console */}
        <Navbar title={getPageTitle()} />

        {/* Dynamic Panel View */}
        <main className="flex-1 overflow-hidden">
          {currentPage === 'dashboard' && (
            <Dashboard 
              setCurrentPage={setCurrentPage} 
              setSelectedUserId={setSelectedUserId} 
              setSelectedSessionId={setSelectedSessionId} 
            />
          )}
          {currentPage === 'activity' && (
            <LiveActivity 
              setCurrentPage={setCurrentPage} 
              setSelectedUserId={setSelectedUserId} 
              setSelectedSessionId={setSelectedSessionId} 
            />
          )}
          {currentPage === 'alerts' && (
            <Alerts 
              setCurrentPage={setCurrentPage} 
              setSelectedUserId={setSelectedUserId} 
              setSelectedSessionId={setSelectedSessionId} 
            />
          )}
          {currentPage === 'threat-intel' && <ThreatIntel />}
          {currentPage === 'user-details' && (
            <UserDetails 
              userId={selectedUserId} 
              sessionId={selectedSessionId} 
              setCurrentPage={setCurrentPage} 
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SecurityProvider>
      <AppContent />
    </SecurityProvider>
  );
}
