import React from 'react';
import { useQueue } from '../context/QueueContext';
import { Plus, Users, Clock, Trash2, CheckCircle2 } from 'lucide-react';

export default function QueueSelector({ onOpenCreateQueue }) {
  const { queues, activeQueue, setActiveQueue, deleteQueue } = useQueue();

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Service Queues</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 border border-slate-200">
              {queues.length} Available
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Select a queue to view live waiting tokens, reorder, or call to service
          </p>
        </div>

        {/* Create Queue Button */}
        <button
          onClick={onOpenCreateQueue}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors w-fit"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Queue</span>
        </button>
      </div>

      {/* Queue Cards / Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {queues.map((q) => {
          const isSelected = activeQueue?.id === q.id;

          return (
            <div
              key={q.id}
              onClick={() => setActiveQueue(q)}
              className={`group relative p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                isSelected
                  ? 'bg-gradient-to-br from-indigo-50/90 via-white to-indigo-50/40 border-indigo-400 shadow-sm ring-2 ring-indigo-500/20'
                  : 'bg-slate-50/50 hover:bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded-md ${
                    isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {q.prefix}
                  </span>
                  <h3 className={`text-sm font-semibold truncate ${isSelected ? 'text-indigo-950 font-bold' : 'text-slate-800'}`}>
                    {q.name}
                  </h3>
                </div>

                {/* Queue status & delete button */}
                <div className="flex items-center gap-1">
                  {queues.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Are you sure you want to delete queue "${q.name}"?`)) {
                          deleteQueue(q.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity rounded"
                      title="Delete Queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600 ring-4 ring-indigo-100" />
                  )}
                </div>
              </div>

              {q.description && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                  {q.description}
                </p>
              )}

              {/* Mini Metrics on Card */}
              <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2.5 border-t border-slate-200/60">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Waiting:</span>
                  <span className={`font-bold ${q.waiting_count > 0 ? 'text-indigo-600' : 'text-slate-700'}`}>
                    {q.waiting_count}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Avg Wait:</span>
                  <span className="font-semibold text-slate-700">
                    {q.avg_wait_minutes > 0 ? `${q.avg_wait_minutes}m` : '< 1m'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
