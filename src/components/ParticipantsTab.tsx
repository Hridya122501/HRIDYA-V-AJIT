import React from 'react';
import {
  Users,
  Crown,
  Wifi,
  Shield,
  Zap,
  Radio,
  Sliders,
  Check
} from 'lucide-react';
import { Participant, RoomSettings } from '../types/party';

interface ParticipantsTabProps {
  participants: Participant[];
  currentUserId: string;
  hostId: string;
  settings: RoomSettings;
  onTransferHost: (targetUserId: string) => void;
  onUpdateSettings: (settings: Partial<RoomSettings>) => void;
  onSimulateUsers: () => void;
}

export const ParticipantsTab: React.FC<ParticipantsTabProps> = ({
  participants,
  currentUserId,
  hostId,
  settings,
  onTransferHost,
  onUpdateSettings,
  onSimulateUsers
}) => {
  const isHost = currentUserId === hostId;

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-4 overflow-y-auto space-y-5">
      {/* Header & Concurrency Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-rose-500" />
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Connected Peers ({participants.length})
          </span>
        </div>

        {/* 10 Concurrent Users requirement quick test trigger */}
        <button
          onClick={onSimulateUsers}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
          title="Spawns 9 simulated concurrent participants to verify 10+ user requirement"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{participants.length >= 10 ? 'Resync 10+ Peers' : 'Simulate 10+ Peers'}</span>
        </button>
      </div>

      {/* Room Permission Controls for Host */}
      {isHost && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              Playback Permissions
            </span>
            <span className="text-[10px] text-amber-400/90 font-medium bg-amber-400/10 px-1.5 py-0.5 rounded">
              Host Panel
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-xs text-zinc-200">Host-Only Playback Controls</p>
              <p className="text-[10px] text-zinc-500">Only you can play, pause, seek and change video</p>
            </div>
            <button
              onClick={() => onUpdateSettings({ hostOnlyControl: !settings.hostOnlyControl })}
              className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                settings.hostOnlyControl ? 'bg-rose-600 justify-end' : 'bg-zinc-700 justify-start'
              }`}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-white shadow-md" />
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
            <div>
              <p className="text-xs text-zinc-200">Allow Guest Polls</p>
              <p className="text-[10px] text-zinc-500">Guests can launch new group polls</p>
            </div>
            <button
              onClick={() => onUpdateSettings({ allowGuestPolls: !settings.allowGuestPolls })}
              className={`w-10 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                settings.allowGuestPolls ? 'bg-rose-600 justify-end' : 'bg-zinc-700 justify-start'
              }`}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-white shadow-md" />
            </button>
          </div>
        </div>
      )}

      {/* Active Participants List */}
      <div className="space-y-2">
        {participants.map((p) => {
          const isUserHost = p.id === hostId;
          const isMe = p.id === currentUserId;

          return (
            <div
              key={p.id}
              className={`bg-zinc-900/90 border rounded-xl p-3 flex items-center justify-between gap-3 transition-colors ${
                isMe ? 'border-rose-500/40 bg-rose-950/10' : 'border-zinc-800/80 hover:border-zinc-750'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  style={{ backgroundColor: `${p.color}25`, borderColor: p.color }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg border shrink-0"
                >
                  {p.avatar}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-white truncate">{p.name}</span>
                    {isMe && <span className="text-[10px] text-zinc-500 font-mono">(You)</span>}
                    {isUserHost && (
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded flex items-center gap-1 font-medium">
                        <Crown className="w-2.5 h-2.5" />
                        Host
                      </span>
                    )}
                    {p.isVirtual && (
                      <span className="text-[9px] text-cyan-400 bg-cyan-500/10 px-1 py-0.2 rounded font-mono">
                        Virtual Peer
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono mt-0.5">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {p.pingMs || 12}ms ping
                    </span>
                    <span>·</span>
                    <span>±{p.driftMs || 0}ms drift</span>
                  </div>
                </div>
              </div>

              {/* Host Transfer Action */}
              {isHost && !isUserHost && (
                <button
                  onClick={() => onTransferHost(p.id)}
                  title="Make this user the Room Host"
                  className="text-[11px] text-zinc-400 hover:text-amber-400 bg-zinc-800/80 hover:bg-zinc-800 px-2 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  Make Host
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
