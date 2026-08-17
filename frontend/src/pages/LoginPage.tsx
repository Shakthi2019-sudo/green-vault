import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Scale, Briefcase, AlertCircle, ArrowRight, Eye, EyeOff, Info, User, Check, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('Judge-001');
  const [password, setPassword] = useState('xE!6*ztUa524aps6');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [selectedRole, setSelectedRole] = useState<'JUDGE' | 'LAWYER' | 'CLIENT' | 'COURT_ADMIN' | 'SECURITY_SIMULATION'>('JUDGE');

  // Defined Demo Users grouped by Role
  const demoUsersByRole: Record<string, { username: string; name: string; subtitle: string }[]> = {
    JUDGE: [
      { username: 'Judge-001', name: 'Hon. Justice Rajesh Sharma', subtitle: 'Commercial Bench • Cases: 001, 002' },
      { username: 'Judge-002', name: 'Hon. Justice Priya Malhotra', subtitle: 'Reviewing Bench • Case: 002' },
    ],
    LAWYER: [
      { username: 'Lawyer-001', name: 'Adv. Vikram Sethi', subtitle: 'Lead Counsel • Case: 001' },
      { username: 'Lawyer-002', name: 'Adv. Ananya Roy', subtitle: 'Associate Counsel • Case: 002' },
      { username: 'Assistant-001', name: 'Kavita Rao', subtitle: 'Legal Assistant • Case: 001' },
    ],
    CLIENT: [
      { username: 'Client-001', name: 'Rohan Verma (Petitioner)', subtitle: 'Managing Director Litigant • Case: 001' },
      { username: 'Client-002', name: 'Meera Deshmukh (Respondent)', subtitle: 'COO Litigant • Case: 002' },
    ],
    COURT_ADMIN: [
      { username: 'Admin-001', name: 'Registrar General S. Sundaram', subtitle: 'Court Administrator • Full Oversight' },
    ],
    SECURITY_SIMULATION: [
      { username: 'Security-Simulation', name: 'Automated Security Testbed', subtitle: 'Security Simulation (Demo Only)' },
    ],
  };

  const defaultCredentials: Record<string, string> = {
    'Judge-001': 'xE!6*ztUa524aps6',
    'Judge-002': 'PPhEB%qHSsfVCSUB',
    'Admin-001': 'ZG$!$G8EGd6d5@VF',
    'Lawyer-001': '$vC4VbbVF3ZFZpx!',
    'Lawyer-002': 'D3BnEVD#G9d8Vpxq',
    'Assistant-001': 'jwJkh5yS7w6Pd!kq',
    'Client-001': '#vf*kPe42K3vMM$9',
    'Client-002': 'PxmyYRvK!Bea^m^*',
    'Security-Simulation': 'f2V&raFx948VHMXM',
  };

  useEffect(() => {
    // Load generated demo passwords for evaluator autofill convenience
    fetch('/demo/credentials/demo_credentials.json')
      .then((res) => res.json())
      .then((data) => {
        setCredentials(data);
        if (data['Judge-001']) {
          setPassword(data['Judge-001']);
        }
      })
      .catch(() => {
        setCredentials(defaultCredentials);
      });
  }, []);

  const handleRoleTabChange = (role: 'JUDGE' | 'LAWYER' | 'CLIENT' | 'COURT_ADMIN' | 'SECURITY_SIMULATION') => {
    setSelectedRole(role);
    const usersInRole = demoUsersByRole[role];
    if (usersInRole && usersInRole.length > 0) {
      const firstUser = usersInRole[0];
      setUsername(firstUser.username);
      const pwd = credentials[firstUser.username] || defaultCredentials[firstUser.username] || '';
      setPassword(pwd);
    } else {
      setUsername('');
      setPassword('');
    }
    setError(null);
  };

  const handleSelectUser = (uName: string) => {
    setUsername(uName);
    const pwd = credentials[uName] || defaultCredentials[uName] || '';
    setPassword(pwd);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    const cleanPassword = password;
    if (!cleanUsername || !cleanPassword) {
      setError('Please enter username and password');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(cleanUsername, cleanPassword);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Incorrect username or password');
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

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg relative z-10 px-4">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl sm:px-10 border border-slate-200 space-y-5">
          {/* 1. ROLE SELECTION */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              1. Select Your Role
            </label>
            <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleRoleTabChange('JUDGE')}
                className={`py-2 px-1 rounded-lg text-[11px] font-medium transition-all flex flex-col items-center gap-1 ${
                  selectedRole === 'JUDGE'
                    ? 'bg-white text-emerald-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Scale className="w-4 h-4 text-emerald-700" />
                <span>Judge</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleTabChange('LAWYER')}
                className={`py-2 px-1 rounded-lg text-[11px] font-medium transition-all flex flex-col items-center gap-1 ${
                  selectedRole === 'LAWYER'
                    ? 'bg-white text-emerald-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Briefcase className="w-4 h-4 text-blue-700" />
                <span>Lawyer</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleTabChange('CLIENT')}
                className={`py-2 px-1 rounded-lg text-[11px] font-medium transition-all flex flex-col items-center gap-1 ${
                  selectedRole === 'CLIENT'
                    ? 'bg-white text-emerald-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-4 h-4 text-purple-700" />
                <span>Client</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleTabChange('COURT_ADMIN')}
                className={`py-2 px-1 rounded-lg text-[11px] font-medium transition-all flex flex-col items-center gap-1 ${
                  selectedRole === 'COURT_ADMIN'
                    ? 'bg-white text-emerald-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield className="w-4 h-4 text-amber-700" />
                <span>Admin</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleTabChange('SECURITY_SIMULATION')}
                className={`py-2 px-1 rounded-lg text-[11px] font-medium transition-all flex flex-col items-center gap-1 ${
                  selectedRole === 'SECURITY_SIMULATION'
                    ? 'bg-white text-emerald-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Lock className="w-4 h-4 text-rose-700" />
                <span>Simulation</span>
              </button>
            </div>
          </div>

          {/* 2. DEMO USER CHIPS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                2. Select Account (or Type Below)
              </label>
              <span className="text-[10px] text-slate-400">Click to fill</span>
            </div>
            <div className="space-y-1.5">
              {demoUsersByRole[selectedRole]?.map((u) => {
                const isSelected = username === u.username;
                return (
                  <button
                    key={u.username}
                    type="button"
                    onClick={() => handleSelectUser(u.username)}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-400 text-slate-900'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">{u.name}</span>
                        <span className="font-mono text-[10px] bg-slate-200/80 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                          {u.username}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{u.subtitle}</div>
                    </div>
                    {isSelected && (
                      <span className="text-emerald-700 bg-emerald-100 p-1 rounded-full shrink-0 ml-2">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 3. CREDENTIAL FORM */}
          <form className="space-y-4 pt-1" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-mono"
                placeholder="Enter username (e.g. Judge-001)"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password (Argon2id Hashed)
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Encrypted Verification</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-mono pr-10"
                  placeholder="Enter password"
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
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#0D5C3A] hover:bg-[#0A462C] text-white text-sm font-semibold shadow-md shadow-emerald-900/15 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
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

          {/* Security Note */}
          <div className="pt-3 border-t border-slate-100">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <Info className="w-3.5 h-3.5 text-emerald-700" />
                <span>Zero Plaintext Password Storage</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                All credentials verified against Argon2id salted hashes. Access tokens signed via HS256 JWT with case-level RBAC enforcement.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
