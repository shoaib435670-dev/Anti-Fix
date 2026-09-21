export type FeatureId =
  | 'image-to-pdf'
  | 'edit-pdf'
  | 'rename-pdf'
  | 'lock-pdf'
  | 'edit-pdf-text'
  | 'draw-on-pdf'
  | 'delete-pdf-pages';

export type PlanType = 'weekly' | 'monthly' | 'gift' | 'free';

export interface FeatureConfig {
  id: FeatureId;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  is_paid: boolean;
  weekly_price: number; // in PKR / Rs.
  monthly_price: number; // in PKR / Rs.
}

export interface UserSubscription {
  id: string;
  user_id: string;
  feature_id: FeatureId;
  plan_type: PlanType;
  status: 'active' | 'expired' | 'revoked';
  start_date: string;
  expiry_date: string;
  expires_at?: string;
  source: 'payment' | 'admin_gift' | 'system';
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  account_created_at: string;
  account_status: 'active' | 'blocked';
  is_admin: boolean;
  subscriptions: UserSubscription[];
  unread_notifications_count?: number;
}

export interface PaymentRequest {
  id: string;
  user_id: string;
  username: string;
  email: string;
  user_email?: string;
  feature_id: FeatureId;
  feature_name: string;
  plan_type: 'weekly' | 'monthly';
  amount: number;
  payment_method: 'easypaisa' | 'jazzcash' | 'bank_transfer';
  transaction_id: string;
  screenshot_url: string; // base64 or storage url
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  reviewed_at?: string;
}

export interface PaymentMethodConfig {
  id: 'easypaisa' | 'jazzcash' | 'bank_transfer';
  name: string;
  enabled: boolean;
  account_number: string;
  account_holder_name: string;
  bank_name?: string;
  iban?: string;
  instructions: string;
}

export interface UserFile {
  id: string;
  user_id: string;
  name: string;
  size: number;
  created_at: string;
  modified_at: string;
  file_type: string;
  data_url?: string;
  page_count?: number;
}

export interface UserNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  read?: boolean;
  created_at: string;
}

export type NotificationItem = UserNotification;

export interface AdminStats {
  total_users: number;
  active_users: number;
  blocked_users: number;
  premium_users: number;
  pending_payments: number;
  approved_payments: number;
  total_payments: number;
  active_features: number;
  free_features: number;
  paid_features: number;
  revenue: number;
  total_revenue?: number;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  admin_email?: string;
  target_user_id?: string;
  target_user_email?: string;
  action_type:
    | 'approve_payment'
    | 'reject_payment'
    | 'block_user'
    | 'unblock_user'
    | 'delete_user'
    | 'gift_plan'
    | 'revoke_plan'
    | 'update_feature'
    | 'update_payment_settings'
    | 'admin_login';
  details: string;
  created_at: string;
}
