'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Bell,
  Sparkles,
  UserCheck,
  LogOut,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';

interface NavbarProps {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  allUsers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>;
}

export default function Navbar({ currentUser, allUsers }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchNotifications();
  }, [currentUser]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSwitchUser = async (userId: string) => {
    try {
      const res = await fetch('/api/auth/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowUserMenu(false);
        // Redirect to their default view
        if (data.user.role === 'OWNER') router.push('/owner');
        else if (data.user.role === 'MANAGER') router.push('/manager');
        else if (data.user.role === 'OPERATIONS') router.push('/operations');
        else router.push('/executor');
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllAsRead: true }),
    });
    setUnreadCount(0);
    fetchNotifications();
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'MANAGER':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'OPERATIONS':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'COORDINATOR':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-rose-100 text-rose-800 border-rose-300';
    }
  };

  const getRoleDisplayName = (user: { name?: string; role: string }) => {
    if (user.role === 'OWNER') return 'Director';
    if (user.role === 'COORDINATOR') return 'Coordinator';
    if (user.role === 'OPERATIONS') return 'Operations';
    if (user.role === 'MANAGER') return 'Manager';
    if (user.name === 'Amna') return 'Lead';
    return user.role;
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 via-pink-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-200 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="font-serif font-bold text-lg tracking-tight text-slate-900 group-hover:text-rose-600 transition-colors">
                  Hira Ali Beauty
                </span>
                <span className="hidden sm:inline-block text-xs font-medium text-slate-500 ml-2 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                  Outreach CRM
                </span>
              </div>
            </Link>
          </div>

          {/* Quick Role Switcher Pill (Convenience for testing Humza, Zain, Fatima, etc.) */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all text-sm font-medium text-slate-700 shadow-sm"
              title="Click to switch role / user"
            >
              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700">
                {currentUser.name.charAt(0)}
              </div>
              <span className="font-semibold text-slate-900">{currentUser.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${getRoleBadge(currentUser.role)}`}>
                {getRoleDisplayName(currentUser)}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Switch Active User / Role
                  </p>
                </div>
                <div className="max-h-72 overflow-y-auto py-1">
                  {allUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleSwitchUser(u.id)}
                      className={`w-full text-left px-4 py-2 flex items-center justify-between text-sm hover:bg-rose-50 transition-colors ${
                        u.id === currentUser.id ? 'bg-slate-50 font-bold text-rose-700' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 border text-slate-700 flex items-center justify-center text-xs font-semibold">
                          {u.name.charAt(0)}
                        </div>
                        <span>{u.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getRoleBadge(u.role)}`}>
                        {getRoleDisplayName(u)}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-slate-100 pt-1 mt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Actions: Notifications & Logout */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-3 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100">
                    <span className="font-semibold text-sm text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-xs text-rose-600 hover:text-rose-700 font-medium"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3.5 transition-colors ${
                            !n.read ? 'bg-rose-50/50' : 'bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {n.type === 'warning' ? (
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            ) : n.type === 'success' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            ) : (
                              <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-slate-900">{n.title}</p>
                              <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                              <p className="text-[10px] text-slate-400 mt-1">
                                {new Date(n.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
