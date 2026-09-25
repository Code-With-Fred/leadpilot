/**
 * Domain model for LeadPilot.
 *
 * Multi-tenant by design: every business record is scoped to an organization
 * (`organization_id`), so row level security can later be expressed as
 * "user must be a member of the row's organization". No business data is
 * modelled globally.
 *
 * These are interface definitions only — nothing here talks to a backend yet.
 */

export type UUID = string;
export type ISODate = string;

export type OrgRole = "owner" | "admin" | "member";
export type PlanTier = "starter" | "growth" | "agency";

export interface Organization {
  id: UUID;
  name: string;
  slug: string;
  plan: PlanTier;
  created_at: ISODate;
}

export interface UserProfile {
  id: UUID; // matches the auth user id
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface OrganizationMember {
  organization_id: UUID;
  user_id: UUID;
  role: OrgRole;
  created_at: ISODate;
}

export type LeadStage =
  | "new"
  | "contacted"
  | "warm"
  | "interested"
  | "qualified"
  | "won"
  | "lost";

export interface Lead {
  id: UUID;
  organization_id: UUID;
  company: string;
  contact_name: string | null;
  contact_email: string | null;
  industry: string | null;
  location: string | null;
  website: string | null;
  stage: LeadStage;
  score: number | null;
  owner_id: UUID | null;
  last_activity_at: ISODate | null;
  created_at: ISODate;
}

export interface Campaign {
  id: UUID;
  organization_id: UUID;
  name: string;
  status: "draft" | "active" | "paused" | "completed";
  created_at: ISODate;
}

export interface Message {
  id: UUID;
  organization_id: UUID;
  lead_id: UUID;
  campaign_id: UUID | null;
  direction: "outbound" | "inbound";
  channel: "email" | "sms" | "whatsapp" | "linkedin";
  body: string;
  status: "draft" | "approved" | "sent" | "failed";
  sent_at: ISODate | null;
}

export interface FollowUp {
  id: UUID;
  organization_id: UUID;
  lead_id: UUID;
  scheduled_for: ISODate;
  status: "scheduled" | "sent" | "cancelled";
  step: number;
}

export interface AiGeneration {
  id: UUID;
  organization_id: UUID;
  lead_id: UUID | null;
  kind: "research" | "message" | "reply_analysis";
  input_tokens: number;
  output_tokens: number;
  created_at: ISODate;
}

export interface Subscription {
  id: UUID;
  organization_id: UUID;
  plan: PlanTier;
  status: "trialing" | "active" | "past_due" | "canceled";
  current_period_end: ISODate | null;
}

export interface UsageRecord {
  id: UUID;
  organization_id: UUID;
  period_start: ISODate;
  leads_processed: number;
  messages_sent: number;
  ai_generations: number;
}

export interface Notification {
  id: UUID;
  organization_id: UUID;
  user_id: UUID;
  title: string;
  body: string | null;
  read_at: ISODate | null;
  created_at: ISODate;
}

/**
 * Data access contract. A Supabase-backed implementation can be dropped in
 * later; every method is organization-scoped on purpose.
 */
export interface LeadPilotRepository {
  listLeads(organizationId: UUID): Promise<Lead[]>;
  getLead(organizationId: UUID, leadId: UUID): Promise<Lead | null>;
  listCampaigns(organizationId: UUID): Promise<Campaign[]>;
  listFollowUps(organizationId: UUID): Promise<FollowUp[]>;
  getUsage(organizationId: UUID): Promise<UsageRecord | null>;
}
