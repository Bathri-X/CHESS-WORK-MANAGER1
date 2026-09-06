export type BatchType = 'general' | 'demo';

export interface Batch {
  id: string;
  user_id: string;
  work_date: string; // 'YYYY-MM-DD'
  start_time: string; // e.g. '06:00 AM'
  end_time: string; // e.g. '07:00 AM'
  class_name: string; // Student / Class name
  topic: string;
  homework?: string;
  class_type: BatchType;
  created_at: string;
  updated_at: string;
}

export type TrackingPeriod = 'MONTHLY' | 'YEARLY' | 'SO_FAR';

export interface TrackingStats {
  grand: number;
  general: number;
  demo: number;
}

export type WeekdayName =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export interface WeekdayThemeConfig {
  name: WeekdayName;
  colorName: string;
  accentColor: string; // Hex or CSS color
  borderClass: string;
  badgeClass: string;
  buttonClass: string;
  headerGlowClass: string;
  cardAccentClass: string;
  textAccentClass: string;
  subtleBgClass: string;
  headerBgClass?: string;
  cardLeftBorderClass?: string;
}

export interface UserProfile {
  id: string;
  email: string;
}

export interface SupabaseConfigStatus {
  supabaseConfigured: boolean;
  hasServiceKey: boolean;
  hasServerPinConfigured: boolean;
}
