import React, { useState } from 'react';
import {
  User,
  Mail,
  Lock,
  Calendar,
  Sparkles,
  CreditCard,
  Trash2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Shield,
  Clock,
} from 'lucide-react';
import { UserProfile, PaymentRequest } from '../types';
import { api } from '../lib/api';

interface UserSettingsProps {
  user: UserProfile;
  onUserUpdated: (user: UserProfile) => void;
  onLogout: () => void;
  myPayments: PaymentRequest[];
}

export const UserSettings: React.FC<UserSettingsProps> = ({
  user,
  onUserUpdated,
  onLogout,
  myPayments,
}) => {
  const [username, setUsername] = useState(user.username);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Change Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Delete account confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);
    setUpdatingProfile(true);

    try {
      const res = await api.updateProfile(username);
      setStatusMsg(res.message);
      onUserUpdated({ ...user, username: res.username });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update username.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      setStatusMsg(res.message);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await api.deleteAccount();
      onLogout();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete account.');
      setDeletingAccount(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
          <User className="w-6 h-6 text-blue-400" /> Account & Preferences
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Manage your personal credentials, active subscriptions, and payment history.
        </p>
      </div>

      {/* Feedback alerts */}
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

      {/* Grid: Profile & Password */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Profile Details</h3>
              <p className="text-[11px] text-slate-400">User ID: {user.id}</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Display Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full bg-slate-950/50 border border-slate-800/80 rounded-xl px-3 py-2 text-xs text-slate-400 cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Contact administrator to change registered email.
              </span>
            </div>

            <button
              type="submit"
              disabled={updatingProfile || username === user.username}
              className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold text-xs transition-colors"
            >
              {updatingProfile ? 'Saving...' : 'Update Username'}
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Security & Password</h3>
              <p className="text-[11px] text-slate-400">Update your account login password</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                New Password (Min 6 chars)
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={changingPassword || !currentPassword || !newPassword}
              className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs transition-colors"
            >
              {changingPassword ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>

      {/* Subscriptions Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Active Subscriptions</h3>
              <p className="text-[11px] text-slate-400">
                Track your active premium feature unlocks and expiration dates
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            {user.subscriptions.filter((s) => s.status === 'active').length} Active Plan(s)
          </span>
        </div>

        {user.subscriptions.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            No active subscriptions yet. Explore premium tools on the Dashboard to activate a plan.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {user.subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase">{sub.feature_id}</span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      sub.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {sub.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="capitalize">{sub.plan_type} Pass</span>
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-500" />
                    Expires: {new Date(sub.expiry_date || sub.expires_at || Date.now()).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Payment Requests History</h3>
            <p className="text-[11px] text-slate-400">
              Track recent submitted payment requests and review approval statuses
            </p>
          </div>
        </div>

        {myPayments.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">
            No payment submissions recorded.
          </p>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {myPayments.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white uppercase">{p.feature_id}</span>
                    <span className="capitalize text-slate-400">({p.plan_type})</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                    TRX ID: {p.transaction_id} • {p.payment_method.toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-white">Rs. {p.amount}</span>
                  <div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                        p.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : p.status === 'rejected'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone: Account Deletion */}
      <div className="bg-red-950/20 border border-red-900/40 rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-200">Danger Zone: Delete Account</h3>
            <p className="text-[11px] text-red-300/70">
              Permanently delete your profile, credentials, and all saved PDF files from our server.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="py-2.5 px-4 rounded-xl bg-red-600/90 hover:bg-red-600 text-white font-bold text-xs transition-colors"
        >
          Permanently Delete My Account
        </button>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-red-800/80 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-white">Delete AntiFix Account?</h3>
              <p className="text-xs text-slate-300 mt-1">
                Are you absolutely sure? All your personal information, active subscriptions, and
                saved files in "My Files" will be immediately destroyed.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-account"
                disabled={deletingAccount}
                onClick={handleDeleteAccount}
                className="py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold shadow-lg shadow-red-600/30"
              >
                {deletingAccount ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
