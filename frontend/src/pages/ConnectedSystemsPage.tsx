import React, { useState, useEffect } from 'react';
import { Network, CheckCircle2, RefreshCw, ExternalLink, ShieldAlert, Building2, FileCheck2, Database } from 'lucide-react';
import { api } from '../services/api';
import { ConnectedSystemItem } from '../types';

export const ConnectedSystemsPage: React.FC = () => {
  const [systems, setSystems] = useState<ConnectedSystemItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  useEffect(() => {
    loadSystems();
  }, []);

  const loadSystems = async () => {
    setLoading(true);
    try {
      const data = await api.getConnectedSystems();
      setSystems(data);
    } catch (err) {
      console.error('Failed to load connected systems', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (sysId: string) => {
    setSyncingId(sysId);
    try {
      await api.syncConnectedSystem(sysId);
      await loadSystems();
    } catch (err: any) {
      alert(err.message || 'Sync failed');
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-serif">
            Connected Legal Ecosystems
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Bridging fragmented legal databases, evidence repositories, and case filings across Indian judicial technology platforms.
          </p>
        </div>
      </div>

      {/* Mandatory Disclaimer Banner (Section 40 & 52) */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 shadow-xs">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <h4 className="font-bold">Prototype Demonstration Notice</h4>
          <p className="leading-relaxed text-amber-800">
            These integrations are mock/demo connectors developed for this hackathon prototype to demonstrate multi-system legal records harmonization. They do not constitute a live production connection to government databases.
          </p>
        </div>
      </div>

      {/* Grid of Connected Systems */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {systems.map((sys) => (
          <div
            key={sys.id}
            className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:border-emerald-300 transition-all flex flex-col justify-between"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {sys.system_code}
                </span>
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Status: Connected (Demo)</span>
                </span>
              </div>

              <h2 className="text-base font-bold text-slate-900">
                {sys.system_name}
              </h2>

              <p className="text-xs text-slate-600 leading-relaxed">
                {sys.description}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>Synchronized Records:</span>
                <strong className="text-slate-900">{sys.records_count} Records</strong>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Last Sync: {new Date(sys.last_sync).toLocaleTimeString()}</span>
                <button
                  onClick={() => handleSync(sys.id)}
                  disabled={syncingId === sys.id}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${syncingId === sys.id ? 'animate-spin' : ''}`} />
                  <span>{syncingId === sys.id ? 'Syncing...' : 'Sync Gateway'}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
