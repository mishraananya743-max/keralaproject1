import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, StatCard, Badge, Button, StarRating, EmptyState, Avatar } from '@/components/ui';
import { DashboardVideo } from '@/components/DashboardVideo';
import {
  Trash2, CheckCircle, Clock, Star, MapPin, Navigation, Truck, Award, TrendingUp,
} from 'lucide-react';
import type { Pickup, Schedule, Rating, Society, TruckLocation } from '@/types';

export function CleanerDashboard() {
  const { profile } = useAuth();
  const [pickups, setPickups] = useState<(Pickup & { societies?: Society })[]>([]);
  const [schedules, setSchedules] = useState<(Schedule & { societies?: Society })[]>([]);
  const [ratings, setRatings] = useState<(Rating & { profiles?: { full_name: string } })[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalPickups, setTotalPickups] = useState(0);
  const [weekPickups, setWeekPickups] = useState(0);
  const [truckActive, setTruckActive] = useState(false);
  const [truckLocation, setTruckLocation] = useState<TruckLocation | null>(null);
  const [activeTab, setActiveTab] = useState<'pickups' | 'schedule' | 'ratings'>('pickups');

  const load = useCallback(async () => {
    if (!profile) return;
    const [pickupsR, schedulesR, ratingsR, totalR, weekR] = await Promise.all([
      supabase.from('pickups')
        .select('*, societies!inner(*)')
        .eq('cleaner_id', profile.id)
        .order('scheduled_date', { ascending: true })
        .limit(20),
      supabase.from('schedules')
        .select('*, societies!inner(*)')
        .eq('cleaner_id', profile.id)
        .eq('is_active', true)
        .order('pickup_day', { ascending: true }),
      supabase.from('ratings')
        .select('*, profiles!ratings_volunteer_id_fkey(full_name)')
        .eq('cleaner_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('pickups').select('id', { count: 'exact', head: true }).eq('cleaner_id', profile.id).eq('status', 'completed'),
      supabase.from('pickups').select('id', { count: 'exact', head: true }).eq('cleaner_id', profile.id).eq('status', 'completed').gte('completed_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    ]);

    setPickups(pickupsR.data as (Pickup & { societies: Society })[] ?? []);
    setSchedules(schedulesR.data as (Schedule & { societies: Society })[] ?? []);
    const rdata = ratingsR.data as (Rating & { profiles: { full_name: string } })[] ?? [];
    setRatings(rdata);
    setTotalPickups(totalR.count ?? 0);
    setWeekPickups(weekR.count ?? 0);
    if (rdata.length > 0) {
      setAvgRating(rdata.reduce((a, b) => a + b.rating, 0) / rdata.length);
    }

    const { data: truck } = await supabase
      .from('truck_locations')
      .select('*')
      .eq('cleaner_id', profile.id)
      .eq('is_active', true)
      .order('last_updated', { ascending: false })
      .maybeSingle();
    setTruckLocation(truck as TruckLocation | null);
    setTruckActive(!!truck);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime for pickups
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel(`cleaner_pickups:${profile.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'pickups', filter: `cleaner_id=eq.${profile.id}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile, load]);

  async function updatePickupStatus(pickup: Pickup, status: Pickup['status']) {
    const updates: Record<string, unknown> = { status };
    if (status === 'completed') updates.completed_at = new Date().toISOString();
    await supabase.from('pickups').update(updates).eq('id', pickup.id);

    if (status === 'en_route' && pickup.society_id) {
      const { data: soc } = await supabase.from('societies').select('volunteer_id').eq('id', pickup.society_id).maybeSingle();
      if (soc?.volunteer_id) {
        await supabase.from('notifications').insert({
          user_id: soc.volunteer_id,
          type: 'truck_nearby',
          title: 'Garbage Truck En Route',
          message: 'Your assigned cleaner is on the way for waste pickup. Please keep the bins ready.',
          data: { pickup_id: pickup.id },
        });
      }
    }
    load();
  }

  async function toggleTruckTracking() {
    if (!profile) return;
    if (truckActive) {
      await supabase.from('truck_locations').update({ is_active: false }).eq('cleaner_id', profile.id).eq('is_active', true);
      setTruckActive(false);
      setTruckLocation(null);
    } else {
      // Start with a default Kerala location
      const { data } = await supabase.from('truck_locations').insert({
        cleaner_id: profile.id,
        latitude: 8.5244,
        longitude: 76.9395,
        speed_kmh: 0,
        heading: 0,
        is_active: true,
      }).select().single();
      setTruckLocation(data as TruckLocation);
      setTruckActive(true);
      startLocationTracking();
    }
  }

  function startLocationTracking() {
    if (!navigator.geolocation) return;
    navigator.geolocation.watchPosition(
      async (pos) => {
        if (!profile) return;
        await supabase.from('truck_locations').update({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          speed_kmh: pos.coords.speed ? pos.coords.speed * 3.6 : 0,
          heading: pos.coords.heading ?? 0,
          last_updated: new Date().toISOString(),
        }).eq('cleaner_id', profile.id).eq('is_active', true);
      },
      null,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }

  const pendingPickups = pickups.filter((p) => p.status === 'pending' || p.status === 'accepted');
  const activePickups = pickups.filter((p) => p.status === 'en_route');
  const completedPickups = pickups.filter((p) => p.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Star className="w-6 h-6" />} label="Avg Rating" value={avgRating.toFixed(1)} color="amber" subtitle={`${ratings.length} reviews`} />
        <StatCard icon={<Trash2 className="w-6 h-6" />} label="This Week" value={weekPickups} color="teal" subtitle="completed pickups" />
        <StatCard icon={<CheckCircle className="w-6 h-6" />} label="Total Pickups" value={totalPickups} color="green" />
        <StatCard icon={<Clock className="w-6 h-6" />} label="Pending" value={pendingPickups.length} color="red" />
      </div>

      <DashboardVideo />

      {/* Truck tracking toggle */}
      <Card className="p-5 bg-gradient-to-r from-teal-700 to-emerald-700 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-lg">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold">Truck GPS Tracking</p>
              <p className="text-sm text-teal-100">
                {truckActive ? 'Active - citizens can track your location' : 'Inactive - enable to allow proximity notifications'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleTruckTracking}
            className={`px-5 py-2.5 rounded-lg font-semibold transition-all ${
              truckActive ? 'bg-red-500 hover:bg-red-600' : 'bg-white text-teal-700 hover:bg-teal-50'
            }`}
          >
            {truckActive ? 'Stop Tracking' : 'Start Tracking'}
          </button>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 bg-white rounded-xl p-1 border border-gray-200 w-fit">
        {[
          { id: 'pickups', label: 'My Pickups', icon: Trash2 },
          { id: 'schedule', label: 'Schedule', icon: Clock },
          { id: 'ratings', label: 'My Ratings', icon: Star },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'pickups' | 'schedule' | 'ratings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id ? 'bg-teal-700 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'pickups' && (
        <div className="space-y-4">
          {pendingPickups.length > 0 && (
            <Card className="p-5">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" /> Pending Pickups
              </h3>
              <div className="space-y-2">
                {pendingPickups.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">{p.societies?.name ?? 'Unknown society'}</p>
                      <p className="text-xs text-gray-500">{new Date(p.scheduled_date).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="success" onClick={() => updatePickupStatus(p, 'accepted')}>
                        <CheckCircle className="w-4 h-4" /> Accept
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activePickups.length > 0 && (
            <Card className="p-5">
              <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-blue-500" /> En Route
              </h3>
              <div className="space-y-2">
                {activePickups.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">{p.societies?.name ?? 'Unknown society'}</p>
                      <p className="text-xs text-gray-500">{new Date(p.scheduled_date).toLocaleDateString('en-IN')}</p>
                    </div>
                    <Button size="sm" variant="success" onClick={() => updatePickupStatus(p, 'completed')}>
                      <CheckCircle className="w-4 h-4" /> Complete
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" /> Completed
            </h3>
            {completedPickups.length === 0 ? (
              <EmptyState icon={<CheckCircle className="w-10 h-10" />} title="No completed pickups yet" />
            ) : (
              <div className="space-y-2">
                {completedPickups.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">{p.societies?.name ?? 'Unknown society'}</p>
                      <p className="text-xs text-gray-500">
                        {p.completed_at ? new Date(p.completed_at).toLocaleString('en-IN') : ''}
                      </p>
                    </div>
                    <Badge color="green">Completed</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'schedule' && (
        <Card className="p-5">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-600" /> My Weekly Schedule
          </h3>
          {schedules.length === 0 ? (
            <EmptyState icon={<Clock className="w-10 h-10" />} title="No schedules assigned" subtitle="Your assigned pickup schedules will appear here" />
          ) : (
            <div className="space-y-2">
              {schedules.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-teal-600" />
                    <div>
                      <p className="font-medium text-gray-800">{s.societies?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{s.societies?.address ?? ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-teal-700">{s.pickup_day}</p>
                    <p className="text-xs text-gray-500">{s.pickup_time} - {s.waste_type}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'ratings' && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" /> My Ratings
            </h3>
            <div className="flex items-center gap-2">
              <StarRating value={Math.round(avgRating)} readOnly size={20} />
              <span className="text-lg font-bold text-gray-800">{avgRating.toFixed(1)}</span>
            </div>
          </div>
          {ratings.length === 0 ? (
            <EmptyState icon={<Star className="w-10 h-10" />} title="No ratings yet" subtitle="Ratings from volunteers will appear here" />
          ) : (
            <div className="space-y-3">
              {ratings.map((r) => (
                <div key={r.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <Avatar name={r.profiles?.full_name ?? 'Unknown'} size={36} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-800">{r.profiles?.full_name ?? 'Volunteer'}</p>
                      <StarRating value={r.rating} readOnly size={14} />
                    </div>
                    {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}
                    <p className="text-xs text-gray-400 mt-1">{new Date(r.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {avgRating >= 4 && (
            <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200 flex items-center gap-3">
              <Award className="w-6 h-6 text-yellow-500" />
              <div>
                <p className="text-sm font-semibold text-yellow-800">Eligible for Bonus!</p>
                <p className="text-xs text-yellow-700">Your rating qualifies you for weekly bonus consideration.</p>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
