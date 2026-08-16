import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { IntroAnimation } from './components/IntroAnimation';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CasesPage } from './pages/CasesPage';
import { CaseDetailPage } from './pages/CaseDetailPage';
import { DocumentDetailPage } from './pages/DocumentDetailPage';
import { AccessRequestsPage } from './pages/AccessRequestsPage';
import { SecurityMonitoringPage } from './pages/SecurityMonitoringPage';
import { RecoveryVaultPage } from './pages/RecoveryVaultPage';
import { BlockchainLedgerPage } from './pages/BlockchainLedgerPage';
import { ConnectedSystemsPage } from './pages/ConnectedSystemsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { SecuritySimulationPage } from './pages/SecuritySimulationPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const AppContent: React.FC = () => {
  const [showIntro, setShowIntro] = useState(() => {
    // Check if intro has already run in current session
    return !sessionStorage.getItem('gv_intro_shown');
  });

  const handleIntroComplete = () => {
    sessionStorage.setItem('gv_intro_shown', 'true');
    setShowIntro(false);
  };

  if (showIntro) {
    return <IntroAnimation onComplete={handleIntroComplete} />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="cases" element={<CasesPage />} />
        <Route path="cases/:caseId" element={<CaseDetailPage />} />
        <Route path="documents" element={<Navigate to="/cases/CASE-2026-001" replace />} />
        <Route path="documents/:docId" element={<DocumentDetailPage />} />
        <Route path="access-requests" element={<AccessRequestsPage />} />
        <Route path="security" element={<SecurityMonitoringPage />} />
        <Route path="recovery" element={<RecoveryVaultPage />} />
        <Route path="blockchain" element={<BlockchainLedgerPage />} />
        <Route path="connected-systems" element={<ConnectedSystemsPage />} />
        <Route path="audit" element={<AuditLogPage />} />
        <Route path="simulation" element={<SecuritySimulationPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
