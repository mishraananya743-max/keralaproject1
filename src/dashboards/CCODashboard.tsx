import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, StatCard, Badge, Button, Modal, Avatar, StarRating, EmptyState } from '@/components/ui';
import {
  Users, Trash2, Star, AlertTriangle, TrendingUp, Award, ShieldCheck,
  CheckCircle, Clock, ArrowRight, BarChart3, MapPin,
} from 'lucide-react';
import type { Profile, Complaint, Pickup, Rating } from '@/types';

type TopCleaner = {
  cleaner_id: string;
  cleaner_name: string;
  avg_rating: number;
  total_ratings: number;
  total_pickups: number;
};

export function CCODashboard() {
  const [stats, setStats] = useState({ cleaners: 0, volunteers: 0, citizens: 0, societies: 0, areas: 0 });
  const [topCleaners, setTopCleaners] = useState<TopCleaner[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [recentPickups, setRecentPickups] = useState<Pickup[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [inquiryNotes, setInquiryNotes] = useState('');
  const [inquiryResult, setInquiryResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'cleaners' | 'complaints'>('overview');

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const [cleanersR, volunteersR, citizensR, societiesR, areasR, complaintsR, pickupsR] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'cleaner'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'volunteer'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'citizen'),
      supabase.from('societies').select('id', { count: 'exact', head: true }),
      supabase.from('areas').select('id', { count: 'exact', head: true }),
      supabase.from('complaints').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('pickups').select('*').order('created_at', { ascending: false }).limit(10),
    ]);

    setStats({
      cleaners: cleanersR.count ?? 0,
      volunteers: volunteersR.count ?? 0,
      citizens: citizensR.count ?? 0,
      societies: societiesR.count ?? 0,
      areas: areasR.count ?? 0,
    });
    setComplaints(complaintsR.data as Complaint[] ?? []);
    setRecentPickups(pickupsR.data as Pickup[] ?? []);

    // Load top cleaners by avg rating this week
    const { data: ratingsData } = await supabase
      .from('ratings')
      .select('cleaner_id, rating')
      .gte('week_start', new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));

    if (ratingsData && ratingsData.length > 0) {
      const byCleaner: Record<string, { ratings: number[]; cleaner_id: string }> = {};
      (ratingsData as Rating[]).forEach((r) => {
        if (!byCleaner[r.cleaner_id]) byCleaner[r.cleaner_id] = { ratings: [], cleaner_id: r.cleaner_id };
        byCleaner[r.cleaner_id].ratings.push(r.rating);
      });

      const cleanerIds = Object.keys(byCleaner);
      const { data: cleaners } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', cleanerIds);

      const { data: pickupsData } = await supabase
        .from('pickups')
      .select('cleaner_id')
      .eq('status', 'completed')
      .gte('completed_at', new Date(Date.now() - 7 * 86400000).toISOString());

      const pickupCounts: Record<string, number> = {};
      (pickupsData ?? []).forEach((p: { cleaner_id: string }) => {
        pickupCounts[p.cleaner_id] = (pickupCounts[p.cleaner_id] ?? 0) + 1;
      });

      const top: TopCleaner[] = Object.values(byCleaner).map((c) => {
        const profile = (cleaners as { id: string; full_name: string }[])?.find((p) => p.id === c.cleaner_id);
        return {
          cleaner_id: c.cleaner_id,
          cleaner_name: profile?.full_name ?? 'Unknown',
          avg_rating: c.ratings.reduce((a, b) => a + b, 0) / c.ratings.length,
          total_ratings: c.ratings.length,
          total_pickups: pickupCounts[c.cleaner_id] ?? 0,
        };
      });
      top.sort((a, b) => b.avg_rating - a.avg_rating);
      setTopCleaners(top.slice(0, 5));
    }
  }

  async function handleInquiry(complaint: Complaint, status: 'resolved' | 'rejected') {
    setBusy(true);
    const profile = (await supabase.auth.getUser()).data.user;
    await supabase.from('complaint_inquiries').insert({
      complaint_id: complaint.id,
      inquirer_id: profile?.id,
      inquirer_role: 'cco',
      inquiry_notes: inquiryNotes,
      inquiry_result: inquiryResult || status,
    });

    await supabase.from('complaints').update({
      status,
      resolution_notes: inquiryResult || inquiryNotes,
      resolved_at: new Date().toISOString(),
      resolved_by: profile?.id,
    }).eq('id', complaint.id);

    if (complaint.complainant_id) {
      await supabase.from('notifications').insert({
        user_id: complaint.complainant_id,
        type: status === 'resolved' ? 'complaint_resolved' : 'general',
        title: status === 'resolved' ? 'Complaint Resolved' : 'Complaint Update',
        message: `Your complaint has been ${status}. ${inquiryResult || inquiryNotes}`,
        data: { complaint_id: complaint.id },
      });
    }

    setSelectedComplaint(null);
    setInquiryNotes('');
    setInquiryResult('');
    setBusy(false);
    loadAll();
  }

  async function awardBonus(cleaner: TopCleaner) {
    const amount = prompt(`Enter bonus amount (INR) for ${cleaner.cleaner_name}:`, '5000');
    if (!amount) return;
    const bonusAmount = parseInt(amount, 10);
    if (isNaN(bonusAmount) || bonusAmount <= 0) return;
    setBusy(true);
    const user = (await supabase.auth.getUser()).data.user;
    await supabase.from('bonus_history').insert({
      cleaner_id: cleaner.cleaner_id,
      avg_rating: cleaner.avg_rating,
      total_pickups: cleaner.total_pickups,
      bonus_amount: bonusAmount,
      awarded_by: user?.id,
      notes: `Weekly performance bonus - ${cleaner.avg_rating.toFixed(1)} avg rating, ${cleaner.total_pickups} pickups`,
    });
    await supabase.from('notifications').insert({
      user_id: cleaner.cleaner_id,
      type: 'bonus_awarded',
      title: 'Bonus Awarded!',
      message: `Congratulations! You've been awarded a bonus of INR ${bonusAmount.toLocaleString('en-IN')} for your excellent performance this week. Average rating: ${cleaner.avg_rating.toFixed(1)} stars, ${cleaner.total_pickups} pickups.`,
      data: { avg_rating: cleaner.avg_rating, total_pickups: cleaner.total_pickups, bonus_amount: bonusAmount },
    });
    setBusy(false);
    alert(`Bonus of INR ${bonusAmount.toLocaleString('en-IN')} awarded to ${cleaner.cleaner_name}!`);
  }

  const pendingComplaints = complaints.filter((c) => c.status === 'pending' || c.status === 'under_inquiry');

  return (
    <div className="space-y-6">
      {/* Tab selector */}
      <div className="flex gap-2 bg-white rounded-xl p-1 border border-gray-200 w-fit">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'cleaners', label: 'Top Cleaners', icon: Award },
          { id: 'complaints', label: `Complaints${pendingComplaints.length > 0 ? ` (${pendingComplaints.length})` : ''}`, icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'overview' | 'cleaners' | 'complaints')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id ? 'bg-teal-700 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Trash2 className="w-6 h-6" />} label="Active Cleaners" value={stats.cleaners} color="teal" />
            <StatCard icon={<Users className="w-6 h-6" />} label="Volunteers" value={stats.volunteers} color="blue" />
            <StatCard icon={<ShieldCheck className="w-6 h-6" />} label="Citizens" value={stats.citizens} color="green" />
            <StatCard icon={<MapPin className="w-6 h-6" />} label="Societies" value={stats.societies} subtitle={`${stats.areas} areas`} color="amber" />
          </div>

          {/* Recent pickups + pending complaints */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-600" /> Recent Pickups
              </h3>
              {recentPickups.length === 0 ? (
                <EmptyState icon={<Trash2 className="w-10 h-10" />} title="No pickups yet" />
              ) : (
                <div className="space-y-2">
                  {recentPickups.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Pickup #{p.id.slice(0, 8)}</p>
                        <p className="text-xs text-gray-500">{new Date(p.scheduled_date).toLocaleDateString('en-IN')}</p>
                      </div>
                      <Badge color={
                        p.status === 'completed' ? 'green' :
                        p.status === 'en_route' ? 'blue' :
                        p.status === 'missed' ? 'red' :
                        p.status === 'accepted' ? 'teal' : 'gray'
                      }>
                        {p.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" /> Pending Complaints
              </h3>
              {pendingComplaints.length === 0 ? (
                <EmptyState icon={<CheckCircle className="w-10 h-10" />} title="No pending complaints" subtitle="All complaints resolved" />
              ) : (
                <div className="space-y-2">
                  {pendingComplaints.slice(0, 5).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedComplaint(c); setActiveTab('complaints'); }}
                      className="w-full text-left flex items-center justify-between p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">{c.category.replace('_', ' ')}</p>
                        <p className="text-xs text-gray-500 truncate">{c.description}</p>
                      </div>
                      <Badge color={c.priority === 'urgent' ? 'red' : c.priority === 'high' ? 'orange' : 'amber'}>
                        {c.priority}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {activeTab === 'cleaners' && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" /> Top 5 Cleaners This Week
            </h3>
            <Badge color="teal">Weekly Rankings</Badge>
          </div>

          {topCleaners.length === 0 ? (
            <EmptyState icon={<Star className="w-10 h-10" />} title="No ratings yet this week" subtitle="Ratings will appear once volunteers start rating cleaners" />
          ) : (
            <div className="space-y-3">
              {topCleaners.map((cleaner, idx) => (
                <div
                  key={cleaner.cleaner_id}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    idx === 0 ? 'border-yellow-400 bg-yellow-50' :
                    idx === 1 ? 'border-gray-300 bg-gray-50' :
                    idx === 2 ? 'border-orange-300 bg-orange-50' :
                    'border-gray-200 bg-white'
                  }`}
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                    idx === 1 ? 'bg-gray-300 text-gray-700' :
                    idx === 2 ? 'bg-orange-400 text-orange-900' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {idx + 1}
                  </div>
                  <Avatar name={cleaner.cleaner_name} size={44} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{cleaner.cleaner_name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <StarRating value={Math.round(cleaner.avg_rating)} readOnly size={16} />
                      <span className="text-sm text-gray-600">{cleaner.avg_rating.toFixed(1)} ({cleaner.total_ratings} reviews)</span>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-teal-700">{cleaner.total_pickups} pickups</p>
                    <p className="text-xs text-gray-500">this week</p>
                  </div>
                  <Button size="sm" variant="success" onClick={() => awardBonus(cleaner)} disabled={busy}>
                    <Award className="w-4 h-4" /> Award Bonus
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 p-4 bg-teal-50 rounded-xl border border-teal-200">
            <h4 className="font-semibold text-teal-800 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Promotion Candidates
            </h4>
            <p className="text-sm text-teal-700">
              Top 5 cleaners with highest weekly ratings are eligible for government promotion. Award bonuses to recognize outstanding performance.
            </p>
          </div>
        </Card>
      )}

      {activeTab === 'complaints' && (
        <Card className="p-5">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" /> All Complaints
          </h3>
          {complaints.length === 0 ? (
            <EmptyState icon={<CheckCircle className="w-10 h-10" />} title="No complaints filed" />
          ) : (
            <div className="space-y-3">
              {complaints.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedComplaint(c)}
                  className="w-full text-left flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge color={
                        c.status === 'resolved' ? 'green' :
                        c.status === 'rejected' ? 'red' :
                        c.status === 'under_inquiry' ? 'amber' : 'gray'
                      }>
                        {c.status.replace('_', ' ')}
                      </Badge>
                      <Badge color={c.priority === 'urgent' ? 'red' : c.priority === 'high' ? 'orange' : 'amber'}>
                        {c.priority}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-gray-700 capitalize">{c.category.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-500 truncate">{c.description}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(c.created_at).toLocaleString('en-IN')}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Complaint inquiry modal */}
      <Modal
        open={!!selectedComplaint}
        onClose={() => setSelectedComplaint(null)}
        title="Complaint Inquiry"
        size="lg"
      >
        {selectedComplaint && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Category</p>
                <p className="text-sm font-medium capitalize">{selectedComplaint.category.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Priority</p>
                <Badge color={selectedComplaint.priority === 'urgent' ? 'red' : selectedComplaint.priority === 'high' ? 'orange' : 'amber'}>
                  {selectedComplaint.priority}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <Badge color={
                  selectedComplaint.status === 'resolved' ? 'green' :
                  selectedComplaint.status === 'rejected' ? 'red' :
                  selectedComplaint.status === 'under_inquiry' ? 'amber' : 'gray'
                }>
                  {selectedComplaint.status.replace('_', ' ')}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">Filed</p>
                <p className="text-sm">{new Date(selectedComplaint.created_at).toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Description</p>
              <p className="text-sm text-gray-700 p-3 bg-gray-50 rounded-lg">{selectedComplaint.description}</p>
            </div>

            {selectedComplaint.photo_url && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Attached Photo</p>
                <img src={selectedComplaint.photo_url} alt="Complaint" className="max-h-64 rounded-lg border border-gray-200" />
              </div>
            )}

            {selectedComplaint.status !== 'resolved' && selectedComplaint.status !== 'rejected' && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Inquiry Notes</label>
                  <textarea
                    value={inquiryNotes}
                    onChange={(e) => setInquiryNotes(e.target.value)}
                    rows={3}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                    placeholder="Notes from the inquiry with the cleaner and volunteer..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Resolution</label>
                  <input
                    type="text"
                    value={inquiryResult}
                    onChange={(e) => setInquiryResult(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:-ring-teal-500 outline-none text-sm"
                    placeholder="Resolution summary..."
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="success" onClick={() => handleInquiry(selectedComplaint, 'resolved')} disabled={busy || !inquiryNotes}>
                    <CheckCircle className="w-4 h-4" /> Mark Resolved
                  </Button>
                  <Button variant="danger" onClick={() => handleInquiry(selectedComplaint, 'rejected')} disabled={busy || !inquiryNotes}>
                    Reject Complaint
                  </Button>
                </div>
              </>
            )}

            {selectedComplaint.resolution_notes && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-green-600 font-medium mb-1">Resolution</p>
                <p className="text-sm text-green-800">{selectedComplaint.resolution_notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
