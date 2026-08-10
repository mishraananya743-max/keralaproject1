import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, Badge, EmptyState, Avatar, Button } from '@/components/ui';
import { BarChart3, TrendingUp, Award, Calendar, IndianRupee, Trash2, AlertTriangle, MapPin } from 'lucide-react';
import type { BonusHistory, Profile, Complaint, Pickup } from '@/types';

export function CCOAnalytics() {
  const [weeklyData, setWeeklyData] = useState<{ week: string; count: number }[]>([]);
  const [areaStats, setAreaStats] = useState<{ area: string; complaints: number; pickups: number }[]>([]);
  const [bonusHistory, setBonusHistory] = useState<(BonusHistory & { profiles?: { full_name: string } })[]>([]);
  const [complaintTrend, setComplaintTrend] = useState<{ week: string; count: number }[]>([]);
  const [topPerformers, setTopPerformers] = useState<{ name: string; avg: number; total: number }[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    // Weekly pickups for last 8 weeks
    const eightWeeksAgo = new Date(Date.now() - 56 * 86400000).toISOString().slice(0, 10);
    const { data: pickups } = await supabase
      .from('pickups')
      .select('scheduled_date, status')
      .gte('scheduled_date', eightWeeksAgo);

    if (pickups && pickups.length > 0) {
      const byWeek: Record<string, number> = {};
      (pickups as Pickup[]).forEach((p) => {
        const weekStart = new Date(p.scheduled_date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
        const key = weekStart.toISOString().slice(0, 10);
        byWeek[key] = (byWeek[key] ?? 0) + 1;
      });
      const sorted = Object.entries(byWeek)
        .map(([week, count]) => ({ week, count }))
        .sort((a, b) => a.week.localeCompare(b.week))
        .slice(-8);
      setWeeklyData(sorted);
    }

    // Area stats
    const { data: complaints } = await supabase.from('complaints').select('area_id, areas(name)');
    const { data: allPickups } = await supabase.from('pickups').select('society_id, societies!inner(area_id, areas(name))');

    const areaMap: Record<string, { area: string; complaints: number; pickups: number }> = {};
    (complaints ?? []).forEach((c: Record<string, unknown>) => {
      const areas = c.areas as { name: string }[] | null;
      const name = areas?.[0]?.name ?? 'Unknown';
      if (!areaMap[name]) areaMap[name] = { area: name, complaints: 0, pickups: 0 };
      areaMap[name].complaints++;
    });
    (allPickups ?? []).forEach((p: Record<string, unknown>) => {
      const societies = p.societies as { area_id: string; areas: { name: string }[] }[] | null;
      const name = societies?.[0]?.areas?.[0]?.name ?? 'Unknown';
      if (!areaMap[name]) areaMap[name] = { area: name, complaints: 0, pickups: 0 };
      areaMap[name].pickups++;
    });
    setAreaStats(Object.values(areaMap).sort((a, b) => b.complaints - a.complaints));

    // Complaint trend (last 8 weeks)
    const { data: cmpData } = await supabase
      .from('complaints')
      .select('created_at')
      .gte('created_at', eightWeeksAgo);

    if (cmpData && cmpData.length > 0) {
      const byWeek: Record<string, number> = {};
      (cmpData as { created_at: string }[]).forEach((c) => {
        const d = new Date(c.created_at);
        d.setDate(d.getDate() - d.getDay() + 1);
        const key = d.toISOString().slice(0, 10);
        byWeek[key] = (byWeek[key] ?? 0) + 1;
      });
      const sorted = Object.entries(byWeek)
        .map(([week, count]) => ({ week, count }))
        .sort((a, b) => a.week.localeCompare(b.week))
        .slice(-8);
      setComplaintTrend(sorted);
    }

    // Bonus history
    const { data: bonuses } = await supabase
      .from('bonus_history')
      .select('*, profiles!bonus_history_cleaner_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(20);
    setBonusHistory((bonuses as Record<string, unknown>[] ?? []).map((b) => ({
      ...b,
      profiles: { full_name: (b.profiles as { full_name: string }[] | undefined)?.[0]?.full_name ?? 'Unknown' },
    })) as unknown as (BonusHistory & { profiles: { full_name: string } })[]);

    // Top performers (all time)
    const { data: ratings } = await supabase
      .from('ratings')
      .select('cleaner_id, rating, profiles!ratings_cleaner_id_fkey(full_name)');

    if (ratings && ratings.length > 0) {
      const byCleaner: Record<string, { name: string; ratings: number[] }> = {};
      (ratings as Record<string, unknown>[]).forEach((r) => {
        const cleanerId = r.cleaner_id as string;
        const rating = r.rating as number;
        const profiles = r.profiles as { full_name: string }[] | null;
        if (!byCleaner[cleanerId]) byCleaner[cleanerId] = { name: profiles?.[0]?.full_name ?? 'Unknown', ratings: [] };
        byCleaner[cleanerId].ratings.push(rating);
      });
      const top = Object.entries(byCleaner)
        .map(([_, v]) => ({
          name: v.name,
          avg: v.ratings.reduce((a, b) => a + b, 0) / v.ratings.length,
          total: v.ratings.length,
        }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 10);
      setTopPerformers(top);
    }
  }

  const maxWeekly = Math.max(...weeklyData.map((d) => d.count), 1);
  const maxComplaints = Math.max(...complaintTrend.map((d) => d.count), 1);
  const maxAreaComplaints = Math.max(...areaStats.map((a) => a.complaints), 1);
  const maxAreaPickups = Math.max(...areaStats.map((a) => a.pickups), 1);
  const maxPerf = Math.max(...topPerformers.map((p) => p.avg), 5);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-teal-600" /> Analytics & Insights
      </h2>

      {/* Weekly pickups chart */}
      <Card className="p-5">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-teal-600" /> Weekly Collection Trends
        </h3>
        {weeklyData.length === 0 ? (
          <EmptyState icon={<TrendingUp className="w-10 h-10" />} title="No data yet" />
        ) : (
          <div className="flex items-end justify-between gap-2 h-48">
            {weeklyData.map((d) => (
              <div key={d.week} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-semibold text-teal-700">{d.count}</span>
                <div
                  className="w-full bg-gradient-to-t from-teal-600 to-teal-400 rounded-t-lg transition-all hover:opacity-80"
                  style={{ height: `${(d.count / maxWeekly) * 100}%`, minHeight: '8px' }}
                />
                <span className="text-xs text-gray-500">{new Date(d.week).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Complaint trend */}
      <Card className="p-5">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" /> Complaint Trends
        </h3>
        {complaintTrend.length === 0 ? (
          <EmptyState icon={<AlertTriangle className="w-10 h-10" />} title="No complaints data" />
        ) : (
          <div className="flex items-end justify-between gap-2 h-40">
            {complaintTrend.map((d) => (
              <div key={d.week} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-semibold text-amber-700">{d.count}</span>
                <div
                  className="w-full bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-lg transition-all hover:opacity-80"
                  style={{ height: `${(d.count / maxComplaints) * 100}%`, minHeight: '8px' }}
                />
                <span className="text-xs text-gray-500">{new Date(d.week).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Area breakdown */}
      <Card className="p-5">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" /> Area-wise Statistics
        </h3>
        {areaStats.length === 0 ? (
          <EmptyState icon={<MapPin className="w-10 h-10" />} title="No area data" />
        ) : (
          <div className="space-y-3">
            {areaStats.map((a) => (
              <div key={a.area} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{a.area}</span>
                  <span className="text-gray-500">{a.complaints} complaints / {a.pickups} pickups</span>
                </div>
                <div className="flex gap-1 h-3">
                  <div className="flex-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full transition-all"
                      style={{ width: `${(a.complaints / maxAreaComplaints) * 100}%` }}
                    />
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-teal-500 to-green-500 rounded-full transition-all"
                      style={{ width: `${(a.pickups / maxAreaPickups) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className="flex gap-4 text-xs text-gray-500 pt-2">
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-500 rounded" /> Complaints</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 bg-teal-500 rounded" /> Pickups</span>
            </div>
          </div>
        )}
      </Card>

      {/* Top performers all time */}
      <Card className="p-5">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-500" /> All-Time Top Performers
        </h3>
        {topPerformers.length === 0 ? (
          <EmptyState icon={<Award className="w-10 h-10" />} title="No ratings data yet" />
        ) : (
          <div className="space-y-2">
            {topPerformers.map((p, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                  idx === 1 ? 'bg-gray-300 text-gray-700' :
                  idx === 2 ? 'bg-orange-400 text-orange-900' :
                  'bg-gray-100 text-gray-500'
                }`}>{idx + 1}</div>
                <Avatar name={p.name} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.total} ratings</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full" style={{ width: `${(p.avg / 5) * 100}%` }} />
                  </div>
                  <span className="text-sm font-bold text-gray-800">{p.avg.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Bonus history */}
      <Card className="p-5">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <IndianRupee className="w-5 h-5 text-green-600" /> Bonus History
        </h3>
        {bonusHistory.length === 0 ? (
          <EmptyState icon={<IndianRupee className="w-10 h-10" />} title="No bonuses awarded yet" subtitle="Award bonuses from the Top Cleaners tab" />
        ) : (
          <div className="space-y-2">
            {bonusHistory.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar name={b.profiles?.full_name ?? 'Cleaner'} size={36} />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{b.profiles?.full_name ?? 'Unknown'}</p>
                    <p className="text-xs text-gray-500">
                      Week of {new Date(b.week_start).toLocaleDateString('en-IN')} - {b.avg_rating.toFixed(1)} stars, {b.total_pickups} pickups
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-700 flex items-center">
                    <IndianRupee className="w-4 h-4" />{b.bonus_amount.toLocaleString('en-IN')}
                  </p>
                  {b.notes && <p className="text-xs text-gray-500 max-w-32 truncate">{b.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
