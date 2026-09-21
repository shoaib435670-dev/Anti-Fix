import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  Sparkles,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { AntiFixLogo } from './AntiFixLogo';
import { api, setStoredToken } from '../lib/api';
import { UserProfile } from '../types';

interface AuthScreenProps {
  onSuccess: (user: UserProfile) => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess, onOpenPrivacy, onOpenTerms }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetToken, setResetToken] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resetForm = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login({ email, password });
      setStoredToken(res.token);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.register({
        username,
        email,
        password,
        confirmPassword,
      });
      setStoredToken(res.token);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.forgotPassword(email);
      setSuccessMsg(res.message);
      if (res.reset_token) {
        setResetToken(res.reset_token);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process password reset request.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.resetPassword({ email, newPassword });
      setSuccessMsg(res.message);
      setTimeout(() => {
        setMode('login');
        setSuccessMsg(null);
        setPassword('');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-950 text-slate-100 relative overflow-x-hidden">
      {/* Background Decorative Gradients */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-10 right-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Container */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 z-10 max-w-5xl mx-auto w-full">
        {/* AntiFix Branding Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <AntiFixLogo size="lg" />
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-3 text-white font-['Space_Grotesk']">
            AntiFix
          </h1>
          <p className="text-sm font-medium text-slate-400 mt-1 max-w-md">
            "Your PDF. Your Control." — Professional, modern PDF toolkit designed for speed, privacy, and full control.
          </p>

          {/* Quick Feature Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs font-medium text-slate-300">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
              <FileCheck2 className="w-3.5 h-3.5 text-blue-400" /> Convert & Edit
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Draw & Annotate
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Encrypt & Lock
            </span>
          </div>
        </div>

        {/* Auth Card */}
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
          {/* Card Tabs */}
          {mode !== 'forgot' && (
            <div className="flex border-b border-slate-800 mb-6 pb-2">
              <button
                type="button"
                id="tab-login"
                onClick={() => {
                  setMode('login');
                  resetForm();
                }}
                className={`flex-1 py-2 text-sm font-semibold text-center transition-colors relative ${
                  mode === 'login' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
                {mode === 'login' && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-blue-500 rounded-full"
                  />
                )}
              </button>
              <button
                type="button"
                id="tab-register"
                onClick={() => {
                  setMode('register');
                  resetForm();
                }}
                className={`flex-1 py-2 text-sm font-semibold text-center transition-colors relative ${
                  mode === 'register' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Account
                {mode === 'register' && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-blue-500 rounded-full"
                  />
                )}
              </button>
            </div>
          )}

          {/* Feedback messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs sm:text-sm flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs sm:text-sm flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          {/* Forms */}
          <AnimatePresence mode="wait">
            {mode === 'login' && (
              <motion.form
                key="login-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="input-login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      id="btn-forgot-password-link"
                      onClick={() => {
                        setMode('forgot');
                        resetForm();
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="input-login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-11 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-submit-login"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Sign In to AntiFix <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.form>
            )}

            {mode === 'register' && (
              <motion.form
                key="register-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleRegister}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="input-register-username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="alex_creator"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="input-register-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Password (Min 6 chars)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="input-register-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-11 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="input-register-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-submit-register"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Create Free Account <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.form>
            )}

            {mode === 'forgot' && (
              <motion.div
                key="forgot-form"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                <div className="text-center mb-2">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 mx-auto flex items-center justify-center mb-2">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Reset Your Password</h3>
                  <p className="text-xs text-slate-400">
                    Enter your registered email and we'll help you securely reset your credentials.
                  </p>
                </div>

                {!resetToken ? (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Registered Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="input-forgot-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      id="btn-submit-forgot"
                      disabled={loading}
                      className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        'Send Recovery Link'
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          id="input-new-password"
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      id="btn-submit-reset-password"
                      disabled={loading}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        'Save New Password'
                      )}
                    </button>
                  </form>
                )}

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      resetForm();
                    }}
                    className="text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Links */}
      <footer className="w-full border-t border-slate-900 py-4 px-6 text-center text-xs text-slate-500 z-10 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-5xl mx-auto">
        <p>© AntiFix — "Your PDF. Your Control."</p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            id="link-footer-privacy"
            onClick={onOpenPrivacy}
            className="hover:text-slate-300 transition-colors"
          >
            Privacy Policy
          </button>
          <span>•</span>
          <button
            type="button"
            id="link-footer-terms"
            onClick={onOpenTerms}
            className="hover:text-slate-300 transition-colors"
          >
            Terms of Service
          </button>
          <span>•</span>
          <span className="text-slate-400">Admin Email: muzamilanki@gmail.com</span>
        </div>
      </footer>
    </div>
  );
};
