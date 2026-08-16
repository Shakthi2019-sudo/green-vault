import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, UserCheck, LogOut, Shield, ChevronDown, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SecurityStatusReport } from '../types';
import { QuickRoleSwitcherModal } from './QuickRoleSwitcherModal';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [secStatus, setSecStatus] = useState<SecurityStatusReport | null>(null);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  const fetchSecurityStatus = async () => {
    try {
      const s = await api.getSecurityStatus();
      setSecStatus(s);
    } catch (e) {
      // fallback
    }
  };

  useEffect(() => {
    fetchSecurityStatus();
    const interval = setInterval(fetchSecurityStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-white/95 backdrop-blur-md border-b border-slate-200">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0D5C3A] to-[#0A462C] flex items-center justify-center text-white shadow-md shadow-emerald-900/10 border border-emerald-500/30">
            <Shield className="w-5 h-5 text-emerald-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-base font-serif tracking-tight">
                GREEN <span className="text-[#0D5C3A]">VAULT</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-sm font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                PROTOTYPE
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
              A Trusted Digital Vault for Legal Records
            </p>
          </div>
        </div>

        {/* Center/Right: Security Status Pill & Switcher */}
        <div className="flex items-center gap-3">
          {/* Security Status Indicator */}
          {secStatus && (
            <div
              className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
                secStatus.status === 'GREEN'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                  : secStatus.status === 'YELLOW'
                  ? 'bg-amber-50 text-amber-800 border-amber-200/80 animate-pulse'
                  : 'bg-rose-50 text-rose-800 border-rose-200/80 animate-pulse'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  secStatus.status === 'GREEN'
                    ? 'bg-emerald-600'
                    : secStatus.status === 'YELLOW'
                    ? 'bg-amber-500'
                    : 'bg-rose-600'
                }`}
              />
              <span>{secStatus.headline}</span>
            </div>
          )}

          {/* Quick Role Switcher Button (Demo Supercharger) */}
          <button
            onClick={() => setIsSwitcherOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium transition-all shadow-xs cursor-pointer"
            title="Switch demo persona (Judge, Lawyer, Admin, Client)"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden sm:inline">Switch Persona:</span>
            <span className="font-semibold text-slate-900">{user?.sub_role || user?.role}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="text-right hidden lg:block">
              <div className="text-xs font-semibold text-slate-900 leading-none">{user?.full_name}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{user?.username}</div>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <QuickRoleSwitcherModal isOpen={isSwitcherOpen} onClose={() => setIsSwitcherOpen(false)} />
    </>
  );
};
