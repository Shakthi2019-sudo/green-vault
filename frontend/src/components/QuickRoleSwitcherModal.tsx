import React, { useEffect, useState } from 'react';
import { X, UserCheck, Scale, Briefcase, Shield, User, Key, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DemoUserItem } from '../types';

interface QuickRoleSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickRoleSwitcherModal: React.FC<QuickRoleSwitcherModalProps> = ({ isOpen, onClose }) => {
  const { user, login, demoUsers } = useAuth();
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [loadingUser, setLoadingUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch demo credentials json for seamless 1-click evaluation switching
    fetch('/demo/credentials/demo_credentials.json')
      .then(res => res.json())
      .then(data => setCredentials(data))
      .catch(() => {
        // If not accessible from root public, try API or defaults
      });
  }, []);

  if (!isOpen) return null;

  const handleSwitch = async (dUser: DemoUserItem) => {
    setLoadingUser(dUser.username);
    setError(null);
    try {
      const pwd = credentials[dUser.username];
      if (!pwd) {
        throw new Error(`Password not found for ${dUser.username}. Please login manually.`);
      }
      await login(dUser.username, pwd);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to switch role');
    } finally {
      setLoadingUser(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'JUDGE':
        return <Scale className="w-5 h-5 text-emerald-700" />;
      case 'COURT_ADMIN':
        return <Shield className="w-5 h-5 text-amber-700" />;
      case 'LAWYER':
        return <Briefcase className="w-5 h-5 text-blue-700" />;
      case 'CLIENT':
        return <User className="w-5 h-5 text-purple-700" />;
      default:
        return <Key className="w-5 h-5 text-rose-700" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Quick Role Switcher (Hackathon Demo)</h3>
              <p className="text-xs text-slate-500">Switch personas instantly to test permission boundaries & workflows</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-3">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-2.5">
            {demoUsers.map((dUser) => {
              const isCurrent = user?.username === dUser.username;
              const hasPassword = Boolean(credentials[dUser.username]);

              return (
                <button
                  key={dUser.username}
                  disabled={loadingUser !== null}
                  onClick={() => handleSwitch(dUser)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400'
                      : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                      {getRoleIcon(dUser.role)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">{dUser.full_name}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {dUser.username}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="font-medium text-emerald-800">{dUser.sub_role}</span>
                        <span>&bull;</span>
                        <span>Cases: {dUser.assigned_cases.length > 0 ? dUser.assigned_cases.join(', ') : 'None'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCurrent ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                        <Check className="w-3.5 h-3.5" />
                        Active
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-600 group-hover:text-emerald-700 px-2.5 py-1 rounded-lg bg-slate-100">
                        {loadingUser === dUser.username ? 'Switching...' : 'Switch →'}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Role + Sub-Role + Case RBAC Evaluated</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-medium cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
