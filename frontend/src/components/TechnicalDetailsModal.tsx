import React from 'react';
import { X, Copy, Check, ShieldCheck, Database, Link, Hash, Key, Clock } from 'lucide-react';
import { formatISTTimestamp } from '../utils/dateUtils';

interface TechnicalDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  data: {
    transaction_id?: string;
    sequence_number?: number;
    transaction_hash?: string;
    previous_hash?: string;
    sha256_hash?: string;
    sha256_fingerprint?: string;
    event_type?: string;
    timestamp?: string | Date;
    encryption_algorithm?: string;
    iv_hex?: string;
    tag_hex?: string;
    raw_details?: Record<string, any>;
    document_id?: string;
    case_id?: string;
    category?: string;
    classification?: string;
    version_number?: number;
    encryption_cipher?: string;
    argon2id_key_derivation?: string;
    storage_path?: string;
    tamper_evident_status?: string;
    created_at?: string | Date;
    updated_at?: string | Date;
  };
}

export const TechnicalDetailsModal: React.FC<TechnicalDetailsModalProps> = ({
  isOpen,
  onClose,
  title = 'Cryptographic & Blockchain Technical Details',
  data
}) => {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
              <p className="text-xs text-slate-500">Permissioned Hash-Chained Ledger Verification Record</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs font-mono">
          {data.sequence_number !== undefined && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 text-slate-600">
                <Database className="w-4 h-4 text-emerald-600" />
                <span className="font-sans font-medium text-slate-800">Ledger Block Sequence:</span>
              </div>
              <span className="font-bold text-emerald-700 font-mono text-sm">Block #{data.sequence_number}</span>
            </div>
          )}

          {data.timestamp && (
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 text-slate-600">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span className="font-sans font-medium text-slate-800">Recorded Timestamp (IST):</span>
              </div>
              <span className="font-bold text-slate-800 font-mono text-xs">{formatISTTimestamp(data.timestamp)}</span>
            </div>
          )}


          {data.transaction_id && (
            <div>
              <label className="block text-slate-500 font-sans mb-1 font-medium">Transaction ID:</label>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-800 break-all">{data.transaction_id}</span>
                <button
                  onClick={() => copyToClipboard('txid', data.transaction_id!)}
                  className="ml-2 text-slate-400 hover:text-slate-700"
                >
                  {copiedKey === 'txid' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {data.transaction_hash && (
            <div>
              <label className="block text-slate-500 font-sans mb-1 font-medium">Current Block Hash (SHA-256):</label>
              <div className="flex items-center justify-between p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-lg">
                <span className="text-emerald-900 font-bold break-all">{data.transaction_hash}</span>
                <button
                  onClick={() => copyToClipboard('txhash', data.transaction_hash!)}
                  className="ml-2 text-emerald-700 hover:text-emerald-900"
                >
                  {copiedKey === 'txhash' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {data.previous_hash && (
            <div>
              <label className="block text-slate-500 font-sans mb-1 font-medium flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-slate-400" />
                Previous Block Hash (Parent Linkage):
              </label>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-slate-600 break-all">{data.previous_hash}</span>
                <button
                  onClick={() => copyToClipboard('prevhash', data.previous_hash!)}
                  className="ml-2 text-slate-400 hover:text-slate-700"
                >
                  {copiedKey === 'prevhash' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {(data.sha256_hash || data.sha256_fingerprint) && (
            <div>
              <label className="block text-slate-500 font-sans mb-1 font-medium flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-emerald-600" />
                Document Plaintext SHA-256 Fingerprint:
              </label>
              <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="text-emerald-900 font-semibold break-all">
                  {data.sha256_hash || data.sha256_fingerprint}
                </span>
                <button
                  onClick={() => copyToClipboard('docsha', (data.sha256_hash || data.sha256_fingerprint)!)}
                  className="ml-2 text-emerald-700 hover:text-emerald-900"
                >
                  {copiedKey === 'docsha' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {/* Encryption Protocol Specs */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 font-sans">
            <h4 className="font-semibold text-slate-800 flex items-center gap-1.5 text-xs">
              <Key className="w-3.5 h-3.5 text-amber-600" />
              Vault Encryption Standard
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div><span className="text-slate-400">Cipher:</span> AES-256-GCM (AEAD)</div>
              <div><span className="text-slate-400">Key Size:</span> 256 bits (32 bytes)</div>
              <div><span className="text-slate-400">IV / Nonce:</span> 96-bit Unique Nonce</div>
              <div><span className="text-slate-400">Auth Tag:</span> 128-bit Integrity Tag</div>
            </div>
          </div>

          {data.raw_details && Object.keys(data.raw_details).length > 0 && (
            <div>
              <label className="block text-slate-500 font-sans mb-1 font-medium">Block Payload Parameters:</label>
              <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg overflow-x-auto text-[11px] leading-relaxed">
                {JSON.stringify(data.raw_details, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-sans">Immutable Ledger &bull; Fabric-Ready Architecture</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
