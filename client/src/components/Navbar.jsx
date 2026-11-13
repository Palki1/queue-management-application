import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQueue } from '../context/QueueContext';
import {
  Layers,
  BarChart3,
  Tv,
  LogOut,
  User,
  Plus,
  Sparkles,
  RefreshCw,
  Volume2,
  VolumeX,
  Smartphone,
  Keyboard
} from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  onOpenCreateQueue,
  onOpenAddToken,
  onOpenPublicDisplay,
  onOpenTracker,
  onOpenShortcuts
}) {
  const { user, logout, demoLogin, isAuthenticated } = useAuth();
  const {
    isSseConnected,
    refreshTokens,
    refreshQueues,
    isLoadingTokens,
    voiceAnnounceEnabled,
    setVoiceAnnounceEnabled,
    currentCounter,
    setCurrentCounter
  } = useQueue();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshTokens(), refreshQueues()]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/25 text-white">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900">
                  Rugas <span className="text-indigo-600">QueueFlow</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/80 rounded-full">
                  AI Pro
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="hidden sm:inline">Smart Flow Control</span>
                <span className="hidden sm:inline text-slate-300">•</span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <span className={`w-2 h-2 rounded-full ${isSseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                  {isSseConnected ? 'Live Sync' : 'Connecting...'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs (Live Operations vs Analytics) */}
          <div className="hidden md:flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('operations')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'operations'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              Queue Operations
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'analytics'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Analytics & Trends
            </button>
          </div>

          {/* Action Buttons & Manager Profile */}
          <div className="flex items-center gap-2">
            
            {/* Counter Selector */}
            <div className="hidden xl:flex items-center gap-1 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs">
              <span className="text-slate-400 font-medium">Counter:</span>
              <select
                value={currentCounter}
                onChange={(e) => setCurrentCounter(e.target.value)}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="Counter 01">Counter 01</option>
                <option value="Counter 02">Counter 02</option>
                <option value="Counter 03">Counter 03</option>
                <option value="VIP Desk A">VIP Desk A</option>
              </select>
            </div>

            {/* Voice Announcement Toggle */}
            <button
              onClick={() => setVoiceAnnounceEnabled(!voiceAnnounceEnabled)}
              title={voiceAnnounceEnabled ? "Voice Announcements Enabled (TTS)" : "Voice Announcements Muted"}
              className={`p-2 rounded-lg border transition-colors ${
                voiceAnnounceEnabled
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                  : 'bg-slate-100 text-slate-400 border-slate-200'
              }`}
            >
              {voiceAnnounceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Customer Mobile Live Tracker Launcher */}
            <button
              onClick={onOpenTracker}
              title="Customer Live Mobile Tracker"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200/80 rounded-lg border border-slate-200 transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
              <span>Customer Tracker</span>
            </button>

            {/* Public TV / Kiosk Display Modal Launcher */}
            <button
              onClick={onOpenPublicDisplay}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200/80 rounded-lg border border-slate-200 transition-colors"
              title="Launch Public Waiting Room Display"
            >
              <Tv className="w-3.5 h-3.5 text-indigo-600" />
              <span>TV Kiosk</span>
            </button>

            {/* Keyboard Shortcuts Button */}
            <button
              onClick={onOpenShortcuts}
              title="Keyboard Shortcuts Cheat Sheet (?)"
              className="hidden md:inline-flex p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            >
              <Keyboard className="w-4 h-4" />
            </button>

            {/* New Person / Token Button */}
            <button
              onClick={onOpenAddToken}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-lg shadow-sm shadow-indigo-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Person</span>
              <span className="sm:hidden">Add</span>
            </button>

            {/* User Profile / Logout or Demo Login */}
            {isAuthenticated ? (
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                <div className="hidden lg:block text-right">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">{user?.name}</div>
                  <div className="text-[11px] text-slate-400 leading-tight">{user?.email}</div>
                </div>
                <button
                  onClick={logout}
                  title="Logout Manager"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={demoLogin}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Demo Login</span>
              </button>
            )}
          </div>

        </div>

        {/* Mobile Tab Bar */}
        <div className="md:hidden flex items-center justify-around py-2 border-t border-slate-100 text-xs">
          <button
            onClick={() => setActiveTab('operations')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium ${
              activeTab === 'operations' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Operations
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium ${
              activeTab === 'analytics' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Analytics
          </button>
          <button
            onClick={onOpenTracker}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium text-slate-600"
          >
            <Smartphone className="w-3.5 h-3.5" />
            Tracker
          </button>
          <button
            onClick={onOpenPublicDisplay}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium text-slate-600"
          >
            <Tv className="w-3.5 h-3.5" />
            TV Screen
          </button>
        </div>

      </div>
    </header>
  );
}
