import { useState, useEffect, useRef, useCallback } from 'react';
import {
  RoomState,
  Participant,
  PlaybackState,
  MediaItem,
  ChatMessage,
  Poll,
  ReactionBurst,
  RoomSettings,
  SyncDiagnostics,
  LatencyMetric
} from '../types/party';

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export function useWatchPartySocket(roomId: string, userProfile: UserProfile) {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('connecting');
  const [recentReaction, setRecentReaction] = useState<ReactionBurst | null>(null);
  const [actionNotification, setActionNotification] = useState<{ message: string; timestamp: number } | null>(null);

  const [diagnostics, setDiagnostics] = useState<SyncDiagnostics>({
    rttMs: 12,
    clockOffsetMs: 0,
    currentDriftMs: 0,
    driftStatus: 'in-sync',
    p50PropagationMs: 15,
    p95PropagationMs: 28,
    p99PropagationMs: 45,
    packetsReceived: 0,
    droppedOrLatePackets: 0,
    history: []
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const propagationHistoryRef = useRef<LatencyMetric[]>([]);

  // Update rolling latency metrics
  const recordLatencyMetric = useCallback((propagationMs: number, action: string) => {
    const newMetric: LatencyMetric = {
      propagationMs: Math.round(propagationMs),
      timestamp: Date.now(),
      action
    };
    const updated = [...propagationHistoryRef.current.slice(-49), newMetric];
    propagationHistoryRef.current = updated;

    const sorted = updated.map(m => m.propagationMs).sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || sorted[0] || 15;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1] || 25;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1] || 35;

    setDiagnostics(prev => ({
      ...prev,
      p50PropagationMs: p50,
      p95PropagationMs: p95,
      p99PropagationMs: p99,
      history: updated,
      packetsReceived: prev.packetsReceived + 1
    }));
  }, []);

  // Update current live drift in diagnostics
  const reportDrift = useCallback((driftMs: number, status: 'in-sync' | 'rate-adjusted' | 'hard-seek') => {
    setDiagnostics(prev => ({
      ...prev,
      currentDriftMs: Math.round(driftMs),
      driftStatus: status
    }));
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    setConnectionStatus(prev => prev === 'disconnected' ? 'reconnecting' : 'connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
      // Join Room
      ws.send(JSON.stringify({
        type: 'join_room',
        roomId: roomId.toUpperCase(),
        user: userProfile
      }));

      // Immediate first ping for NTP sync
      ws.send(JSON.stringify({
        type: 'ping',
        clientSendTime: performance.now()
      }));

      // Start periodic NTP ping loop every 2.5s
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'ping',
            clientSendTime: performance.now(),
            driftMs: diagnostics.currentDriftMs,
            pingMs: diagnostics.rttMs
          }));
        }
      }, 2500);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const receiveTime = performance.now();

        if (data.type === 'pong') {
          const rtt = Math.max(1, receiveTime - data.clientSendTime);
          // Clock skew: serverTime - (now - RTT/2)
          const estimatedServerSendTime = Date.now() - (rtt / 2);
          const clockOffset = data.serverTime - estimatedServerSendTime;

          setDiagnostics(prev => ({
            ...prev,
            rttMs: Math.round(rtt),
            clockOffsetMs: Math.round(clockOffset)
          }));
          return;
        }

        if (data.type === 'sync_full_room') {
          setRoomState(data.room);
          recordLatencyMetric(14, 'initial_sync');
          return;
        }

        if (data.type === 'playback_update') {
          const playback: PlaybackState = data.playback;
          setRoomState(prev => prev ? { ...prev, playback } : null);

          // Calculate control propagation latency if sent by this client
          if (typeof data.originClientTime === 'number') {
            const propagation = receiveTime - data.originClientTime;
            recordLatencyMetric(propagation, playback.lastActionBy.action);
          } else {
            // Received from another user: estimate one-way transit time ~ RTT/2
            recordLatencyMetric(diagnostics.rttMs / 2 + 5, playback.lastActionBy.action);
          }

          // Show action toast notification
          if (playback.lastActionBy) {
            const act = playback.lastActionBy;
            let actText = '';
            if (act.action === 'play') actText = `${act.userName} played the video`;
            else if (act.action === 'pause') actText = `${act.userName} paused the video`;
            else if (act.action === 'seek') actText = `${act.userName} jumped to ${formatTime(playback.currentTime)}`;
            else if (act.action === 'change_media') actText = `${act.userName} switched to ${playback.currentMedia.title}`;

            if (actText) {
              setActionNotification({ message: actText, timestamp: Date.now() });
            }
          }
          return;
        }

        if (data.type === 'participant_joined') {
          setRoomState(prev => prev ? {
            ...prev,
            participants: data.participants
          } : null);
          return;
        }

        if (data.type === 'participant_left') {
          setRoomState(prev => {
            if (!prev) return null;
            return {
              ...prev,
              participants: data.participants,
              hostId: data.newHostId || prev.hostId
            };
          });
          return;
        }

        if (data.type === 'participants_update') {
          setRoomState(prev => prev ? { ...prev, participants: data.participants } : null);
          return;
        }

        if (data.type === 'playlist_update') {
          setRoomState(prev => prev ? { ...prev, playlist: data.playlist } : null);
          return;
        }

        if (data.type === 'new_chat_message') {
          setRoomState(prev => {
            if (!prev) return null;
            // Prevent duplicate message IDs
            if (prev.chatMessages.some(m => m.id === data.message.id)) return prev;
            return {
              ...prev,
              chatMessages: [...prev.chatMessages, data.message]
            };
          });
          return;
        }

        if (data.type === 'chat_reactions_update') {
          setRoomState(prev => {
            if (!prev) return null;
            return {
              ...prev,
              chatMessages: prev.chatMessages.map(m =>
                m.id === data.messageId ? { ...m, reactions: data.reactions } : m
              )
            };
          });
          return;
        }

        if (data.type === 'reaction_burst') {
          setRecentReaction(data.reaction);
          return;
        }

        if (data.type === 'poll_update') {
          setRoomState(prev => {
            if (!prev) return null;
            const updatedPoll: Poll = data.poll;
            const exists = prev.polls.some(p => p.id === updatedPoll.id);
            return {
              ...prev,
              polls: exists
                ? prev.polls.map(p => p.id === updatedPoll.id ? updatedPoll : p)
                : [updatedPoll, ...prev.polls]
            };
          });
          return;
        }

        if (data.type === 'host_transferred') {
          setRoomState(prev => {
            if (!prev) return null;
            return {
              ...prev,
              hostId: data.hostId,
              participants: data.participants || prev.participants.map(p => ({
                ...p,
                isHost: p.id === data.hostId
              }))
            };
          });
          return;
        }

        if (data.type === 'settings_updated') {
          setRoomState(prev => prev ? { ...prev, settings: data.settings } : null);
          return;
        }

        if (data.type === 'error') {
          setActionNotification({ message: data.message, timestamp: Date.now() });
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      // Auto-reconnect with exponential backoff / retry after 2s
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 2000);
    };

    ws.onerror = (err) => {
      console.warn('WebSocket encountered error:', err);
    };
  }, [roomId, userProfile, diagnostics.rttMs, diagnostics.currentDriftMs, recordLatencyMetric]);

  useEffect(() => {
    connect();
    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Actions
  const send = useCallback((payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  const play = useCallback((currentTime: number) => {
    send({ type: 'play', currentTime, clientSendTime: performance.now() });
  }, [send]);

  const pause = useCallback((currentTime: number) => {
    send({ type: 'pause', currentTime, clientSendTime: performance.now() });
  }, [send]);

  const seek = useCallback((currentTime: number) => {
    send({ type: 'seek', currentTime, clientSendTime: performance.now() });
  }, [send]);

  const changeMedia = useCallback((media: MediaItem, startPlaying = true) => {
    send({ type: 'change_media', media, startPlaying, clientSendTime: performance.now() });
  }, [send]);

  const queueMedia = useCallback((media: MediaItem) => {
    send({ type: 'queue_media', media });
  }, [send]);

  const removeQueueMedia = useCallback((mediaId: string) => {
    send({ type: 'remove_queue_media', mediaId });
  }, [send]);

  const reorderQueue = useCallback((playlist: MediaItem[]) => {
    send({ type: 'reorder_queue', playlist });
  }, [send]);

  const playNext = useCallback(() => {
    send({ type: 'play_next' });
  }, [send]);

  const sendChat = useCallback((text: string) => {
    send({ type: 'chat_message', text });
  }, [send]);

  const reactChat = useCallback((messageId: string, emoji: string) => {
    send({ type: 'chat_reaction', messageId, emoji });
  }, [send]);

  const triggerReactionBurst = useCallback((emoji: string, x?: number) => {
    send({ type: 'reaction_burst', emoji, x });
  }, [send]);

  const createPoll = useCallback((question: string, options: string[], mediaIds?: string[]) => {
    send({ type: 'create_poll', question, options, mediaIds });
  }, [send]);

  const votePoll = useCallback((pollId: string, optionId: string) => {
    send({ type: 'vote_poll', pollId, optionId });
  }, [send]);

  const closePoll = useCallback((pollId: string) => {
    send({ type: 'close_poll', pollId });
  }, [send]);

  const transferHost = useCallback((targetUserId: string) => {
    send({ type: 'transfer_host', targetUserId });
  }, [send]);

  const updateSettings = useCallback((settings: Partial<RoomSettings>) => {
    send({ type: 'update_settings', settings });
  }, [send]);

  const simulateVirtualUsers = useCallback((count = 9) => {
    send({ type: 'simulate_virtual_users', count });
  }, [send]);

  return {
    roomState,
    connectionStatus,
    diagnostics,
    recentReaction,
    actionNotification,
    reportDrift,
    play,
    pause,
    seek,
    changeMedia,
    queueMedia,
    removeQueueMedia,
    reorderQueue,
    playNext,
    sendChat,
    reactChat,
    triggerReactionBurst,
    createPoll,
    votePoll,
    closePoll,
    transferHost,
    updateSettings,
    simulateVirtualUsers
  };
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
