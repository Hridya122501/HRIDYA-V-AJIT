export interface MediaItem {
  id: string;
  title: string;
  url: string;
  poster: string;
  duration: number; // in seconds
  synopsis: string;
  genre: string[];
  director: string;
  cast: string[];
  rating: string;
  year: number;
  tags: string[];
  addedBy?: string;
}

export interface PlaybackState {
  currentMedia: MediaItem;
  isPlaying: boolean;
  currentTime: number; // authoritative position in seconds at updatedAt
  playbackRate: number;
  updatedAt: number; // UTC ms timestamp
  version: number; // monotonic sequence counter
  lastActionBy: {
    userId: string;
    userName: string;
    action: 'play' | 'pause' | 'seek' | 'change_media' | 'rate';
    timestamp: number;
  };
}

export interface Participant {
  id: string;
  name: string;
  avatar: string;
  color: string;
  isHost: boolean;
  connectedAt: number;
  pingMs: number;
  driftMs: number;
  isVirtual?: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  reactions?: Record<string, string[]>; // emoji -> array of userIds
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // userIds
  mediaId?: string;
}

export interface Poll {
  id: string;
  question: string;
  createdBy: string;
  createdByName: string;
  createdAt: number;
  options: PollOption[];
  status: 'active' | 'closed';
  winnerOptionId?: string;
}

export interface ReactionBurst {
  id: string;
  emoji: string;
  userId: string;
  userName: string;
  userColor: string;
  x: number; // percentage 10% - 90%
}

export interface RoomSettings {
  hostOnlyControl: boolean;
  allowGuestPolls: boolean;
  autoPlayNext: boolean;
}

export interface RoomState {
  id: string;
  name: string;
  hostId: string;
  participants: Participant[];
  playback: PlaybackState;
  playlist: MediaItem[];
  polls: Poll[];
  chatMessages: ChatMessage[];
  settings: RoomSettings;
  createdAt: number;
}

export interface LatencyMetric {
  propagationMs: number;
  timestamp: number;
  action: string;
}

export interface SyncDiagnostics {
  rttMs: number;
  clockOffsetMs: number;
  currentDriftMs: number;
  driftStatus: 'in-sync' | 'rate-adjusted' | 'hard-seek';
  p50PropagationMs: number;
  p95PropagationMs: number;
  p99PropagationMs: number;
  packetsReceived: number;
  droppedOrLatePackets: number;
  history: LatencyMetric[];
}
