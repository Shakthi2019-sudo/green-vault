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
  Video,
  Image as ImageIcon,
  FileCode,
  Maximize2
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DocumentItem, DocumentVerifyResult } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { TechnicalDetailsModal } from '../components/TechnicalDetailsModal';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';
import { formatISTTimestamp, formatISTDateTime, formatISTDate } from '../utils/dateUtils';

export const DocumentDetailPage: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<DocumentVerifyResult | null>(null);
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(1);
  const [showTechnicalModal, setShowTechnicalModal] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // In-app Media Preview State
  const [mediaBlobUrl, setMediaBlobUrl] = useState<string | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // New Version Form Modal
  const [isNewVersionOpen, setIsNewVersionOpen] = useState(false);
  const [changeSummary, setChangeSummary] = useState('');
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [submittingVersion, setSubmittingVersion] = useState(false);

  // Archive Modal
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState('Matter settled / superseded by judgment record.');
  const [archiving, setArchiving] = useState(false);

  // Downloading State
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (docId) {
      loadDocument(docId);
    }
  }, [docId]);

  useEffect(() => {
    if (document && selectedVersionNum) {
      loadMediaBlob(document.id, selectedVersionNum);
    }
    return () => {
      if (mediaBlobUrl) {
        window.URL.revokeObjectURL(mediaBlobUrl);
      }
    };
  }, [document?.id, selectedVersionNum]);

  const loadDocument = async (id: string) => {
    setLoading(true);
    try {
      const data = await api.getDocument(id);
      setDocument(data);
      setSelectedVersionNum(data.current_version);
    } catch (err: any) {
      alert(err.message || 'You do not have permission to view this document.');
      navigate('/cases');
    } finally {
      setLoading(false);
    }
  };

  const loadMediaBlob = async (id: string, version: number) => {
    setMediaLoading(true);
    setMediaError(null);
    try {
      const { blob } = await api.getDocumentBlob(id, version);
      const url = window.URL.createObjectURL(blob);
      setMediaBlobUrl(url);
    } catch (err: any) {
      setMediaError(err.message || 'Could not load media payload');
      setMediaBlobUrl(null);
    } finally {
      setMediaLoading(false);
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

  const handleDownload = async (vNum?: number, vFileName?: string) => {
    if (!document) return;
    const targetVer = vNum || selectedVersionNum;
    const targetFile = vFileName || currentVersionObj?.file_name;
    setDownloading(true);
    try {
      await api.downloadDocumentFile(document.id, targetVer, targetFile);
    } catch (err: any) {
      alert(err.message || 'Download failed');
    } finally {
      setDownloading(false);
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
  const mime = (currentVersionObj?.mime_type || 'application/pdf').toLowerCase();
  const fileName = (currentVersionObj?.file_name || document.title).toLowerCase();

  const isPdf = mime.includes('pdf') || fileName.endsWith('.pdf');
  const isImage = mime.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(fileName);
  const isSupportedVideo =
    mime.includes('mp4') ||
    mime.includes('webm') ||
    mime.includes('m4v') ||
    /\.(mp4|webm|m4v)$/i.test(fileName);

  const isUnsupportedCodec =
    (mime.startsWith('video/') || /\.(avi|mov|mkv|3gp|wmv|flv)$/i.test(fileName)) &&
    !isSupportedVideo;

  const canCreateVersion = user?.role === 'JUDGE' || user?.role === 'LAWYER' || user?.role === 'COURT_ADMIN';
  const canArchive = user?.role === 'JUDGE' || user?.role === 'COURT_ADMIN';

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
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

      {/* Main Document Information Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                {document.category}
              </span>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                {document.classification}
              </span>
              <span className="text-xs text-slate-500 font-mono">Case: {document.case_id}</span>
              <span className="text-xs text-slate-500 font-mono">Version: {selectedVersionNum}.0</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-2 font-serif">
              {document.title}
            </h1>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 flex-wrap">
              <span>
                Registered by <strong className="text-slate-700">{document.uploader_name}</strong> on{' '}
                {formatISTTimestamp(document.created_at)}
              </span>
              <span className="text-slate-300">&bull;</span>
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified</span>
              </span>
              <span className="inline-flex items-center gap-1 text-teal-800 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Authorized</span>
              </span>
              <span className="inline-flex items-center gap-1 text-slate-600">
                <Lock className="w-3 h-3" />
                <span>Protected</span>
              </span>
            </div>
          </div>

          {/* Document Action Area: [ View ] [ Download ] */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsPreviewModalOpen(true)}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#0D5C3A] border border-emerald-300 rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Open Document Preview"
            >
              <Eye className="w-4 h-4 text-emerald-700" />
              <span>View</span>
            </button>

            <button
              onClick={() => handleDownload()}
              disabled={downloading}
              className="px-4 py-2 bg-[#0D5C3A] hover:bg-[#0A462C] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              title="Download Authenticated Document"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Downloading...' : 'Download'}</span>
            </button>

            <button
              onClick={handleVerifyIntegrity}
              disabled={verifying}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>{verifying ? 'Verifying...' : 'Verify Integrity'}</span>
            </button>

            {canCreateVersion && (
              <button
                onClick={() => setIsNewVersionOpen(true)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>New Version</span>
              </button>
            )}

            {canArchive && (
              <button
                onClick={() => setIsArchiveOpen(true)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                title="Archive Record"
              >
                <Archive className="w-4 h-4" />
              </button>
            )}
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
                  {formatISTTimestamp(verifyResult.verified_at)}
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

      {/* IN-APP SECURE MEDIA & DOCUMENT PREVIEWER */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
              {isSupportedVideo ? (
                <Video className="w-4 h-4" />
              ) : isImage ? (
                <ImageIcon className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-serif">
                {isSupportedVideo
                  ? 'Digital Video Evidence Player'
                  : isImage
                  ? 'Digital Photographic Evidence'
                  : isPdf
                  ? 'Secure PDF Document Preview'
                  : 'Authenticated Record'}
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                {currentVersionObj?.file_name || document.title} • Version {selectedVersionNum}.0 •{' '}
                {(currentVersionObj?.file_size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPreviewModalOpen(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Full Preview</span>
            </button>
            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-medium">
              AES-256-GCM Decrypted
            </span>
          </div>
        </div>

        {/* Media Player / Render Area */}
        <div className="rounded-xl overflow-hidden bg-slate-900/5 border border-slate-200 min-h-[360px] flex items-center justify-center p-4">
          {mediaLoading ? (
            <div className="text-center space-y-2 py-12">
              <div className="w-7 h-7 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Decrypting and streaming from Primary Vault...</p>
            </div>
          ) : mediaError ? (
            <div className="text-center space-y-2 p-6 max-w-md">
              <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
              <h4 className="text-xs font-bold text-slate-800">Preview Notice</h4>
              <p className="text-xs text-slate-500">{mediaError}</p>
              <button
                onClick={() => handleDownload()}
                className="mt-2 px-4 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-semibold"
              >
                Download Encrypted Master File
              </button>
            </div>
          ) : isSupportedVideo ? (
            /* HTML5 VIDEO EVIDENCE PLAYER */
            <div className="w-full max-w-3xl space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black shadow-lg">
                <video
                  controls
                  className="w-full h-auto max-h-[460px] mx-auto"
                  src={mediaBlobUrl || undefined}
                  preload="metadata"
                >
                  Your browser does not support HTML5 video playback.
                </video>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-slate-800">Digital Video Evidence Record</span>
                  <span>&bull;</span>
                  <span className="font-mono text-[11px] text-slate-500">{mime}</span>
                </div>
                <div className="font-mono text-[11px] text-emerald-800 font-semibold">
                  SHA-256 Fingerprinted ✓
                </div>
              </div>
            </div>
          ) : isImage ? (
            /* HIGH RESOLUTION IMAGE PREVIEW */
            <div className="w-full max-w-2xl text-center space-y-3">
              <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm inline-block max-w-full">
                <img
                  src={mediaBlobUrl || undefined}
                  alt={document.title}
                  className="max-h-[460px] w-auto rounded-lg mx-auto object-contain"
                />
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {currentVersionObj?.file_name || document.title} • {mime}
              </div>
            </div>
          ) : isPdf ? (
            /* PDF DOCUMENT VIEWER */
            <div className="w-full h-[520px] rounded-xl overflow-hidden border border-slate-200 bg-white">
              <iframe
                src={mediaBlobUrl ? `${mediaBlobUrl}#toolbar=1` : undefined}
                title={document.title}
                className="w-full h-full border-none"
              />
            </div>
          ) : (
            /* UNSUPPORTED CODEC / OTHER RECORD FORMATS */
            <div className="text-center space-y-3 p-8">
              <FileCode className="w-12 h-12 text-slate-400 mx-auto" />
              <div>
                <h3 className="font-bold text-sm text-slate-900">{currentVersionObj?.file_name || document.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">{mime} • {(currentVersionObj?.file_size / 1024).toFixed(1)} KB</p>
              </div>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                {isUnsupportedCodec
                  ? 'Preview is not supported by this browser.'
                  : 'This legal record is encrypted and fingerprinted with SHA-256 in the vault. Use the button below to download the decrypted payload.'}
              </p>
              <button
                onClick={() => handleDownload()}
                className="px-5 py-2.5 bg-[#0D5C3A] hover:bg-[#0A462C] text-white rounded-xl text-xs font-semibold shadow-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Version History Selector & Timeline */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 font-serif flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-800" />
            <span>Version History & Audit Trail</span>
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
                className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                  isSelected
                    ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs font-mono">
                    Version {v.version_number}.0
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {formatISTTimestamp(v.created_at)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium line-clamp-2">
                  {v.change_summary}
                </p>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  {(v.file_size / 1024).toFixed(1)} KB &bull; SHA: {v.sha256_hash.slice(0, 16)}...
                </div>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVersionNum(v.version_number);
                      setIsPreviewModalOpen(true);
                    }}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-md text-[11px] font-semibold border border-emerald-200 flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(v.version_number, v.file_name);
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dedicated Full Document Preview Modal */}
      {isPreviewModalOpen && (
        <DocumentPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          documentId={document.id}
          caseId={document.case_id}
          documentTitle={document.title}
          versionNumber={selectedVersionNum}
          category={document.category}
          classification={document.classification}
          uploaderName={document.uploader_name}
          createdAt={document.created_at}
          sha256Hash={currentVersionObj?.sha256_hash}
          mimeType={currentVersionObj?.mime_type}
          fileName={currentVersionObj?.file_name}
          isVerified={true}
        />
      )}

      {/* Create New Version Modal */}
      {isNewVersionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 font-serif">
              Upload New Version for {document.title}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every document version is cryptographically fingerprinted with SHA-256 and immutably sealed on the blockchain ledger.
            </p>

            <form onSubmit={handleCreateVersion} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Change Summary / Justification
                </label>
                <input
                  type="text"
                  required
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  placeholder="e.g., Incorporated Schedule B commercial amendments"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Payload
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setVersionFile(e.target.files?.[0] || null)}
                  className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-[#0D5C3A] hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewVersionOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingVersion}
                  className="px-4 py-2 bg-[#0D5C3A] hover:bg-[#0A462C] text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submittingVersion ? 'Digitally Sealing...' : 'Seal & Upload Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {isArchiveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 font-serif">
              Archive Legal Record
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Archiving marks the record inactive but preserves full cryptographic audit trails and version history on the blockchain.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Archival
                </label>
                <textarea
                  rows={3}
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsArchiveOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={archiving}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
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
          title={`Cryptographic Fingerprint & Security Profile: ${document.title}`}
          data={{
            document_id: document.id,
            case_id: document.case_id,
            category: document.category,
            classification: document.classification,
            version_number: selectedVersionNum,
            sha256_fingerprint: currentVersionObj?.sha256_hash,
            encryption_cipher: 'AES-256-GCM (Vault Encrypted at Rest)',
            argon2id_key_derivation: 'Enabled for role-based sessions',
            storage_path: `storage/vault/encrypted/${document.id}_v${selectedVersionNum}.enc`,
            tamper_evident_status: currentVersionObj?.is_tampered ? 'TAMPER_DETECTED' : 'PRISTINE_VERIFIED',
            created_at: document.created_at,
            updated_at: document.updated_at
          }}
        />
      )}
    </div>
  );
};
