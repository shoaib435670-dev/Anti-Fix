import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Upload,
  CheckCircle2,
  Copy,
  AlertCircle,
  CreditCard,
  Building,
  Smartphone,
  Info,
} from 'lucide-react';
import { FeatureConfig, PaymentMethodConfig, UserProfile } from '../types';
import { api } from '../lib/api';

interface PaymentModalProps {
  user: UserProfile;
  feature: FeatureConfig;
  planType: 'weekly' | 'monthly';
  paymentMethods: PaymentMethodConfig[];
  isOpen: boolean;
  onClose: () => void;
  onPaymentSubmitted: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  user,
  feature,
  planType,
  paymentMethods,
  isOpen,
  onClose,
  onPaymentSubmitted,
}) => {
  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    paymentMethods[0]?.id || 'easypaisa'
  );
  const [transactionId, setTransactionId] = useState('');
  const [screenshotData, setScreenshotData] = useState<string>('');
  const [note, setNote] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPrice = planType === 'weekly' ? feature.weekly_price : feature.monthly_price;
  const activeMethod = paymentMethods.find((pm) => pm.id === selectedMethodId) || paymentMethods[0];

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPG, PNG, WEBP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('Image file size must be under 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setScreenshotData(event.target?.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!transactionId.trim()) {
      setError('Please provide the transaction/reference number.');
      return;
    }

    if (!screenshotData) {
      setError('Please upload a screenshot of your transaction receipt.');
      return;
    }

    setLoading(true);
    try {
      await api.submitPayment({
        feature_id: feature.id,
        plan_type: planType,
        payment_method: selectedMethodId,
        transaction_id: transactionId.trim(),
        screenshot_url: screenshotData,
        note: note.trim(),
      });

      onPaymentSubmitted();
    } catch (err: any) {
      setError(err.message || 'Failed to submit payment request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-8 overflow-hidden"
        >
          {/* Close Button */}
          <button
            id="btn-close-payment-modal"
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="border-b border-slate-800 pb-4 mb-6">
            <span className="text-xs uppercase font-mono font-bold text-blue-400">
              Checkout & Payment Submission
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
              {feature.name} — {planType === 'weekly' ? 'Weekly Pass' : 'Monthly Pass'}
            </h2>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60">
              <span className="text-xs text-slate-400">Total Payable Amount:</span>
              <span className="text-lg font-black text-emerald-400">
                Rs. {currentPrice} PKR
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                1. Select Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map((method) => {
                  const isSelected = selectedMethodId === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethodId(method.id)}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600/10 border-blue-500 text-white shadow-sm ring-1 ring-blue-500'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {method.id === 'easypaisa' && <Smartphone className="w-5 h-5 text-emerald-400" />}
                      {method.id === 'jazzcash' && <CreditCard className="w-5 h-5 text-amber-400" />}
                      {method.id === 'bank_transfer' && <Building className="w-5 h-5 text-sky-400" />}
                      <span className="text-xs font-semibold truncate">{method.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Payment Method Details */}
            {activeMethod && (
              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/70">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {activeMethod.name} Details
                  </span>
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified Account
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Account Number */}
                  <div className="flex items-center justify-between bg-slate-900/80 px-3 py-2 rounded-xl">
                    <span className="text-slate-400">Account / Mobile Number:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white tracking-wider">
                        {activeMethod.account_number}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(activeMethod.account_number, 'account_num')}
                        className="text-slate-400 hover:text-blue-400 p-1"
                        title="Copy Account Number"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {copiedField === 'account_num' && (
                        <span className="text-[10px] text-emerald-400 font-medium">Copied!</span>
                      )}
                    </div>
                  </div>

                  {/* Account Holder Name */}
                  <div className="flex items-center justify-between bg-slate-900/80 px-3 py-2 rounded-xl">
                    <span className="text-slate-400">Account Title:</span>
                    <span className="font-semibold text-white">
                      {activeMethod.account_holder_name}
                    </span>
                  </div>

                  {/* Bank Name if available */}
                  {activeMethod.bank_name && (
                    <div className="flex items-center justify-between bg-slate-900/80 px-3 py-2 rounded-xl">
                      <span className="text-slate-400">Bank Name:</span>
                      <span className="font-semibold text-white">{activeMethod.bank_name}</span>
                    </div>
                  )}

                  {/* IBAN if available */}
                  {activeMethod.iban && (
                    <div className="flex items-center justify-between bg-slate-900/80 px-3 py-2 rounded-xl">
                      <span className="text-slate-400">IBAN:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-white text-[11px] truncate max-w-[170px]">
                          {activeMethod.iban}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(activeMethod.iban!, 'iban')}
                          className="text-slate-400 hover:text-blue-400 p-1"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {copiedField === 'iban' && (
                          <span className="text-[10px] text-emerald-400 font-medium">Copied!</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="pt-2 text-[11px] text-slate-400 flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span>{activeMethod.instructions}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Transaction Reference / ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                2. Transaction / Reference Number (TRX ID)
              </label>
              <input
                id="input-payment-trx-id"
                type="text"
                required
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g. 29384729103 or TID #12345678"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            {/* Screenshot Upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                3. Upload Payment Receipt Screenshot
              </label>

              {!screenshotData ? (
                <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-800 hover:border-blue-500 rounded-2xl cursor-pointer bg-slate-950/60 transition-colors group">
                  <Upload className="w-8 h-8 text-slate-500 group-hover:text-blue-400 transition-colors mb-2" />
                  <span className="text-xs font-semibold text-slate-300 group-hover:text-white">
                    Click to browse or drop payment screenshot
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1">PNG, JPG, WEBP (Max 8MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 max-h-48 flex items-center justify-center">
                  <img
                    src={screenshotData}
                    alt="Payment Proof"
                    className="max-h-48 w-auto object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setScreenshotData('')}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/80 text-slate-300 hover:text-white hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Optional Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                4. Optional Note
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional notes or remarks for admin review..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Submit Button */}
            <button
              id="btn-submit-payment-request"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Submit Payment Request (Rs. {currentPrice})
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
