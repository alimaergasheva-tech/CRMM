export type UserRole = "admin" | "manager";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  is_active: boolean;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export type LeadStatus = "new" | "in_progress" | "waiting" | "won" | "lost";
export type LeadSource =
  | "website_form"
  | "telegram_bot"
  | "phone"
  | "referral"
  | "manual"
  | "other";

export interface Lead {
  id: string;
  client_id: string;
  source: LeadSource;
  status: LeadStatus;
  assigned_to: string | null;
  value: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = "pending" | "done";

export interface Task {
  id: string;
  lead_id: string | null;
  client_id: string | null;
  assigned_to: string;
  title: string;
  due_date: string | null;
  status: TaskStatus;
  created_at: string;
}

export interface LeadWithClient extends Lead {
  client_name: string;
  client_phone: string;
  assignee_name: string | null;
}

export interface TaskWithMeta extends Task {
  assignee_name: string;
  client_name: string | null;
  lead_status: LeadStatus | null;
}

export interface AnalyticsResponse {
  totalLeads: number;
  conversionRate: number;
  avgCloseDays: number | null;
  leadsOverTime: { date: string; count: number }[];
  statusBreakdown: { status: LeadStatus; count: number }[];
  sourceBreakdown: { source: LeadSource; count: number }[];
  teamPerformance?: {
    userId: string;
    userName: string;
    won: number;
    total: number;
  }[];
}

export const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "in_progress",
  "waiting",
  "won",
  "lost",
];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Новая",
  in_progress: "В работе",
  waiting: "Ожидание",
  won: "Успешно",
  lost: "Отказ",
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  website_form: "Форма сайта",
  telegram_bot: "Telegram",
  phone: "Телефон",
  referral: "Рекомендация",
  manual: "Вручную",
  other: "Другое",
};

export const LEAD_SOURCES: LeadSource[] = [
  "website_form",
  "telegram_bot",
  "phone",
  "referral",
  "manual",
  "other",
];
