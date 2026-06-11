export type CoverageStatus = 'Active' | 'Watch' | 'Inactive';
export type RelationshipTier = 'Tier 1' | 'Tier 2' | 'Tier 3';
export type MeetingType = 'In-person' | 'Call' | 'Video' | 'Conference/Event';
export type TaskPriority = 'High' | 'Medium' | 'Low';
export type TaskStatus = 'Open' | 'In Progress' | 'Done' | 'Deferred';
export type DealType = 'M&A Buy-side' | 'M&A Sell-side' | 'Capital Raise' | 'IPO' | 'Debt Advisory' | 'Other';
export type DealStage = 'Prospect' | 'Pitching' | 'Mandate Won' | 'In Execution' | 'Closing' | 'Closed' | 'Dead';
export type DealRole = 'Lead' | 'Co-advisor' | 'Subadvisor';
export type ProjectType = 'Pitch' | 'Research' | 'Model' | 'Regulatory/Compliance' | 'Other';
export type ProjectStatus = 'Not Started' | 'In Progress' | 'On Hold' | 'Complete';

export interface Company {
  id: string;
  name: string;
  ticker?: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  sub_sector?: string;
  hq_location?: string;
  coverage_status: CoverageStatus;
  relationship_owner?: string;
  last_activity_date?: string;
  notes?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  full_name: string;
  title?: string;
  company_id?: string;
  company?: Company;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  relationship_tier: RelationshipTier;
  last_contact_date?: string;
  notes?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: string;
  date_time: string;
  meeting_type: MeetingType;
  company_id?: string;
  company?: Company;
  deal_id?: string;
  deal?: Deal;
  agenda?: string;
  notes?: string;
  attendee_ids: string[];
  attendees?: Contact[];
  created_at: string;
  updated_at: string;
}

export interface FollowUp {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to?: string;
  company_id?: string;
  company?: Company;
  contact_id?: string;
  contact?: Contact;
  deal_id?: string;
  deal?: Deal;
  source_meeting_id?: string;
  source_meeting?: Meeting;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  name: string;
  company_id?: string;
  company?: Company;
  deal_type: DealType;
  stage: DealStage;
  role: DealRole;
  estimated_fee?: number;
  expected_close_date?: string;
  key_contact_ids: string[];
  key_contacts?: Contact[];
  deal_team?: string[];
  notes?: string;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  priority: TaskPriority;
  due_date?: string;
  owner?: string;
  company_id?: string;
  company?: Company;
  deal_id?: string;
  deal?: Deal;
  description?: string;
  subtasks: Subtask[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  open_followups: number;
  overdue_tasks: number;
  active_deals: number;
  deals_by_stage: Record<DealStage, number>;
  upcoming_meetings: Meeting[];
  recent_contacts: Contact[];
}
