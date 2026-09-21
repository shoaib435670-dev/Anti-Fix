import {
  UserProfile,
  FeatureConfig,
  PaymentMethodConfig,
  UserFile,
  UserNotification,
  AdminStats,
  AdminAuditLog,
  PaymentRequest,
} from '../types';

const TOKEN_KEY = 'antifix_user_token';
const ADMIN_TOKEN_KEY = 'antifix_admin_token';

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);
export const setStoredToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const removeStoredToken = () => localStorage.removeItem(TOKEN_KEY);

export const getStoredAdminToken = () => sessionStorage.getItem(ADMIN_TOKEN_KEY);
export const setStoredAdminToken = (token: string) => sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
export const removeStoredAdminToken = () => sessionStorage.removeItem(ADMIN_TOKEN_KEY);

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data as T;
}

async function adminRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const adminToken = getStoredAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (adminToken) {
    headers['Authorization'] = `Bearer ${adminToken}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Admin request failed');
  }
  return data as T;
}

export const api = {
  // Public
  getFeatures: () => request<{ features: FeatureConfig[] }>('/api/features'),
  getPaymentMethods: () => request<{ payment_methods: PaymentMethodConfig[] }>('/api/payment-methods'),

  // Auth
  register: (body: { username: string; email: string; password: string; confirmPassword: string }) =>
    request<{ token: string; user: UserProfile }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getMe: () => request<{ user: UserProfile }>('/api/auth/me'),

  forgotPassword: (email: string) =>
    request<{ message: string; reset_token?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (body: { email: string; newPassword: string }) =>
    request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateProfile: (username: string) =>
    request<{ message: string; username: string }>('/api/auth/update-profile', {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  deleteAccount: () =>
    request<{ message: string }>('/api/auth/account', {
      method: 'DELETE',
    }),

  // User Files
  getFiles: () => request<{ files: UserFile[] }>('/api/files'),
  getFile: (id: string) => request<{ file: UserFile & { data_url: string } }>(`/api/files/${id}`),
  saveFile: (file: { name: string; size: number; file_type: string; data_url: string; page_count?: number }) =>
    request<{ file: UserFile; message: string }>('/api/files', {
      method: 'POST',
      body: JSON.stringify(file),
    }),
  renameFile: (id: string, newName: string) =>
    request<{ file: UserFile; message: string }>(`/api/files/${id}/rename`, {
      method: 'PATCH',
      body: JSON.stringify({ newName }),
    }),
  deleteFile: (id: string) =>
    request<{ message: string }>(`/api/files/${id}`, {
      method: 'DELETE',
    }),

  // User Payments
  submitPayment: (body: {
    feature_id: string;
    plan_type: 'weekly' | 'monthly';
    payment_method: string;
    transaction_id: string;
    screenshot_url: string;
    note?: string;
  }) =>
    request<{ payment: PaymentRequest; message: string }>('/api/payments/submit', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getMyPayments: () => request<{ payments: PaymentRequest[] }>('/api/payments/my'),

  // Notifications
  getNotifications: () => request<{ notifications: UserNotification[] }>('/api/notifications'),
  markNotificationRead: (id: string) =>
    request<{ success: boolean }>(`/api/notifications/${id}/read`, {
      method: 'POST',
    }),
  markAllNotificationsRead: () =>
    request<{ success: boolean }>('/api/notifications/read-all', {
      method: 'POST',
    }),

  // Admin APIs
  adminLogin: (body: { email: string; pin: string }) =>
    adminRequest<{ token: string; admin: { email: string; role: string } }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getAdminStats: () => adminRequest<{ stats: AdminStats }>('/api/admin/stats'),

  getAdminUsers: () => adminRequest<{ users: any[] }>('/api/admin/users'),

  blockUser: (userId: string, block: boolean) =>
    adminRequest<{ message: string; status: string }>(`/api/admin/users/${userId}/block`, {
      method: 'POST',
      body: JSON.stringify({ block }),
    }),

  giftUserPlan: (userId: string, body: { feature_id: string; plan_type?: string; duration_days?: number }) =>
    adminRequest<{ message: string }>(`/api/admin/users/${userId}/gift`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  revokeUserPlan: (userId: string, subscription_id: string) =>
    adminRequest<{ message: string }>(`/api/admin/users/${userId}/revoke-plan`, {
      method: 'POST',
      body: JSON.stringify({ subscription_id }),
    }),

  deleteAdminUser: (userId: string) =>
    adminRequest<{ message: string }>(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    }),

  getAdminPayments: (params?: { status?: string; method?: string; feature?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return adminRequest<{ payments: PaymentRequest[] }>(`/api/admin/payments?${query}`);
  },

  approvePayment: (paymentId: string) =>
    adminRequest<{ message: string; payment: PaymentRequest }>(`/api/admin/payments/${paymentId}/approve`, {
      method: 'POST',
    }),

  rejectPayment: (paymentId: string, reason?: string) =>
    adminRequest<{ message: string; payment: PaymentRequest }>(`/api/admin/payments/${paymentId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  getAdminFeatures: () => adminRequest<{ features: FeatureConfig[] }>('/api/admin/features'),

  updateAdminFeature: (id: string, updates: Partial<FeatureConfig>) =>
    adminRequest<{ message: string; feature: FeatureConfig }>(`/api/admin/features/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  getAdminPaymentSettings: () =>
    adminRequest<{ payment_methods: PaymentMethodConfig[] }>('/api/admin/payment-settings'),

  updateAdminPaymentSettings: (methods: PaymentMethodConfig[]) =>
    adminRequest<{ message: string; payment_methods: PaymentMethodConfig[] }>('/api/admin/payment-settings', {
      method: 'PUT',
      body: JSON.stringify({ methods }),
    }),

  getAdminAuditLogs: () => adminRequest<{ logs: AdminAuditLog[] }>('/api/admin/audit-logs'),
};
