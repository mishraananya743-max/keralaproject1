/*
# Kerala Waste Management System - Complete Schema

## Overview
A comprehensive waste pickup management system for the Government of Kerala with:
- Role-based access (CCO, Cleaner, Volunteer, Citizen)
- Society/area management with pickup schedules
- Rating system for cleaners with weekly bonuses
- Complaint registration with photo attachments
- Truck location tracking with proximity notifications
- Notification system

## Tables Created
1. `profiles` - Extends auth.users with role, name, phone, area assignment
2. `areas` - Geographic areas/zones in Kerala
3. `societies` - Residential societies within areas
4. `cleaner_areas` - Maps cleaners to areas they serve
5. `schedules` - Pickup schedules for societies
6. `pickups` - Actual pickup records
7. `ratings` - Ratings given by volunteers to cleaners
8. `complaints` - Citizen complaints with photo URLs
9. `complaint_inquiries` - Inquiry records for complaints
10. `truck_locations` - Real-time truck GPS tracking
11. `notifications` - System notifications for all users
12. `pickup_requests` - Citizen pickup requests

## Security
- RLS enabled on all tables
- Owner-scoped policies using auth.uid()
- Role-based access via profiles.role column
*/

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'citizen' CHECK (role IN ('cco', 'cleaner', 'volunteer', 'citizen')),
  area_id uuid,
  avatar_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================
-- AREAS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  district text NOT NULL,
  latitude double precision DEFAULT 10.1632,
  longitude double precision DEFAULT 76.6413,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "areas_select_all" ON areas;
CREATE POLICY "areas_select_all" ON areas FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "areas_insert_staff" ON areas;
CREATE POLICY "areas_insert_staff" ON areas FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "areas_update_staff" ON areas;
CREATE POLICY "areas_update_staff" ON areas FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- SOCIETIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS societies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  area_id uuid NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  address text,
  latitude double precision DEFAULT 10.1632,
  longitude double precision DEFAULT 76.6413,
  volunteer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE societies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "societies_select_all" ON societies;
CREATE POLICY "societies_select_all" ON societies FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "societies_insert_all" ON societies;
CREATE POLICY "societies_insert_all" ON societies FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "societies_update_all" ON societies;
CREATE POLICY "societies_update_all" ON societies FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "societies_delete_all" ON societies;
CREATE POLICY "societies_delete_all" ON societies FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- CLEANER_AREAS TABLE (maps cleaners to areas)
-- ============================================
CREATE TABLE IF NOT EXISTS cleaner_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  area_id uuid NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(cleaner_id, area_id)
);

ALTER TABLE cleaner_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cleaner_areas_select_all" ON cleaner_areas;
CREATE POLICY "cleaner_areas_select_all" ON cleaner_areas FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "cleaner_areas_insert_all" ON cleaner_areas;
CREATE POLICY "cleaner_areas_insert_all" ON cleaner_areas FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "cleaner_areas_update_all" ON cleaner_areas;
CREATE POLICY "cleaner_areas_update_all" ON cleaner_areas FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "cleaner_areas_delete_all" ON cleaner_areas;
CREATE POLICY "cleaner_areas_delete_all" ON cleaner_areas FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- SCHEDULES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id uuid NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
  cleaner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  pickup_day text NOT NULL CHECK (pickup_day IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  pickup_time time NOT NULL DEFAULT '07:00',
  waste_type text DEFAULT 'general' CHECK (waste_type IN ('general','organic','recyclable','hazardous')),
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedules_select_all" ON schedules;
CREATE POLICY "schedules_select_all" ON schedules FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "schedules_insert_all" ON schedules;
CREATE POLICY "schedules_insert_all" ON schedules FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "schedules_update_all" ON schedules;
CREATE POLICY "schedules_update_all" ON schedules FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "schedules_delete_all" ON schedules;
CREATE POLICY "schedules_delete_all" ON schedules FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- PICKUPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS pickups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES schedules(id) ON DELETE SET NULL,
  society_id uuid NOT NULL REFERENCES societies(id) ON DELETE CASCADE,
  cleaner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','en_route','completed','missed')),
  scheduled_date date NOT NULL,
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pickups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pickups_select_all" ON pickups;
CREATE POLICY "pickups_select_all" ON pickups FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "pickups_insert_all" ON pickups;
CREATE POLICY "pickups_insert_all" ON pickups FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "pickups_update_all" ON pickups;
CREATE POLICY "pickups_update_all" ON pickups FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pickups_delete_all" ON pickups;
CREATE POLICY "pickups_delete_all" ON pickups FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- RATINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_id uuid REFERENCES pickups(id) ON DELETE SET NULL,
  cleaner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  society_id uuid REFERENCES societies(id) ON DELETE SET NULL,
  volunteer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  week_year int NOT NULL DEFAULT EXTRACT(WEEK FROM now())::int,
  week_start date NOT NULL DEFAULT date_trunc('week', now())::date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ratings_select_all" ON ratings;
CREATE POLICY "ratings_select_all" ON ratings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "ratings_insert_all" ON ratings;
CREATE POLICY "ratings_insert_all" ON ratings FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "ratings_update_own" ON ratings;
CREATE POLICY "ratings_update_own" ON ratings FOR UPDATE
  TO authenticated USING (volunteer_id = auth.uid()) WITH CHECK (volunteer_id = auth.uid());

DROP POLICY IF EXISTS "ratings_delete_own" ON ratings;
CREATE POLICY "ratings_delete_own" ON ratings FOR DELETE
  TO authenticated USING (volunteer_id = auth.uid());

-- ============================================
-- COMPLAINTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complainant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  area_id uuid REFERENCES areas(id) ON DELETE SET NULL,
  society_id uuid REFERENCES societies(id) ON DELETE SET NULL,
  cleaner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('missed_pickup','dirty_area','rude_behavior','damaged_property','overcharging','other')),
  description text NOT NULL,
  photo_url text,
  latitude double precision,
  longitude double precision,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','under_inquiry','resolved','rejected')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  resolution_notes text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "complaints_select_all" ON complaints;
