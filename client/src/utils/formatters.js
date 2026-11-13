export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0s';
  const sec = Math.round(seconds);
  if (sec < 60) return `${sec}s`;
  const mins = Math.floor(sec / 60);
  const remainingSec = sec % 60;
  if (mins < 60) {
    return remainingSec > 0 ? `${mins}m ${remainingSec}s` : `${mins}m`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

export function formatTime(isoString) {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(isoString) {
  if (!isoString) return '--';
  const date = new Date(isoString);
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getWaitTimeColor(seconds) {
  if (!seconds || seconds < 300) { // < 5 mins
    return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  }
  if (seconds < 900) { // 5 - 15 mins
    return 'text-amber-700 bg-amber-50 border-amber-200';
  }
  return 'text-rose-700 bg-rose-50 border-rose-200'; // > 15 mins
}
