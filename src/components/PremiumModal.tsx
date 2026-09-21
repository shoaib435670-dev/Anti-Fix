import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  CheckCircle2,
  X,
  CreditCard,
  Zap,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { FeatureConfig } from '../types';

interface PremiumModalProps {
  feature: FeatureConfig;
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (plan: 'weekly' | 'monthly') => void;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({
  feature,
  isOpen,
  onClose,
  onSelectPlan,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'weekly' | 'monthly'>('monthly');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
        >
          {/* Subtle Ambient Accent */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            id="btn-close-premium-modal"
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white mx-auto shadow-lg shadow-amber-500/20 mb-3">
              <Sparkles className="w-7 h-7" />
            </div>
            <span className="text-xs uppercase tracking-widest text-amber-400 font-mono font-bold">
              Premium Feature
            </span>
            <h3 className="text-2xl font-extrabold text-white mt-1">
              Unlock {feature.name}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-sm mx-auto">
              This feature requires an active premium pass. Get full control over your documents with instant activation.
            </p>
          </div>

          {/* Plan Choice Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {/* Weekly Plan */}
            <div
              onClick={() => setSelectedPlan('weekly')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                selectedPlan === 'weekly'
                  ? 'bg-blue-600/10 border-blue-500 shadow-md ring-1 ring-blue-500'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Weekly Plan
                </span>
                {selectedPlan === 'weekly' && (
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">Rs. {feature.weekly_price}</span>
                <span className="text-xs text-slate-400">/ 7 days</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Ideal for one-time quick jobs and short projects.
              </p>
            </div>

            {/* Monthly Plan (Best Value) */}
            <div
              onClick={() => setSelectedPlan('monthly')}
              className={`relative p-4 rounded-2xl border cursor-pointer transition-all ${
                selectedPlan === 'monthly'
                  ? 'bg-blue-600/10 border-blue-500 shadow-md ring-1 ring-blue-500'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white uppercase tracking-wider shadow-sm">
                Best Value
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Monthly Plan
                </span>
                {selectedPlan === 'monthly' && (
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">Rs. {feature.monthly_price}</span>
                <span className="text-xs text-slate-400">/ 30 days</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Full unlimited usage for a full month. Save over 25%!
              </p>
            </div>
          </div>

          {/* Highlights checklist */}
          <div className="bg-slate-950/40 rounded-xl p-3 mb-6 border border-slate-800/80 space-y-1.5 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Full unconstrained processing & no watermarks</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>High-speed cloud processing with encrypted privacy</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Flexible manual EasyPaisa, JazzCash, or Bank Transfer</span>
            </div>
          </div>

          {/* Action Button */}
          <button
            id="btn-confirm-purchase-plan"
            type="button"
            onClick={() => onSelectPlan(selectedPlan)}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            Proceed to Payment — Rs.{' '}
            {selectedPlan === 'weekly' ? feature.weekly_price : feature.monthly_price}
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
