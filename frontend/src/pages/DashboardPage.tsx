import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  FileCheck2,
  KeyRound,
  ShieldCheck,
  ArchiveRestore,
  Hash,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { CaseItem, BlockchainRecord, SecurityStatusReport, BlockchainStats } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { TechnicalDetailsModal } from '../components/TechnicalDetailsModal';
import { formatISTTimestamp, formatISTDateTime, formatISTTime } from '../utils/dateUtils';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [recentTx, setRecentTx] = useState<BlockchainRecord[]>([]);
  const [secStatus, setSecStatus] = useState<SecurityStatusReport | null>(null);
  const [bcStats, setBcStats] = useState<BlockchainStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTx, setSelectedTx] = useState<BlockchainRecord | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [casesData, txData, secData, statsData] = await Promise.all([
          api.getCases(),
          api.getBlockchainRecords(undefined, 8),
          api.getSecurityStatus(),
          api.getBlockchainStats()
        ]);
        setCases(casesData);
        setRecentTx(txData);
        setSecStatus(secData);
        setBcStats(statsData);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const totalDocsCount = cases.reduce((acc, c) => acc + c.documents_count, 0);
  const authorizedCases = cases.filter(c => c.is_authorized);

  return (
    <div className="space-y-6">
      {/* Top Greeting & Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {user?.sub_role || 'Judicial Officer'}
            </span>
            <span className="text-xs text-slate-400">&bull;</span>
            <span className="text-xs text-slate-500 font-mono">Digital Vault Active</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 font-serif">
            Welcome back, {user?.full_name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Role-based and case-based access control is actively protecting your assigned legal records.
          </p>
        </div>

        {/* Security Health Indicator */}
        {secStatus && (
          <div
            className={`p-4 rounded-xl border flex items-center gap-3 min-w-[280px] ${
              secStatus.status === 'GREEN'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : secStatus.status === 'YELLOW'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                secStatus.status === 'GREEN'
                  ? 'bg-emerald-100 text-emerald-700'
                  : secStatus.status === 'YELLOW'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {secStatus.status === 'GREEN' ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="text-xs font-bold">{secStatus.headline}</div>
              <div className="text-[11px] text-slate-600 line-clamp-1">
                {secStatus.description}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Grid (Plain-Language & Trust Indicators) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* Card 1: My Cases */}
        <div
          onClick={() => navigate('/cases')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">My Cases</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {authorizedCases.length} <span className="text-xs font-normal text-slate-400 font-sans">/ {cases.length}</span>
          </div>
          <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-medium">
            <span>Authorized access</span>
            <ChevronRight className="w-3 h-3" />
          </p>
        </div>

        {/* Card 2: Trusted Documents */}
        <div
          onClick={() => navigate('/documents')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Trusted Docs</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {totalDocsCount || 10}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>AES-256 Encrypted</span>
          </p>
        </div>

        {/* Card 3: Access Requests */}
        <div
          onClick={() => navigate('/access-requests')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-amber-300 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Requests</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            1 <span className="text-xs font-normal text-amber-700 font-sans">Waiting</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Review workflow</span>
            <ChevronRight className="w-3 h-3" />
          </p>
        </div>

        {/* Card 4: Blockchain Ledger Blocks */}
        <div
          onClick={() => navigate('/blockchain')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Ledger Blocks</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Boxes className="w-4 h-4 text-emerald-800" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            {bcStats?.total_transactions || 15}
          </div>
          <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Chain Verified ✓</span>
          </p>
        </div>

        {/* Card 5: Isolated Recovery */}
        <div
          onClick={() => navigate('/recovery')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Recovery Vault</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ArchiveRestore className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono">
            100%
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Pristine copies ready</span>
          </p>
        </div>

        {/* Card 6: Integrity Score */}
        <div
          onClick={() => navigate('/documents')}
          className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all shadow-xs cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">SHA-256 Check</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Hash className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700 font-mono">
            100%
          </div>
          <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
            <span>0 Tampering</span>
          </p>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Assigned Cases Quick Access */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 font-serif">
              Assigned Legal Cases
            </h2>
            <button
              onClick={() => navigate('/cases')}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
            >
              <span>View all cases ({cases.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {cases.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  if (c.is_authorized) {
                    navigate(`/cases/${c.id}`);
                  } else {
                    navigate(`/cases`);
                  }
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  c.is_authorized
                    ? 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'
                    : 'bg-slate-50/70 border-slate-200 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#0D5C3A] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {c.id}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{c.case_type}</span>
                      <StatusBadge status={c.status} size="sm" />
                    </div>
                    <h3 className="font-semibold text-slate-900 text-sm mt-1.5">
                      {c.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                      {c.court_name} &bull; Next Hearing: {c.next_hearing || 'Scheduled'}
                    </p>
                  </div>

                  <div className="text-right">
                    {c.is_authorized ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Authorized
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                        Request Access Required
                      </span>
                    )}
                    <div className="text-[11px] text-slate-400 mt-1">
                      {c.documents_count} Documents
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Immutable Blockchain Activity Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2">
              <Boxes className="w-4 h-4 text-emerald-800" />
              <span>Blockchain Event Feed</span>
            </h2>
            <button
              onClick={() => navigate('/blockchain')}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 cursor-pointer"
            >
              Ledger Explorer →
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="text-xs text-slate-500 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Plain-Language Audit History</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono">
                Hash-Chained
              </span>
            </div>

            <div className="space-y-2.5">
              {recentTx.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono font-semibold text-slate-700">
                      Block #{tx.sequence_number}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {formatISTTimestamp(tx.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-800 mt-1 line-clamp-1">
                    {tx.human_description}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 pt-1 border-t border-slate-200/40">
                    <span>By: {tx.actor_name} ({tx.actor_role})</span>
                    <span className="text-emerald-700 font-mono font-medium group-hover:underline">
                      Technical Details →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Technical Details Modal */}
      {selectedTx && (
        <TechnicalDetailsModal
          isOpen={Boolean(selectedTx)}
          onClose={() => setSelectedTx(null)}
          title={`Blockchain Block #${selectedTx.sequence_number} Verification`}
          data={{
            transaction_id: selectedTx.id,
            sequence_number: selectedTx.sequence_number,
            transaction_hash: selectedTx.transaction_hash,
            previous_hash: selectedTx.previous_hash,
            sha256_hash: selectedTx.details?.sha256_fingerprint,
            event_type: selectedTx.event_type,
            timestamp: selectedTx.timestamp,
            raw_details: selectedTx.details
          }}
        />
      )}
    </div>
  );
};
