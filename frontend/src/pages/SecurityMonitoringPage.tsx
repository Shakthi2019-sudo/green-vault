import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Activity,
  AlertCircle,
  ArchiveRestore,
  CheckCircle2,
  RefreshCw,
  Info,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { SecurityStatusReport, SecurityEventItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export const SecurityMonitoringPage: React.FC = () => {
  const navigate = useNavigate();
  const [statusReport, setStatusReport] = useState<SecurityStatusReport | null>(null);
  const [events, setEvents] = useState<SecurityEventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      const [sData, eData] = await Promise.all([
        api.getSecurityStatus(),
        api.getSecurityEvents()
      ]);
      setStatusReport(sData);
      setEvents(eData);
    } catch (err) {
      console.error('Failed to load security data', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-serif">
            Security & Integrity Monitoring
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated rule-based detection for unauthorized access attempts, mass alterations, and cryptographic hash mismatches.
          </p>
        </div>

        <button
          onClick={loadSecurityData}
          className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Primary Security Status Gauge Banner */}
      {statusReport && (
        <div
          className={`p-6 rounded-2xl border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 ${
            statusReport.status === 'GREEN'
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : statusReport.status === 'YELLOW'
              ? 'bg-amber-50/80 border-amber-200 text-amber-950'
              : 'bg-rose-50/80 border-rose-200 text-rose-950'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                statusReport.status === 'GREEN'
                  ? 'bg-emerald-100 text-emerald-700'
                  : statusReport.status === 'YELLOW'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {statusReport.status === 'GREEN' ? (
                <ShieldCheck className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider">
                  Vault Security Status: {statusReport.status}
                </span>
                <span className="text-xs">&bull;</span>
                <span className="text-xs">
                  {statusReport.active_incidents_count} Active Incidents
                </span>
              </div>
              <h2 className="text-xl font-bold font-serif">
                {statusReport.headline}
              </h2>
              <p className="text-xs text-slate-700 max-w-2xl leading-relaxed">
                {statusReport.description}
              </p>
            </div>
          </div>

          {statusReport.status !== 'GREEN' && (
            <button
              onClick={() => navigate('/recovery')}
              className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl shadow-md flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <ArchiveRestore className="w-4 h-4 text-emerald-400" />
              <span>Open Isolated Recovery Vault</span>
            </button>
          )}
        </div>
      )}

      {/* Incident Triage Cards (Plain-Language Format) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 font-serif">
            Security Incident Log & Plain-Language Guidance
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {events.length} Total Monitored Events
          </span>
        </div>

        {events.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h3 className="font-semibold text-slate-800 text-sm">No Security Anomalies Recorded</h3>
            <p className="text-xs text-slate-500">All document fingerprints match their trusted blockchain ledger records.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((ev) => (
              <div
                key={ev.id}
                className={`p-6 bg-white rounded-2xl border shadow-xs space-y-4 ${
                  ev.risk_level === 'CRITICAL' || ev.risk_level === 'HIGH'
                    ? 'border-rose-200 ring-1 ring-rose-300'
                    : ev.risk_level === 'MEDIUM'
                    ? 'border-amber-200'
                    : 'border-slate-200'
                }`}
              >
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {ev.id}
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        ev.risk_level === 'CRITICAL' || ev.risk_level === 'HIGH'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : ev.risk_level === 'MEDIUM'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      RISK LEVEL: {ev.risk_level}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm">{ev.title}</h3>
                  </div>

                  <div className="text-right text-xs text-slate-400 font-mono">
                    {new Date(ev.timestamp).toLocaleString()}
                  </div>
                </div>

                {/* Plain-Language 3-Part Triage Box */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {/* WHAT HAPPENED */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-slate-500">
                      1. What Happened
                    </div>
                    <p className="text-slate-700 leading-relaxed">
                      {ev.what_happened}
                    </p>
                  </div>

                  {/* WHY IT MATTERS */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-slate-500">
                      2. Why It Matters
                    </div>
                    <p className="text-slate-700 leading-relaxed">
                      {ev.why_it_matters}
                    </p>
                  </div>

                  {/* WHAT TO DO */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-1">
                    <div className="font-bold text-emerald-900 uppercase tracking-wider text-[11px]">
                      3. Recommended Action
                    </div>
                    <p className="text-emerald-950 font-medium leading-relaxed">
                      {ev.what_to_do}
                    </p>
                  </div>
                </div>

                {/* Footer details */}
                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                  <span>
                    Actor: <strong className="text-slate-700">{ev.actor_name || 'System Detector'}</strong> {ev.case_id && `&bull; Case: ${ev.case_id}`}
                  </span>

                  {ev.category === 'INTEGRITY_MISMATCH' && (
                    <button
                      onClick={() => navigate('/recovery')}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Review in Recovery Vault</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
