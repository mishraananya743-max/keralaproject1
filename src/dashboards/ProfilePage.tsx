import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, Button, Avatar, Badge } from '@/components/ui';
import { User, Phone, Mail, MapPin, Save, LogOut, Shield, Trash2, Users, Building2 } from 'lucide-react';
import type { UserRole } from '@/types';

const roleLabels: Record<UserRole, string> = {
  cco: 'Chief Cleaning Officer',
  cleaner: 'Cleaner',
  volunteer: 'Society Volunteer',
  citizen: 'Citizen',
};

const roleIcons: Record<UserRole, typeof Shield> = {
  cco: Shield,
  cleaner: Trash2,
  volunteer: Users,
  citizen: User,
};

export function ProfilePage() {
  const { profile, signOut } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!profile) return null;
  const RoleIcon = roleIcons[profile.role];

  async function handleSave() {
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ full_name: fullName, phone })
      .eq('id', profile?.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile header */}
      <Card className="p-6 bg-gradient-to-r from-teal-700 to-emerald-700 text-white">
        <div className="flex items-center gap-4">
          <Avatar name={profile.full_name} src={profile.avatar_url} size={72} />
          <div>
            <h2 className="text-xl font-bold">{profile.full_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <RoleIcon className="w-4 h-4 text-teal-200" />
              <span className="text-sm text-teal-100">{roleLabels[profile.role]}</span>
            </div>
            <p className="text-xs text-teal-200 mt-1">Member since {new Date(profile.created_at).toLocaleDateString('en-IN')}</p>
          </div>
        </div>
      </Card>

      {/* Edit form */}
      <Card className="p-6">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-teal-600" /> Edit Profile
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            {saved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
          </div>
        </div>
      </Card>

      {/* Role info */}
      <Card className="p-6">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-teal-600" /> Role & Permissions
        </h3>
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 bg-teal-50 rounded-lg">
            <RoleIcon className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <p className="font-medium text-gray-800">{roleLabels[profile.role]}</p>
            <Badge color="teal">Active</Badge>
          </div>
        </div>
        <div className="text-sm text-gray-600 space-y-1">
          {profile.role === 'cco' && <p>Full system access: view all dashboards, manage cleaners, award bonuses, resolve complaints</p>}
          {profile.role === 'cleaner' && <p>Manage assigned pickups, track truck location, view ratings and schedules</p>}
          {profile.role === 'volunteer' && <p>Manage society schedules, assign cleaners, rate completed pickups, add societies</p>}
          {profile.role === 'citizen' && <p>Request pickups, file complaints with photos, track nearby garbage trucks</p>}
        </div>
      </Card>

      {/* Sign out */}
      <Card className="p-6">
        <Button variant="danger" onClick={signOut} className="w-full">
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </Card>
    </div>
  );
}
