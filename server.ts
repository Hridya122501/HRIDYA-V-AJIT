import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { MOVIE_CATALOG } from './src/data/movies';
import {
  RoomState,
  Participant,
  PlaybackState,
  MediaItem,
  ChatMessage,
  Poll,
  ReactionBurst,
  RoomSettings
} from './src/types/party';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT || '3000', 10);

const app = express();
app.use(express.json());

const server = http.createServer(app);

// In-memory room store
const rooms = new Map<string, RoomState>();
// Map ws connection to user session
interface ClientSession {
  ws: WebSocket;
  roomId: string;
  userId: string;
}
const clients = new Map<WebSocket, ClientSession>();

function getOrCreateRoom(roomId: string, roomName?: string): RoomState {
  const normalizedId = roomId.trim().toUpperCase();
  let room = rooms.get(normalizedId);
  if (!room) {
    const starterMedia: MediaItem = MOVIE_CATALOG[0]; // Tears of Steel
    const starterQueue: MediaItem[] = [MOVIE_CATALOG[1], MOVIE_CATALOG[2]]; // Sintel, Big Buck Bunny

    const starterPoll: Poll = {
      id: `poll-${Date.now()}`,
      question: 'What should we watch after Tears of Steel?',
      createdBy: 'system',
      createdByName: 'Room Bot',
      createdAt: Date.now(),
      status: 'active',
      options: [
        { id: 'opt-1', text: 'Sintel: The Dragon Quest (Fantasy)', votes: [], mediaId: 'movie-2' },
        { id: 'opt-2', text: 'Big Buck Bunny (Comedy)', votes: [], mediaId: 'movie-3' },
        { id: 'opt-3', text: 'Neon Odyssey: Tokyo Driftline (Cyberpunk)', votes: [], mediaId: 'movie-6' }
      ]
    };

    const starterPlayback: PlaybackState = {
      currentMedia: starterMedia,
      isPlaying: false,
      currentTime: 0,
      playbackRate: 1.0,
      updatedAt: Date.now(),
      version: 1,
      lastActionBy: {
        userId: 'system',
        userName: 'Host',
        action: 'change_media',
        timestamp: Date.now()
      }
    };

    const defaultSettings: RoomSettings = {
      hostOnlyControl: false,
      allowGuestPolls: true,
      autoPlayNext: true
    };

    const initialMessages: ChatMessage[] = [
      {
        id: `msg-${Date.now()}-1`,
        userId: 'system',
        userName: 'Cinema Concierge',
        userColor: '#38bdf8',
        text: `Welcome to watch room ${normalizedId}! Playback, seeking, and chat are synchronized in real-time.`,
        timestamp: Date.now(),
        isSystem: true
      }
    ];

    room = {
      id: normalizedId,
      name: roomName || `Party ${normalizedId}`,
      hostId: '',
      participants: [],
      playback: starterPlayback,
      playlist: starterQueue,
      polls: [starterPoll],
      chatMessages: initialMessages,
      settings: defaultSettings,
      createdAt: Date.now()
    };

    rooms.set(normalizedId, room);
  }
  return room;
}

function broadcastToRoom(roomId: string, message: any, excludeWs?: WebSocket) {
  const payload = JSON.stringify(message);
  for (const [ws, session] of clients.entries()) {
    if (session.roomId === roomId && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(payload);
      } catch (err) {
        console.error('Failed to send message to client:', err);
      }
    }
  }
}

function calculateAuthoritativeTime(playback: PlaybackState): number {
  if (!playback.isPlaying) {
    return playback.currentTime;
  }
  const elapsedSeconds = (Date.now() - playback.updatedAt) / 1000;
  return Math.max(0, playback.currentTime + elapsedSeconds * playback.playbackRate);
}

// WebSocket setup
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  if (url.pathname === '/ws' || url.pathname.startsWith('/ws')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', (ws) => {
  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      handleClientMessage(ws, data);
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
      try {
        ws.send(JSON.stringify({ type: 'error', message: 'Malformed message format' }));
      } catch {}
    }
  });

  ws.on('close', () => {
    handleClientDisconnect(ws);
  });

  ws.on('error', (err) => {
    console.error('WebSocket client error:', err);
  });
});

