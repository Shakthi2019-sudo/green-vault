import React, { useState, useEffect } from 'react';
import {
  ArchiveRestore,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  RefreshCw,
  Hash,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { RecoveryRecordItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { formatISTDateTime } from '../utils/dateUtils';

export const RecoveryVaultPage: React.FC = () => {
  const [records, setRecords] = useState<RecoveryRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [recoverySuccessMsg, setRecoverySuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadRecoveryRecords();
  }, []);

  const loadRecoveryRecords = async () => {
    setLoading(true);
    try {
      const data = await api.getRecoveryRecords();
      setRecords(data);
    } catch (err) {
      console.error('Failed to load recovery records', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (docId: string) => {
    setRestoringId(docId);
    setRecoverySuccessMsg(null);
    try {
      const res = await api.restoreDocument(docId, 'Authorized judicial restoration from isolated recovery vault');
      setRecoverySuccessMsg(res.message || 'Document restored successfully. Integrity verified ✓. Recovery event recorded.');
      await loadRecoveryRecords();
    } catch (err: any) {
      alert(err.message || 'Recovery failed');
    } finally {
      setRestoringId(null);
    }
  };

  const quarantinedRecords = records.filter(r => r.status === 'QUARANTINED');
  const restoredRecords = records.filter(r => r.status === 'RESTORED');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-serif">
            Isolated Recovery Vault
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Certified, isolated mirror repository protecting original legal records against unexpected modification or tampering.
          </p>
        </div>

        <button
          onClick={loadRecoveryRecords}
          className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Vault Status</span>
        </button>
      </div>

      {/* Vault Concept Explainer Banner */}
      <div className="p-6 bg-gradient-to-r from-emerald-900 via-[#0D5C3A] to-teal-900 rounded-2xl text-white shadow-md space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-800 text-emerald-200 border border-emerald-700">
            AIR-GAPPED RECOVERY PRINCIPLE
          </span>
        </div>
        <h2 className="text-lg font-bold font-serif">
          Isolated Protection & Verified Rollback Workflow
        </h2>
        <p className="text-xs text-emerald-100/90 max-w-3xl leading-relaxed">
          Green Vault automatically maintains an isolated pristine copy of every uploaded record and its cryptographic SHA-256 fingerprint. If any file in the primary vault suffers unauthorized modification or tag mismatch, the system restricts the compromised document and enables 1-click restoration from this verified recovery store.
        </p>
      </div>

      {/* Success Notification Banner */}
      {recoverySuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-start gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold">Restoration Complete & Verified ✓</h4>
            <p className="text-xs text-emerald-800">{recoverySuccessMsg}</p>
          </div>
        </div>
      )}

      {/* Quarantined Records (Needs Recovery) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h2 className="text-base font-bold text-slate-900 font-serif">
              Quarantined Records Requiring Restoration ({quarantinedRecords.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Authorized Restoration Active
          </span>
        </div>

        {quarantinedRecords.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
            <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto" />
            <h3 className="font-semibold text-slate-900 text-sm">All Primary Vault Documents Healthy</h3>
            <p className="text-xs text-slate-500">No quarantined documents. All primary files match their trusted isolated recovery copies.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {quarantinedRecords.map((rec) => (
              <div
                key={rec.id}
                className="p-6 bg-white rounded-2xl border border-rose-200 ring-1 ring-rose-300 shadow-sm space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200">
                        {rec.id}
                      </span>
                      <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {rec.case_id} &bull; v{rec.version_number}.0
                      </span>
                      <span className="text-xs font-bold text-rose-800 bg-rose-100/70 px-2.5 py-0.5 rounded-full border border-rose-200">
                        QUARANTINED ⚠️
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mt-2">
                      {rec.document_title}
                    </h3>
                  </div>

                  {/* Restore Trigger Button (Demo Step 13) */}
                  <button
                    onClick={() => handleRestore(rec.document_id)}
                    disabled={restoringId === rec.document_id}
                    className="px-5 py-2.5 bg-[#0D5C3A] hover:bg-[#0A462C] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <RotateCcw className={`w-4 h-4 ${restoringId === rec.document_id ? 'animate-spin' : ''}`} />
                    <span>{restoringId === rec.document_id ? 'Restoring from Isolated Vault...' : 'Restore Trusted Version'}</span>
                  </button>
                </div>

                {/* Hash Comparison Box */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="font-sans font-bold text-rose-900 block text-[11px] mb-1">
                      Detected Corrupted / Tampered Hash:
                    </span>
                    <span className="text-rose-800 break-all">{rec.tampered_hash || 'HASH_MISMATCH_DETECTED'}</span>
                  </div>

                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="font-sans font-bold text-emerald-900 block text-[11px] mb-1">
                      Isolated Vault Trusted Master Hash:
                    </span>
                    <span className="text-emerald-900 font-bold break-all">{rec.trusted_hash}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                  <Info className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    Clicking <strong>Restore Trusted Version</strong> will replace the modified primary file with the pristine isolated copy, clear the restriction, and record a <code className="text-emerald-900 font-bold">DOCUMENT_RESTORED</code> event to the blockchain ledger.
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recovery History Log */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 font-serif">
          Historical Vault Restorations & Verified Recoveries
        </h2>

        {restoredRecords.length === 0 ? (
          <p className="text-xs text-slate-500 italic">No past recovery events.</p>
        ) : (
          <div className="space-y-2.5">
            {restoredRecords.map((rec) => (
              <div key={rec.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{rec.document_title}</span>
                    <span className="text-[11px] font-mono text-slate-500 font-semibold">({rec.case_id})</span>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Restored & Verified ✓
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Restored by {rec.restorer_name || 'Court Administrator'} on {rec.restored_at ? formatISTDateTime(rec.restored_at) : 'Recent'} &bull; {rec.details}
                  </div>
                </div>

                <span className="font-mono text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {rec.trusted_hash.slice(0, 16)}...
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
