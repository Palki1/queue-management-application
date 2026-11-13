import React, { useState, useEffect } from 'react';
import { useQueue } from '../context/QueueContext';
import {
  X,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Tv,
  Bell,
  Clock,
  Layers
} from 'lucide-react';
import { sounds } from '../utils/sound';

export default function PublicDisplayModal({ isOpen, onClose }) {
  const { activeQueue, queues, setActiveQueue, tokens, currentServing, currentCounter } = useQueue();
  const [clock, setClock] = useState(new Date());
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isOpen) return null;

  const waitingTokens = tokens.filter(t => t.status === 'WAITING').slice(0, 6);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col overflow-hidden select-none animate-fade-in">
      
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">
              Rugas QueueFlow <span className="text-indigo-400">TV Display</span>
            </h1>
            <p className="text-xs text-slate-400">
              Lobby & Waiting Area Live Monitor
            </p>
          </div>
        </div>

        {/* Queue Switcher Dropdown */}
        <div className="flex items-center gap-3">
          <select
            value={activeQueue?.id || ''}
            onChange={(e) => {
              const selected = queues.find(q => q.id === Number(e.target.value));
              if (selected) setActiveQueue(selected);
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 rounded-lg focus:outline-none"
          >
            {queues.map(q => (
              <option key={q.id} value={q.id}>{q.name} ({q.prefix})</option>
            ))}
          </select>

          {/* Sound & Voice test button */}
          <button
            onClick={() => {
              sounds.speakAnnouncement('CS-010', 'Sarah Jenkins', currentCounter || 'Counter 01');
            }}
            title="Test Voice Announcement (Ding-Dong + Speech)"
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <Bell className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Test Voice</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Modal */}
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Display Area */}
      <div className="flex-1 p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Side: Massive NOW SERVING Box (Columns 1-7) */}
        <div className="lg:col-span-7 flex flex-col justify-between bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border-2 border-indigo-500/30 rounded-3xl p-8 lg:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <span className="text-sm lg:text-base font-extrabold tracking-widest uppercase text-emerald-400">
                NOW SERVING • {currentCounter ? currentCounter.toUpperCase() : 'COUNTER 01'}
              </span>
            </div>

            <h2 className="text-lg text-slate-300 font-semibold mb-6">
              {activeQueue?.name || 'Main Service Queue'}
            </h2>

            {currentServing ? (
              <div className="my-6">
                <div className="text-7xl sm:text-9xl font-mono font-black tracking-tight text-white drop-shadow-md">
                  {currentServing.token_number}
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-indigo-300 mt-4 truncate">
                  {currentServing.customer_name}
                </div>
                <div className="text-base text-slate-400 mt-2 font-medium">
                  {currentServing.service_type || 'General Service'}
                </div>
              </div>
            ) : (
              <div className="my-16 text-center lg:text-left">
                <div className="text-5xl lg:text-6xl font-mono font-bold text-slate-600">
                  READY
                </div>
                <p className="text-lg text-slate-400 mt-4">
                  Please wait. Next token will appear shortly.
                </p>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-slate-800 flex items-center justify-between text-sm text-slate-400">
            <span>Please proceed to Counter 01 when called</span>
            <div className="flex items-center gap-2 text-indigo-400 font-medium">
              <Bell className="w-4 h-4 animate-bounce" />
              <span>Chime will announce next token</span>
            </div>
          </div>
        </div>

        {/* Right Side: Upcoming Waiting Queue (Columns 8-12) */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8 shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-base lg:text-lg font-bold text-slate-200 uppercase tracking-wider">
                Up Next in Queue
              </h3>
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 font-mono font-bold text-xs rounded-full">
                {waitingTokens.length} Next
              </span>
            </div>

            {waitingTokens.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-sm">
                No tokens currently waiting.
              </div>
            ) : (
              <div className="space-y-3">
                {waitingTokens.map((token, idx) => (
                  <div
                    key={token.id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      idx === 0
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                        : 'bg-slate-800/60 border-slate-700 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs ${
                        idx === 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-slate-300'
                      }`}>
                        #{token.position}
                      </span>
                      <div>
                        <div className="font-mono font-bold text-base text-white">
                          {token.token_number}
                        </div>
                        <div className="text-xs text-slate-400 truncate max-w-[140px] sm:max-w-[200px]">
                          {token.customer_name}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-semibold text-indigo-400">
                        {token.service_type || 'General'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        ~{token.estimated_wait_minutes || 1}m wait
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clock & Footer Info */}
          <div className="pt-6 border-t border-slate-800 flex items-center justify-between text-slate-400 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span className="font-mono font-semibold text-white text-sm">
                {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <div>
              {clock.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
