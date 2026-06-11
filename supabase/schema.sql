-- IB Dealflow Tracker — Supabase Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== COMPANIES ====================
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  ticker TEXT,
  exchange TEXT,
  sector TEXT,
  industry TEXT,
  sub_sector TEXT,
  hq_location TEXT,
  coverage_status TEXT NOT NULL DEFAULT 'Active' CHECK (coverage_status IN ('Active', 'Watch', 'Inactive')),
  relationship_owner TEXT,
  last_activity_date TIMESTAMPTZ,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== CONTACTS ====================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  title TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  relationship_tier TEXT NOT NULL DEFAULT 'Tier 2' CHECK (relationship_tier IN ('Tier 1', 'Tier 2', 'Tier 3')),
  last_contact_date TIMESTAMPTZ,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== DEALS ====================
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_type TEXT NOT NULL CHECK (deal_type IN ('M&A Buy-side', 'M&A Sell-side', 'Capital Raise', 'IPO', 'Debt Advisory', 'Other')),
  stage TEXT NOT NULL DEFAULT 'Prospect' CHECK (stage IN ('Prospect', 'Pitching', 'Mandate Won', 'In Execution', 'Closing', 'Closed', 'Dead')),
  role TEXT NOT NULL DEFAULT 'Lead' CHECK (role IN ('Lead', 'Co-advisor', 'Subadvisor')),
  estimated_fee NUMERIC(15, 2),
  expected_close_date DATE,
  key_contact_ids UUID[] DEFAULT '{}',
  deal_team TEXT[] DEFAULT '{}',
  notes TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== MEETINGS ====================
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date_time TIMESTAMPTZ NOT NULL,
  meeting_type TEXT NOT NULL CHECK (meeting_type IN ('In-person', 'Call', 'Video', 'Conference/Event')),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  agenda TEXT,
  notes TEXT,
  attendee_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== FOLLOW-UPS ====================
CREATE TABLE follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Done', 'Deferred')),
  assigned_to TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  source_meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== PROJECTS ====================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Pitch', 'Research', 'Model', 'Regulatory/Compliance', 'Other')),
  status TEXT NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'In Progress', 'On Hold', 'Complete')),
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
  due_date DATE,
  owner TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  description TEXT,
  subtasks JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== TRIGGERS (auto-update timestamps) ====================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER deals_updated_at BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER meetings_updated_at BEFORE UPDATE ON meetings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER follow_ups_updated_at BEFORE UPDATE ON follow_ups FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update last_activity_date on company when a meeting is added
CREATE OR REPLACE FUNCTION update_company_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NOT NULL THEN
    UPDATE companies SET last_activity_date = NEW.date_time WHERE id = NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meetings_update_company_activity
  AFTER INSERT OR UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_company_last_activity();

-- Auto-update last_contact_date on contacts when a meeting is added
CREATE OR REPLACE FUNCTION update_contact_last_contact()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.attendee_ids IS NOT NULL AND array_length(NEW.attendee_ids, 1) > 0 THEN
    UPDATE contacts SET last_contact_date = NEW.date_time
    WHERE id = ANY(NEW.attendee_ids);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meetings_update_contact_last_contact
  AFTER INSERT OR UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_contact_last_contact();

-- ==================== INDEXES ====================
CREATE INDEX idx_companies_coverage_status ON companies(coverage_status);
CREATE INDEX idx_companies_sector ON companies(sector);
CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_contacts_relationship_tier ON contacts(relationship_tier);
CREATE INDEX idx_meetings_company_id ON meetings(company_id);
CREATE INDEX idx_meetings_date_time ON meetings(date_time DESC);
CREATE INDEX idx_follow_ups_status ON follow_ups(status);
CREATE INDEX idx_follow_ups_due_date ON follow_ups(due_date);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_deals_company_id ON deals(company_id);
CREATE INDEX idx_projects_status ON projects(status);

-- ==================== ROW LEVEL SECURITY ====================
-- Disable RLS for single-user app (auth handled at app level)
-- If you want RLS, enable and set policies here
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE contacts DISABLE ROW LEVEL SECURITY;
ALTER TABLE meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups DISABLE ROW LEVEL SECURITY;
ALTER TABLE deals DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- ==================== SAMPLE DATA (optional) ====================
-- Uncomment to seed with demo data
/*
INSERT INTO companies (name, sector, industry, hq_location, coverage_status, relationship_owner, tags) VALUES
  ('Acme Corp', 'Technology', 'Software', 'San Francisco, CA', 'Active', 'John Smith', '{"M&A candidate"}'),
  ('Beta Industries', 'Industrials', 'Manufacturing', 'Chicago, IL', 'Watch', 'John Smith', '{"IPO watch"}'),
  ('Gamma Holdings', 'Financial Services', 'Asset Management', 'New York, NY', 'Active', 'John Smith', '{"portfolio company"}');
*/
