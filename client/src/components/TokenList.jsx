import React, { useState, useEffect } from 'react';
import { useQueue } from '../context/QueueContext';
import {
  ArrowUp,
  ArrowDown,
  Play,
  XCircle,
  Clock,
  Search,
  Filter,
  User,
  Phone,
  Ticket,
  AlertCircle,
  MoreVertical,
  CheckCircle2,
  GripVertical,
  Zap,
  Smartphone,
  ShieldAlert
} from 'lucide-react';
import { formatDuration, formatTime, getWaitTimeColor } from '../utils/formatters';

export default function TokenList({ onOpenAddToken, onOpenTicket, onOpenTracker }) {
  const {
    activeQueue,
    tokens,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    moveToken,
    moveToPosition,
    escalateToken,
    serveSpecific,
    cancelToken,
    isLoadingTokens
  } = useQueue();

  const [currentTime, setCurrentTime] = useState(Date.now());
  const [draggedTokenId, setDraggedTokenId] = useState(null);
  const [dragOverPosition, setDragOverPosition] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!activeQueue) return null;

  const waitingTokens = tokens.filter(t => t.status === 'WAITING');
  const maxWaitingPosition = waitingTokens.length;

  const handleCancel = (token) => {
    const reason = prompt(`Reason for cancelling token ${token.token_number} (${token.customer_name}):`, 'Customer requested / Walked out');
    if (reason !== null) {
      cancelToken(token.id, reason || 'Cancelled by manager');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      
      {/* Header & Filter Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Waiting Queue</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {waitingTokens.length} Waiting
              </span>
              <span className="hidden sm:inline-flex text-[11px] font-normal text-slate-400">
                (Drag & drop rows or click ↑ ↓ to reorder)
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Move tokens up or down to adjust priority. Top token can be called to service immediately.
            </p>
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search token # or name..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 mt-4 overflow-x-auto pb-1 text-xs font-semibold">
          {[
            { id: 'ALL', label: 'All Tokens' },
            { id: 'WAITING', label: `Waiting (${waitingTokens.length})` },
            { id: 'IN_SERVICE', label: 'In Service' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'CANCELLED', label: 'Cancelled' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tokens List / Table */}
      {isLoadingTokens && tokens.length === 0 ? (
        <div className="p-12 text-center text-sm text-slate-400">
          Loading queue tokens...
        </div>
      ) : tokens.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Ticket className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">No tokens found</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {statusFilter === 'WAITING'
              ? 'There are currently no customers waiting in this queue. Add a new person to generate a token.'
              : 'No tokens match your search criteria.'}
          </p>
          <button
            onClick={onOpenAddToken}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            Add Person to Queue
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-x-auto">
          {tokens.map((token) => {
            const isWaiting = token.status === 'WAITING';
            const isServing = token.status === 'IN_SERVICE';
            const isCompleted = token.status === 'COMPLETED';
            const isCancelled = token.status === 'CANCELLED';

            // Calculate live wait time
            let waitSeconds = token.wait_time_seconds || 0;
            if (isWaiting && token.created_at) {
              const createdMs = new Date(token.created_at).getTime();
              waitSeconds = Math.max(0, Math.floor((currentTime - createdMs) / 1000));
            }

            const isSlaBreached = isWaiting && waitSeconds > 600; // > 10m
            const isTop = isWaiting && token.position === 1;
            const isBottom = isWaiting && token.position >= maxWaitingPosition;
            const isDragTarget = isWaiting && dragOverPosition === token.position;

            return (
              <div
                key={token.id}
                draggable={isWaiting}
                onDragStart={(e) => {
                  if (!isWaiting) return;
                  setDraggedTokenId(token.id);
                  e.dataTransfer.setData('text/plain', String(token.position));
                }}
                onDragOver={(e) => {
                  if (!isWaiting) return;
                  e.preventDefault();
                  if (dragOverPosition !== token.position) {
                    setDragOverPosition(token.position);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverPosition === token.position) {
                    setDragOverPosition(null);
                  }
                }}
                onDrop={(e) => {
                  if (!isWaiting || !draggedTokenId) return;
                  e.preventDefault();
                  moveToPosition(draggedTokenId, token.position);
                  setDraggedTokenId(null);
                  setDragOverPosition(null);
                }}
                className={`p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all ${
                  isDragTarget
                    ? 'border-t-2 border-indigo-600 bg-indigo-50/80 shadow-inner'
                    : isServing
                    ? 'bg-indigo-50/60 border-l-4 border-l-indigo-600'
                    : isSlaBreached
                    ? 'bg-amber-50/40 border-l-4 border-l-amber-500'
                    : isTop
                    ? 'bg-amber-50/30 hover:bg-amber-50/60'
                    : 'hover:bg-slate-50/70'
                }`}
              >
                {/* Left: Drag Handle, Position Badge, Token #, Customer Details */}
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  
                  {/* Drag Handle */}
                  {isWaiting && (
                    <div
                      className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-600 p-1 -ml-1 transition-colors hidden sm:block"
                      title="Drag to reorder position in queue"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>
                  )}

                  {/* Position Badge (Requirement 4) */}
                  <div className="shrink-0 text-center">
                    {isWaiting ? (
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shadow-sm ${
                        token.position === 1
                          ? 'bg-amber-500 text-white ring-2 ring-amber-300'
                          : token.position === 2
                          ? 'bg-slate-300 text-slate-800'
                          : token.position === 3
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        #{token.position}
                      </span>
                    ) : (
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                        isServing
                          ? 'bg-indigo-600 text-white animate-pulse'
                          : isCompleted
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}>
                        {isServing ? 'LIVE' : isCompleted ? '✓' : '✕'}
                      </span>
                    )}
                  </div>

                  {/* Token Number & Customer Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {token.token_number}
                      </span>
                      <span className="text-sm font-semibold text-slate-800 truncate">
                        {token.customer_name}
                      </span>

                      {/* SLA Breach Alert Tag */}
                      {isSlaBreached && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          <span>SLA &gt; 10m</span>
                        </span>
                      )}

                      {/* Priority Tag */}
                      {token.priority && token.priority !== 'NORMAL' && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                          {token.priority}
                        </span>
                      )}

                      {/* Status Tag */}
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase ${
                        isWaiting
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : isServing
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-200 font-extrabold'
                          : isCompleted
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {token.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>Service: <strong className="text-slate-700 font-medium">{token.service_type || 'General'}</strong></span>
                      {token.customer_phone && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span>{token.customer_phone}</span>
                        </>
                      )}
                      {token.notes && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="italic text-slate-400 truncate max-w-xs">{token.notes}</span>
                        </>
                      )}
                      {token.cancellation_reason && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="text-rose-600 font-medium truncate max-w-xs">Reason: {token.cancellation_reason}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Center: Wait Time & Estimated Wait */}
                <div className="flex items-center gap-4 text-xs shrink-0 pl-11 md:pl-0">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-500">Wait:</span>
                    <span className={`px-2 py-0.5 rounded-md font-mono font-semibold border ${getWaitTimeColor(waitSeconds)}`}>
                      {formatDuration(waitSeconds)}
                    </span>
                  </div>

                  {isWaiting && (
                    <div className="hidden sm:block text-slate-400 text-[11px]">
                      Est: ~{token.estimated_wait_minutes || 1}m
                    </div>
                  )}
                </div>

                {/* Right: Actions (Move UP, Move DOWN, Serve, Cancel, Escalate) */}
                <div className="flex items-center gap-1.5 shrink-0 pl-11 md:pl-0">
                  
                  {/* Quick Escalate to #1 Button (if not already #1) */}
                  {isWaiting && !isTop && (
                    <button
                      onClick={() => escalateToken(token.id)}
                      className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Quick Escalate to Position #1"
                    >
                      <Zap className="w-3.5 h-3.5 fill-current" />
                    </button>
                  )}

                  {/* Requirement 5: Move UP and DOWN in the Queue */}
                  {isWaiting && (
                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                      <button
                        onClick={() => moveToken(token.id, 'UP')}
                        disabled={isTop}
                        title={isTop ? 'Already at top of queue' : 'Move Token UP'}
                        className={`p-1.5 rounded-md transition-colors ${
                          isTop
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-700 hover:text-indigo-600 hover:bg-white shadow-xs'
                        }`}
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-[1px] h-3.5 bg-slate-300" />

                      <button
                        onClick={() => moveToken(token.id, 'DOWN')}
                        disabled={isBottom}
                        title={isBottom ? 'Already at bottom of queue' : 'Move Token DOWN'}
                        className={`p-1.5 rounded-md transition-colors ${
                          isBottom
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-700 hover:text-indigo-600 hover:bg-white shadow-xs'
                        }`}
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Requirement 6: Assign for service */}
                  {isWaiting && (
                    <button
                      onClick={() => serveSpecific(token.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isTop
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                      }`}
                      title="Assign Token for Service"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>{isTop ? 'Serve Next' : 'Serve'}</span>
                    </button>
                  )}

                  {/* Requirement 7: Cancel Token from queue */}
                  {(isWaiting || isServing) && (
                    <button
                      onClick={() => handleCancel(token)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Cancel Token"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}

                  {/* Live Mobile Tracker Launcher */}
                  {onOpenTracker && (
                    <button
                      onClick={() => onOpenTracker(token.token_number)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Open Live Customer Tracker for this Token"
                    >
                      <Smartphone className="w-4 h-4" />
                    </button>
                  )}

                  {/* Ticket Receipt Viewer */}
                  {onOpenTicket && (
                    <button
                      onClick={() => onOpenTicket(token)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="View Digital Ticket Receipt"
                    >
                      <Ticket className="w-4 h-4" />
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
