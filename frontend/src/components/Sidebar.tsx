import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  KeyRound,
  ShieldAlert,
  ArchiveRestore,
  Boxes,
  Network,
  History,
  FlaskConical,
  Lock,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Cases', path: '/cases', icon: Briefcase },
    { name: 'Documents & Evidence', path: '/documents', icon: FileText },
    { name: 'Access Requests', path: '/access-requests', icon: KeyRound },
    { name: 'Security Monitoring', path: '/security', icon: ShieldAlert },
    { name: 'Isolated Recovery Vault', path: '/recovery', icon: ArchiveRestore },
    { name: 'Blockchain Ledger', path: '/blockchain', icon: Boxes },
    { name: 'Connected Legal Systems', path: '/connected-systems', icon: Network },
    { name: 'Audit History', path: '/audit', icon: History },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 select-none">
      {/* Navigation List */}
      <div className="p-4 space-y-6 overflow-y-auto">
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Legal Repository
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-50 text-[#0D5C3A] font-semibold shadow-xs border border-emerald-200/80'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-[#0D5C3A]' : 'text-slate-400'}`} />
                        <span>{item.name}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#0D5C3A]" />}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Security Simulation Testbed Section */}
        <div className="pt-2 border-t border-slate-100">
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
              Simulation Zone
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-800 border border-amber-300">
              DEMO ONLY
            </span>
          </div>

          <NavLink
            to="/simulation"
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                isActive
                  ? 'bg-amber-50 text-amber-900 font-semibold border-amber-300 shadow-xs'
                  : 'bg-amber-50/40 text-amber-800 hover:bg-amber-50 border-amber-200/60'
              }`
            }
          >
            <div className="flex items-center gap-2.5">
              <FlaskConical className="w-4 h-4 text-amber-600" />
              <span>Security Simulation</span>
            </div>
            <span className="text-[10px] text-amber-600 font-mono">TEST</span>
          </NavLink>
        </div>
      </div>

      {/* User Status Card at Bottom */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/80">
        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
            <Lock className="w-3.5 h-3.5 text-emerald-700" />
            <span>Encrypted Vault Session</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Role: <span className="font-medium text-slate-700">{user?.sub_role}</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            AES-256-GCM + SHA-256 Active
          </p>
        </div>
      </div>
    </aside>
  );
};
