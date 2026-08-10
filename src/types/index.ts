export type UserRole = 'cco' | 'cleaner' | 'volunteer' | 'citizen';

export type PickupStatus = 'pending' | 'accepted' | 'en_route' | 'completed' | 'missed';
export type ComplaintStatus = 'pending' | 'under_inquiry' | 'resolved' | 'rejected';
export type RequestStatus = 'pending' | 'accepted' | 'scheduled' | 'completed' | 'rejected';
export type WasteType = 'general' | 'organic' | 'recyclable' | 'hazardous';
export type NotificationType =
  | 'pickup_assigned'
  | 'pickup_reminder'
  | 'rating_received'
  | 'complaint_filed'
  | 'complaint_inquiry'
  | 'complaint_resolved'
  | 'truck_nearby'
  | 'bonus_awarded'
  | 'promotion'
  | 'general';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  area_id: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Area {
  id: string;
  name: string;
  district: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

export interface Society {
  id: string;
  name: string;
  area_id: string;
  address: string | null;
  latitude: number;
  longitude: number;
  volunteer_id: string | null;
  created_at: string;
}

export interface Schedule {
  id: string;
  society_id: string;
  cleaner_id: string | null;
  pickup_day: string;
  pickup_time: string;
  waste_type: WasteType;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Pickup {
  id: string;
  schedule_id: string | null;
  society_id: string;
  cleaner_id: string | null;
  status: PickupStatus;
  scheduled_date: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface Rating {
  id: string;
  pickup_id: string | null;
  cleaner_id: string;
  society_id: string | null;
  volunteer_id: string;
  rating: number;
  comment: string | null;
  week_year: number;
  week_start: string;
  created_at: string;
}

export interface Complaint {
  id: string;
  complainant_id: string;
  area_id: string | null;
  society_id: string | null;
  cleaner_id: string | null;
  category: string;
  description: string;
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  status: ComplaintStatus;
  priority: string;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface ComplaintInquiry {
  id: string;
  complaint_id: string;
  inquirer_id: string;
  inquirer_role: string;
  inquiry_notes: string;
  inquiry_result: string | null;
  created_at: string;
}

export interface TruckLocation {
  id: string;
  cleaner_id: string;
  pickup_id: string | null;
  latitude: number;
  longitude: number;
  speed_kmh: number;
  heading: number;
  is_active: boolean;
  last_updated: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface PickupRequest {
  id: string;
  requester_id: string;
  area_id: string | null;
  society_id: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  waste_type: WasteType;
  description: string | null;
  photo_url: string | null;
  status: RequestStatus;
  assigned_cleaner_id: string | null;
  created_at: string;
}

export interface CleanerArea {
  id: string;
  cleaner_id: string;
  area_id: string;
  assigned_at: string;
}

export interface BonusHistory {
  id: string;
  cleaner_id: string;
  week_start: string;
  avg_rating: number;
  total_pickups: number;
  bonus_amount: number;
  awarded_by: string | null;
  notes: string | null;
  created_at: string;
}
