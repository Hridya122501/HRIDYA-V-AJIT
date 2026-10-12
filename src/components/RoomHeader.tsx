import React, { useState } from 'react';
import {
  Film,
  Users,
  Copy,
  Check,
  Activity,
  Sliders,
  Sparkles,
  Crown,
  Share2,
  Zap,
  Wifi,
  WifiOff
} from 'lucide-react';
import { RoomState, SyncDiagnostics } from '../types/party';

interface RoomHeaderProps {
  roomState: RoomState | null;
  currentUserId: string;
  diagnostics: SyncDiagnostics;
  connectionStatus: string;
  onOpenDiscovery: () => void;
  onOpenDiagnostics: () => void;
  onOpenSettings: () => void;
  onSimulateUsers: () => void;
}

export const RoomHeader: React.FC<RoomHeaderProps> = ({
  roomState,
  currentUserId,
  diagnostics,
  connectionStatus,
  onOpenDiscovery,
  onOpenDiagnostics,
  onOpenSettings,
  onSimulateUsers
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!roomState) return null;

  const isHost = roomState.hostId === currentUserId;
  const currentHost = roomState.participants.find(p => p.id === roomState.hostId);
  const participantCount = roomState.participants.length;

  const handleCopyLink = () => {
    const inviteUrl = `${window.location.origin}/?room=${roomState.id}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomState.id);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30 shrink-0">
      {/* Brand & Room Info */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2 text-rose-500 font-bold tracking-tight text-lg shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-900/30">
            <Film className="w-5 h-5" />
          </div>
          <span className="hidden sm:inline bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            SyncCinema
          </span>
        </div>

        <div className="h-5 w-px bg-zinc-800 hidden sm:block" />

        {/* Room Code & Copy */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800/80 rounded-lg px-2.5 py-1 text-xs">
          <span className="text-zinc-400 font-medium">Room:</span>
          <span className="font-mono font-bold text-zinc-100 tracking-wider">{roomState.id}</span>
          <button
            onClick={handleCopyCode}
            title="Copy room code"
            className="text-zinc-400 hover:text-white transition-colors ml-1 p-0.5 rounded cursor-pointer"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Invite Button */}
        <button
          onClick={handleCopyLink}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-rose-400" />}
          <span>{copiedLink ? 'Invite Copied!' : 'Invite Link'}</span>
        </button>

        {/* Active Movie Title */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-zinc-400 truncate max-w-xs">
          <span className="text-zinc-600">·</span>
          <span className="truncate text-zinc-300 font-medium">
            Now: {roomState.playback.currentMedia.title}
          </span>
        </div>
      </div>

      {/* Sync Metrics, Participants & Controls */}
      <div className="flex items-center gap-3">
        {/* Connection & Live Drift Telemetry badge */}
        <button
          onClick={onOpenDiagnostics}
          title="Click to open Latency & Drift Diagnostics"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 text-xs transition-colors cursor-pointer group"
        >
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              diagnostics.driftStatus === 'in-sync' ? 'bg-emerald-400' : 'bg-amber-400'
            }`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              diagnostics.driftStatus === 'in-sync' ? 'bg-emerald-500' : 'bg-amber-500'
            }`} />
          </span>

          <span className="text-zinc-400 font-mono text-[11px] hidden sm:inline">
            <strong className="text-zinc-200 font-semibold">{diagnostics.currentDriftMs}ms</strong> drift
          </span>

          <span className="text-zinc-600 hidden sm:inline">·</span>

          <span className="text-zinc-400 font-mono text-[11px] hidden md:inline">
            <strong className="text-zinc-200 font-semibold">{diagnostics.p95PropagationMs}ms</strong> p95
          </span>

          <Activity className="w-3.5 h-3.5 text-zinc-500 group-hover:text-rose-400 transition-colors" />
        </button>

        {/* Participants count & Avatars */}
        <div className="flex items-center gap-2 text-xs text-zinc-300 bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 rounded-lg">
          <Users className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-semibold text-zinc-100">{participantCount}</span>
          <span className="text-zinc-500 hidden sm:inline">online</span>

          {/* Quick 10 Concurrent Users Sim button if under 10 */}
          {participantCount < 10 && (
            <button
              onClick={onSimulateUsers}
              title="Add 9 simulated concurrent peers to test 10+ user requirement"
              className="ml-1 px-1.5 py-0.5 text-[10px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded cursor-pointer flex items-center gap-1 transition-colors"
            >
              <Zap className="w-2.5 h-2.5" />
              <span>Sim 10+</span>
            </button>
          )}
        </div>

        {/* Host Badge */}
        {isHost ? (
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-amber-400 font-medium bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md">
            <Crown className="w-3 h-3" />
            <span>Host</span>
          </div>
        ) : (
          <div className="hidden xl:flex items-center gap-1 text-[11px] text-zinc-400">
            <span>Host:</span>
            <span className="text-zinc-200 font-medium">{currentHost?.name || 'Assigned'}</span>
          </div>
        )}

        {/* Movie Discovery Button */}
        <button
          onClick={onOpenDiscovery}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-md shadow-rose-950/40 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Browse Movies</span>
          <span className="sm:hidden">Browse</span>
        </button>

        {/* Room Settings Button */}
        <button
          onClick={onOpenSettings}
          title="Room Settings & Controls"
          className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors cursor-pointer"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
