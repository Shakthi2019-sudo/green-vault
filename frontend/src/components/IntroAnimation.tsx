import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, CheckCircle2, ChevronRight } from 'lucide-react';

interface IntroAnimationProps {
  onComplete: () => void;
}

export const IntroAnimation: React.FC<IntroAnimationProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // 0.0-1.0s: Light background & radiance
    const t1 = setTimeout(() => setStep(1), 1000);
    // 1.0-2.5s: Vault Shield symbol
    const t2 = setTimeout(() => setStep(2), 2500);
    // 2.5-3.5s: GREEN VAULT title
    const t3 = setTimeout(() => setStep(3), 3500);
    // 3.5-4.8s: Subtitle + auto-transition or enter button
    const t4 = setTimeout(() => {
      onComplete();
    }, 4800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white overflow-hidden select-none"
    >
      {/* Skip Button */}
      <button
        onClick={onComplete}
        className="absolute top-6 right-6 px-4 py-1.5 text-xs font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 hover:text-slate-700 rounded-full transition-all border border-slate-200 shadow-sm flex items-center gap-1"
      >
        Skip Intro
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      {/* Background Subtle Green/Gold Radiance */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1.2, opacity: 0.25 }}
          transition={{ duration: 3.5, ease: 'easeOut' }}
          className="w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-emerald-200 via-teal-100 to-amber-100 blur-3xl"
        />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-lg px-6">
        {/* Animated Vault / Shield SVG Crest */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-6"
        >
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#0D5C3A] via-[#0F766E] to-[#0A462C] shadow-xl flex items-center justify-center p-0.5 border border-emerald-400/40">
            {/* Precision SVG Shield with Vault Keyhole & Verification Checkmark */}
            <svg
              className="w-14 h-14 text-white drop-shadow-md"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Outer Shield */}
              <motion.path
                d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              />
              {/* Internal Vault Seal */}
              <motion.circle
                cx="12"
                cy="11"
                r="3.5"
                stroke="#FCD34D"
                strokeWidth="1.6"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.8 }}
              />
              {/* Keyhole / Check */}
              <motion.path
                d="m9.5 11 1.8 1.8 3.2-3.2"
                stroke="#FFFFFF"
                strokeWidth="2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 1.4, duration: 0.6 }}
              />
            </svg>
          </div>

          {/* Gold Vault Ring Accent */}
          <motion.div
            initial={{ rotate: 0, opacity: 0 }}
            animate={{ rotate: 360, opacity: 0.8 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute -inset-2 rounded-3xl border border-dashed border-amber-400/40 pointer-events-none"
          />
        </motion.div>

        {/* GREEN VAULT Brand Reveal */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: step >= 2 ? 1 : 0, y: step >= 2 ? 0 : 15 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="space-y-2"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Immutable Legal eVault
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 font-serif">
            GREEN <span className="text-[#0D5C3A]">VAULT</span>
          </h1>
        </motion.div>

        {/* Subtitle Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: step >= 3 ? 1 : 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-3 text-sm sm:text-base text-slate-600 font-medium tracking-wide max-w-md"
        >
          A Trusted Digital Vault for Legal Records
        </motion.p>

        {/* Enter The Vault Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: step >= 3 ? 1 : 0, scale: step >= 3 ? 1 : 0.9 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-6"
        >
          <button
            onClick={onComplete}
            className="px-6 py-2.5 rounded-xl bg-[#0D5C3A] hover:bg-[#0A462C] text-white text-sm font-semibold shadow-lg shadow-emerald-900/20 flex items-center gap-2 hover:gap-3 transition-all cursor-pointer"
          >
            <span>ENTER THE VAULT</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>

      {/* Progress Bar Indicator */}
      <div className="absolute bottom-6 w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 4.8, ease: "linear" }}
          className="h-full bg-gradient-to-r from-emerald-600 to-amber-500 rounded-full"
        />
      </div>
    </motion.div>
  );
};
