import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AuthScreen } from '@/components/AuthScreen';
import { Layout } from '@/components/Layout';
import { CCODashboard } from '@/dashboards/CCODashboard';
import { CCOAnalytics } from '@/dashboards/CCOAnalytics';
import { CleanerManagement } from '@/dashboards/CleanerManagement';
import { CleanerDashboard } from '@/dashboards/CleanerDashboard';
import { VolunteerDashboard } from '@/dashboards/VolunteerDashboard';
import { CitizenDashboard } from '@/dashboards/CitizenDashboard';
import { WasteGuide } from '@/dashboards/WasteGuide';
import { ProfilePage } from '@/dashboards/ProfilePage';
import { Logo } from '@/components/Logo';
import {
  BarChart3, Award, AlertTriangle, Trash2, Clock, Star, MapPin,
  Calendar, Building2, User, Users, PieChart, Settings, Recycle,
} from 'lucide-react';
import type { UserRole } from '@/types';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-teal-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Logo size={64} />
        <div className="w-8 h-8 border-3 border-teal-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-teal-300 text-sm">Loading Suchitwa Kerala...</p>
      </div>
    </div>
  );
}

const navByRole: Record<UserRole, { id: string; label: string; icon: React.ReactNode }[]> = {
  cco: [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <PieChart className="w-5 h-5" /> },
    { id: 'cleaners', label: 'Top Cleaners', icon: <Award className="w-5 h-5" /> },
    { id: 'manage', label: 'Cleaner Mgmt', icon: <Users className="w-5 h-5" /> },
    { id: 'complaints', label: 'Complaints', icon: <AlertTriangle className="w-5 h-5" /> },
    { id: 'guide', label: 'Waste Guide', icon: <Recycle className="w-5 h-5" /> },
    { id: 'profile', label: 'Profile', icon: <Settings className="w-5 h-5" /> },
  ],
  cleaner: [
    { id: 'pickups', label: 'My Pickups', icon: <Trash2 className="w-5 h-5" /> },
    { id: 'schedule', label: 'Schedule', icon: <Clock className="w-5 h-5" /> },
    { id: 'ratings', label: 'My Ratings', icon: <Star className="w-5 h-5" /> },
    { id: 'guide', label: 'Waste Guide', icon: <Recycle className="w-5 h-5" /> },
    { id: 'profile', label: 'Profile', icon: <Settings className="w-5 h-5" /> },
  ],
  volunteer: [
    { id: 'schedules', label: 'Schedules', icon: <Calendar className="w-5 h-5" /> },
    { id: 'rate', label: 'Rate Cleaners', icon: <Star className="w-5 h-5" /> },
    { id: 'societies', label: 'My Societies', icon: <Building2 className="w-5 h-5" /> },
    { id: 'guide', label: 'Waste Guide', icon: <Recycle className="w-5 h-5" /> },
    { id: 'profile', label: 'Profile', icon: <Settings className="w-5 h-5" /> },
  ],
  citizen: [
    { id: 'requests', label: 'My Requests', icon: <Trash2 className="w-5 h-5" /> },
    { id: 'complaints', label: 'Complaints', icon: <AlertTriangle className="w-5 h-5" /> },
    { id: 'track', label: 'Track Truck', icon: <MapPin className="w-5 h-5" /> },
    { id: 'guide', label: 'Waste Guide', icon: <Recycle className="w-5 h-5" /> },
    { id: 'profile', label: 'Profile', icon: <Settings className="w-5 h-5" /> },
  ],
};

function DashboardRouter() {
  const { profile, loading } = useAuth();
  const [activeView, setActiveView] = useState('');

  if (loading) return <LoadingScreen />;
  if (!profile) return <AuthScreen />;

  const navItems = navByRole[profile.role] ?? navByRole.citizen;
  const currentView = activeView || navItems[0].id;

  let content: React.ReactNode;
  if (currentView === 'guide') {
    content = <WasteGuide />;
  } else if (currentView === 'profile') {
    content = <ProfilePage />;
  } else {
    switch (profile.role) {
      case 'cco':
        if (currentView === 'analytics') content = <CCOAnalytics />;
        else if (currentView === 'manage') content = <CleanerManagement />;
        else content = <CCODashboard />;
        break;
      case 'cleaner':
        content = <CleanerDashboard />;
        break;
      case 'volunteer':
        content = <VolunteerDashboard />;
        break;
      default:
        content = <CitizenDashboard />;
    }
  }

  return (
    <Layout activeView={currentView} onViewChange={setActiveView} navItems={navItems}>
      {content}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <DashboardRouter />
    </AuthProvider>
  );
}

export default App;
