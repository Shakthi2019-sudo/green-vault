import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Shield,
  Send,
  Building2,
  Lock,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { AccessRequestItem, CaseItem } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export const AccessRequestsPage: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AccessRequestItem[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // New Request Form
  const [selectedCaseId, setSelectedCaseId] = useState('CASE-2026-003');
  const [reason, setReason] = useState('Bench assignment review & adjudication record access requirement.');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isCourtAdmin = user?.role in { 'COURT_ADMIN': true, 'ADMIN': true } || user?.sub_role?.includes('Administrator');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqData, casesData] = await Promise.all([
        api.getAccessRequests(),
        api.getCases()
      ]);
      setRequests(reqData);
      setCases(casesData);
    } catch (err) {
      console.error('Failed to load access requests', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reqId: string) => {
    setActionLoading(reqId);
    try {
      await api.approveAccessRequest(reqId, 'Approved by Court Administrator per judicial assignment.');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (reqId: string) => {
    setActionLoading(reqId);
    try {
      await api.rejectAccessRequest(reqId, 'Rejected: Insufficient jurisdictional justification.');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Rejection failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId || !reason) return;

    setSubmitting(true);
    try {
      await api.submitAccessRequest(selectedCaseId, ['VIEW', 'DOWNLOAD'], reason);
      setSuccessMsg(`Access request for ${selectedCaseId} submitted successfully!`);
      setTimeout(() => setSuccessMsg(null), 3000);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-serif">
            Case Access Requests
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Formal judicial permission requests and administrative approval workflows recorded on blockchain.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            Role: <strong className="text-emerald-800">{user?.sub_role}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Access Requests List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 font-serif">
              {isCourtAdmin ? 'Pending & Reviewed Authorization Requests' : 'My Submitted Access Requests'}
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              {requests.length} Total Requests
            </span>
          </div>

          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {req.id}
                      </span>
                      <span className="text-xs font-mono font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {req.case_id}
                      </span>
                      <StatusBadge status={req.status} size="sm" />
                    </div>
                    <h3 className="font-semibold text-slate-900 text-sm mt-1.5">
                      {req.case_title}
                    </h3>
                  </div>

                  <div className="text-right text-[11px] text-slate-400">
                    {new Date(req.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">Requester: {req.user_full_name} ({req.user_role})</span>
                    <span className="font-mono text-emerald-800 text-[11px]">
                      Scope: {req.requested_permissions.join(', ')}
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs mt-1 italic">
                    "{req.reason}"
                  </p>
                </div>

                {/* Review status note */}
                {req.reviewed_by && (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      Reviewed by {req.reviewer_name} on {req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : 'N/A'}: <span className="font-medium text-slate-700">{req.review_note}</span>
                    </span>
                  </div>
                )}

                {/* Court Admin Action Buttons (Demo Step 9) */}
                {isCourtAdmin && req.status === 'PENDING' && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleReject(req.id)}
                      disabled={actionLoading === req.id}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5 text-slate-500" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleApprove(req.id)}
                      disabled={actionLoading === req.id}
                      className="px-4 py-1.5 bg-[#0D5C3A] hover:bg-[#0A462C] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{actionLoading === req.id ? 'Granting on Blockchain...' : 'Approve Access'}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Submit New Request Form */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 font-serif">
            Submit New Access Request
          </h2>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Target Case</label>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} — {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Permissions Requested</label>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-semibold">
                    VIEW
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-semibold">
                    DOWNLOAD
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason / Official Purpose</label>
                <textarea
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State the official judicial or legal justification..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
                <div className="font-semibold text-slate-800">Protocol Notice:</div>
                <p>Upon approval by the Court Administrator, permissions are immutably registered on the blockchain event ledger.</p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0D5C3A] hover:bg-[#0A462C] text-white font-semibold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Submitting...' : 'Submit Request'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
