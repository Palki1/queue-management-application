import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useQueue } from '../context/QueueContext';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  Activity,
  Flame,
  Filter
} from 'lucide-react';
import { formatDuration, formatDateTime } from '../utils/formatters';

export default function AnalyticsDashboard() {
  const { queues, activeQueue } = useQueue();

  const [selectedQueueId, setSelectedQueueId] = useState('all');
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load analytics data
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [sumRes, trendRes, distRes, logRes] = await Promise.all([
          api.getAnalyticsOverview(selectedQueueId),
          api.getAnalyticsTrends(selectedQueueId),
          api.getWaitDistribution(selectedQueueId),
          api.getActivityLog(selectedQueueId, 15)
        ]);

        if (sumRes.success) setSummary(sumRes.summary);
        if (trendRes.success) setTrends(trendRes.trends);
        if (distRes.success) setDistribution(distRes.distribution);
        if (logRes.success) setActivityLog(logRes.events);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [selectedQueueId]);

  const maxQueueLength = Math.max(...trends.map(t => t.queue_length), 5);
  const maxWaitMin = Math.max(...trends.map(t => t.avg_wait_minutes), 10);
  const totalDist = distribution.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="space-y-6">
      
      {/* Top Filter Bar & CSV Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <span>Queue Performance & Flow Analytics</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time trends on wait times, queue lengths, and service throughput
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Queue Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedQueueId}
              onChange={(e) => setSelectedQueueId(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Queues Combined</option>
              {queues.map(q => (
                <option key={q.id} value={q.id}>{q.name} ({q.prefix})</option>
              ))}
            </select>
          </div>

          {/* CSV Export Button (Requirement 8) */}
          <a
            href={api.getExportUrl(selectedQueueId)}
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Tokens Card */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Total Issued Today</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {summary?.total_today ?? summary?.total_tokens ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span className="font-semibold text-indigo-600 font-mono">{summary?.waiting_count ?? 0}</span>
            <span>waiting right now</span>
          </div>
        </div>

        {/* Avg Wait Time Card */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Avg Wait Time</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {summary?.avg_wait_minutes ?? 0} <span className="text-base font-semibold text-slate-400">mins</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Peak wait today: <strong className="text-slate-700">{summary?.max_wait_minutes ?? 0} mins</strong>
          </div>
        </div>

        {/* Avg Service Duration Card */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Avg Service Duration</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {summary?.avg_service_minutes ?? 0} <span className="text-base font-semibold text-slate-400">mins</span>
          </div>
          <div className="text-xs text-emerald-600 font-semibold mt-1">
            Target service: &lt; 8 mins
          </div>
        </div>

        {/* Completion vs Abandonment Rate */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Completion Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {summary?.completion_rate ?? 0}%
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Cancelled rate: <strong className="text-rose-600">{summary?.cancellation_rate ?? 0}%</strong>
          </div>
        </div>

      </div>

      {/* Main Charts Grid: Queue Length Trends & Wait Time Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Queue Length Trends (Requirement 8) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>Hourly Queue Length Trends</span>
              </h3>
              <p className="text-xs text-slate-500">
                Number of people waiting in queue across business hours
              </p>
            </div>
            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
              Hourly Curve
            </span>
          </div>

          {/* Responsive SVG Line / Bar Visualization */}
          <div className="h-56 w-full flex items-end gap-2 pt-6 pb-2 px-2 border-b border-slate-100">
            {trends.map((t, idx) => {
              const heightPct = Math.max(8, Math.round((t.queue_length / maxQueueLength) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
                  {/* Tooltip */}
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] rounded px-2 py-1 pointer-events-none whitespace-nowrap z-20 shadow-md">
                    {t.hour}: {t.queue_length} in queue ({t.arrivals} in, {t.completed} served)
                  </div>

                  {/* Bar */}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-indigo-600 to-indigo-400 group-hover:from-indigo-500 group-hover:to-violet-400 transition-all duration-300"
                  />
                  <span className="text-[10px] text-slate-400 font-mono mt-1">
                    {t.hour.split(':')[0]}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3">
            <span>Peak Queue Traffic: ~11:00 AM – 1:00 PM</span>
            <span className="font-semibold text-slate-600">Peak Size: {maxQueueLength} persons</span>
          </div>
        </div>

        {/* Chart 2: Average Wait Time Trends */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Average Wait Time by Hour</span>
              </h3>
              <p className="text-xs text-slate-500">
                Customer wait time (in minutes) before service starts
              </p>
            </div>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md">
              Minutes
            </span>
          </div>

          {/* Responsive SVG Bars */}
          <div className="h-56 w-full flex items-end gap-2 pt-6 pb-2 px-2 border-b border-slate-100">
            {trends.map((t, idx) => {
              const heightPct = Math.max(10, Math.round((t.avg_wait_minutes / maxWaitMin) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
                  <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] rounded px-2 py-1 pointer-events-none whitespace-nowrap z-20 shadow-md">
                    {t.hour}: {t.avg_wait_minutes} mins avg wait
                  </div>

                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[28px] rounded-t-lg bg-gradient-to-t from-amber-500 to-amber-300 group-hover:from-amber-400 group-hover:to-yellow-300 transition-all duration-300"
                  />
                  <span className="text-[10px] text-slate-400 font-mono mt-1">
                    {t.hour.split(':')[0]}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3">
            <span>Average overall wait: <strong>{summary?.avg_wait_minutes || 0}m</strong></span>
            <span>Target: &lt; 10m SLA</span>
          </div>
        </div>

      </div>

      {/* Bottom Grid: Wait Distribution Breakdown & Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Wait Time Distribution (Columns 1-5) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Wait Time Distribution
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Breakdown of customer waiting times
            </p>

            <div className="space-y-3">
              {distribution.map((item, idx) => {
                const pct = totalDist > 0 ? Math.round((item.count / totalDist) * 100) : 0;
                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700">{item.name}</span>
                      <span className="font-mono text-slate-500">{item.count} customers ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        style={{ width: `${pct}%`, backgroundColor: item.color }}
                        className="h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
            <span>Total Measured: {totalDist} customers</span>
            <span className="font-medium text-emerald-600">85% served in under 15 mins</span>
          </div>
        </div>

        {/* Live Activity Audit Feed (Columns 6-12) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <span>Live Event Audit Trail</span>
              </h3>
              <p className="text-xs text-slate-500">
                Chronological log of token creations, moves, services, and cancellations
              </p>
            </div>
          </div>

          {activityLog.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No recent activity recorded yet.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {activityLog.map((log) => {
                let badgeClass = 'bg-slate-100 text-slate-700';
                if (log.event_type.includes('CREATED')) badgeClass = 'bg-blue-50 text-blue-700 border border-blue-200';
                if (log.event_type.includes('SERVED')) badgeClass = 'bg-indigo-50 text-indigo-700 border border-indigo-200';
                if (log.event_type.includes('COMPLETED')) badgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                if (log.event_type.includes('CANCELLED')) badgeClass = 'bg-rose-50 text-rose-700 border border-rose-200';
                if (log.event_type.includes('MOVED') || log.event_type.includes('REORDERED')) badgeClass = 'bg-amber-50 text-amber-700 border border-amber-200';

                return (
                  <div key={log.id} className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${badgeClass}`}>
                          {log.event_type.replace('TOKEN_', '')}
                        </span>
                        <span className="font-semibold text-slate-800">
                          {log.description}
                        </span>
                      </div>
                      {log.queue_name && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Queue: {log.queue_name}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {formatDateTime(log.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
