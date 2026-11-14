import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { sounds } from '../utils/sound';
import confetti from 'canvas-confetti';

const QueueContext = createContext(null);

export function QueueProvider({ children }) {
  const { isAuthenticated } = useAuth();

  const [queues, setQueues] = useState([]);
  const [activeQueue, setActiveQueue] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [currentServing, setCurrentServing] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, WAITING, IN_SERVICE, COMPLETED, CANCELLED
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingQueues, setIsLoadingQueues] = useState(false);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [isSseConnected, setIsSseConnected] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [currentCounter, setCurrentCounter] = useState('Counter 01');
  const [voiceAnnounceEnabled, setVoiceAnnounceEnabled] = useState(true);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Fetch all queues
  const refreshQueues = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setIsLoadingQueues(true);
      const res = await api.getQueues();
      if (res.success && res.queues) {
        setQueues(res.queues);
        // Default to first active queue if none selected
        setActiveQueue(current => {
          if (current) {
            const updated = res.queues.find(q => q.id === current.id);
            return updated || res.queues[0] || null;
          }
          return res.queues[0] || null;
        });
      }
    } catch (err) {
      console.error('Failed to load queues:', err);
    } finally {
      setIsLoadingQueues(false);
    }
  }, [isAuthenticated]);

  // Fetch tokens for active queue
  const refreshTokens = useCallback(async () => {
    if (!activeQueue) return;
    try {
      setIsLoadingTokens(true);
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await api.getTokens(activeQueue.id, params);
      if (res.success) {
        setTokens(res.tokens || []);
        setCurrentServing(res.current_serving || null);
      }
    } catch (err) {
      console.error('Failed to load tokens:', err);
    } finally {
      setIsLoadingTokens(false);
    }
  }, [activeQueue, statusFilter, searchQuery]);

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      refreshQueues();
    } else {
      setQueues([]);
      setActiveQueue(null);
      setTokens([]);
      setCurrentServing(null);
    }
  }, [isAuthenticated, refreshQueues]);

  // Reload tokens whenever active queue, filter, or search changes
  useEffect(() => {
    if (activeQueue) {
      refreshTokens();
    }
  }, [activeQueue, statusFilter, searchQuery, refreshTokens]);

  // Setup Server-Sent Events (SSE) for real-time live synchronization
  useEffect(() => {
    let eventSource = null;

    try {
      const sseUrl = import.meta.env.VITE_API_URL
        ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/events`
        : '/events';
      eventSource = new EventSource(sseUrl);

      eventSource.onopen = () => {
        setIsSseConnected(true);
      };

      eventSource.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          if (event.type === 'CONNECTED') return;

          // Play sound and trigger confetti on service actions
          if (event.type === 'TOKEN_SERVED') {
            const token = event.payload?.token;
            if (voiceAnnounceEnabled && token) {
              sounds.speakAnnouncement(token.token_number, token.customer_name, currentCounter);
            } else {
              sounds.playChime();
            }
          } else if (event.type === 'TOKEN_COMPLETED') {
            sounds.playSuccess();
            confetti({
              particleCount: 40,
              spread: 60,
              origin: { y: 0.6 }
            });
          }

          // Refresh current queue and tokens
          refreshQueues();
          refreshTokens();
        } catch (err) {
          console.error('Error parsing SSE event:', err);
        }
      };

      eventSource.onerror = () => {
        setIsSseConnected(false);
      };
    } catch (err) {
      console.warn('Could not establish SSE connection:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [refreshQueues, refreshTokens]);

  // Actions
  const handleCreateQueue = async (name, prefix, description) => {
    const res = await api.createQueue(name, prefix, description);
    if (res.success) {
      addToast(`Queue "${res.queue.name}" created successfully!`, 'success');
      await refreshQueues();
      setActiveQueue(res.queue);
      return res.queue;
    }
    throw new Error(res.error || 'Failed to create queue');
  };

  const handleAddToken = async (tokenData) => {
    if (!activeQueue) throw new Error('No active queue selected');
    const res = await api.addToken(activeQueue.id, tokenData);
    if (res.success) {
      addToast(`Token ${res.token.token_number} generated for ${res.token.customer_name}!`, 'success');
      await refreshTokens();
      await refreshQueues();
      return res.token;
    }
    throw new Error(res.error || 'Failed to add token');
  };

  const handleMoveToken = async (tokenId, direction) => {
    if (!activeQueue) return;
    try {
      const res = await api.moveToken(activeQueue.id, tokenId, direction);
      if (res.success) {
        addToast(res.message, 'info');
        await refreshTokens();
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleMoveToPosition = async (tokenId, targetPosition) => {
    if (!activeQueue) return;
    try {
      const res = await api.moveToken(activeQueue.id, tokenId, { targetPosition });
      if (res.success) {
        addToast(res.message, 'info');
        await refreshTokens();
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleEscalateToken = async (tokenId) => {
    if (!activeQueue) return;
    try {
      const res = await api.moveToken(activeQueue.id, tokenId, { targetPosition: 1 });
      if (res.success) {
        addToast(`⚡ Token escalated to #1 priority!`, 'success');
        await refreshTokens();
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleServeNext = async () => {
    if (!activeQueue) return;
    try {
      const res = await api.serveNextToken(activeQueue.id);
      if (res.success) {
        sounds.playChime();
        addToast(res.message, 'success');
        await refreshTokens();
        await refreshQueues();
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleServeSpecific = async (tokenId) => {
    if (!activeQueue) return;
    try {
      const res = await api.serveSpecificToken(activeQueue.id, tokenId);
      if (res.success) {
        sounds.playChime();
        addToast(res.message, 'success');
        await refreshTokens();
        await refreshQueues();
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleCompleteToken = async (tokenId) => {
    if (!activeQueue) return;
    try {
      const res = await api.completeToken(activeQueue.id, tokenId);
      if (res.success) {
        sounds.playSuccess();
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
        addToast(`Service completed for ${res.token.token_number}!`, 'success');
        await refreshTokens();
        await refreshQueues();
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleCancelToken = async (tokenId, reason) => {
    if (!activeQueue) return;
    try {
      const res = await api.cancelToken(activeQueue.id, tokenId, reason);
      if (res.success) {
        addToast(`Token ${res.token.token_number} cancelled.`, 'warning');
        await refreshTokens();
        await refreshQueues();
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleDeleteQueue = async (queueId) => {
    try {
      const res = await api.deleteQueue(queueId);
      if (res.success) {
        addToast(res.message, 'success');
        await refreshQueues();
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <QueueContext.Provider value={{
      queues,
      activeQueue,
      tokens,
      currentServing,
      statusFilter,
      searchQuery,
      isLoadingQueues,
      isLoadingTokens,
      isSseConnected,
      toasts,
      setStatusFilter,
      setSearchQuery,
      setActiveQueue,
      refreshQueues,
      refreshTokens,
      currentCounter,
      setCurrentCounter,
      voiceAnnounceEnabled,
      setVoiceAnnounceEnabled,
      createQueue: handleCreateQueue,
      addToken: handleAddToken,
      moveToken: handleMoveToken,
      moveToPosition: handleMoveToPosition,
      escalateToken: handleEscalateToken,
      serveNext: handleServeNext,
      serveSpecific: handleServeSpecific,
      completeToken: handleCompleteToken,
      cancelToken: handleCancelToken,
      deleteQueue: handleDeleteQueue,
      addToast,
      removeToast
    }}>
      {children}
    </QueueContext.Provider>
  );
}

export function useQueue() {
  const ctx = useContext(QueueContext);
  if (!ctx) throw new Error('useQueue must be used within a QueueProvider');
  return ctx;
}