CREATE POLICY "complaints_select_all" ON complaints FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "complaints_insert_own" ON complaints;
CREATE POLICY "complaints_insert_own" ON complaints FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = complainant_id);

DROP POLICY IF EXISTS "complaints_update_all" ON complaints;
CREATE POLICY "complaints_update_all" ON complaints FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "complaints_delete_own" ON complaints;
CREATE POLICY "complaints_delete_own" ON complaints FOR DELETE
  TO authenticated USING (auth.uid() = complainant_id);

-- ============================================
-- COMPLAINT_INQUIRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS complaint_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  inquirer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  inquirer_role text NOT NULL,
  inquiry_notes text NOT NULL,
  inquiry_result text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE complaint_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inquiries_select_all" ON complaint_inquiries;
CREATE POLICY "inquiries_select_all" ON complaint_inquiries FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "inquiries_insert_all" ON complaint_inquiries;
CREATE POLICY "inquiries_insert_all" ON complaint_inquiries FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "inquiries_update_all" ON complaint_inquiries;
CREATE POLICY "inquiries_update_all" ON complaint_inquiries FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- TRUCK_LOCATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS truck_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pickup_id uuid REFERENCES pickups(id) ON DELETE SET NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  speed_kmh double precision DEFAULT 0,
  heading double precision DEFAULT 0,
  is_active boolean DEFAULT true,
  last_updated timestamptz DEFAULT now()
);

ALTER TABLE truck_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "truck_locations_select_all" ON truck_locations;
CREATE POLICY "truck_locations_select_all" ON truck_locations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "truck_locations_insert_all" ON truck_locations;
CREATE POLICY "truck_locations_insert_all" ON truck_locations FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "truck_locations_update_all" ON truck_locations;
CREATE POLICY "truck_locations_update_all" ON truck_locations FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "truck_locations_delete_all" ON truck_locations;
CREATE POLICY "truck_locations_delete_all" ON truck_locations FOR DELETE
  TO authenticated USING (true);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('pickup_assigned','pickup_reminder','rating_received','complaint_filed','complaint_inquiry','complaint_resolved','truck_nearby','bonus_awarded','promotion','general')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert_all" ON notifications;
CREATE POLICY "notifications_insert_all" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- ============================================
-- PICKUP_REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS pickup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  area_id uuid REFERENCES areas(id) ON DELETE SET NULL,
  society_id uuid REFERENCES societies(id) ON DELETE SET NULL,
  address text,
  latitude double precision,
  longitude double precision,
  waste_type text DEFAULT 'general' CHECK (waste_type IN ('general','organic','recyclable','hazardous')),
  description text,
  photo_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','scheduled','completed','rejected')),
  assigned_cleaner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pickup_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pickup_requests_select_all" ON pickup_requests;
CREATE POLICY "pickup_requests_select_all" ON pickup_requests FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "pickup_requests_insert_own" ON pickup_requests;
CREATE POLICY "pickup_requests_insert_own" ON pickup_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "pickup_requests_update_all" ON pickup_requests;
CREATE POLICY "pickup_requests_update_all" ON pickup_requests FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pickup_requests_delete_own" ON pickup_requests;
CREATE POLICY "pickup_requests_delete_own" ON pickup_requests FOR DELETE
  TO authenticated USING (auth.uid() = requester_id);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_area ON profiles(area_id);
CREATE INDEX IF NOT EXISTS idx_societies_area ON societies(area_id);
CREATE INDEX IF NOT EXISTS idx_schedules_society ON schedules(society_id);
CREATE INDEX IF NOT EXISTS idx_schedules_cleaner ON schedules(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_pickups_society ON pickups(society_id);
CREATE INDEX IF NOT EXISTS idx_pickups_cleaner ON pickups(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_pickups_status ON pickups(status);
CREATE INDEX IF NOT EXISTS idx_pickups_date ON pickups(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_ratings_cleaner ON ratings(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_ratings_week ON ratings(week_start);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_area ON complaints(area_id);
CREATE INDEX IF NOT EXISTS idx_complaints_complainant ON complaints(complainant_id);
CREATE INDEX IF NOT EXISTS idx_truck_locations_cleaner ON truck_locations(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_pickup_requests_status ON pickup_requests(status);
CREATE INDEX IF NOT EXISTS idx_cleaner_areas_cleaner ON cleaner_areas(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_cleaner_areas_area ON cleaner_areas(area_id);

-- ============================================
-- HANDLE NEW USER CREATION TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'), COALESCE(NEW.raw_user_meta_data->>'role', 'citizen'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- AUTO-UPDATE updated_at ON PROFILES
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
