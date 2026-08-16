import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical,
  ShieldAlert,
  AlertTriangle,
  Lock,
  RotateCcw,
  CheckCircle2,
  FileWarning,
  KeyRound,
  Zap,
  ArrowRight,
  ShieldCheck,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { SimulationActionResponse } from '../types';

export const SecuritySimulationPage: React.FC = () => {
  const navigate = useNavigate();
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [result, setResult] = useState<SimulationActionResponse | null>(null);

  const handleSimulateTamper = async () => {
    setRunningAction('tamper');
    setResult(null);
    try {
      const res = await api.simulateTamper();
      setResult(res);
    } catch (err: any) {
      alert(err.message || 'Simulation failed');
    } finally {
      setRunningAction(null);
    }
  };

  const handleSimulateUnauthorizedAccess = async () => {
    setRunningAction('unauth_access');
    setResult(null);
    try {
      const res = await api.simulateUnauthorizedAccess();
      setResult(res);
    } catch (err: any) {
      alert(err.message || 'Simulation failed');
    } finally {
      setRunningAction(null);
    }
  };

  const handleSimulateFailedLogins = async () => {
    setRunningAction('failed_logins');
    setResult(null);
    try {
      const res = await api.simulateFailedLogins();
      setResult(res);
    } catch (err: any) {
      alert(err.message || 'Simulation failed');
    } finally {
      setRunningAction(null);
    }
  };

  const handleSimulateMassMod = async () => {
    setRunningAction('mass_mod');
    setResult(null);
    try {
      const res = await api.simulateMassModification();
      setResult(res);
    } catch (err: any) {
      alert(err.message || 'Simulation failed');
    } finally {
      setRunningAction(null);
    }
  };

  const handleResetSimulation = async () => {
    setRunningAction('reset');
    try {
      const res = await api.resetSimulation();
      setResult(res);
    } catch (err: any) {
      alert(err.message || 'Reset failed');
    } finally {
      setRunningAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Simulation Banner */}
      <div className="p-6 bg-amber-500/10 border-2 border-amber-400 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-amber-700" />
            <h1 className="text-xl font-bold text-amber-950 font-serif">
              Security Simulation Testbed
            </h1>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-amber-200 text-amber-900 rounded-full border border-amber-300">
            DEMO ONLY &bull; SAFE TEST ENVIRONMENT
          </span>
        </div>
        <p className="text-xs text-amber-900 leading-relaxed max-w-3xl">
          This controlled environment allows hackathon evaluators to test and demonstrate Green Vault's automated defense response pipeline: <strong>DETECT &rarr; BLOCK &rarr; VERIFY &rarr; PRESERVE &rarr; RECOVER &rarr; RECORD</strong>.
        </p>
      </div>

      {/* Real-time Response Flow Display */}
      {result && (
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" />
              <span>Simulated Event Executed: {result.simulation_type}</span>
            </h3>
            <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded border border-rose-200">
              ALERT TRIGGERED
            </span>
          </div>

          <p className="text-xs text-slate-700 font-medium leading-relaxed">
            {result.message}
          </p>

          {/* 6-Step Response Pipeline Visualizer */}
          <div className="pt-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Automated Vault Defense Lifecycle:
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center text-xs">
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 font-bold">
                1. DETECT
                <span className="block text-[10px] font-normal text-rose-700 mt-0.5">Hash Mismatch</span>
              </div>
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 font-bold">
                2. BLOCK
                <span className="block text-[10px] font-normal text-rose-700 mt-0.5">Access Restricted</span>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 font-bold">
                3. VERIFY
                <span className="block text-[10px] font-normal text-amber-700 mt-0.5">Ledger Compared</span>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 font-bold">
                4. PRESERVE
                <span className="block text-[10px] font-normal text-emerald-700 mt-0.5">Air-Gapped Copy</span>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 font-bold">
                5. RECOVER
                <span className="block text-[10px] font-normal text-emerald-700 mt-0.5">1-Click Restore</span>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 font-bold">
                6. RECORD
                <span className="block text-[10px] font-normal text-emerald-700 mt-0.5">Blockchain Tx</span>
              </div>
            </div>
          </div>

          {result.simulation_type === 'SIMULATED_DOCUMENT_TAMPERING' && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => navigate('/recovery')}
                className="px-5 py-2.5 bg-[#0D5C3A] hover:bg-[#0A462C] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <span>Proceed to Step 13: Open Isolated Recovery Vault &rarr;</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Simulation Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Simulation 1: Document Tampering (Demo Step 12) */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:border-amber-300 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <FileWarning className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                1. Simulate Document Tampering (Demo Step 12)
              </h3>
              <p className="text-xs text-slate-500 font-mono">Target: Evidence_A.pdf (Primary Vault)</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Simulates an unexpected byte alteration in primary storage. Triggers SHA-256 fingerprint mismatch alert, automatically quarantines the record, and prepares the isolated recovery vault.
          </p>

          <button
            onClick={handleSimulateTamper}
            disabled={runningAction !== null}
            className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{runningAction === 'tamper' ? 'Triggering Simulation...' : 'Trigger Document Tampering Simulation'}</span>
          </button>
        </div>

        {/* Simulation 2: Unauthorized Case Access Attempt */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:border-amber-300 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                2. Simulate Unauthorized Access Attempt
              </h3>
              <p className="text-xs text-slate-500 font-mono">Target: CASE-2026-003</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Simulates an API request from an unassigned user role attempting to access a confidential property case without holding active permissions.
          </p>

          <button
            onClick={handleSimulateUnauthorizedAccess}
            disabled={runningAction !== null}
            className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            <span>{runningAction === 'unauth_access' ? 'Simulating...' : 'Simulate Unauthorized Access'}</span>
          </button>
        </div>

        {/* Simulation 3: Failed Login Burst */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:border-amber-300 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                3. Simulate Multiple Failed Logins
              </h3>
              <p className="text-xs text-slate-500 font-mono">Target: Judge-001 Account</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Simulates a burst of 5 rapid failed password entries. Updates system security status to <span className="font-bold text-amber-700">YELLOW</span> and generates plain-language security guidance.
          </p>

          <button
            onClick={handleSimulateFailedLogins}
            disabled={runningAction !== null}
            className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <KeyRound className="w-4 h-4" />
            <span>{runningAction === 'failed_logins' ? 'Simulating...' : 'Simulate Failed Login Burst'}</span>
          </button>
        </div>

        {/* Simulation 4: Mass Document Modifications */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4 hover:border-amber-300 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                4. Simulate Mass Modification Anomaly
              </h3>
              <p className="text-xs text-slate-500 font-mono">Target: Multi-Case Vault Anomaly</p>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Simulates 12 rapid document modification attempts in 10 seconds. Triggers a <span className="font-bold text-rose-700">CRITICAL / RED</span> alert and automated circuit-breaker protection.
          </p>

          <button
            onClick={handleSimulateMassMod}
            disabled={runningAction !== null}
            className="w-full py-2.5 px-4 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            <span>{runningAction === 'mass_mod' ? 'Simulating...' : 'Simulate Mass Modification Anomaly'}</span>
          </button>
        </div>
      </div>

      {/* Reset State Action */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Reset All Simulation Scenarios</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Clears simulated alerts, resets document flags, and returns the vault health status to GREEN.
          </p>
        </div>

        <button
          onClick={handleResetSimulation}
          disabled={runningAction !== null}
          className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Simulation State</span>
        </button>
      </div>
    </div>
  );
};
