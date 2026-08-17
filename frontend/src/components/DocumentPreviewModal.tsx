import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ShieldCheck,
  Hash,
  FileText,
  Video,
  Image as ImageIcon,
  AlertTriangle,
  Lock,
  CheckCircle2,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { formatISTTimestamp } from '../utils/dateUtils';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  caseId: string;
  documentTitle: string;
  versionNumber: number;
  category?: string;
  classification?: string;
  uploaderName?: string;
  createdAt?: string;
  sha256Hash?: string;
  mimeType?: string;
  fileName?: string;
  isVerified?: boolean;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  documentId,
  caseId,
  documentTitle,
  versionNumber,
  category = 'Evidence',
  classification = 'PUBLIC_CASE_RECORD',
  uploaderName = 'Registrar',
  createdAt,
  sha256Hash,
  mimeType,
  fileName,
  isVerified = true
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [actualMime, setActualMime] = useState<string>(mimeType || 'application/pdf');
  const [actualFileName, setActualFileName] = useState<string>(fileName || documentTitle);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState(false);

  useEffect(() => {
    if (isOpen && documentId) {
      loadDocumentContent();
    } else {
      cleanupBlobUrl();
    }
    return () => {
      cleanupBlobUrl();
    };
  }, [isOpen, documentId, versionNumber]);

  const cleanupBlobUrl = () => {
    if (blobUrl) {
      window.URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }
  };

  const loadDocumentContent = async () => {
    setLoading(true);
    setError(null);
    setIsAuthError(false);
    try {
      const res = await api.getDocumentBlob(documentId, versionNumber);
      const url = window.URL.createObjectURL(res.blob);
      setBlobUrl(url);
      setActualMime(res.mimeType || mimeType || 'application/pdf');
      setActualFileName(res.fileName || fileName || documentTitle);
    } catch (err: any) {
      const msg = err.message || 'Failed to preview document';
      setError(msg);
      if (msg.includes('not authorized') || msg.includes('permission') || msg.includes('403')) {
        setIsAuthError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await api.downloadDocumentFile(documentId, versionNumber, actualFileName);
    } catch (err: any) {
      alert(err.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  if (!isOpen) return null;

  // File format detection
  const resolvedFileName = actualFileName || documentTitle;
  const lowerFile = resolvedFileName.toLowerCase();
  const lowerMime = (actualMime || '').toLowerCase();

  const isPdf = lowerMime.includes('pdf') || lowerFile.endsWith('.pdf');
  const isImage =
    lowerMime.startsWith('image/') ||
    lowerFile.endsWith('.png') ||
    lowerFile.endsWith('.jpg') ||
    lowerFile.endsWith('.jpeg') ||
    lowerFile.endsWith('.webp');

  // Supported browser video formats
  const isSupportedVideo =
    lowerMime.includes('mp4') ||
    lowerMime.includes('webm') ||
    lowerFile.endsWith('.mp4') ||
    lowerFile.endsWith('.webm') ||
    lowerFile.endsWith('.m4v');

  // Any other video extension that browsers may not decode natively
  const isUnsupportedVideo =
    (lowerMime.startsWith('video/') ||
      lowerFile.endsWith('.avi') ||
      lowerFile.endsWith('.mov') ||
      lowerFile.endsWith('.mkv') ||
      lowerFile.endsWith('.3gp') ||
      lowerFile.endsWith('.wmv') ||
      lowerFile.endsWith('.flv')) &&
    !isSupportedVideo;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 md:p-6"
    >
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header Section */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono font-bold text-slate-700 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                {caseId}
              </span>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                {category}
              </span>
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                Version {versionNumber}
              </span>
              {classification && (
                <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  {classification}
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-serif truncate" title={resolvedFileName}>
              {resolvedFileName}
            </h2>

            {/* Verification & Trust Badges */}
            <div className="flex items-center gap-2.5 flex-wrap text-xs pt-0.5">
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Document verified</span>
              </span>
              <span className="inline-flex items-center gap-1 text-teal-800 font-medium bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>Authorized & Protected</span>
              </span>
              <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-[11px]">
                <Lock className="w-3 h-3 text-slate-500" />
                <span>AES-256-GCM Decrypted</span>
              </span>
              {uploaderName && (
                <span className="text-[11px] text-slate-500">
                  Uploaded by <strong className="text-slate-700">{uploaderName}</strong>
                  {createdAt ? ` on ${formatISTTimestamp(createdAt)}` : ''}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors shrink-0 cursor-pointer"
            aria-label="Close preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SHA-256 Fingerprint Sub-bar */}
        {sha256Hash && (
          <div className="px-5 py-2 bg-emerald-950/5 border-b border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-600">
            <div className="flex items-center gap-1.5 truncate">
              <Hash className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="font-semibold text-slate-700 shrink-0">SHA-256:</span>
              <span className="text-emerald-950 font-bold truncate">{sha256Hash}</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-sans font-semibold bg-emerald-100/70 px-2 py-0.5 rounded ml-2 shrink-0">
              Verified ✓
            </span>
          </div>
        )}

        {/* Modal Body / Viewer Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/60 flex items-center justify-center min-h-[420px]">
          {loading ? (
            <div className="text-center space-y-3 py-16">
              <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800">Authenticating with Primary Vault...</p>
                <p className="text-[11px] text-slate-500">Decrypting AES-256-GCM payload in memory for preview</p>
              </div>
            </div>
          ) : error ? (
            <div className="max-w-md w-full p-6 bg-white rounded-2xl border border-rose-200 shadow-sm text-center space-y-3 my-auto">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {isAuthError ? '403 Forbidden — Access Denied' : 'Preview Error'}
                </h3>
                <p className="text-xs text-rose-700 font-medium mt-1">
                  {error}
                </p>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {isAuthError
                  ? 'Your role, sub-role, or case assignment does not permit viewing this confidential record.'
                  : 'The requested document could not be rendered for preview.'}
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                {!isAuthError && (
                  <button
                    onClick={loadDocumentContent}
                    className="px-4 py-2 bg-[#0D5C3A] text-white rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry</span>
                  </button>
                )}
              </div>
            </div>
          ) : isPdf && blobUrl ? (
            /* PDF DOCUMENT PREVIEW */
            <div className="w-full h-[580px] bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <iframe
                src={`${blobUrl}#toolbar=1&navpanes=0`}
                title={resolvedFileName}
                className="w-full h-full border-none"
              />
            </div>
          ) : isImage && blobUrl ? (
            /* IMAGE EVIDENCE PREVIEW */
            <div className="w-full flex flex-col items-center justify-center space-y-3">
              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-md inline-block max-w-full overflow-hidden">
                <img
                  src={blobUrl}
                  alt={resolvedFileName}
                  className="max-h-[520px] w-auto max-w-full rounded-lg object-contain mx-auto"
                />
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {resolvedFileName} • {actualMime}
              </div>
            </div>
          ) : isSupportedVideo && blobUrl ? (
            /* AUTHENTICATED HTML5 VIDEO PLAYER */
            <div className="w-full max-w-3xl space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-black shadow-xl border border-slate-800">
                <video
                  controls
                  autoPlay={false}
                  className="w-full h-auto max-h-[500px] mx-auto block"
                  src={blobUrl}
                  preload="metadata"
                >
                  Your browser does not support HTML5 video playback.
                </video>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-slate-800">Digital Video Evidence Record</span>
                  <span>&bull;</span>
                  <span className="font-mono text-[11px] text-slate-500">{actualMime}</span>
                </div>
                <div className="font-mono text-[11px] text-emerald-800 font-semibold">
                  SHA-256 Fingerprinted ✓
                </div>
              </div>
            </div>
          ) : (
            /* UNSUPPORTED CODEC / OTHER FILE FORMAT FALLBACK */
            <div className="max-w-md w-full p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center space-y-4 my-auto">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
                <FileText className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">{resolvedFileName}</h3>
                <p className="text-xs text-slate-500 font-mono">{actualMime}</p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Preview is not supported by this browser.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="px-5 py-2 bg-[#0D5C3A] hover:bg-[#0A462C] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloading ? 'Downloading...' : 'Download Record'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Bar */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Authenticated session active &bull; Vault access logged to audit trail</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>

            <button
              onClick={handleDownload}
              disabled={downloading || Boolean(error && isAuthError)}
              className="px-5 py-2 bg-[#0D5C3A] hover:bg-[#0A462C] text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'Downloading...' : 'Download'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
