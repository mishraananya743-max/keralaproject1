import { useState, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { Logo } from '@/components/Logo';
import { Avatar } from '@/components/ui';
import { Bell, LogOut, Menu, X } from 'lucide-react';
import type { UserRole } from '@/types';

interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
}

interface LayoutProps {
  activeView: string;
  onViewChange: (v: string) => void;
  navItems: NavItem[];
  children: ReactNode;
}

const roleLabels: Record<UserRole, string> = {
  cco: 'Chief Cleaning Officer',
  cleaner: 'Cleaner',
  volunteer: 'Society Volunteer',
  citizen: 'Citizen',
};

export function Layout({ activeView, onViewChange, navItems, children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const { unreadCount, notifications, markRead, markAllRead } = useNotifications(profile?.id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-teal-900 text-white z-40 transition-transform duration-300 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 border-b border-teal-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={36} />
          </div>
          <button className="lg:hidden text-teal-300" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-teal-800">
          <div className="flex items-center gap-3">
            <Avatar name={profile.full_name} src={profile.avatar_url} size={40} />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{profile.full_name}</p>
              <p className="text-xs text-teal-300">{roleLabels[profile.role]}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onViewChange(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                activeView === item.id
                  ? 'bg-teal-700 text-white border-l-4 border-yellow-400'
                  : 'text-teal-200 hover:bg-teal-800 hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-teal-800">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-teal-200 hover:bg-teal-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-gray-600" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="lg:hidden">
              <Logo size={32} />
            </div>
            <div className="hidden lg:block">
              <h2 className="text-lg font-bold text-gray-800 capitalize">
                {navItems.find((n) => n.id === activeView)?.label ?? 'Dashboard'}
              </h2>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-40 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
                    <h3 className="font-semibold text-gray-800">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-teal-600 hover:text-teal-800 font-medium">
                        Mark all read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm">No notifications yet</div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => markRead(n.id)}
                        className={`w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          !n.is_read ? 'bg-teal-50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {!n.is_read && <div className="w-2 h-2 bg-teal-500 rounded-full mt-1.5 flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">{n.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(n.created_at).toLocaleString('en-IN')}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
