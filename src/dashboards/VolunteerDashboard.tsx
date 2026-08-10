import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, StatCard, Badge, Button, Modal, StarRating, EmptyState, Avatar } from '@/components/ui';
import {
  Calendar, Plus, Star, Trash2, Users, Clock, MapPin, CheckCircle, Building2,
} from 'lucide-react';
import type { Schedule, Pickup, Rating, Society, Area, Profile, CleanerArea } from '@/types';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function VolunteerDashboard() {
  const { profile } = useAuth();
  const [mySocieties, setMySocieties] = useState<Society[]>([]);
  const [schedules, setSchedules] = useState<(Schedule & { societies?: Society; profiles?: { full_name: string } })[]>([]);
  const [cleaners, setCleaners] = useState<Profile[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [pickupsToRate, setPickupsToRate] = useState<(Pickup & { societies?: Society; profiles?: { full_name: string } })[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAddSociety, setShowAddSociety] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedules' | 'rate' | 'societies'>('schedules');

  // Schedule form state
  const [formSociety, setFormSociety] = useState('');
  const [formCleaner, setFormCleaner] = useState('');
  const [formDay, setFormDay] = useState('Monday');
  const [formTime, setFormTime] = useState('07:00');
  const [formWasteType, setFormWasteType] = useState<'general' | 'organic' | 'recyclable' | 'hazardous'>('general');

  // New society form
  const [newSocietyName, setNewSocietyName] = useState('');
  const [newSocietyArea, setNewSocietyArea] = useState('');
  const [newSocietyAddress, setNewSocietyAddress] = useState('');

  // Rating modal
  const [ratingPickup, setRatingPickup] = useState<(Pickup & { societies?: Society; profiles?: { full_name: string } }) | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

  const load = useCallback(async () => {
    if (!profile) return;
    const [societiesR, cleanersR, areasR] = await Promise.all([
      supabase.from('societies').select('*').eq('volunteer_id', profile.id),
      supabase.from('profiles').select('*').eq('role', 'cleaner').eq('is_active', true),
      supabase.from('areas').select('*'),
    ]);

    const mySocs = societiesR.data as Society[] ?? [];
    setMySocieties(mySocs);
    setCleaners(cleanersR.data as Profile[] ?? []);
    setAreas(areasR.data as Area[] ?? []);

    if (mySocs.length > 0) {
      const societyIds = mySocs.map((s) => s.id);
      const [schedulesR, pickupsR] = await Promise.all([
        supabase.from('schedules')
          .select('*, societies!inner(*), profiles!schedules_cleaner_id_fkey(full_name)')
          .in('society_id', societyIds)
          .order('pickup_day'),
        supabase.from('pickups')
          .select('*, societies!inner(*), profiles!pickups_cleaner_id_fkey(full_name)')
          .in('society_id', societyIds)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false }),
      ]);
      setSchedules(schedulesR.data as (Schedule & { societies: Society; profiles: { full_name: string } })[] ?? []);

      // Find completed pickups that haven't been rated yet
      const completedPickups = pickupsR.data as (Pickup & { societies: Society; profiles: { full_name: string } })[] ?? [];
      const { data: existingRatings } = await supabase
        .from('ratings')
        .select('pickup_id')
        .in('pickup_id', completedPickups.map((p) => p.id));
      const ratedIds = new Set((existingRatings ?? []).map((r: { pickup_id: string }) => r.pickup_id));
      setPickupsToRate(completedPickups.filter((p) => !ratedIds.has(p.id)));
    }
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  async function createSchedule() {
    if (!profile || !formSociety) return;
    await supabase.from('schedules').insert({
      society_id: formSociety,
      cleaner_id: formCleaner || null,
      pickup_day: formDay,
      pickup_time: formTime,
      waste_type: formWasteType,
      is_active: true,
      created_by: profile.id,
    });

    // Create a pickup for the next occurrence of this day
    const today = new Date();
    const targetDay = days.indexOf(formDay);
    const currentDay = today.getDay() === 0 ? 6 : today.getDay() - 1;
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    const pickupDate = new Date(today);
    pickupDate.setDate(today.getDate() + daysUntil);

    if (formCleaner) {
      await supabase.from('pickups').insert({
        society_id: formSociety,
        cleaner_id: formCleaner,
        status: 'pending',
        scheduled_date: pickupDate.toISOString().slice(0, 10),
      });

      await supabase.from('notifications').insert({
        user_id: formCleaner,
        type: 'pickup_assigned',
        title: 'New Pickup Assigned',
        message: `You have a new pickup scheduled for ${formDay} at ${formTime}.`,
        data: { society_id: formSociety, day: formDay, time: formTime },
      });
    }

    setShowScheduleModal(false);
    setFormSociety('');
    setFormCleaner('');
    setFormDay('Monday');
    setFormTime('07:00');
    setFormWasteType('general');
    load();
  }

  async function addSociety() {
    if (!profile || !newSocietyName || !newSocietyArea) return;
    await supabase.from('societies').insert({
      name: newSocietyName,
      area_id: newSocietyArea,
      address: newSocietyAddress,
      volunteer_id: profile.id,
      latitude: 8.5244,
      longitude: 76.9395,
    });
    setShowAddSociety(false);
    setNewSocietyName('');
    setNewSocietyArea('');
    setNewSocietyAddress('');
    load();
  }

  async function submitRating() {
    if (!profile || !ratingPickup) return;
    await supabase.from('ratings').insert({
      pickup_id: ratingPickup.id,
      cleaner_id: ratingPickup.cleaner_id,
      society_id: ratingPickup.society_id,
      volunteer_id: profile.id,
      rating: ratingValue,
      comment: ratingComment,
    });

    if (ratingPickup.cleaner_id) {
      await supabase.from('notifications').insert({
        user_id: ratingPickup.cleaner_id,
        type: 'rating_received',
        title: 'New Rating Received',
        message: `You received a ${ratingValue}-star rating for a pickup at ${ratingPickup.societies?.name ?? 'your society'}.`,
        data: { rating: ratingValue, pickup_id: ratingPickup.id },
      });
    }

    setRatingPickup(null);
    setRatingValue(5);
    setRatingComment('');
    load();
  }

  async function deleteSchedule(id: string) {
    await supabase.from('schedules').delete().eq('id', id);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Building2 className="w-6 h-6" />} label="My Societies" value={mySocieties.length} color="teal" />
        <StatCard icon={<Calendar className="w-6 h-6" />} label="Active Schedules" value={schedules.length} color="blue" />
        <StatCard icon={<Star className="w-6 h-6" />} label="Pending Ratings" value={pickupsToRate.length} color="amber" />
        <StatCard icon={<Users className="w-6 h-6" />} label="Available Cleaners" value={cleaners.length} color="green" />
      </div>

      <div className="flex gap-2 bg-white rounded-xl p-1 border border-gray-200 w-fit flex-wrap">
        {[
          { id: 'schedules', label: 'Schedules', icon: Calendar },
          { id: 'rate', label: `Rate Cleaners${pickupsToRate.length > 0 ? ` (${pickupsToRate.length})` : ''}`, icon: Star },
          { id: 'societies', label: 'My Societies', icon: Building2 },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'schedules' | 'rate' | 'societies')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id ? 'bg-teal-700 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'schedules' && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" /> Pickup Schedules
            </h3>
            <Button size="sm" onClick={() => setShowScheduleModal(true)}>
              <Plus className="w-4 h-4" /> New Schedule
            </Button>
          </div>
          {schedules.length === 0 ? (
            <EmptyState icon={<Calendar className="w-10 h-10" />} title="No schedules yet" subtitle="Create a pickup schedule for your society" />
          ) : (
            <div className="space-y-2">
              {schedules.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-teal-600" />
                    <div>
                      <p className="font-medium text-gray-800">{s.societies?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-gray-500">
                        {s.pickup_day} at {s.pickup_time} - {s.waste_type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium text-gray-700">{s.profiles?.full_name ?? 'Unassigned'}</p>
                      <p className="text-xs text-gray-400">{s.profiles ? 'Cleaner' : 'No cleaner'}</p>
                    </div>
                    <button onClick={() => deleteSchedule(s.id)} className="text-red-400 hover:text-red-600 p-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'rate' && (
        <Card className="p-5">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" /> Rate Completed Pickups
          </h3>
          {pickupsToRate.length === 0 ? (
            <EmptyState icon={<CheckCircle className="w-10 h-10" />} title="No pickups to rate" subtitle="Completed pickups will appear here for rating" />
          ) : (
            <div className="space-y-3">
              {pickupsToRate.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar name={p.profiles?.full_name ?? 'Cleaner'} size={40} />
                    <div>
                      <p className="font-medium text-gray-800">{p.profiles?.full_name ?? 'Unknown cleaner'}</p>
                      <p className="text-xs text-gray-500">
                        {p.societies?.name} - {p.completed_at ? new Date(p.completed_at).toLocaleDateString('en-IN') : ''}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setRatingPickup(p)}>
                    <Star className="w-4 h-4" /> Rate
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'societies' && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-600" /> My Societies
            </h3>
            <Button size="sm" onClick={() => setShowAddSociety(true)}>
              <Plus className="w-4 h-4" /> Add Society
            </Button>
          </div>
          {mySocieties.length === 0 ? (
            <EmptyState icon={<Building2 className="w-10 h-10" />} title="No societies assigned" subtitle="Add a society you manage" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mySocieties.map((s) => {
                const area = areas.find((a) => a.id === s.area_id);
                return (
                  <div key={s.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-teal-600 mt-1" />
                      <div>
                        <p className="font-medium text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.address ?? 'No address'}</p>
                        <Badge color="teal">{area?.name ?? 'Unknown area'}</Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Schedule modal */}
      <Modal open={showScheduleModal} onClose={() => setShowScheduleModal(false)} title="Create Pickup Schedule">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Society</label>
            <select value={formSociety} onChange={(e) => setFormSociety(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Select society</option>
              {mySocieties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Assign Cleaner</label>
            <select value={formCleaner} onChange={(e) => setFormCleaner(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Unassigned</option>
              {cleaners.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Day</label>
              <select value={formDay} onChange={(e) => setFormDay(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500">
                {days.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Time</label>
              <input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Waste Type</label>
            <select value={formWasteType} onChange={(e) => setFormWasteType(e.target.value as 'general' | 'organic' | 'recyclable' | 'hazardous')} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500">
              <option value="general">General</option>
              <option value="organic">Organic</option>
              <option value="recyclable">Recyclable</option>
              <option value="hazardous">Hazardous</option>
            </select>
          </div>
          <Button onClick={createSchedule} className="w-full">
            <Plus className="w-4 h-4" /> Create Schedule
          </Button>
        </div>
      </Modal>

      {/* Rating modal */}
      <Modal open={!!ratingPickup} onClose={() => setRatingPickup(null)} title="Rate Cleaner">
        {ratingPickup && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Avatar name={ratingPickup.profiles?.full_name ?? 'Cleaner'} size={44} />
              <div>
                <p className="font-medium text-gray-800">{ratingPickup.profiles?.full_name ?? 'Unknown'}</p>
                <p className="text-xs text-gray-500">{ratingPickup.societies?.name}</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 mb-2">How was the service?</p>
              <StarRating value={ratingValue} onChange={setRatingValue} size={36} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Comment (optional)</label>
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                placeholder="Share your experience..."
              />
            </div>
            <Button onClick={submitRating} className="w-full">
              <Star className="w-4 h-4" /> Submit Rating
            </Button>
          </div>
        )}
      </Modal>

      {/* Add society modal */}
      <Modal open={showAddSociety} onClose={() => setShowAddSociety(false)} title="Add Society">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Society Name</label>
            <input type="text" value={newSocietyName} onChange={(e) => setNewSocietyName(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" placeholder="e.g. Green Valley Apartments" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Area</label>
            <select value={newSocietyArea} onChange={(e) => setNewSocietyArea(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Select area</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}, {a.district}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Address</label>
            <textarea value={newSocietyAddress} onChange={(e) => setNewSocietyAddress(e.target.value)} rows={2} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" placeholder="Full address..." />
          </div>
          <Button onClick={addSociety} className="w-full">
            <Plus className="w-4 h-4" /> Add Society
          </Button>
        </div>
      </Modal>
    </div>
  );
}
