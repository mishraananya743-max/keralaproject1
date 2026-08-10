import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Card, StatCard, Badge, Button, Modal, EmptyState } from '@/components/ui';
import {
  Trash2, Plus, AlertTriangle, MapPin, Truck, Camera, CheckCircle,
  Navigation, Clock, X, Upload, Image as ImageIcon,
} from 'lucide-react';
import type { PickupRequest, Complaint, Area, Society, TruckLocation } from '@/types';

const complaintCategories = [
  { value: 'missed_pickup', label: 'Missed Pickup' },
  { value: 'dirty_area', label: 'Dirty Area' },
  { value: 'rude_behavior', label: 'Rude Behavior' },
  { value: 'damaged_property', label: 'Damaged Property' },
  { value: 'overcharging', label: 'Overcharging' },
  { value: 'other', label: 'Other' },
];

export function CitizenDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'requests' | 'complaints' | 'track'>('requests');
  const [myRequests, setMyRequests] = useState<(PickupRequest & { areas?: Area; societies?: Society })[]>([]);
  const [myComplaints, setMyComplaints] = useState<(Complaint & { areas?: Area; societies?: Society })[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [trucks, setTrucks] = useState<(TruckLocation & { profiles?: { full_name: string } })[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [nearbyAlerted, setNearbyAlerted] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const complaintFileRef = useRef<HTMLInputElement>(null);

  // Request form
  const [reqArea, setReqArea] = useState('');
  const [reqSociety, setReqSociety] = useState('');
  const [reqAddress, setReqAddress] = useState('');
  const [reqWasteType, setReqWasteType] = useState<'general' | 'organic' | 'recyclable' | 'hazardous'>('general');
  const [reqDesc, setReqDesc] = useState('');
  const [reqPhoto, setReqPhoto] = useState<string | null>(null);

  // Complaint form
  const [cmpCategory, setCmpCategory] = useState('missed_pickup');
  const [cmpArea, setCmpArea] = useState('');
  const [cmpDesc, setCmpDesc] = useState('');
  const [cmpPhoto, setCmpPhoto] = useState<string | null>(null);
  const [cmpPriority, setCmpPriority] = useState('normal');

  const load = useCallback(async () => {
    if (!profile) return;
    const [reqR, cmpR, areasR, socR, trucksR] = await Promise.all([
      supabase.from('pickup_requests')
        .select('*, areas(*), societies(*)')
        .eq('requester_id', profile.id)
        .order('created_at', { ascending: false }),
      supabase.from('complaints')
        .select('*, areas(*), societies(*)')
        .eq('complainant_id', profile.id)
        .order('created_at', { ascending: false }),
      supabase.from('areas').select('*'),
      supabase.from('societies').select('*'),
      supabase.from('truck_locations')
        .select('*, profiles!truck_locations_cleaner_id_fkey(full_name)')
        .eq('is_active', true),
    ]);
    setMyRequests(reqR.data as (PickupRequest & { areas: Area; societies: Society })[] ?? []);
    setMyComplaints(cmpR.data as (Complaint & { areas: Area; societies: Society })[] ?? []);
    setAreas(areasR.data as Area[] ?? []);
    setSocieties(socR.data as Society[] ?? []);
    setTrucks(trucksR.data as (TruckLocation & { profiles: { full_name: string } })[] ?? []);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime truck tracking
  useEffect(() => {
    const channel = supabase
      .channel('citizen_trucks')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'truck_locations' },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  // Get user location
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
      },
      null,
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Proximity check - notify when truck comes within 5km or 2km
  useEffect(() => {
    if (userLat == null || userLng == null || trucks.length === 0) return;
    trucks.forEach((truck) => {
      if (!truck.cleaner_id) return;
      const dist = haversine(userLat, userLng, truck.latitude, truck.longitude);
      const key5km = `${truck.cleaner_id}-5km`;
      const key2km = `${truck.cleaner_id}-2km`;
      if (dist <= 2 && !nearbyAlerted.has(key2km)) {
        sendNearbyNotification(truck, '2km');
        setNearbyAlerted((prev) => new Set(prev).add(key2km));
      } else if (dist <= 5 && dist > 2 && !nearbyAlerted.has(key5km)) {
        sendNearbyNotification(truck, '5km');
        setNearbyAlerted((prev) => new Set(prev).add(key5km));
      }
    });
  }, [userLat, userLng, trucks, nearbyAlerted]);

  async function sendNearbyNotification(truck: TruckLocation & { profiles?: { full_name: string } }, range: string) {
    if (!profile) return;
    await supabase.from('notifications').insert({
      user_id: profile.id,
      type: 'truck_nearby',
      title: 'Garbage Truck Nearby!',
      message: `A garbage truck is within ${range} of your location. ${truck.profiles?.full_name ? 'Driver: ' + truck.profiles.full_name + '.' : ''} Please keep your bins ready.`,
      data: { cleaner_id: truck.cleaner_id, range, distance: haversine(userLat!, userLng!, truck.latitude, truck.longitude) },
    });
  }

  async function handlePhotoUpload(file: File, setter: (url: string) => void) {
    if (!profile) return;
    const ext = file.name.split('.').pop();
    const path = `${profile.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('complaints').upload(path, file);
    if (error) {
      // Fallback: use data URL
      const reader = new FileReader();
      reader.onload = () => setter(reader.result as string);
      reader.readAsDataURL(file);
      return;
    }
    const { data } = supabase.storage.from('complaints').getPublicUrl(path);
    setter(data.publicUrl);
  }

  async function submitRequest() {
    if (!profile) return;
    await supabase.from('pickup_requests').insert({
      requester_id: profile.id,
      area_id: reqArea || null,
      society_id: reqSociety || null,
      address: reqAddress,
      waste_type: reqWasteType,
      description: reqDesc,
      photo_url: reqPhoto,
      latitude: userLat,
      longitude: userLng,
    });
    setShowRequestModal(false);
    setReqArea(''); setReqSociety(''); setReqAddress(''); setReqDesc(''); setReqPhoto(''); setReqWasteType('general');
    load();
  }

  async function submitComplaint() {
    if (!profile || !cmpDesc) return;
    await supabase.from('complaints').insert({
      complainant_id: profile.id,
      area_id: cmpArea || null,
      category: cmpCategory,
      description: cmpDesc,
      photo_url: cmpPhoto,
      priority: cmpPriority,
      latitude: userLat,
      longitude: userLng,
    });
    setShowComplaintModal(false);
    setCmpCategory('missed_pickup'); setCmpArea(''); setCmpDesc(''); setCmpPhoto(''); setCmpPriority('normal');
    load();
  }

  const pendingRequests = myRequests.filter((r) => r.status === 'pending' || r.status === 'accepted');
  const activeComplaints = myComplaints.filter((c) => c.status === 'pending' || c.status === 'under_inquiry');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Trash2 className="w-6 h-6" />} label="My Requests" value={myRequests.length} color="teal" />
        <StatCard icon={<Clock className="w-6 h-6" />} label="Pending" value={pendingRequests.length} color="amber" />
        <StatCard icon={<AlertTriangle className="w-6 h-6" />} label="Complaints" value={myComplaints.length} color="red" />
        <StatCard icon={<Truck className="w-6 h-6" />} label="Active Trucks" value={trucks.length} color="blue" subtitle="nearby" />
      </div>

      <div className="flex gap-2 bg-white rounded-xl p-1 border border-gray-200 w-fit flex-wrap">
        {[
          { id: 'requests', label: 'My Requests', icon: Trash2 },
          { id: 'complaints', label: `Complaints${activeComplaints.length > 0 ? ` (${activeComplaints.length})` : ''}`, icon: AlertTriangle },
          { id: 'track', label: 'Track Truck', icon: MapPin },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'requests' | 'complaints' | 'track')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id ? 'bg-teal-700 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'requests' && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-teal-600" /> My Pickup Requests
            </h3>
            <Button size="sm" onClick={() => setShowRequestModal(true)}>
              <Plus className="w-4 h-4" /> New Request
            </Button>
          </div>
          {myRequests.length === 0 ? (
            <EmptyState icon={<Trash2 className="w-10 h-10" />} title="No requests yet" subtitle="Request a garbage pickup for your area" />
          ) : (
            <div className="space-y-3">
              {myRequests.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge color={
                        r.status === 'completed' ? 'green' :
                        r.status === 'accepted' || r.status === 'scheduled' ? 'blue' :
                        r.status === 'rejected' ? 'red' : 'gray'
                      }>
                        {r.status}
                      </Badge>
                      <Badge color="teal">{r.waste_type}</Badge>
                    </div>
                    <p className="text-sm font-medium text-gray-700">{r.address || r.societies?.name || r.areas?.name || 'Pickup request'}</p>
                    {r.description && <p className="text-xs text-gray-500 truncate">{r.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">{new Date(r.created_at).toLocaleString('en-IN')}</p>
                  </div>
                  {r.photo_url && <img src={r.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover ml-2" />}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'complaints' && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" /> My Complaints
            </h3>
            <Button size="sm" variant="danger" onClick={() => setShowComplaintModal(true)}>
              <Plus className="w-4 h-4" /> File Complaint
            </Button>
          </div>
          {myComplaints.length === 0 ? (
            <EmptyState icon={<AlertTriangle className="w-10 h-10" />} title="No complaints filed" subtitle="Report issues with waste collection in your area" />
          ) : (
            <div className="space-y-3">
              {myComplaints.map((c) => (
                <div key={c.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
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
                      <span className="text-sm font-medium capitalize text-gray-700">{c.category.replace('_', ' ')}</span>
                    </div>
                    <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString('en-IN')}</span>
                  </div>
                  <p className="text-sm text-gray-600">{c.description}</p>
                  {c.photo_url && <img src={c.photo_url} alt="Complaint" className="mt-2 max-h-40 rounded-lg border border-gray-200" />}
                  {c.resolution_notes && (
                    <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs text-green-600 font-medium">Resolution</p>
                      <p className="text-sm text-green-800">{c.resolution_notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'track' && (
        <Card className="p-5">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-blue-500" /> Live Truck Tracking
          </h3>

          {/* Map visualization */}
          <div className="relative bg-teal-50 rounded-xl border-2 border-teal-200 h-80 mb-4 overflow-hidden">
            <TruckMap
              trucks={trucks}
              userLat={userLat}
              userLng={userLng}
            />
          </div>

          {/* Truck list */}
          {trucks.length === 0 ? (
            <EmptyState icon={<Truck className="w-10 h-10" />} title="No active trucks" subtitle="Active trucks will appear here for tracking" />
          ) : (
            <div className="space-y-2">
              {trucks.map((t) => {
                const dist = userLat != null && userLng != null
                  ? haversine(userLat, userLng, t.latitude, t.longitude)
                  : null;
                return (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Truck className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{t.profiles?.full_name ?? 'Unknown driver'}</p>
                        <p className="text-xs text-gray-500">
                          {t.latitude.toFixed(4)}, {t.longitude.toFixed(4)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {dist != null && (
                        <>
                          <p className="text-sm font-bold text-teal-700">{dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}</p>
                          <Badge color={dist <= 2 ? 'green' : dist <= 5 ? 'teal' : 'gray'}>
                            {dist <= 2 ? 'Very close!' : dist <= 5 ? 'Nearby' : 'Far'}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 p-4 bg-teal-50 rounded-xl border border-teal-200">
            <p className="text-sm text-teal-700">
              <MapPin className="w-4 h-4 inline mr-1" />
              {userLat != null
                ? `Your location: ${userLat.toFixed(4)}, ${userLng?.toFixed(4)}`
                : 'Enable location services to see distance to trucks and get proximity alerts.'}
            </p>
            <p className="text-xs text-teal-600 mt-1">
              You'll receive notifications when a garbage truck comes within 5km and again at 2km of your location.
            </p>
          </div>
        </Card>
      )}

      {/* Request modal */}
      <Modal open={showRequestModal} onClose={() => setShowRequestModal(false)} title="Request Garbage Pickup">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Area</label>
            <select value={reqArea} onChange={(e) => setReqArea(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Select area</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}, {a.district}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Society (optional)</label>
            <select value={reqSociety} onChange={(e) => setReqSociety(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Select society</option>
              {societies.filter((s) => !reqArea || s.area_id === reqArea).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Address</label>
            <input type="text" value={reqAddress} onChange={(e) => setReqAddress(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" placeholder="Your address..." />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Waste Type</label>
            <select value={reqWasteType} onChange={(e) => setReqWasteType(e.target.value as 'general' | 'organic' | 'recyclable' | 'hazardous')} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500">
              <option value="general">General</option>
              <option value="organic">Organic</option>
              <option value="recyclable">Recyclable</option>
              <option value="hazardous">Hazardous</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Description (optional)</label>
            <textarea value={reqDesc} onChange={(e) => setReqDesc(e.target.value)} rows={2} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" placeholder="Any details about the waste..." />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Photo (optional)</label>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f, setReqPhoto); }} />
            {reqPhoto ? (
              <div className="relative">
                <img src={reqPhoto} alt="" className="max-h-40 rounded-lg border border-gray-200" />
                <button onClick={() => setReqPhoto('')} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()} className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-teal-500 hover:text-teal-600 transition-colors flex items-center justify-center gap-2">
                <Camera className="w-5 h-5" /> Add Photo
              </button>
            )}
          </div>
          <Button onClick={submitRequest} className="w-full">
            <Trash2 className="w-4 h-4" /> Submit Request
          </Button>
        </div>
      </Modal>

      {/* Complaint modal */}
      <Modal open={showComplaintModal} onClose={() => setShowComplaintModal(false)} title="File a Complaint">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Category</label>
            <select value={cmpCategory} onChange={(e) => setCmpCategory(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500">
              {complaintCategories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Area</label>
            <select value={cmpArea} onChange={(e) => setCmpArea(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Select area</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}, {a.district}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Priority</label>
            <select value={cmpPriority} onChange={(e) => setCmpPriority(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
            <textarea value={cmpDesc} onChange={(e) => setCmpDesc(e.target.value)} rows={3} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500" placeholder="Describe the issue in detail..." />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Attach Photo</label>
            <input ref={complaintFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f, setCmpPhoto); }} />
            {cmpPhoto ? (
              <div className="relative">
                <img src={cmpPhoto} alt="" className="max-h-40 rounded-lg border border-gray-200" />
                <button onClick={() => setCmpPhoto('')} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={() => complaintFileRef.current?.click()} className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-teal-500 hover:text-teal-600 transition-colors flex items-center justify-center gap-2">
                <Upload className="w-5 h-5" /> Attach Photo
              </button>
            )}
          </div>
          <Button variant="danger" onClick={submitComplaint} className="w-full">
            <AlertTriangle className="w-4 h-4" /> Submit Complaint
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function TruckMap({
  trucks,
  userLat,
  userLng,
}: {
  trucks: (TruckLocation & { profiles?: { full_name: string } })[];
  userLat: number | null;
  userLng: number | null;
}) {
  if (trucks.length === 0 && userLat == null) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        <div className="text-center">
          <MapPin className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>Enable location to see trucks near you</p>
        </div>
      </div>
    );
  }

  // Calculate bounds for the map
  const allLats = [...trucks.map((t) => t.latitude), ...(userLat != null ? [userLat] : [])];
  const allLngs = [...trucks.map((t) => t.longitude), ...(userLng != null ? [userLng] : [])];
  const minLat = Math.min(...allLats) - 0.01;
  const maxLat = Math.max(...allLats) + 0.01;
  const minLng = Math.min(...allLngs) - 0.01;
  const maxLng = Math.max(...allLngs) + 0.01;
  const latRange = maxLat - minLat || 0.1;
  const lngRange = maxLng - minLng || 0.1;

  function project(lat: number, lng: number) {
    const x = ((lng - minLng) / lngRange) * 100;
    const y = ((maxLat - lat) / latRange) * 100;
    return { x, y };
  }

  return (
    <div className="relative w-full h-full">
      {/* Grid background */}
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(rgba(13, 148, 136, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(13, 148, 136, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />

      {/* Roads */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#94a3b8" strokeWidth="3" opacity="0.4" />
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#94a3b8" strokeWidth="3" opacity="0.4" />
        <line x1="0" y1="25%" x2="100%" y2="75%" stroke="#94a3b8" strokeWidth="2" opacity="0.3" />
      </svg>

      {/* User location */}
      {userLat != null && userLng != null && (() => {
        const { x, y } = project(userLat, userLng);
        return (
          <div className="absolute -translate-x-1/2 -translate-y-1/2 z-10" style={{ left: `${x}%`, top: `${y}%` }}>
            <div className="relative">
              <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg" />
              <div className="absolute inset-0 w-4 h-4 bg-blue-500 rounded-full animate-ping opacity-75" />
            </div>
            <p className="text-xs font-medium text-blue-700 mt-1 whitespace-nowrap">You</p>
          </div>
        );
      })()}

      {/* Trucks */}
      {trucks.map((t) => {
        const { x, y } = project(t.latitude, t.longitude);
        const dist = userLat != null && userLng != null ? haversine(userLat, userLng, t.latitude, t.longitude) : null;
        return (
          <div key={t.id} className="absolute -translate-x-1/2 -translate-y-1/2 z-20" style={{ left: `${x}%`, top: `${y}%` }}>
            <div className={`p-2 rounded-full shadow-lg ${dist != null && dist <= 2 ? 'bg-green-500' : dist != null && dist <= 5 ? 'bg-teal-500' : 'bg-gray-500'}`}>
              <Truck className="w-4 h-4 text-white" />
            </div>
            {/* Proximity circles */}
            {dist != null && dist <= 5 && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-teal-400 rounded-full opacity-30 animate-pulse" />
            )}
            <p className="text-xs font-medium text-gray-700 mt-1 whitespace-nowrap bg-white/80 px-1 rounded">
              {t.profiles?.full_name?.split(' ')[0] ?? 'Truck'}
              {dist != null && ` (${dist.toFixed(1)}km)`}
            </p>
          </div>
        );
      })}

      {/* Legend */}
      <div className="absolute bottom-2 right-2 bg-white/90 rounded-lg p-2 text-xs space-y-1">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded-full" /> Your location
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded-full" /> Truck (≤2km)
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-teal-500 rounded-full" /> Truck (≤5km)
        </div>
      </div>
    </div>
  );
}