function handleClientMessage(ws: WebSocket, msg: any) {
  const now = Date.now();

  // High-precision NTP ping-pong for clock offset & RTT
  if (msg.type === 'ping') {
    ws.send(JSON.stringify({
      type: 'pong',
      clientSendTime: msg.clientSendTime,
      serverTime: now
    }));

    // Update participant ping/drift metrics if provided
    const session = clients.get(ws);
    if (session) {
      const room = rooms.get(session.roomId);
      if (room) {
        const participant = room.participants.find(p => p.id === session.userId);
        if (participant) {
          if (typeof msg.pingMs === 'number') participant.pingMs = msg.pingMs;
          if (typeof msg.driftMs === 'number') participant.driftMs = msg.driftMs;
        }
      }
    }
    return;
  }

  // Join Room
  if (msg.type === 'join_room') {
    const roomId = (msg.roomId || 'MAIN').trim().toUpperCase();
    const user = msg.user;
    if (!user || !user.id) {
      ws.send(JSON.stringify({ type: 'error', message: 'User profile required' }));
      return;
    }

    const room = getOrCreateRoom(roomId, msg.roomName);
    clients.set(ws, { ws, roomId, userId: user.id });

    // Check if host should be assigned
    const isFirstParticipant = room.participants.length === 0 || !room.hostId;
    if (isFirstParticipant) {
      room.hostId = user.id;
    }

    // Add or update participant
    let existingIndex = room.participants.findIndex(p => p.id === user.id);
    const participant: Participant = {
      id: user.id,
      name: user.name || 'Anonymous',
      avatar: user.avatar || '🍿',
      color: user.color || '#38bdf8',
      isHost: room.hostId === user.id,
      connectedAt: now,
      pingMs: 12,
      driftMs: 0
    };

    if (existingIndex >= 0) {
      room.participants[existingIndex] = participant;
    } else {
      room.participants.push(participant);
    }

    // Update current playback time snapshot before sending
    const currentLiveTime = calculateAuthoritativeTime(room.playback);
    const playbackSnapshot: PlaybackState = {
      ...room.playback,
      currentTime: currentLiveTime,
      updatedAt: now
    };
    room.playback = playbackSnapshot;

    // Send complete initial snapshot to joining client
    ws.send(JSON.stringify({
      type: 'sync_full_room',
      room: {
        ...room,
        playback: playbackSnapshot
      },
      serverTime: now
    }));

    // Announce to other participants
    broadcastToRoom(roomId, {
      type: 'participant_joined',
      participant,
      participants: room.participants
    }, ws);

    // Announce join in chat
    const joinMsg: ChatMessage = {
      id: `sys-${now}-${Math.random().toString(36).substring(2, 6)}`,
      userId: 'system',
      userName: 'System',
      userColor: '#94a3b8',
      text: `${participant.name} joined the watch party`,
      timestamp: now,
      isSystem: true
    };
    room.chatMessages.push(joinMsg);
    broadcastToRoom(roomId, { type: 'new_chat_message', message: joinMsg });
    return;
  }

  const session = clients.get(ws);
  if (!session) return;
  const room = rooms.get(session.roomId);
  if (!room) return;

  const currentParticipant = room.participants.find(p => p.id === session.userId);
  const isHost = room.hostId === session.userId;
  const canControl = !room.settings.hostOnlyControl || isHost;

  // Play
  if (msg.type === 'play') {
    if (!canControl) {
      ws.send(JSON.stringify({ type: 'error', message: 'Only the host can control playback' }));
      return;
    }

    const targetTime = typeof msg.currentTime === 'number' ? msg.currentTime : calculateAuthoritativeTime(room.playback);
    room.playback.isPlaying = true;
    room.playback.currentTime = targetTime;
    room.playback.updatedAt = now;
    room.playback.version += 1;
    room.playback.lastActionBy = {
      userId: session.userId,
      userName: currentParticipant?.name || 'Someone',
      action: 'play',
      timestamp: now
    };

    broadcastToRoom(session.roomId, {
      type: 'playback_update',
      playback: room.playback,
      serverTime: now,
      originClientTime: msg.clientSendTime
    });
    return;
  }

  // Pause
  if (msg.type === 'pause') {
    if (!canControl) {
      ws.send(JSON.stringify({ type: 'error', message: 'Only the host can control playback' }));
      return;
    }

    const targetTime = typeof msg.currentTime === 'number' ? msg.currentTime : calculateAuthoritativeTime(room.playback);
    room.playback.isPlaying = false;
    room.playback.currentTime = targetTime;
    room.playback.updatedAt = now;
    room.playback.version += 1;
    room.playback.lastActionBy = {
      userId: session.userId,
      userName: currentParticipant?.name || 'Someone',
      action: 'pause',
      timestamp: now
    };

    broadcastToRoom(session.roomId, {
      type: 'playback_update',
      playback: room.playback,
      serverTime: now,
      originClientTime: msg.clientSendTime
    });
    return;
  }

  // Seek
  if (msg.type === 'seek') {
    if (!canControl) {
      ws.send(JSON.stringify({ type: 'error', message: 'Only the host can seek video' }));
      return;
    }

    const seekTime = Math.max(0, msg.currentTime || 0);
    room.playback.currentTime = seekTime;
    room.playback.updatedAt = now;
    room.playback.version += 1;
    room.playback.lastActionBy = {
      userId: session.userId,
      userName: currentParticipant?.name || 'Someone',
      action: 'seek',
      timestamp: now
    };

    broadcastToRoom(session.roomId, {
      type: 'playback_update',
      playback: room.playback,
      serverTime: now,
      originClientTime: msg.clientSendTime
    });
    return;
  }

  // Change Media
  if (msg.type === 'change_media') {
    if (!canControl) {
      ws.send(JSON.stringify({ type: 'error', message: 'Only the host can change current film' }));
      return;
    }

    const media: MediaItem = msg.media;
    if (!media || !media.url) return;

    room.playback.currentMedia = media;
    room.playback.currentTime = 0;
    room.playback.isPlaying = msg.startPlaying !== false;
    room.playback.updatedAt = now;
    room.playback.version += 1;
    room.playback.lastActionBy = {
      userId: session.userId,
      userName: currentParticipant?.name || 'Someone',
      action: 'change_media',
      timestamp: now
    };

    broadcastToRoom(session.roomId, {
      type: 'playback_update',
      playback: room.playback,
      serverTime: now,
      originClientTime: msg.clientSendTime
    });

    const sysMsg: ChatMessage = {
      id: `sys-${now}`,
      userId: 'system',
      userName: 'System',
      userColor: '#38bdf8',
      text: `${currentParticipant?.name || 'Someone'} queued up: ${media.title}`,
      timestamp: now,
      isSystem: true
    };
    room.chatMessages.push(sysMsg);
    broadcastToRoom(session.roomId, { type: 'new_chat_message', message: sysMsg });
    return;
  }

  // Add to Queue
  if (msg.type === 'queue_media') {
    const media: MediaItem = msg.media;
    if (!media) return;
    room.playlist.push({
      ...media,
      addedBy: currentParticipant?.name || 'Guest'
    });
    broadcastToRoom(session.roomId, {
      type: 'playlist_update',
      playlist: room.playlist
    });

    const sysMsg: ChatMessage = {
      id: `sys-${now}`,
      userId: 'system',
      userName: 'System',
      userColor: '#a855f7',
      text: `Added to playlist: ${media.title}`,
      timestamp: now,
      isSystem: true
    };
    room.chatMessages.push(sysMsg);
    broadcastToRoom(session.roomId, { type: 'new_chat_message', message: sysMsg });
    return;
  }

  // Remove from Queue
  if (msg.type === 'remove_queue_media') {
    if (!canControl) return;
    room.playlist = room.playlist.filter(item => item.id !== msg.mediaId);
    broadcastToRoom(session.roomId, {
      type: 'playlist_update',
      playlist: room.playlist
    });
    return;
  }

  // Reorder Queue
  if (msg.type === 'reorder_queue') {
    if (!canControl) return;
    if (Array.isArray(msg.playlist)) {
      room.playlist = msg.playlist;
      broadcastToRoom(session.roomId, {
        type: 'playlist_update',
        playlist: room.playlist
      });
    }
    return;
  }

  // Play Next from Queue
  if (msg.type === 'play_next') {
    if (!canControl) return;
    if (room.playlist.length > 0) {
      const nextMedia = room.playlist.shift()!;
      room.playback.currentMedia = nextMedia;
      room.playback.currentTime = 0;
      room.playback.isPlaying = true;
      room.playback.updatedAt = now;
      room.playback.version += 1;
      room.playback.lastActionBy = {
        userId: session.userId,
        userName: currentParticipant?.name || 'Host',
        action: 'change_media',
        timestamp: now
      };

      broadcastToRoom(session.roomId, {
        type: 'playback_update',
        playback: room.playback,
        serverTime: now
      });

      broadcastToRoom(session.roomId, {
        type: 'playlist_update',
        playlist: room.playlist
      });
    }
    return;
  }

  // Live Chat
  if (msg.type === 'chat_message') {
    const text = (msg.text || '').trim();
    if (!text) return;

    const chatMsg: ChatMessage = {
      id: `chat-${now}-${Math.random().toString(36).substring(2, 6)}`,
      userId: session.userId,
      userName: currentParticipant?.name || 'Anonymous',
      userColor: currentParticipant?.color || '#38bdf8',
      text,
      timestamp: now,
      reactions: {}
    };

    room.chatMessages.push(chatMsg);
    // Keep max 200 chat messages to prevent unbounded memory
    if (room.chatMessages.length > 200) {
      room.chatMessages.splice(0, room.chatMessages.length - 200);
    }

    broadcastToRoom(session.roomId, {
      type: 'new_chat_message',
      message: chatMsg
    });
    return;
  }

  // Chat Reaction on message
  if (msg.type === 'chat_reaction') {
    const { messageId, emoji } = msg;
    const targetMsg = room.chatMessages.find(m => m.id === messageId);
    if (!targetMsg) return;

    if (!targetMsg.reactions) targetMsg.reactions = {};
    if (!targetMsg.reactions[emoji]) targetMsg.reactions[emoji] = [];

    const existingUserIdx = targetMsg.reactions[emoji].indexOf(session.userId);
    if (existingUserIdx >= 0) {
      // Toggle off
      targetMsg.reactions[emoji].splice(existingUserIdx, 1);
      if (targetMsg.reactions[emoji].length === 0) {
        delete targetMsg.reactions[emoji];
      }
    } else {
      // Add reaction
      targetMsg.reactions[emoji].push(session.userId);
    }

    broadcastToRoom(session.roomId, {
      type: 'chat_reactions_update',
      messageId,
      reactions: targetMsg.reactions
    });
    return;
  }

  // Floating Emoji Reaction Burst over Video
  if (msg.type === 'reaction_burst') {
    const burst: ReactionBurst = {
      id: `burst-${now}-${Math.random().toString(36).substring(2, 6)}`,
      emoji: msg.emoji || '❤️',
      userId: session.userId,
      userName: currentParticipant?.name || 'Anonymous',
      userColor: currentParticipant?.color || '#ec4899',
      x: typeof msg.x === 'number' ? Math.max(10, Math.min(90, msg.x)) : (20 + Math.random() * 60)
    };

    broadcastToRoom(session.roomId, {
      type: 'reaction_burst',
      reaction: burst
    });
    return;
  }

  // Group Polls
  if (msg.type === 'create_poll') {
    if (room.settings.hostOnlyControl && !isHost && !room.settings.allowGuestPolls) {
      ws.send(JSON.stringify({ type: 'error', message: 'Only the host can launch polls' }));
      return;
    }

    const { question, options, mediaIds } = msg;
    if (!question || !Array.isArray(options) || options.length < 2) return;

    const poll: Poll = {
      id: `poll-${now}`,
      question: question.trim(),
      createdBy: session.userId,
      createdByName: currentParticipant?.name || 'Participant',
      createdAt: now,
      status: 'active',
      options: options.map((optText: string, idx: number) => ({
        id: `opt-${idx}-${now}`,
        text: optText.trim(),
        votes: [],
        mediaId: mediaIds && mediaIds[idx] ? mediaIds[idx] : undefined
      }))
    };

    room.polls.unshift(poll);
    broadcastToRoom(session.roomId, {
      type: 'poll_update',
      poll
    });

    const sysMsg: ChatMessage = {
      id: `sys-${now}`,
      userId: 'system',
      userName: 'Poll Bot',
      userColor: '#f59e0b',
      text: `📊 New Poll: "${poll.question}"`,
      timestamp: now,
      isSystem: true
    };
    room.chatMessages.push(sysMsg);
    broadcastToRoom(session.roomId, { type: 'new_chat_message', message: sysMsg });
    return;
  }

  // Vote on Poll
  if (msg.type === 'vote_poll') {
    const { pollId, optionId } = msg;
    const poll = room.polls.find(p => p.id === pollId);
    if (!poll || poll.status !== 'active') return;

    // Remove user vote from any existing options in this poll
    poll.options.forEach(opt => {
      opt.votes = opt.votes.filter(vId => vId !== session.userId);
    });

    // Add vote to chosen option
    const targetOpt = poll.options.find(opt => opt.id === optionId);
    if (targetOpt) {
      targetOpt.votes.push(session.userId);
    }

    broadcastToRoom(session.roomId, {
      type: 'poll_update',
      poll
    });
    return;
  }

  // Close Poll
  if (msg.type === 'close_poll') {
    const { pollId } = msg;
    const poll = room.polls.find(p => p.id === pollId);
    if (!poll) return;
    if (poll.createdBy !== session.userId && !isHost) return;

    poll.status = 'closed';
    // Find winner
    let maxVotes = -1;
    let winnerId: string | undefined;
    poll.options.forEach(opt => {
      if (opt.votes.length > maxVotes) {
        maxVotes = opt.votes.length;
        winnerId = opt.id;
      }
    });
    poll.winnerOptionId = winnerId;

    broadcastToRoom(session.roomId, {
      type: 'poll_update',
      poll
    });

    const winnerOpt = poll.options.find(o => o.id === winnerId);
    const sysMsg: ChatMessage = {
      id: `sys-${now}`,
      userId: 'system',
      userName: 'Poll Bot',
      userColor: '#10b981',
      text: `🏁 Poll Closed! Winner: "${winnerOpt?.text || 'None'}" (${maxVotes} votes)`,
      timestamp: now,
      isSystem: true
    };
    room.chatMessages.push(sysMsg);
    broadcastToRoom(session.roomId, { type: 'new_chat_message', message: sysMsg });
    return;
  }

  // Host Transfer
  if (msg.type === 'transfer_host') {
    if (!isHost) {
      ws.send(JSON.stringify({ type: 'error', message: 'Only current host can transfer host privileges' }));
      return;
    }

    const { targetUserId } = msg;
    const targetParticipant = room.participants.find(p => p.id === targetUserId);
    if (!targetParticipant) return;

    room.hostId = targetUserId;
    room.participants.forEach(p => {
      p.isHost = p.id === targetUserId;
    });

    broadcastToRoom(session.roomId, {
      type: 'host_transferred',
      hostId: targetUserId,
      participants: room.participants
    });

    const sysMsg: ChatMessage = {
      id: `sys-${now}`,
      userId: 'system',
      userName: 'System',
      userColor: '#eab308',
      text: `👑 Host status transferred to ${targetParticipant.name}`,
      timestamp: now,
      isSystem: true
    };
    room.chatMessages.push(sysMsg);
    broadcastToRoom(session.roomId, { type: 'new_chat_message', message: sysMsg });
    return;
  }

  // Room Settings
  if (msg.type === 'update_settings') {
    if (!isHost) {
      ws.send(JSON.stringify({ type: 'error', message: 'Only host can change room settings' }));
      return;
    }
    room.settings = { ...room.settings, ...msg.settings };
    broadcastToRoom(session.roomId, {
      type: 'settings_updated',
      settings: room.settings
    });
    return;
  }

  // Simulate Virtual Concurrent Users (Supports constraint: 10+ concurrent users per room)
  if (msg.type === 'simulate_virtual_users') {
    const count = Math.min(20, Math.max(1, msg.count || 9));
    const sampleNames = ['Maya Lin', 'Kaito Tanaka', 'Elena Rostova', 'Marcus Vance', 'Sofia Chen', 'Devon Thorne', 'Amina Diallo', 'Lucas Silva', 'Chloe Bennett', 'Arjun Mehta'];
    const sampleAvatars = ['🍿', '🎬', '🔥', '✨', '🎧', '👾', '🚀', '⭐', '🍕', '☕'];
    const sampleColors = ['#f43f5e', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6', '#6366f1', '#eab308'];

    // Remove existing virtual users if any or add new ones up to count
    room.participants = room.participants.filter(p => !p.isVirtual);

    for (let i = 0; i < count; i++) {
      const vUser: Participant = {
        id: `v-user-${i + 1}`,
        name: sampleNames[i % sampleNames.length],
        avatar: sampleAvatars[i % sampleAvatars.length],
        color: sampleColors[i % sampleColors.length],
        isHost: false,
        connectedAt: now - Math.floor(Math.random() * 60000),
        pingMs: Math.floor(8 + Math.random() * 25),
        driftMs: Math.floor(Math.random() * 45),
        isVirtual: true
      };
      room.participants.push(vUser);
    }

    broadcastToRoom(session.roomId, {
      type: 'participants_update',
      participants: room.participants
    });

    const sysMsg: ChatMessage = {
      id: `sys-${now}`,
      userId: 'system',
      userName: 'Benchmarking Suite',
      userColor: '#10b981',
      text: `⚡ Concurrency active: ${room.participants.length} concurrent users connected to room ${room.id}`,
      timestamp: now,
      isSystem: true
    };
    room.chatMessages.push(sysMsg);
    broadcastToRoom(session.roomId, { type: 'new_chat_message', message: sysMsg });
    return;
  }
}

function handleClientDisconnect(ws: WebSocket) {
  const session = clients.get(ws);
  if (!session) return;
  clients.delete(ws);

  const room = rooms.get(session.roomId);
  if (!room) return;

  const departingUser = room.participants.find(p => p.id === session.userId);
  room.participants = room.participants.filter(p => p.id !== session.userId);

  let newHostId: string | undefined;
  if (room.hostId === session.userId && room.participants.length > 0) {
    // Pick first real participant or first participant
    const nextHost = room.participants.find(p => !p.isVirtual) || room.participants[0];
    room.hostId = nextHost.id;
    nextHost.isHost = true;
    newHostId = nextHost.id;
  }

  broadcastToRoom(session.roomId, {
    type: 'participant_left',
    participantId: session.userId,
    participants: room.participants,
    newHostId
  });

  if (departingUser) {
    const leaveMsg: ChatMessage = {
      id: `sys-${Date.now()}`,
      userId: 'system',
      userName: 'System',
      userColor: '#94a3b8',
      text: `${departingUser.name} left the room`,
      timestamp: Date.now(),
      isSystem: true
    };
    room.chatMessages.push(leaveMsg);
    broadcastToRoom(session.roomId, { type: 'new_chat_message', message: leaveMsg });
  }
}

// REST helper endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), roomsCount: rooms.size });
});

app.get('/api/rooms/:id', (req, res) => {
  const roomId = req.params.id.toUpperCase();
  const room = rooms.get(roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({
    id: room.id,
    name: room.name,
    participantsCount: room.participants.length,
    currentMedia: room.playback.currentMedia.title,
    isPlaying: room.playback.isPlaying
  });
});

// Mount Vite or static server
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🎬 SyncCinema Server running on http://0.0.0.0:${PORT} (WS on /ws)`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
