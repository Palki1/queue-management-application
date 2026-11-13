import React from 'react';
import { useQueue } from '../context/QueueContext';
import {
  Sparkles,
  AlertTriangle,
  Users,
  Clock,
  Zap,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Flame
} from 'lucide-react';
import { formatDuration } from '../utils/formatters';

export default function AIQueueAdvisor() {
  const { activeQueue, tokens, escalateToken } = useQueue();

  if (!activeQueue) return null;

  const waitingTokens = tokens.filter(t => t.status === 'WAITING');
  const waitingCount = waitingTokens.length;

  // Identify SLA breaches (> 10 minutes wait time, 600s)
  const currentTime = Date.now();
  const slaBreachedTokens = waitingTokens.filter(t => {
    if (!t.created_at) return false;
    const elapsedSec = (currentTime - new Date(t.created_at).getTime()) / 1000;
    return elapsedSec > 600; // 10 minutes SLA
  });

  // Calculate congestion score
  let congestionLevel = 'LOW';
  let congestionColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  let staffingTip = 'Current 1 desk is sufficient to maintain < 5m wait SLA.';

  if (waitingCount >= 6) {
    congestionLevel = 'HIGH SURGE';
    congestionColor = 'text-rose-700 bg-rose-50 border-rose-200';
    staffingTip = 'Queue congestion high. Recommend opening Counter 02 to prevent SLA breaches.';
  } else if (waitingCount >= 3) {
    congestionLevel = 'MODERATE';
    congestionColor = 'text-amber-700 bg-amber-50 border-amber-200';
    staffingTip = 'Moderate traffic. Average service time ~5m. Throughput is balanced.';
  }

  return (
    <div className="bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/60 rounded-2xl p-4 sm:p-5 border border-indigo-200/80 shadow-sm relative overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left: AI Header & Insights */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/25">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span>AI Queue Copilot & Smart Flow Insights</span>
              </h4>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${congestionColor}`}>
                {congestionLevel} LOAD
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-xl">
              <strong>Smart Staffing Insight:</strong> {staffingTip}
            </p>
          </div>
        </div>

        {/* Right: SLA Warnings or Quick Stats */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {slaBreachedTokens.length > 0 ? (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-300/80 px-3 py-1.5 rounded-xl text-xs text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
              <span>
                <strong className="font-bold">{slaBreachedTokens.length}</strong> {slaBreachedTokens.length === 1 ? 'token' : 'tokens'} &gt; 10m SLA:
              </span>
              <button
                onClick={() => escalateToken(slaBreachedTokens[0].id)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 transition-all shadow-xs"
                title="Escalate longest waiting customer to #1"
              >
                <Zap className="w-3 h-3 fill-current" />
                <span>Escalate {slaBreachedTokens[0].token_number}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>Target SLA: &lt; 10m</span>
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Zero SLA Breaches</span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
