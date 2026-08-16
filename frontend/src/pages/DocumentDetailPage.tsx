import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  ShieldCheck,
  Hash,
  Download,
  Eye,
  History,
  Archive,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Plus,
  ArrowLeft,
  Key,
  Database,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { DocumentItem, DocumentVerifyResult } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { TechnicalDetailsModal } from '../components/TechnicalDetailsModal';

export const DocumentDetailPage: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();

  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<DocumentVerifyResult | null>(null);
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(1);
  const [showTechnicalModal, setShowTechnicalModal] = useState(false);

  // New Version Form Modal
  const [isNewVersionOpen, setIsNewVersionOpen] = useState(false);
  const [changeSummary, setChangeSummary] = useState('');
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [submittingVersion, setSubmittingVersion] = useState(false);

  // Archive Modal
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState('Matter settled / superseded by judgment record.');
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (docId) {
      loadDocument(docId);
    }
  }, [docId]);

  const loadDocument = async (id: string) => {
    setLoading(true);
    try {
      const data = await api.getDocument(id);
      setDocument(data);
      setSelectedVersionNum(data.current_version);
    } catch (err: any) {
      alert(err.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    if (!docId) return;
    setVerifying(true);
    try {
      const res = await api.verifyDocument(docId, selectedVersionNum);
      setVerifyResult(res);
    } catch (err: any) {
      alert(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docId || !versionFile || !changeSummary) return;

    setSubmittingVersion(true);
    try {
      await api.createVersion(docId, changeSummary, versionFile);
      setIsNewVersionOpen(false);
      setChangeSummary('');
      setVersionFile(null);
      await loadDocument(docId);
      // Auto-trigger verify
      await handleVerifyIntegrity();
    } catch (err: any) {
      alert(err.message || 'Failed to create new version');
    } finally {
      setSubmittingVersion(false);
    }
  };

  const handleArchive = async () => {
    if (!docId) return;
    setArchiving(true);
    try {
      await api.archiveDocument(docId, archiveReason);
      setIsArchiveOpen(false);
      await loadDocument(docId);
    } catch (err: any) {
      alert(err.message || 'Failed to archive document');
    } finally {
      setArchiving(false);
    }
  };

  if (loading || !document) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Decrypting Vault Payload & Ledger...</p>
        </div>
      </div>
    );
  }

  const currentVersionObj = document.versions.find(v => v.version_number === selectedVersionNum) || document.versions[0];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(document.case_id ? `/cases/${document.case_id}` : '/cases')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Case ({document.case_id})</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            {document.id}
          </span>
          <StatusBadge status={document.status} size="sm" />
        </div>
      </div>

      {/* Main Document Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                {document.category}
              </span>
              <span className="text-xs text-slate-500 font-mono">Case: {document.case_id}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-2 font-serif">
              {document.title}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Registered by {document.uploader_name} on {new Date(document.created_at).toLocaleString()}
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleVerifyIntegrity}
              disabled={verifying}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#0D5C3A] border border-emerald-300 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>{verifying ? 'Recalculating SHA-256...' : 'Verify Document Integrity'}</span>
            </button>

            <a
              href={`/api/documents/${document.id}/preview?version=${selectedVersionNum}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </a>

            <a
              href={`/api/documents/${document.id}/download?version=${selectedVersionNum}`}
              download
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </a>

            <button
              onClick={() => setIsNewVersionOpen(true)}
              className="px-3.5 py-2 bg-[#0D5C3A] hover:bg-[#0A462C] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Version</span>
            </button>

            <button
              onClick={() => setIsArchiveOpen(true)}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Archive Record"
            >
              <Archive className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Integrity Verification Banner */}
        {verifyResult && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3.5 ${
              verifyResult.is_valid
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                verifyResult.is_valid
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {verifyResult.is_valid ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>

            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs">
                  {verifyResult.is_valid
                    ? 'Document verified. No unexpected changes detected. ✓'
                    : 'Warning: This document does not match its trusted record. ⚠️'}
                </h4>
                <span className="text-[10px] font-mono text-slate-500">
                  {new Date(verifyResult.verified_at).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                {verifyResult.message}
              </p>
              <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2 bg-white/80 rounded-lg border border-slate-200 truncate">
                  <span className="font-sans font-semibold text-slate-600 block text-[10px]">Computed Hash:</span>
                  <span className="truncate">{verifyResult.computed_hash}</span>
                </div>
                <div className="p-2 bg-white/80 rounded-lg border border-slate-200 truncate">
                  <span className="font-sans font-semibold text-slate-600 block text-[10px]">Trusted Ledger Hash:</span>
                  <span className="truncate">{verifyResult.trusted_blockchain_hash}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fingerprint & Security Specs Bar */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-emerald-700 shrink-0" />
            <div>
              <span className="font-semibold text-slate-700">SHA-256 Fingerprint: </span>
              <span className="font-mono text-emerald-950 font-bold break-all">
                {currentVersionObj?.sha256_hash}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowTechnicalModal(true)}
            className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 shrink-0 cursor-pointer underline"
          >
            View Technical Details →
          </button>
        </div>
      </div>

      {/* Version History Selector & Timeline */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-800" />
            <span>Version History & Audit Log</span>
          </h2>
          <span className="text-xs font-medium text-slate-500">
            {document.versions.length} Version(s) Recorded
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {document.versions.map((v) => {
            const isSelected = selectedVersionNum === v.version_number;
            return (
              <div
                key={v.id}
                onClick={() => setSelectedVersionNum(v.version_number)}
                className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 ${
                  isSelected
                    ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs font-mono">
                    Version {v.version_number}.0
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(v.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium line-clamp-2">
                  {v.change_summary}
                </p>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  {(v.file_size / 1024).toFixed(1)} KB &bull; SHA: {v.sha256_hash.slice(0, 16)}...
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create New Version Modal */}
      {isNewVersionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Create New Document Version</h3>
              <p className="text-xs text-slate-500">Next: Version {document.current_version + 1}.0 (Previous versions preserved)</p>
            </div>

            <form onSubmit={handleCreateVersion} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Summary of Changes</label>
                <input
                  type="text"
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  placeholder="e.g. Schedule Annexure 4 added per hearing order..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Version File (PDF)</label>
                <input
                  type="file"
                  accept="application/pdf,.pdf,.doc,.docx"
                  onChange={(e) => setVersionFile(e.target.files?.[0] || null)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-700"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px]">
                <p>Prior versions remain immutable in encrypted storage. A new blockchain block will be minted with the new file's SHA-256 fingerprint.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewVersionOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVersion}
                  className="px-5 py-2 rounded-xl bg-[#0D5C3A] hover:bg-[#0A462C] text-white font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingVersion ? 'Sealing Version...' : 'Create Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {isArchiveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Archive Legal Record</h3>
              <p className="text-xs text-slate-500">Document will not be deleted, but marked as archived in vault.</p>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Archival Justification:</label>
                <textarea
                  rows={3}
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsArchiveOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleArchive}
                  disabled={archiving}
                  className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold shadow-xs cursor-pointer"
                >
                  {archiving ? 'Archiving...' : 'Confirm Archival'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Technical Details Modal */}
      {showTechnicalModal && (
        <TechnicalDetailsModal
          isOpen={showTechnicalModal}
          onClose={() => setShowTechnicalModal(false)}
          title={`Document ${document.title} (v${selectedVersionNum}) Technical Details`}
          data={{
            transaction_id: `DOC-TX-${document.id}`,
            sha256_hash: currentVersionObj?.sha256_hash,
            event_type: 'DOCUMENT_AUTHENTICATED',
            encryption_algorithm: 'AES-256-GCM',
            timestamp: currentVersionObj?.created_at,
            raw_details: {
              document_id: document.id,
              case_id: document.case_id,
              version_number: selectedVersionNum,
              file_name: currentVersionObj?.file_name,
              file_size_bytes: currentVersionObj?.file_size,
              mime_type: currentVersionObj?.mime_type,
              vault_status: document.status
            }
          }}
        />
      )}
    </div>
  );
};
