import React, { useState } from 'react';
import { useQueue } from '../context/QueueContext';
import {
  X,
  Smartphone,
  Search,
  Clock,
  Users,
  CheckCircle2,
  AlertCircle,
  Bell,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { formatDuration } from '../utils/formatters';

export default function CustomerLiveTrackerModal({ isOpen, onClose, initialTokenNumber = '' }) {
  const { tokens, activeQueue, currentServing } = useQueue();
  const [tokenInput, setTokenInput] = useState(initialTokenNumber);
  const [searchedToken, setSearchedToken] = useState(null);

  if (!isOpen) return null;

  const handleSearch = (e) => {
    e?.preventDefault();
    const query = tokenInput.trim().toUpperCase();
    if (!query) return;

    // Search in current tokens or across all
    const found = tokens.find(t => t.token_number.toUpperCase() === query);
    setSearchedToken(found || { notFound: true, query });
  };

  // If initialTokenNumber was passed, auto-select
  const currentToken = searchedToken && !searchedToken.notFound
    ? tokens.find(t => t.id === searchedToken.id) || searchedToken
    : (initialTokenNumber ? tokens.find(t => t.token_number.toUpperCase() === initialTokenNumber.toUpperCase()) : null);

  const isServing = currentToken?.status === 'IN_SERVICE';
  const isWaiting = currentToken?.status === 'WAITING';
  const isCompleted = currentToken?.status === 'COMPLETED';
  const isCancelled = currentToken?.status === 'CANCELLED';

  const peopleAhead = isWaiting ? Math.max(0, currentToken.position - 1) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 text-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-800 relative animate-scale-up overflow-hidden">
        
        {/* Glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Customer Mobile Live Tracker</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h3>
            <p className="text-xs text-slate-400">
              Live smartphone tracker simulation
            </p>
          </div>
        </div>

        {/* Search input if no token loaded */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
              placeholder="Enter Token # (e.g. CS-011)..."
              className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold uppercase bg-slate-800/80 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors shrink-0"
          >
            Track
          </button>
        </form>

        {/* Result view */}
        {currentToken ? (
          <div className="space-y-5">
            
            {/* Status Card */}
            <div className={`p-6 rounded-2xl border text-center relative overflow-hidden ${
              isServing
                ? 'bg-gradient-to-b from-emerald-950 to-slate-900 border-emerald-500/50 shadow-xl shadow-emerald-950/40 ring-2 ring-emerald-500/30'
                : isWaiting
                ? 'bg-slate-800/60 border-slate-700'
                : isCompleted
                ? 'bg-slate-800/60 border-slate-700'
                : 'bg-rose-950/40 border-rose-800/40'
            }`}>
              
              {isServing && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500 text-slate-950 uppercase tracking-wider mb-2 animate-bounce">
                  <Bell className="w-3.5 h-3.5 fill-current" />
                  <span>It's Your Turn! Please Proceed</span>
                </div>
              )}

              <div className="text-xs uppercase font-medium text-slate-400">Your Token</div>
              <div className="text-5xl font-mono font-black text-white mt-1">
                {currentToken.token_number}
              </div>
              <div className="text-sm font-semibold text-slate-300 mt-1">
                {currentToken.customer_name}
              </div>

              {/* Position Progress Indicator */}
              {isWaiting && (
                <div className="mt-5 pt-4 border-t border-slate-700/60">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span className="font-semibold text-white">Position in Queue:</span>
                    <span className="font-mono font-extrabold text-indigo-400 text-sm">
                      #{currentToken.position}
                    </span>
                  </div>

                  {/* Visual Step Bar */}
                  <div className="w-full bg-slate-700/50 h-2 rounded-full overflow-hidden mb-3">
                    <div
                      style={{ width: `${Math.max(15, 100 - (currentToken.position - 1) * 20)}%` }}
                      className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{peopleAhead} {peopleAhead === 1 ? 'person' : 'people'} ahead</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>~{currentToken.estimated_wait_minutes || 2}m wait</span>
                    </div>
                  </div>
                </div>
              )}

              {isServing && (
                <div className="mt-4 pt-4 border-t border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                  Counter 01 is waiting for you now!
                </div>
              )}

              {isCompleted && (
                <div className="mt-4 pt-4 border-t border-slate-700 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Service Completed. Thank you!</span>
                </div>
              )}

              {isCancelled && (
                <div className="mt-4 pt-4 border-t border-slate-700 text-rose-400 text-xs font-semibold">
                  This token was cancelled.
                </div>
              )}

            </div>

            <div className="text-center text-[11px] text-slate-400">
              Live real-time status. Keeps automatically updated via Server-Sent Events.
            </div>

          </div>
        ) : searchedToken?.notFound ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Token <strong className="font-mono text-white">"{searchedToken.query}"</strong> was not found in active records.
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            Enter a token number above (e.g. <span className="font-mono text-indigo-400">CS-011</span>) to monitor your live place in line.
          </div>
        )}

      </div>
    </div>
  );
}
