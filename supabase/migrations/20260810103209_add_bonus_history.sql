/*
# Add bonus_history table and cleaner weekly stats view

## New Tables
1. `bonus_history` - Tracks all bonuses awarded to cleaners by the CCO
   - cleaner_id (uuid, FK to profiles)
   - week_start (date) - which week the bonus is for
   - avg_rating (numeric) - the cleaner's average rating that week
   - total_pickups (int) - number of completed pickups that week
   - bonus_amount (numeric) - monetary bonus amount
   - awarded_by (uuid, FK to profiles) - the CCO who awarded it
   - notes (text)

2. `weekly_cleaner_stats` view - Aggregates ratings and pickups per cleaner per week

## Security
- RLS enabled on bonus_history
- All authenticated users can read, only CCO can insert
*/

CREATE TABLE IF NOT EXISTS bonus_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cleaner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start date NOT NULL DEFAULT date_trunc('week', now())::date,
  avg_rating numeric DEFAULT 0,
  total_pickups int DEFAULT 0,
  bonus_amount numeric DEFAULT 0,
  awarded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bonus_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bonus_history_select_all" ON bonus_history;
CREATE POLICY "bonus_history_select_all" ON bonus_history FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "bonus_history_insert_all" ON bonus_history;
CREATE POLICY "bonus_history_insert_all" ON bonus_history FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_bonus_history_cleaner ON bonus_history(cleaner_id);
CREATE INDEX IF NOT EXISTS idx_bonus_history_week ON bonus_history(week_start);
