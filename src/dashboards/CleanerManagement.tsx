import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, Button, Badge, Avatar, EmptyState, Modal } from '@/components/ui';
import { Users, MapPin, Plus, Trash2, Building2, UserCheck } from 'lucide-react';
import type { Profile, Area, CleanerArea } from '@/types';

export function CleanerManagement() {
  const [cleaners, setCleaners] = useState<Profile[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [assignments, setAssignments] = useState<CleanerArea[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [selCleaner, setSelCleaner] = useState('');
  const [selArea, setSelArea] = useState('');

  const load = useCallback(async () => {
    const [cleanersR, areasR, assignR] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'cleaner').eq('is_active', true),
      supabase.from('areas').select('*'),
      supabase.from('cleaner_areas').select('*'),
    ]);
    setCleaners(cleanersR.data as Profile[] ?? []);
    setAreas(areasR.data as Area[] ?? []);
    setAssignments(assignR.data as CleanerArea[] ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function assignCleaner() {
    if (!selCleaner || !selArea) return;
    await supabase.from('cleaner_areas').insert({ cleaner_id: selCleaner, area_id: selArea });
    setShowAssign(false);
    setSelCleaner('');
    setSelArea('');
    load();
  }

  async function removeAssignment(id: string) {
    await supabase.from('cleaner_areas').delete().eq('id', id);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Users className="w-6 h-6 text-teal-600" /> Cleaner Management
        </h2>
        <Button onClick={() => setShowAssign(true)}>
          <Plus className="w-4 h-4" /> Assign Cleaner to Area
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-50 rounded-lg"><Users className="w-5 h-5 text-teal-600" /></div>
            <div><p className="text-sm text-gray-500">Total Cleaners</p><p className="text-xl font-bold text-gray-800">{cleaners.length}</p></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg"><MapPin className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Total Areas</p><p className="text-xl font-bold text-gray-800">{areas.length}</p></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg"><UserCheck className="w-5 h-5 text-green-600" /></div>
            <div><p className="text-sm text-gray-500">Assignments</p><p className="text-xl font-bold text-gray-800">{assignments.length}</p></div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg"><Building2 className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-sm text-gray-500">Unassigned</p><p className="text-xl font-bold text-gray-800">{cleaners.filter(c => !assignments.some(a => a.cleaner_id === c.id)).length}</p></div>
          </div>
        </Card>
      </div>

      {/* Cleaners list with their areas */}
      <Card className="p-5">
        <h3 className="font-bold text-gray-800 mb-4">Cleaners & Assigned Areas</h3>
        {cleaners.length === 0 ? (
          <EmptyState icon={<Users className="w-10 h-10" />} title="No cleaners registered" />
        ) : (
          <div className="space-y-3">
            {cleaners.map((c) => {
              const myAreas = assignments.filter((a) => a.cleaner_id === c.id);
              const areaNames = myAreas.map((a) => areas.find((ar) => ar.id === a.area_id)).filter(Boolean);
              return (
                <div key={c.id} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <Avatar name={c.full_name} size={44} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800">{c.full_name}</p>
                    <p className="text-xs text-gray-500">{c.email}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {areaNames.length === 0 ? (
                        <Badge color="gray">No area assigned</Badge>
                      ) : (
                        areaNames.map((a) => {
                          const assignment = myAreas.find((ma) => ma.area_id === a!.id);
                          return (
                            <span key={a!.id} className="inline-flex items-center gap-1 bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full text-xs">
                              <MapPin className="w-3 h-3" /> {a!.name}
                              <button onClick={() => assignment && removeAssignment(assignment.id)} className="text-teal-500 hover:text-red-500 ml-1">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Assign modal */}
      <Modal open={showAssign} onClose={() => setShowAssign(false)} title="Assign Cleaner to Area">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Cleaner</label>
            <select value={selCleaner} onChange={(e) => setSelCleaner(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Select cleaner</option>
              {cleaners.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Area</label>
            <select value={selArea} onChange={(e) => setSelArea(e.target.value)} className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Select area</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}, {a.district}</option>)}
            </select>
          </div>
          <Button onClick={assignCleaner} className="w-full">
            <Plus className="w-4 h-4" /> Assign
          </Button>
        </div>
      </Modal>
    </div>
  );
}
