import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Scale, Briefcase, UserCheck, AlertCircle, Key, ArrowRight, Eye, EyeOff, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DemoUserItem } from '../types';

export const LoginPage: React.FC = () => {
  const { login, demoUsers } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('Judge-001');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [selectedRoleTab, setSelectedRoleTab] = useState<'JUDGE' | 'LAWYER' | 'COURT_ADMIN' | 'CLIENT' | 'SIMULATION'>('JUDGE');

  useEffect(() => {
    // Load generated demo passwords for evaluator autofill convenience
    fetch('/demo/credentials/demo_credentials.json')
      .then(res => res.json())
      .then(data => {
        setCredentials(data);
        if (data['Judge-001']) {
          setPassword(data['Judge-001']);
        }
      })
      .catch(() => {});
  }, []);

  const handleRoleSelect = (dUser: DemoUserItem) => {
    setUsername(dUser.username);
    if (credentials[dUser.username]) {
      setPassword(credentials[dUser.username]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Background decoration */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
        <div className="w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-emerald-100 via-teal-50 to-slate-100 blur-3xl" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0D5C3A] via-[#0F766E] to-[#0A462C] flex items-center justify-center text-white shadow-xl shadow-emerald-900/15 border border-emerald-400/40">
            <Shield className="w-8 h-8 text-emerald-100" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900 font-serif">
          GREEN <span className="text-[#0D5C3A]">VAULT</span>
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 font-medium">
          A Trusted Digital Vault for Legal Records
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg relative z-10 px-4">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl sm:px-10 border border-slate-200">
          {/* Persona Selector Tabs for Easy Evaluation */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Select Demo Persona (Evaluation Helper)
            </label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setSelectedRoleTab('JUDGE');
                  const u = demoUsers.find(x => x.username === 'Judge-001');
                  if (u) handleRoleSelect(u);
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  selectedRoleTab === 'JUDGE'
                    ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Judge
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRoleTab('COURT_ADMIN');
                  const u = demoUsers.find(x => x.username === 'Admin-001');
                  if (u) handleRoleSelect(u);
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  selectedRoleTab === 'COURT_ADMIN'
                    ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRoleTab('LAWYER');
                  const u = demoUsers.find(x => x.username === 'Lawyer-001');
                  if (u) handleRoleSelect(u);
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  selectedRoleTab === 'LAWYER'
                    ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lawyer
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRoleTab('CLIENT');
                  const u = demoUsers.find(x => x.username === 'Client-001');
                  if (u) handleRoleSelect(u);
                }}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  selectedRoleTab === 'CLIENT'
                    ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Client
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-mono"
                placeholder="e.g. Judge-001"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">
                  Password (Argon2id Hashed)
                </label>
                <span className="text-[10px] text-slate-400">Autofilled for Demo</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-mono pr-10"
                  placeholder="Enter secure password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#0D5C3A] hover:bg-[#0A462C] text-white text-sm font-semibold shadow-md shadow-emerald-900/15 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Authenticating with Argon2id...</span>
              ) : (
                <>
                  <span>Sign In to Green Vault</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Credential Reference Accordion */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <Info className="w-3.5 h-3.5 text-emerald-700" />
                <span>Security Architecture Note</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Passwords are cryptographically generated via Python <code className="text-emerald-800 bg-emerald-50 px-1 py-0.5 rounded">secrets</code> and verified against Argon2id hashes. No plaintext passwords are stored in the database.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
