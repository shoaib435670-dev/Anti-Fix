import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Search,
  User,
  Shield,
  LogOut,
  FolderLock,
  Settings,
  Sparkles,
  CheckCheck,
  ChevronDown,
  X,
} from 'lucide-react';
import { AntiFixLogo } from './AntiFixLogo';
import { UserProfile, UserNotification } from '../types';
import { api } from '../lib/api';

interface HeaderProps {
  user: UserProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  notifications: UserNotification[];
  refreshNotifications: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onOpenAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeTab,
  setActiveTab,
  onLogout,
  notifications,
  refreshNotifications,
  searchQuery,
  setSearchQuery,
  onOpenAdmin,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Close menus on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      refreshNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = async (notif: UserNotification) => {
    if (!notif.is_read) {
      await api.markNotificationRead(notif.id);
      refreshNotifications();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div
          id="header-brand-logo"
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-12 h-9 overflow-hidden flex items-center justify-center">
            <img src="/logo.svg" alt="AntiFix" className="w-full h-full object-contain" />
          </div>
          <div className="hidden sm:flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white font-['Space_Grotesk']">
                AntiFix
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                PRO
              </span>
            </div>
            <span className="text-[10px] text-slate-400 tracking-wider uppercase font-mono font-medium -mt-0.5">
              Your PDF. Your Control.
            </span>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md mx-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-global-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search PDF tools, files..."
              className="w-full bg-slate-900/90 border border-slate-800 rounded-full pl-9 pr-8 py-1.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Nav Action Elements */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              id="btn-header-notifications"
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-slate-950 animate-pulse" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60 mt-2 pr-1">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`py-3 px-2 rounded-lg cursor-pointer transition-colors ${
                          notif.is_read
                            ? 'text-slate-400 hover:bg-slate-800/40'
                            : 'text-slate-200 bg-blue-950/20 hover:bg-blue-950/40'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span
                            className={`text-xs font-semibold ${
                              notif.is_read ? 'text-slate-300' : 'text-blue-300'
                            }`}
                          >
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {new Date(notif.created_at).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                          {notif.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              id="btn-header-user-menu"
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all text-left cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm">
                {user.username.slice(0, 2)}
              </div>
              <div className="hidden md:flex flex-col">
                <span className="text-xs font-semibold text-white leading-tight">
                  {user.username}
                </span>
                <span className="text-[10px] text-slate-400">
                  {user.subscriptions.some((s) => s.status === 'active') ? 'Premium Member' : 'Free Member'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-slate-800 mb-1">
                  <p className="text-xs font-semibold text-white truncate">{user.username}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                </div>

                <button
                  id="menu-item-files"
                  type="button"
                  onClick={() => {
                    setActiveTab('my-files');
                    setShowUserMenu(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl font-medium transition-colors ${
                    activeTab === 'my-files'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <FolderLock className="w-4 h-4 text-blue-400" /> My Saved Files
                </button>

                <button
                  id="menu-item-settings"
                  type="button"
                  onClick={() => {
                    setActiveTab('settings');
                    setShowUserMenu(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl font-medium transition-colors ${
                    activeTab === 'settings'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Settings className="w-4 h-4 text-slate-400" /> Account Settings
                </button>

                {/* Admin Panel Link */}
                <button
                  id="menu-item-admin"
                  type="button"
                  onClick={() => {
                    onOpenAdmin();
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl font-medium text-amber-300 hover:bg-amber-950/40 hover:text-amber-200 transition-colors"
                >
                  <Shield className="w-4 h-4 text-amber-400" /> Admin Control Panel
                </button>

                <div className="border-t border-slate-800 my-1" />

                <button
                  id="menu-item-logout"
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl font-medium text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
