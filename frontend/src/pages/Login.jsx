import React, { useState } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { ShieldCheck, Lock, User, Eye, EyeOff, AlertTriangle } from 'lucide-react';

export default function Login() {
  const { login, error: loginError, loading } = useSecurity();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    
    if (!username || !password) {
      setValidationError('Please fill in all security credentials.');
      return;
    }
    
    const success = await login(username, password);
    if (!success) {
      // Error handled by context
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden px-4">
      {/* Background Decorative Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40"></div>

      {/* Login Card */}
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-xl relative z-10">
        
        {/* Logo and Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-sm mb-4">
            <ShieldCheck className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 tracking-wider">GUARDINSIDER SYSTEM</h2>
          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">Bank Privilege Security Portal</p>
        </div>

        {/* Errors */}
        {(validationError || loginError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2.5 mb-6 text-xs text-red-700">
            <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-red-600" />
            <span>{validationError || loginError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-1.5">Operator ID</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="operator_username"
                disabled={loading}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50"
              />
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider block mb-1.5">Keyphrase Access Token</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={loading}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-10 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-50"
              />
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded-lg border border-blue-500 shadow-sm transition-all duration-200 uppercase tracking-wider disabled:opacity-50"
          >
            {loading ? 'Authenticating Secure Keys...' : 'Sign In To Panel'}
          </button>
        </form>

        {/* Demo Credentials Hint */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <span className="text-[10px] text-slate-400 block mb-1.5 uppercase font-bold tracking-wider">Default Developer Keys</span>
          <div className="inline-flex gap-4 text-[10px] font-mono bg-slate-50 border border-slate-200 rounded-md px-3 py-1 text-slate-500">
            <div>Username: <span className="text-blue-600 font-bold">admin</span></div>
            <div className="border-l border-slate-200 pl-4">Key: <span className="text-blue-600 font-bold">security2026</span></div>
          </div>
        </div>

      </div>
    </div>
  );
}
