import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  FileText,
  Users,
  ShieldCheck,
  Boxes,
  Network,
  History,
  CheckCircle2,
  Lock,
  Upload,
  Download,
  Eye,
  ChevronRight,
  Hash,
  Scale,
  Calendar,
  AlertCircle,
  Plus,
  ArrowLeft,
  Video,
  Image as ImageIcon
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CaseDetail, DocumentItem, BlockchainRecord } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { TechnicalDetailsModal } from '../components/TechnicalDetailsModal';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';
import { formatISTTimestamp, formatISTDateTime, formatISTDate } from '../utils/dateUtils';

export const CaseDetailPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'DOCUMENTS' | 'PEOPLE' | 'HISTORY' | 'BLOCKCHAIN' | 'SYSTEMS'>('DOCUMENTS');
  const [selectedTx, setSelectedTx] = useState<BlockchainRecord | null>(null);

  // Document Preview Modal state
  const [previewDoc, setPreviewDoc] = useState<{
    id: string;
    caseId: string;
    title: string;
    version: number;
    category?: string;
    classification?: string;
    uploaderName?: string;
    createdAt?: string;
    sha256Hash?: string;
    mimeType?: string;
    fileName?: string;
  } | null>(null);

  // Download state
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Evidence');
  const [uploadClassification, setUploadClassification] = useState('PUBLIC_CASE_RECORD');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const canUpload = user?.role === 'JUDGE' || user?.role === 'LAWYER' || user?.role === 'COURT_ADMIN';

  useEffect(() => {
    if (caseId) {
      loadCaseDetail(caseId);
    }
  }, [caseId]);

  const loadCaseDetail = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCaseDetail(id);
      setCaseData(data);
    } catch (err: any) {
      setError(err.message || 'You are not authorized to view this case.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDoc = async (docId: string, version?: number, fallbackName?: string) => {
    setDownloadingDocId(docId);
    try {
      await api.downloadDocumentFile(docId, version, fallbackName);
    } catch (err: any) {
      alert(err.message || 'Download failed');
    } finally {
      setDownloadingDocId(null);
    }
  };

  const openPreview = (doc: DocumentItem, versionNum?: number) => {
    const vNum = versionNum || doc.current_version;
    const vObj = doc.versions.find(v => v.version_number === vNum) || doc.versions[0];
    setPreviewDoc({
      id: doc.id,
      caseId: doc.case_id,
      title: doc.title,
      version: vNum,
      category: doc.category,
      classification: doc.classification,
      uploaderName: doc.uploader_name,
      createdAt: doc.created_at,
      sha256Hash: vObj?.sha256_hash || doc.sha256_fingerprint,
      mimeType: vObj?.mime_type,
      fileName: vObj?.file_name || doc.title
    });
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId || !uploadFile || !uploadTitle) return;

    setUploading(true);
    try {
      await api.uploadDocument(caseId, uploadTitle, uploadCategory, uploadFile, uploadClassification);
      setIsUploadOpen(false);
      setUploadTitle('');
      setUploadFile(null);
      setUploadClassification('PUBLIC_CASE_RECORD');
      await loadCaseDetail(caseId);
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Decrypting Case Repository Vault...</p>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="max-w-xl mx-auto mt-12 p-8 bg-white rounded-2xl border border-amber-200 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          {error || 'You are not currently authorized to view this case.'}
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <button
            onClick={() => navigate('/cases')}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
          >
            ← Back to Cases
          </button>
          <button
            onClick={() => navigate('/access-requests')}
            className="px-4 py-2 bg-[#0D5C3A] hover:bg-[#0A462C] text-white text-xs font-semibold rounded-xl cursor-pointer"
          >
            Submit Access Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb & Back */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/cases')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Cases</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-[#0D5C3A] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            {caseData.id}
          </span>
          <StatusBadge status={caseData.status} size="sm" />
        </div>
      </div>

      {/* Case Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span>{caseData.court_name}</span>
              <span>&bull;</span>
              <span>{caseData.case_type}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1 font-serif">
              {caseData.title}
            </h1>
            <p className="text-xs text-slate-600 mt-1.5 max-w-3xl leading-relaxed">
              {caseData.description}
            </p>
          </div>

          {canUpload && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-4 py-2 bg-[#0D5C3A] hover:bg-[#0A462C] text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Document / Evidence</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-t border-slate-100 pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('DOCUMENTS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'DOCUMENTS'
                ? 'bg-emerald-50 text-[#0D5C3A] font-semibold border border-emerald-200/80 shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Documents & Evidence ({caseData.documents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'bg-emerald-50 text-[#0D5C3A] font-semibold border border-emerald-200/80 shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Document Versions Timeline</span>
          </button>

          <button
            onClick={() => setActiveTab('PEOPLE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'PEOPLE'
                ? 'bg-emerald-50 text-[#0D5C3A] font-semibold border border-emerald-200/80 shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Parties & Counsel ({caseData.people.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('BLOCKCHAIN')}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'BLOCKCHAIN'
                ? 'bg-emerald-50 text-[#0D5C3A] font-semibold border border-emerald-200/80 shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Blockchain History ({caseData.recent_transactions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('SYSTEMS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'SYSTEMS'
                ? 'bg-emerald-50 text-[#0D5C3A] font-semibold border border-emerald-200/80 shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Connected Systems ({caseData.connected_systems.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: DOCUMENTS & EVIDENCE */}
      {activeTab === 'DOCUMENTS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {caseData.documents.map((doc) => {
              const lowerTitle = doc.title.toLowerCase();
              const isVideo = lowerTitle.endsWith('.mp4') || lowerTitle.endsWith('.webm') || lowerTitle.endsWith('.mov') || lowerTitle.endsWith('.avi');
              const isImg = lowerTitle.endsWith('.jpg') || lowerTitle.endsWith('.jpeg') || lowerTitle.endsWith('.png') || lowerTitle.endsWith('.webp');

              return (
                <div
                  key={doc.id}
                  className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all space-y-3.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {doc.category}
                        </span>
                        <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {doc.classification}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">v{doc.current_version}.0</span>
                        <StatusBadge status={doc.status} size="sm" />
                      </div>
                      <h3
                        onClick={() => navigate(`/documents/${doc.id}`)}
                        className="font-semibold text-slate-900 text-sm mt-2 cursor-pointer hover:text-emerald-800 transition-colors"
                      >
                        {doc.title}
                      </h3>
                    </div>

                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      {isVideo ? <Video className="w-4 h-4 text-emerald-800" /> : (isImg ? <ImageIcon className="w-4 h-4 text-teal-800" /> : <FileText className="w-4 h-4" />)}
                    </div>
                  </div>

                  {/* Fingerprint Badge */}
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-[11px] font-mono">
                    <div className="flex items-center gap-1.5 text-slate-500 truncate">
                      <Hash className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span className="truncate">{doc.sha256_fingerprint}</span>
                    </div>
                    <span className="text-[10px] font-sans font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded shrink-0 ml-2">
                      Verified ✓
                    </span>
                  </div>

                  {/* Document Action Area: [ View ] [ Download ] */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openPreview(doc);
                        }}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#0D5C3A] border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="View Document Preview"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-700" />
                        <span>View</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadDoc(doc.id, doc.current_version, doc.title);
                        }}
                        disabled={downloadingDocId === doc.id}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        title="Download Authenticated Document"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{downloadingDocId === doc.id ? 'Downloading...' : 'Download'}</span>
                      </button>
                    </div>

                    <button
                      onClick={() => navigate(`/documents/${doc.id}`)}
                      className="text-emerald-700 hover:text-emerald-900 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>Inspect</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: DOCUMENT VERSIONS TIMELINE */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-serif">
              Document Version Lifecycle & Multi-Version History
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Official records are never overwritten. Every amendment generates a cryptographically fingerprinted new version.
            </p>
          </div>

          <div className="space-y-6">
            {caseData.documents.map((doc) => (
              <div key={doc.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-700" />
                    <span className="font-semibold text-slate-900 text-sm">{doc.title}</span>
                    <span className="text-xs text-slate-500 font-mono">({doc.id})</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                    {doc.versions.length} Version(s)
                  </span>
                </div>

                {/* Timeline chain */}
                <div className="pl-4 border-l-2 border-emerald-300 space-y-3 mt-2">
                  {doc.versions.map((v) => (
                    <div key={v.id} className="relative bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2">
                      <div className="absolute -left-[23px] top-3.5 w-3 h-3 rounded-full bg-emerald-600 border-2 border-white" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 font-mono">Version {v.version_number}.0</span>
                        <span className="text-slate-500 font-mono text-[11px]">{formatISTTimestamp(v.created_at)}</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">
                        {v.change_summary}
                      </p>
                      <div className="text-[11px] font-mono text-emerald-900 bg-emerald-50 px-2 py-1 rounded truncate">
                        SHA-256: {v.sha256_hash}
                      </div>

                      {/* Action buttons on timeline item */}
                      <div className="pt-1.5 flex items-center justify-end gap-2 border-t border-slate-100">
                        <button
                          onClick={() => openPreview(doc, v.version_number)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#0D5C3A] border border-emerald-200 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => handleDownloadDoc(doc.id, v.version_number, v.file_name)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PEOPLE & CASE ASSIGNMENTS */}
      {activeTab === 'PEOPLE' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-serif">
              Assigned Judicial Stakeholders & Litigants
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Access permissions are strictly anchored to these assigned roles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {caseData.people.map((p) => (
              <div key={p.user_id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">{p.full_name}</span>
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">
                      {p.username}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-[#0D5C3A] mt-1">
                    {p.assignment_role}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Active Grant
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: BLOCKCHAIN HISTORY */}
      {activeTab === 'BLOCKCHAIN' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-serif">
                Immutable Blockchain Transaction Ledger
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Hash-chained event log recording every document registration, version, and access event.
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Chain Verified ✓
            </span>
          </div>

          <div className="space-y-2.5">
            {caseData.recent_transactions.map((tx) => (
              <div
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-700">
                      Block #{tx.sequence_number}
                    </span>
                    <span className="text-xs text-slate-500">&bull;</span>
                    <span className="text-xs font-medium text-slate-900">{tx.human_description}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-1 flex items-center gap-2">
                    <span>{formatISTTimestamp(tx.timestamp)}</span>
                    <span>&bull;</span>
                    <span>By: {tx.actor_name}</span>
                    <span>&bull;</span>
                    <span>TxID: {tx.id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-emerald-700 group-hover:underline">
                    Inspect Block →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: CONNECTED SYSTEMS */}
      {activeTab === 'SYSTEMS' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-serif">
              Connected Indian Legal Platforms (Demo Integrations)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Conceptual integrations bridging fragmented legal records across national platforms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {caseData.connected_systems.map((sys) => (
              <div key={sys} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{sys}</span>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Connected (Demo)
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Synchronized registry metadata and cross-referenced document hashes for {caseData.id}.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dedicated Full Document Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          documentId={previewDoc.id}
          caseId={previewDoc.caseId}
          documentTitle={previewDoc.title}
          versionNumber={previewDoc.version}
          category={previewDoc.category}
          classification={previewDoc.classification}
          uploaderName={previewDoc.uploaderName}
          createdAt={previewDoc.createdAt}
          sha256Hash={previewDoc.sha256Hash}
          mimeType={previewDoc.mimeType}
          fileName={previewDoc.fileName}
          isVerified={true}
        />
      )}

      {/* Upload Document Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Upload Legal Record or Evidence</h3>
              <p className="text-xs text-slate-500 font-mono">Case: {caseData.id}</p>
            </div>

            <form onSubmit={handleUpload} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document Title</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Site_Inspection_Photo.jpg or Contract.pdf"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Evidence">Evidence</option>
                    <option value="Digital Evidence">Digital Evidence (Video)</option>
                    <option value="Petition">Petition</option>
                    <option value="Witness Statement">Witness Statement</option>
                    <option value="Forensic Report">Forensic Report</option>
                    <option value="Court Order">Court Order</option>
                    <option value="Judgment">Judgment</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Classification</label>
                  <select
                    value={uploadClassification}
                    onChange={(e) => setUploadClassification(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="PUBLIC_CASE_RECORD">Public Case Record</option>
                    <option value="EVIDENCE">Evidence</option>
                    <option value="CLIENT_ACCESSIBLE">Client Accessible</option>
                    <option value="COURT_INTERNAL">Court Internal (Judge Only)</option>
                    <option value="LAWYER_CONFIDENTIAL">Lawyer Confidential</option>
                    <option value="RESTRICTED">Restricted</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">File (PDF, Video, Image, DOCX)</label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-700"
                  required
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] space-y-1">
                <div className="font-semibold">Security Protocol:</div>
                <p>Payload is encrypted with AES-256-GCM, fingerprinted with SHA-256, and sealed onto the immutable blockchain ledger.</p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2 rounded-xl bg-[#0D5C3A] hover:bg-[#0A462C] text-white font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {uploading ? 'Encrypting & Registering...' : 'Upload & Encrypt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
