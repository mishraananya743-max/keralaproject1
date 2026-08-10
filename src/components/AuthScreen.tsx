import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';
import { Trash2, Users, Shield, User, Phone, Mail, Lock, UserPlus, LogIn } from 'lucide-react';
import type { UserRole } from '@/types';

const roleOptions: { value: UserRole; label: string; icon: typeof Shield; desc: string }[] = [
  { value: 'citizen', label: 'Citizen', icon: User, desc: 'Request pickups & file complaints' },
  { value: 'volunteer', label: 'Society Volunteer', icon: Users, desc: 'Manage schedules & rate cleaners' },
  { value: 'cleaner', label: 'Cleaner', icon: Trash2, desc: 'Receive pickup assignments' },
  { value: 'cco', label: 'Chief Cleaning Officer', icon: Shield, desc: 'Government admin oversight' },
];

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('citizen');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      const { error } = await signUp(email, password, fullName, role, phone);
      if (error) setError(error);
    }
    setBusy(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-72 h-72 bg-teal-400 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-400 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-yellow-400 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Logo size={80} />
          <h1 className="mt-4 text-2xl font-bold text-white">Suchitwa Kerala</h1>
          <p className="text-teal-300 text-sm">Government of Kerala Waste Management</p>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="flex gap-2 mb-6 bg-teal-50 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'signin' ? 'bg-teal-700 text-white shadow-md' : 'text-teal-700 hover:bg-teal-100'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'signup' ? 'bg-teal-700 text-white shadow-md' : 'text-teal-700 hover:bg-teal-100'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Full Name</label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                      placeholder="Enter your full name"
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
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Select Your Role</label>
                  <div className="grid grid-cols-2 gap-2">
                    {roleOptions.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setRole(opt.value)}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            role === opt.value
                              ? 'border-teal-600 bg-teal-50 shadow-sm'
                              : 'border-gray-200 hover:border-teal-300'
                          }`}
                        >
                          <Icon className={`w-5 h-5 mb-1 ${role === opt.value ? 'text-teal-700' : 'text-gray-500'}`} />
                          <div className={`text-sm font-semibold ${role === opt.value ? 'text-teal-800' : 'text-gray-700'}`}>
                            {opt.label}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                  placeholder="Minimum 6 characters"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === 'signin' ? (
                <>
                  <LogIn className="w-4 h-4" /> Sign In
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Create Account
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-4">
            Government of Kerala - Suchitwa Mission
          </p>
        </div>
      </div>
    </div>
  );
}
