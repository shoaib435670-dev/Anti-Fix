import React, { useState } from 'react';
import {
  ArrowLeft,
  Upload,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Download,
  Save,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  FileCheck,
  Printer,
  Copy,
  Edit3,
} from 'lucide-react';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import * as pdfjsLib from 'pdfjs-dist';
import { api } from '../../lib/api';

interface LockPdfToolProps {
  onBack: () => void;
  onFileSaved: () => void;
}

export const LockPdfTool: React.FC<LockPdfToolProps> = ({ onBack, onFileSaved }) => {
  const [originalName, setOriginalName] = useState<string>('');
  const [rawPdfBytes, setRawPdfBytes] = useState<Uint8Array | null>(null);

  // Passwords
  const [userPassword, setUserPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Permissions
  const [allowPrinting, setAllowPrinting] = useState(true);
  const [allowCopying, setAllowCopying] = useState(false);
  const [allowModifying, setAllowModifying] = useState(false);
  const [algorithm, setAlgorithm] = useState<'RC4' | 'AES-256'>('RC4');

  // Encryption results
  const [encrypting, setEncrypting] = useState(false);
  const [encryptedBytes, setEncryptedBytes] = useState<Uint8Array | null>(null);
  const [encryptedDataUrl, setEncryptedDataUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Verification test
  const [testPasswordInput, setTestPasswordInput] = useState('');
  const [verificationResult, setVerificationResult] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Password strength calculator
  const calculateStrength = (pwd: string) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 6) score += 25;
    if (pwd.length >= 10) score += 25;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 25;
    if (/[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score += 25;
    return score;
  };

  const strength = calculateStrength(userPassword);
  const strengthLabel =
    strength <= 25 ? 'Weak' : strength <= 50 ? 'Medium' : strength <= 75 ? 'Strong' : 'Very Strong';
  const strengthColor =
    strength <= 25
      ? 'text-red-400 bg-red-500'
      : strength <= 50
      ? 'text-amber-400 bg-amber-500'
      : 'text-emerald-400 bg-emerald-500';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Please select a valid PDF document.');
      return;
    }

    setOriginalName(file.name);
    setErrorMsg(null);
    setStatusMsg(null);
    setEncryptedBytes(null);
    setEncryptedDataUrl(null);
    setVerificationResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const buf = event.target?.result as ArrayBuffer;
      setRawPdfBytes(new Uint8Array(buf));
    };
    reader.readAsArrayBuffer(file);
  };

  const handleEncrypt = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    if (!rawPdfBytes) {
      setErrorMsg('Please upload a PDF document first.');
      return;
    }

    if (!userPassword) {
      setErrorMsg('Please enter a password to lock the document.');
      return;
    }

    if (userPassword !== confirmPassword) {
      setErrorMsg('Password confirmation does not match.');
      return;
    }

    setEncrypting(true);
    try {
      const options: any = {
        algorithm: algorithm,
        ownerPassword: ownerPassword.trim() || userPassword,
        permissions: {
          printing: allowPrinting ? 'highResolution' : 'none',
          copying: allowCopying,
          modifying: allowModifying,
          annotating: allowModifying,
        },
      };

      const encrypted = await encryptPDF(rawPdfBytes, userPassword, options);
      setEncryptedBytes(encrypted);

      const blob = new Blob([encrypted as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setEncryptedDataUrl(url);

      setStatusMsg('PDF locked and encrypted successfully!');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Encryption failed: ' + (err.message || ''));
    } finally {
      setEncrypting(false);
    }
  };

  const handleTestVerification = async () => {
    if (!encryptedBytes) return;
    setVerifying(true);
    setVerificationResult(null);

    try {
      const loadingTask = pdfjsLib.getDocument({
        data: encryptedBytes.slice(),
        password: testPasswordInput,
      });

      const doc = await loadingTask.promise;
      setVerificationResult(`Success! Document unlocked successfully with ${doc.numPages} page(s).`);
    } catch (err: any) {
      if (err.name === 'PasswordException' || err.message?.includes('password')) {
        setVerificationResult('Incorrect password! Verification confirmed document is protected.');
      } else {
        setVerificationResult('Verification error: ' + err.message);
      }
    } finally {
      setVerifying(false);
    }
  };

  const outputFileName = () => {
    const base = originalName.replace(/\.pdf$/i, '');
    return `${base}_locked.pdf`;
  };

  const handleDownload = () => {
    if (!encryptedDataUrl) return;
    const a = document.createElement('a');
    a.href = encryptedDataUrl;
    a.download = outputFileName();
    a.click();
  };

  const handleSaveToFiles = async () => {
    if (!encryptedBytes) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      let binary = '';
      const len = encryptedBytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(encryptedBytes[i]);
      }
      const base64Data = 'data:application/pdf;base64,' + btoa(binary);

      await api.saveFile({
        name: outputFileName(),
        size: encryptedBytes.length,
        file_type: 'application/pdf',
        data_url: base64Data,
      });

      setStatusMsg('Protected PDF saved to "My Files" successfully!');
      onFileSaved();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save encrypted PDF.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <span className="text-xs uppercase font-mono font-bold text-blue-400">
          Utility • Lock & Encrypt PDF
        </span>
      </div>

      {!rawPdfBytes ? (
        <label className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-800 hover:border-blue-500 rounded-3xl cursor-pointer bg-slate-900/60 transition-all group">
          <Upload className="w-12 h-12 text-slate-500 group-hover:text-blue-400 transition-colors mb-3" />
          <h3 className="text-base font-bold text-white group-hover:text-blue-300">
            Select a PDF document to password-protect
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Military-grade encryption (RC4 & AES-256), custom permissions & password verification
          </p>
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      ) : (
        <div className="max-w-2xl mx-auto space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {statusMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Configuration Form */}
          <form
            onSubmit={handleEncrypt}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs text-slate-400 uppercase font-mono font-semibold">
                    Document Selected
                  </h4>
                  <p className="text-sm font-bold text-white truncate max-w-sm">{originalName}</p>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {(rawPdfBytes.length / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>

            {/* User Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                User Password (Required to Open PDF)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  placeholder="Set strong document password..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-11 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength bar */}
              {userPassword && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Password Strength:</span>
                    <span className={`font-semibold ${strengthColor.split(' ')[0]}`}>
                      {strengthLabel}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strengthColor.split(' ')[1]}`}
                      style={{ width: `${strength}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Optional Owner Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Owner / Admin Password (Optional)
              </label>
              <input
                type="text"
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
                placeholder="Separate password for master permissions (optional)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Permissions Checkboxes */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Document Permissions:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowPrinting}
                    onChange={(e) => setAllowPrinting(e.target.checked)}
                    className="accent-blue-500 rounded"
                  />
                  <Printer className="w-3.5 h-3.5 text-blue-400" /> Allow Printing
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowCopying}
                    onChange={(e) => setAllowCopying(e.target.checked)}
                    className="accent-blue-500 rounded"
                  />
                  <Copy className="w-3.5 h-3.5 text-amber-400" /> Allow Copying
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowModifying}
                    onChange={(e) => setAllowModifying(e.target.checked)}
                    className="accent-blue-500 rounded"
                  />
                  <Edit3 className="w-3.5 h-3.5 text-purple-400" /> Allow Modifying
                </label>
              </div>
            </div>

            {/* Encrypt Submit Button */}
            <button
              id="btn-submit-lock-pdf"
              type="submit"
              disabled={encrypting}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {encrypting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" /> Lock & Encrypt PDF
                </>
              )}
            </button>
          </form>

          {/* Verification & Download Area once encrypted */}
          {encryptedBytes && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" /> Document Protected Successfully!
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="btn-download-locked-pdf"
                  onClick={handleDownload}
                  className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all"
                >
                  <Download className="w-4 h-4" /> Download Locked PDF
                </button>
                <button
                  type="button"
                  id="btn-save-locked-pdf"
                  disabled={saving}
                  onClick={handleSaveToFiles}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-emerald-400" /> Save to My Files
                    </>
                  )}
                </button>
              </div>

              {/* In-app Verification Test */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                <div>
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Security Verification Test
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Test unlocking the encrypted file right here to confirm password protection:
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={testPasswordInput}
                    onChange={(e) => setTestPasswordInput(e.target.value)}
                    placeholder="Enter password to test unlock..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestVerification}
                    disabled={verifying}
                    className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shrink-0 transition-colors"
                  >
                    {verifying ? 'Testing...' : 'Verify Unlock'}
                  </button>
                </div>

                {verificationResult && (
                  <p
                    className={`text-xs font-medium ${
                      verificationResult.startsWith('Success')
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {verificationResult}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
