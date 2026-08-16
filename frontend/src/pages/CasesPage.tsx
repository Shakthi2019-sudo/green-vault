import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Search,
  Filter,
  Lock,
  CheckCircle2,
  KeyRound,
  FileText,
  Building2,
  Calendar,
  ChevronRight,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { CaseItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export const CasesPage: React.FC = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCaseForRequest, setSelectedCaseForRequest] = useState<CaseItem | null>(null);
  const [requestReason, setRequestReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestSuccessMessage, setRequestSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      const data = await api.getCases();
      setCases(data);
    } catch (err) {
      console.error('Failed to load cases', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCaseClick = (c: CaseItem) => {
    if (c.is_authorized) {
      navigate(`/cases/${c.id}`);
    } else {
      setSelectedCaseForRequest(c);
      setRequestReason('Assigned judicial bench review & case record access requirement.');
    }
  };

  const handleSubmitAccessRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseForRequest) return;

    setSubmittingRequest(true);
    try {
      await api.submitAccessRequest(
        selectedCaseForRequest.id,
        ['VIEW', 'DOWNLOAD'],
        requestReason
      );
      setRequestSuccessMessage(`Access request for ${selectedCaseForRequest.id} submitted successfully to Court Administrator.`);
      setTimeout(() => {
        setSelectedCaseForRequest(null);
        setRequestSuccessMessage(null);
      }, 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to submit request');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const filteredCases = cases.filter(c =>
    c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.court_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-serif">
            Legal Case Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Access-controlled case records with cryptographic integrity fingerprints & connected legal systems.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Case ID (CASE-2026-001), Title, or Court..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-medium"
          />
        </div>
      </div>

      {/* Cases List */}
      <div className="space-y-4">
        {filteredCases.map((c) => (
          <div
            key={c.id}
            onClick={() => handleCaseClick(c)}
            className={`p-6 bg-white rounded-2xl border transition-all cursor-pointer shadow-xs ${
              c.is_authorized
                ? 'border-slate-200 hover:border-emerald-300 hover:shadow-md'
                : 'border-amber-200 bg-amber-50/10 hover:border-amber-300'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs font-mono font-bold text-[#0D5C3A] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    {c.id}
                  </span>
                  <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {c.case_type}
                  </span>
                  <StatusBadge status={c.status} size="sm" />

                  {c.is_authorized ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Authorized
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <Lock className="w-3 h-3 text-amber-600" />
                      Authorization Required
                    </span>
                  )}
                </div>

                <h2 className="text-lg font-bold text-slate-900">
                  {c.title}
                </h2>

                <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{c.court_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Filing: {c.filing_date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="font-semibold text-slate-700">{c.documents_count} Verified Documents</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 max-w-3xl leading-relaxed pt-1">
                  {c.description}
                </p>

                {/* Connected Systems Badges */}
                <div className="flex items-center gap-1.5 pt-2">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Systems:</span>
                  {c.connected_systems.map((sys) => (
                    <span
                      key={sys}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-medium"
                    >
                      {sys} (Demo)
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="shrink-0 flex items-center lg:flex-col lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                {c.is_authorized ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/cases/${c.id}`);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#0D5C3A] hover:bg-[#0A462C] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Open Case View</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCaseForRequest(c);
                      setRequestReason('Assigned judicial bench review & case record access requirement.');
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Request Access</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Access Request Modal */}
      {selectedCaseForRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-amber-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Access Authorization Required</h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedCaseForRequest.id} &bull; {selectedCaseForRequest.title}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmitAccessRequest} className="p-6 space-y-4">
              {requestSuccessMessage ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{requestSuccessMessage}</span>
                </div>
              ) : (
                <>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                    <div className="font-semibold text-slate-800">Permission Protocol:</div>
                    <p className="text-[11px] text-slate-500">
                      You are not currently assigned to this case. Submit an Access Request to Court Administration explaining your judicial or legal necessity.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Requested Permissions:
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                        VIEW
                      </span>
                      <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200">
                        DOWNLOAD
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Official Reason / Justification:
                    </label>
                    <textarea
                      rows={3}
                      value={requestReason}
                      onChange={(e) => setRequestReason(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                      placeholder="e.g. Supplemental bench adjudication or co-counsel briefing..."
                      required
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCaseForRequest(null)}
                      className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingRequest}
                      className="px-5 py-2 rounded-xl bg-[#0D5C3A] hover:bg-[#0A462C] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {submittingRequest ? 'Submitting...' : 'Submit Access Request'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
