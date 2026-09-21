import React, { useState, useEffect } from 'react';
import {
  Shield,
  KeyRound,
  Users,
  CreditCard,
  Layers,
  Settings,
  Gift,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Lock,
  Unlock,
  Trash2,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Activity,
  LogOut,
  ArrowLeft,
  X,
  Plus,
  Eye,
  Check,
} from 'lucide-react';
import {
  AdminStats,
  PaymentRequest,
  FeatureConfig,
  PaymentMethodConfig,
  AdminAuditLog,
} from '../types';
import { api, setStoredAdminToken, removeStoredAdminToken, getStoredAdminToken } from '../lib/api';

interface AdminPanelProps {
  onBack: () => void;
  onRefreshAll: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBack, onRefreshAll }) => {
  // Admin Auth state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(!!getStoredAdminToken());
  const [adminEmail, setAdminEmail] = useState('muzamilanki@gmail.com');
  const [adminPin, setAdminPin] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Active Admin Sub-tab
  const [activeTab, setActiveTab] = useState<
    'stats' | 'users' | 'payments' | 'features' | 'payment_settings' | 'gift' | 'logs'
  >('stats');

  // Data states
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [features, setFeatures] = useState<FeatureConfig[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  // Search & Filters
  const [userSearch, setUserSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');

  // Modals & Actions
  const [viewScreenshotUrl, setViewScreenshotUrl] = useState<string | null>(null);
  const [rejectModalPayment, setRejectModalPayment] = useState<PaymentRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Gift Plan Form
  const [giftUserId, setGiftUserId] = useState('');
  const [giftFeatureId, setGiftFeatureId] = useState('edit-pdf');
  const [giftPlanType, setGiftPlanType] = useState('monthly');
  const [giftDays, setGiftDays] = useState(30);

  // Status & Feedback
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      const [sRes, uRes, pRes, fRes, pmRes, lRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getAdminPayments(),
        api.getAdminFeatures(),
        api.getAdminPaymentSettings(),
        api.getAdminAuditLogs(),
      ]);

      setStats(sRes.stats);
      setUsers(uRes.users);
      setPayments(pRes.payments);
      setFeatures(fRes.features);
      setPaymentMethods(pmRes.payment_methods);
      setAuditLogs(lRes.logs);
      if (uRes.users.length > 0 && !giftUserId) {
        setGiftUserId(uRes.users[0].id);
      }
    } catch (err: any) {
      if (err.message?.includes('Unauthorized') || err.message?.includes('token')) {
        setIsAdminLoggedIn(false);
        removeStoredAdminToken();
      } else {
        setErrorMsg('Failed to load admin telemetry: ' + err.message);
      }
    }
  };

  useEffect(() => {
    if (isAdminLoggedIn) {
      fetchAdminData();
    }
  }, [isAdminLoggedIn]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await api.adminLogin({ email: adminEmail, pin: adminPin });
      setStoredAdminToken(res.token);
      setIsAdminLoggedIn(true);
      setAdminPin('');
    } catch (err: any) {
      setLoginError(err.message || 'Invalid Administrator credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAdminLogout = () => {
    removeStoredAdminToken();
    setIsAdminLoggedIn(false);
  };

  // User Actions
  const handleToggleBlockUser = async (userId: string, currentStatus: string) => {
    try {
      const shouldBlock = currentStatus !== 'blocked';
      await api.blockUser(userId, shouldBlock);
      setStatusMsg(`User status updated to ${shouldBlock ? 'BLOCKED' : 'ACTIVE'}.`);
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to permanently delete this user and all their files?')) return;
    try {
      await api.deleteAdminUser(userId);
      setStatusMsg('User removed successfully.');
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Payment Actions
  const handleApprovePayment = async (paymentId: string) => {
    try {
      await api.approvePayment(paymentId);
      setStatusMsg('Payment approved and feature plan automatically activated for user.');
      fetchAdminData();
      onRefreshAll();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleRejectPayment = async () => {
    if (!rejectModalPayment) return;
    try {
      await api.rejectPayment(rejectModalPayment.id, rejectionReason);
      setRejectModalPayment(null);
      setRejectionReason('');
      setStatusMsg('Payment request marked as rejected.');
      fetchAdminData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Feature Updates
  const handleUpdateFeature = async (id: string, updates: Partial<FeatureConfig>) => {
    try {
      await api.updateAdminFeature(id, updates);
      setStatusMsg('Feature configuration updated.');
      fetchAdminData();
      onRefreshAll();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Payment Settings Updates
  const handleUpdatePaymentMethod = async (index: number, updates: Partial<PaymentMethodConfig>) => {
    const updatedMethods = [...paymentMethods];
    updatedMethods[index] = { ...updatedMethods[index], ...updates };
    setPaymentMethods(updatedMethods);
    try {
      await api.updateAdminPaymentSettings(updatedMethods);
      setStatusMsg('Payment settings saved.');
      onRefreshAll();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Gift Plan Action
  const handleGiftPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!giftUserId) return;
    try {
      await api.giftUserPlan(giftUserId, {
        feature_id: giftFeatureId,
        plan_type: giftPlanType,
        duration_days: giftDays,
      });
      setStatusMsg('Complimentary plan gifted successfully!');
      fetchAdminData();
      onRefreshAll();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Filtered lists
  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.id.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredPayments = payments.filter((p) => {
    if (paymentStatusFilter !== 'all' && p.status !== paymentStatusFilter) return false;
    if (paymentMethodFilter !== 'all' && p.payment_method !== paymentMethodFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Exit Admin
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs uppercase font-mono font-bold text-amber-400 flex items-center gap-1.5">
            <Shield className="w-4 h-4" /> AntiFix Master Admin Console
          </span>
          {isAdminLoggedIn && (
            <button
              type="button"
              onClick={handleAdminLogout}
              className="py-1 px-2.5 rounded-lg bg-red-950/40 border border-red-800/80 text-red-300 hover:bg-red-900/60 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          )}
        </div>
      </div>

      {/* Admin Login Dialog if not authenticated */}
      {!isAdminLoggedIn ? (
        <div className="max-w-md mx-auto my-12 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white">Administrator Access Required</h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter master credentials to unlock administrative controls.
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Admin Email
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Master PIN
              </label>
              <input
                type="password"
                required
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                placeholder="Enter master PIN..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono tracking-widest"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loginLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Unlock Admin Dashboard'
              )}
            </button>
          </form>
        </div>
      ) : (
        /* Logged in Admin Console */
        <div className="space-y-6">
          {/* Navigation Sub-Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
            {[
              { id: 'stats', label: 'Dashboard & Stats', icon: TrendingUp },
              { id: 'users', label: 'User Accounts', icon: Users },
              { id: 'payments', label: 'Payment Requests', icon: CreditCard },
              { id: 'features', label: 'Features & Pricing', icon: Layers },
              { id: 'payment_settings', label: 'Payment Methods', icon: Settings },
              { id: 'gift', label: 'Gift Free Plans', icon: Gift },
              { id: 'logs', label: 'Audit Logs', icon: FileSpreadsheet },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.id === 'payments' &&
                    payments.filter((p) => p.status === 'pending').length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-red-600 text-white">
                        {payments.filter((p) => p.status === 'pending').length}
                      </span>
                    )}
                </button>
              );
            })}
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center justify-between">
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {statusMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-between">
              <span>{statusMsg}</span>
              <button onClick={() => setStatusMsg(null)}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* TAB 1: DASHBOARD & STATS */}
          {activeTab === 'stats' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Total Users
                  </span>
                  <p className="text-2xl font-black text-white mt-1">{stats.total_users}</p>
                </div>
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                    Active Users
                  </span>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{stats.active_users}</p>
                </div>
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-red-400">
                    Blocked Users
                  </span>
                  <p className="text-2xl font-black text-red-400 mt-1">{stats.blocked_users}</p>
                </div>
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                    Premium Users
                  </span>
                  <p className="text-2xl font-black text-amber-400 mt-1">{stats.premium_users}</p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">
                    Pending Payments
                  </span>
                  <p className="text-2xl font-black text-blue-400 mt-1">
                    {stats.pending_payments}
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                    Approved Payments
                  </span>
                  <p className="text-2xl font-black text-emerald-400 mt-1">
                    {stats.approved_payments}
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-400">
                    Total Revenue (PKR)
                  </span>
                  <p className="text-2xl font-black text-purple-400 mt-1">
                    Rs. {stats.total_revenue ?? stats.revenue ?? 0}
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Active Features
                  </span>
                  <p className="text-2xl font-black text-white mt-1">
                    {stats.active_features} ({stats.paid_features} Paid, {stats.free_features} Free)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-base font-bold text-white">Registered User Accounts</h3>
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by name, email, ID..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-x-auto shadow-xl">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-4">User</th>
                      <th className="p-4">User ID</th>
                      <th className="p-4">Created Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Active Plans</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-semibold text-white">
                          <p>{u.username}</p>
                          <p className="text-[11px] text-slate-400 font-normal">{u.email}</p>
                        </td>
                        <td className="p-4 font-mono text-[11px] text-slate-400">{u.id}</td>
                        <td className="p-4 text-slate-400">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              u.status === 'blocked'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="p-4">
                          {u.subscriptions?.length > 0 ? (
                            <span className="text-amber-400 font-medium">
                              {u.subscriptions.map((s: any) => s.feature_id).join(', ')}
                            </span>
                          ) : (
                            <span className="text-slate-500">None</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleBlockUser(u.id, u.status)}
                              className={`p-1.5 rounded-lg border text-xs font-semibold ${
                                u.status === 'blocked'
                                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                                  : 'bg-amber-950/40 border-amber-800 text-amber-300'
                              }`}
                              title={u.status === 'blocked' ? 'Unblock User' : 'Block User'}
                            >
                              {u.status === 'blocked' ? (
                                <Unlock className="w-3.5 h-3.5" />
                              ) : (
                                <Lock className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1.5 rounded-lg bg-red-950/40 border border-red-800 text-red-300 hover:bg-red-900/60"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PAYMENT REQUESTS */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-bold text-white">Payment Requests Management</h3>
                <div className="flex items-center gap-2 text-xs">
                  <select
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-white"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-x-auto shadow-xl">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-4">User</th>
                      <th className="p-4">Feature & Plan</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Method & TRX ID</th>
                      <th className="p-4">Receipt Screenshot</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Approve / Reject</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-semibold text-white">
                          <p>{p.username}</p>
                          <p className="text-[11px] text-slate-400 font-normal">{p.user_email || p.email}</p>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-white uppercase">{p.feature_id}</p>
                          <p className="text-[11px] text-slate-400 capitalize">{p.plan_type} pass</p>
                        </td>
                        <td className="p-4 font-black text-emerald-400">Rs. {p.amount}</td>
                        <td className="p-4">
                          <p className="font-semibold uppercase">{p.payment_method}</p>
                          <p className="font-mono text-[11px] text-slate-400">{p.transaction_id}</p>
                        </td>
                        <td className="p-4">
                          <button
                            type="button"
                            onClick={() => setViewScreenshotUrl(p.screenshot_url)}
                            className="py-1 px-2.5 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600/20 text-xs font-semibold flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Proof
                          </button>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              p.status === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : p.status === 'rejected'
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {p.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleApprovePayment(p.id)}
                                className="py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectModalPayment(p)}
                                className="py-1 px-2.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-300 font-bold text-xs"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: FEATURES & PRICING */}
          {activeTab === 'features' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">Feature Access & Pricing Controls</h3>
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-x-auto shadow-xl">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-4">Feature</th>
                      <th className="p-4">Enabled Status</th>
                      <th className="p-4">Access Type</th>
                      <th className="p-4">Weekly Price (Rs.)</th>
                      <th className="p-4">Monthly Price (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {features.map((f) => (
                      <tr key={f.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-white">{f.name}</p>
                          <p className="text-[11px] text-slate-400 truncate max-w-xs">{f.description}</p>
                        </td>
                        <td className="p-4">
                          <button
                            type="button"
                            onClick={() => handleUpdateFeature(f.id, { enabled: !f.enabled })}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              f.enabled
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}
                          >
                            {f.enabled ? 'Enabled' : 'Disabled'}
                          </button>
                        </td>
                        <td className="p-4">
                          <button
                            type="button"
                            onClick={() => handleUpdateFeature(f.id, { is_paid: !f.is_paid })}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              f.is_paid
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {f.is_paid ? 'Paid' : 'Free'}
                          </button>
                        </td>
                        <td className="p-4">
                          <input
                            type="number"
                            value={f.weekly_price}
                            onChange={(e) =>
                              handleUpdateFeature(f.id, { weekly_price: Number(e.target.value) })
                            }
                            className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                          />
                        </td>
                        <td className="p-4">
                          <input
                            type="number"
                            value={f.monthly_price}
                            onChange={(e) =>
                              handleUpdateFeature(f.id, { monthly_price: Number(e.target.value) })
                            }
                            className="w-24 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: PAYMENT SETTINGS */}
          {activeTab === 'payment_settings' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">Manual Payment Methods Configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {paymentMethods.map((pm, idx) => (
                  <div
                    key={pm.id}
                    className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3.5"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="font-bold text-white text-sm">{pm.name}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdatePaymentMethod(idx, { enabled: !pm.enabled })}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          pm.enabled
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {pm.enabled ? 'Active' : 'Disabled'}
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Account / Mobile Number
                      </label>
                      <input
                        type="text"
                        value={pm.account_number}
                        onChange={(e) =>
                          handleUpdatePaymentMethod(idx, { account_number: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Account Holder Name
                      </label>
                      <input
                        type="text"
                        value={pm.account_holder_name}
                        onChange={(e) =>
                          handleUpdatePaymentMethod(idx, { account_holder_name: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                    </div>

                    {pm.id === 'bank_transfer' && (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                          Bank Name & IBAN
                        </label>
                        <input
                          type="text"
                          value={pm.bank_name || ''}
                          onChange={(e) =>
                            handleUpdatePaymentMethod(idx, { bank_name: e.target.value })
                          }
                          placeholder="Bank Name"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white mb-2"
                        />
                        <input
                          type="text"
                          value={pm.iban || ''}
                          onChange={(e) =>
                            handleUpdatePaymentMethod(idx, { iban: e.target.value })
                          }
                          placeholder="IBAN PK..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Instructions for Customers
                      </label>
                      <textarea
                        rows={2}
                        value={pm.instructions}
                        onChange={(e) =>
                          handleUpdatePaymentMethod(idx, { instructions: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: GIFT PLANS */}
          {activeTab === 'gift' && (
            <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Gift Complimentary Plan</h3>
                  <p className="text-xs text-slate-400">
                    Grant free premium access to any registered user directly.
                  </p>
                </div>
              </div>

              <form onSubmit={handleGiftPlan} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Select Target User
                  </label>
                  <select
                    value={giftUserId}
                    onChange={(e) => setGiftUserId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Select Feature to Unlock
                  </label>
                  <select
                    value={giftFeatureId}
                    onChange={(e) => setGiftFeatureId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {features.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Plan Type
                    </label>
                    <select
                      value={giftPlanType}
                      onChange={(e) => {
                        setGiftPlanType(e.target.value);
                        if (e.target.value === 'weekly') setGiftDays(7);
                        if (e.target.value === 'monthly') setGiftDays(30);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="weekly">Weekly (7 days)</option>
                      <option value="monthly">Monthly (30 days)</option>
                      <option value="custom">Custom Duration</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Duration (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={giftDays}
                      onChange={(e) => setGiftDays(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-amber-600/25 transition-all flex items-center justify-center gap-2"
                >
                  <Gift className="w-4 h-4" /> Activate Free Gift Pass
                </button>
              </form>
            </div>
          )}

          {/* TAB 7: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">System & Administrator Audit Trail</h3>
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-x-auto shadow-xl">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Administrator</th>
                      <th className="p-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-mono text-[11px] text-slate-400">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="p-4 font-bold text-white">{log.action}</td>
                        <td className="p-4 text-amber-400">{log.admin_email || 'Administrator'}</td>
                        <td className="p-4 font-mono text-[11px] text-slate-400">
                          {JSON.stringify(log.details)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* View Screenshot Modal */}
          {viewScreenshotUrl && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
              <div className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
                <button
                  type="button"
                  onClick={() => setViewScreenshotUrl(null)}
                  className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
                <h4 className="text-sm font-bold text-white mb-4">Payment Receipt Screenshot</h4>
                <div className="max-h-[500px] overflow-auto rounded-2xl bg-black p-2 flex items-center justify-center">
                  <img
                    src={viewScreenshotUrl}
                    alt="Proof"
                    className="max-h-[480px] w-auto object-contain"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Reject Reason Modal */}
          {rejectModalPayment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
              <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                <h4 className="text-base font-bold text-white">Reject Payment Request</h4>
                <p className="text-xs text-slate-400">
                  Provide a clear reason for rejecting this transaction. The user will be notified.
                </p>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Transaction ID was not found in bank statement."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRejectModalPayment(null)}
                    className="py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectPayment}
                    className="py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
