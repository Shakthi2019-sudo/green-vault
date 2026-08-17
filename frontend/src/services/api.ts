import {
  User, DemoUserItem, CaseItem, CaseDetail, DocumentItem,
  DocumentVersionItem, DocumentVerifyResult, AccessRequestItem,
  BlockchainRecord, ChainVerificationReport, BlockchainStats,
  SecurityStatusReport, SecurityEventItem, RecoveryRecordItem,
  ConnectedSystemItem, AuditEventItem
} from '../types';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('gv_token');
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Auth
  login: async (username: string, password: string): Promise<{ access_token: string; user: User }> => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Incorrect username or password');
    }
    return res.json();
  },

  getMe: async (): Promise<User> => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Session expired');
    return res.json();
  },

  getDemoUsers: async (): Promise<DemoUserItem[]> => {
    const res = await fetch(`${API_BASE}/auth/demo-users`);
    if (!res.ok) throw new Error('Failed to load demo users');
    return res.json();
  },

  // Cases
  getCases: async (): Promise<CaseItem[]> => {
    const res = await fetch(`${API_BASE}/cases`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch cases');
    return res.json();
  },

  getCaseDetail: async (caseId: string): Promise<CaseDetail> => {
    const res = await fetch(`${API_BASE}/cases/${caseId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to load case details');
    }
    return res.json();
  },

  // Documents
  getDocument: async (docId: string): Promise<DocumentItem> => {
    const res = await fetch(`${API_BASE}/documents/${docId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch document');
    }
    return res.json();
  },

  getDocumentBlob: async (docId: string, version?: number): Promise<{ blob: Blob; mimeType: string; fileName: string }> => {
    const url = version ? `${API_BASE}/documents/${docId}/preview?version=${version}` : `${API_BASE}/documents/${docId}/preview`;
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error('Your session has expired. Please log in again.');
      if (res.status === 403) throw new Error('You do not have permission to view this document.');
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to fetch document content');
    }
    const blob = await res.blob();
    const mimeType = res.headers.get('Content-Type') || 'application/octet-stream';
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^";]+)"?/);
    const fileName = match ? match[1] : `document_${docId}`;
    return { blob, mimeType, fileName };
  },

  downloadDocumentFile: async (docId: string, version?: number, fallbackFileName?: string): Promise<void> => {
    const url = version ? `${API_BASE}/documents/${docId}/download?version=${version}` : `${API_BASE}/documents/${docId}/download`;
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error('Your session has expired. Please log in again.');
      if (res.status === 403) throw new Error('You do not have permission to download this document.');
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Download failed');
    }
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^";]+)"?/);
    const fileName = match ? match[1] : (fallbackFileName || `document_${docId}.pdf`);

    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  },

  getDocumentStreamUrl: (docId: string, version?: number): string => {
    const token = localStorage.getItem('gv_token');
    const vParam = version ? `version=${version}` : '';
    const tParam = token ? `token=${encodeURIComponent(token)}` : '';
    const query = [vParam, tParam].filter(Boolean).join('&');
    return `${API_BASE}/documents/${docId}/preview${query ? `?${query}` : ''}`;
  },

  uploadDocument: async (caseId: string, title: string, category: string, file: File, classification: string = 'PUBLIC_CASE_RECORD'): Promise<DocumentItem> => {
    const formData = new FormData();
    formData.append('case_id', caseId);
    formData.append('title', title);
    formData.append('category', category);
    formData.append('classification', classification);
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  createVersion: async (docId: string, changeSummary: string, file: File): Promise<DocumentVersionItem> => {
    const formData = new FormData();
    formData.append('change_summary', changeSummary);
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/documents/${docId}/versions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create new version');
    }
    return res.json();
  },

  verifyDocument: async (docId: string, version?: number): Promise<DocumentVerifyResult> => {
    const url = version ? `${API_BASE}/documents/${docId}/verify?version=${version}` : `${API_BASE}/documents/${docId}/verify`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Verification failed');
    return res.json();
  },

  archiveDocument: async (docId: string, reason: string): Promise<DocumentItem> => {
    const res = await fetch(`${API_BASE}/documents/${docId}/archive`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    if (!res.ok) throw new Error('Archival failed');
    return res.json();
  },

  // Access Requests
  getAccessRequests: async (): Promise<AccessRequestItem[]> => {
    const res = await fetch(`${API_BASE}/access-requests`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch access requests');
    return res.json();
  },

  submitAccessRequest: async (caseId: string, requestedPermissions: string[], reason: string): Promise<AccessRequestItem> => {
    const res = await fetch(`${API_BASE}/access-requests`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ case_id: caseId, requested_permissions: requestedPermissions, reason })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Request submission failed');
    }
    return res.json();
  },

  approveAccessRequest: async (reqId: string, reviewNote?: string): Promise<AccessRequestItem> => {
    const res = await fetch(`${API_BASE}/access-requests/${reqId}/approve`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED', review_note: reviewNote || 'Approved by Court Administrator' })
    });
    if (!res.ok) throw new Error('Approval failed');
    return res.json();
  },

  rejectAccessRequest: async (reqId: string, reviewNote?: string): Promise<AccessRequestItem> => {
    const res = await fetch(`${API_BASE}/access-requests/${reqId}/reject`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'REJECTED', review_note: reviewNote || 'Rejected by Court Administrator' })
    });
    if (!res.ok) throw new Error('Rejection failed');
    return res.json();
  },

  // Blockchain Ledger
  getBlockchainRecords: async (caseId?: string, limit: number = 100): Promise<BlockchainRecord[]> => {
    const params = new URLSearchParams();
    if (caseId) params.append('case_id', caseId);
    params.append('limit', limit.toString());

    const res = await fetch(`${API_BASE}/blockchain/records?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch blockchain records');
    return res.json();
  },

  verifyChain: async (): Promise<ChainVerificationReport> => {
    const res = await fetch(`${API_BASE}/blockchain/verify-chain`);
    if (!res.ok) throw new Error('Blockchain verification failed');
    return res.json();
  },

  getBlockchainStats: async (): Promise<BlockchainStats> => {
    const res = await fetch(`${API_BASE}/blockchain/stats`);
    if (!res.ok) throw new Error('Failed to fetch blockchain stats');
    return res.json();
  },

  // Security Monitoring
  getSecurityStatus: async (): Promise<SecurityStatusReport> => {
    const res = await fetch(`${API_BASE}/security/status`);
    if (!res.ok) throw new Error('Failed to fetch security status');
    return res.json();
  },

  getSecurityEvents: async (): Promise<SecurityEventItem[]> => {
    const res = await fetch(`${API_BASE}/security/events`);
    if (!res.ok) throw new Error('Failed to fetch security events');
    return res.json();
  },

  // Isolated Recovery Vault
  getRecoveryRecords: async (): Promise<RecoveryRecordItem[]> => {
    const res = await fetch(`${API_BASE}/recovery/records`);
    if (!res.ok) throw new Error('Failed to fetch recovery records');
    return res.json();
  },

  restoreDocument: async (docId: string, reason?: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_BASE}/recovery/${docId}/restore`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || 'Authorized restoration from isolated recovery vault' })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Restoration failed');
    }
    return res.json();
  },

  // Connected Systems
  getConnectedSystems: async (): Promise<ConnectedSystemItem[]> => {
    const res = await fetch(`${API_BASE}/integrations/systems`);
    if (!res.ok) throw new Error('Failed to fetch connected systems');
    return res.json();
  },

  syncConnectedSystem: async (systemId: string): Promise<any> => {
    const res = await fetch(`${API_BASE}/integrations/sync/${systemId}`, {
      method: 'POST'
    });
    return res.json();
  },

  // Audit Logs
  getAuditLogs: async (limit: number = 100): Promise<AuditEventItem[]> => {
    const res = await fetch(`${API_BASE}/audit/logs?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  // Security Simulation (DEMO ONLY)
  simulateTamper: async (documentId?: string): Promise<any> => {
    const url = documentId ? `${API_BASE}/simulation/tamper-document?document_id=${documentId}` : `${API_BASE}/simulation/tamper-document`;
    const res = await fetch(url, { method: 'POST' });
    return res.json();
  },

  simulateUnauthorizedAccess: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/simulation/unauthorized-access`, { method: 'POST' });
    return res.json();
  },

  simulateFailedLogins: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/simulation/failed-logins`, { method: 'POST' });
    return res.json();
  },

  simulateMassModification: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/simulation/mass-modification`, { method: 'POST' });
    return res.json();
  },

  resetSimulation: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/simulation/reset`, { method: 'POST' });
    return res.json();
  }
};
