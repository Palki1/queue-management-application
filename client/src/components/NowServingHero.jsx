import React, { useState, useEffect } from 'react';
import { useQueue } from '../context/QueueContext';
import {
  Bell,
  CheckCircle2,
  Clock,
  UserCheck,
  ArrowRight,
  Sparkles,
  Phone,
  Tag,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { formatDuration } from '../utils/formatters';

export default function NowServingHero({ onOpenAddToken, onOpenTicket }) {
  const {
    activeQueue,
    tokens,
    currentServing,
    currentCounter,
    serveNext,
    completeToken,
    cancelToken
  } = useQueue();

  const [serviceTimerSeconds, setServiceTimerSeconds] = useState(0);

  // Find next waiting token at position #1
  const nextWaitingToken = tokens.find(t => t.status === 'WAITING' && t.position === 1);
  const waitingTokensCount = tokens.filter(t => t.status === 'WAITING').length;

  // Live timer for currently in-service token
  useEffect(() => {
    if (!currentServing || !currentServing.service_started_at) {
      setServiceTimerSeconds(0);
      return;
    }

    const calcElapsed = () => {
      const start = new Date(currentServing.service_started_at).getTime();
      const now = Date.now();
      return Math.max(0, Math.floor((now - start) / 1000));
    };

    setServiceTimerSeconds(calcElapsed());
    const interval = setInterval(() => {
      setServiceTimerSeconds(calcElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [currentServing]);

  if (!activeQueue) return null;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-950/20 relative overflow-hidden">
      {/* Background decorative glow */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        
        {/* Left Side: Currently Serving Desk */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
              Service Desk • {currentCounter || 'Counter 01'} • {activeQueue.name}
            </span>
          </div>

          {currentServing ? (
            <div>
              <div className="flex flex-wrap items-baseline gap-3 mb-2">
                <span className="text-3xl sm:text-5xl font-mono font-extrabold tracking-tight text-white drop-shadow-sm">
                  {currentServing.token_number}
                </span>
                <span className="text-xl sm:text-2xl font-bold text-slate-200">
                  {currentServing.customer_name}
                </span>
                {currentServing.priority && currentServing.priority !== 'NORMAL' && (
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-400 text-slate-950 uppercase tracking-wide">
                    {currentServing.priority}
                  </span>
                )}
              </div>

              {/* Service Details & Live Timer */}
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-300 mb-6">
                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                  <Tag className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Category: {currentServing.service_type || 'General Service'}</span>
                </div>

                {currentServing.customer_phone && (
                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                    <Phone className="w-3.5 h-3.5 text-indigo-300" />
                    <span>{currentServing.customer_phone}</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg font-mono font-bold">
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                  <span>Service Duration: {formatDuration(serviceTimerSeconds)}</span>
                </div>
              </div>

              {/* In-Service Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => completeToken(currentServing.id)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 shadow-lg shadow-emerald-500/30 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Service</span>
                </button>

                <button
                  onClick={() => {
                    const reason = prompt('Reason for cancelling in-service token (e.g. Customer walked away / No-show):');
                    if (reason !== null) {
                      cancelToken(currentServing.id, reason || 'No-show / Walked away');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Cancel / No Show</span>
                </button>

                {onOpenTicket && (
                  <button
                    onClick={() => onOpenTicket(currentServing)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                  >
                    <span>View Ticket</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-2">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-300 mb-2">
                Counter is Ready
              </h3>
              <p className="text-sm text-slate-400 max-w-md">
                No customer is currently being served. Click the button to call the next waiting token to the desk.
              </p>
            </div>
          )}
        </div>

        {/* Right Side: Call Next Button (Requirement 6) */}
        <div className="lg:w-80 shrink-0 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider">Next in Line (#1)</span>
              <span className="font-mono text-indigo-300 font-bold">
                {waitingTokensCount} Waiting
              </span>
            </div>

            {nextWaitingToken ? (
              <div className="mb-4 p-3 bg-white/10 rounded-xl border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-lg text-white">
                    {nextWaitingToken.token_number}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-indigo-500/30 text-indigo-200">
                    Est. Wait: {nextWaitingToken.estimated_wait_minutes || 1}m
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-200 truncate mt-0.5">
                  {nextWaitingToken.customer_name}
                </div>
                <div className="text-xs text-slate-400 truncate">
                  {nextWaitingToken.service_type || 'General Service'}
                </div>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-white/5 rounded-xl border border-dashed border-white/10 text-center text-xs text-slate-400">
                Queue is clear. No waiting tokens.
              </div>
            )}
          </div>

          {/* Simple Button Click: Serve Next Token (Requirement 6) */}
          <button
            onClick={serveNext}
            disabled={!nextWaitingToken}
            className={`w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all ${
              nextWaitingToken
                ? 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 active:scale-[0.98] text-white shadow-lg shadow-indigo-600/40 ring-2 ring-indigo-400/30 cursor-pointer'
                : 'bg-white/10 text-slate-400 cursor-not-allowed border border-white/5'
            }`}
          >
            <Bell className="w-5 h-5 animate-bounce-short" />
            <span>
              {nextWaitingToken
                ? `Call Next: ${nextWaitingToken.token_number}`
                : 'No Tokens Waiting'}
            </span>
            {nextWaitingToken && <ArrowRight className="w-4 h-4 ml-0.5" />}
          </button>
        </div>

      </div>
    </div>
  );
}
