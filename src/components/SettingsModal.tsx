import React from 'react';
import {
  Sliders,
  Shield,
  Radio,
  X,
  Crown,
  Share2,
  Copy,
  Check,
  Zap,
  Users
} from 'lucide-react';
import { RoomState, RoomSettings } from '../types/party';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomState: RoomState | null;
  currentUserId: string;
  onUpdateSettings: (settings: Partial<RoomSettings>) => void;
  onSimulateUsers: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  roomState,
  currentUserId,
  onUpdateSettings,
  onSimulateUsers
}) => {
  const [copiedLink, setCopiedLink] = React.useState(false);

  if (!isOpen || !roomState) return null;

  const isHost = roomState.hostId === currentUserId;
  const settings = roomState.settings;

  const handleCopyInvite = () => {
    const inviteUrl = `${window.location.origin}/?room=${roomState.id}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-rose-500" />
            <h3 className="text-sm font-bold text-white">Party Room Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 text-xs">
          {/* Room Invite Share */}
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3.5 space-y-2">
            <span className="font-semibold text-zinc-300 block">Invite Friends</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/?room=${roomState.id}`}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-300 font-mono text-[11px] focus:outline-none"
              />
              <button
                onClick={handleCopyInvite}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Permissions Settings */}
          <div className="space-y-3">
            <h4 className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">
              Playback & Moderation
            </h4>

            {/* Host Only Controls Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
              <div className="pr-4">
                <span className="font-medium text-white block">Host-Only Controls</span>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Restricts play, pause, seek, and media switching to the room host.
                </p>
              </div>
              <button
                disabled={!isHost}
                onClick={() => onUpdateSettings({ hostOnlyControl: !settings.hostOnlyControl })}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  !isHost ? 'opacity-40 cursor-not-allowed' : ''
                } ${settings.hostOnlyControl ? 'bg-rose-600 justify-end' : 'bg-zinc-800 justify-start'}`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {/* Allow Guest Polls */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
              <div className="pr-4">
                <span className="font-medium text-white block">Allow Guest Polls</span>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Permits all watch party participants to initiate group voting polls.
                </p>
              </div>
              <button
                disabled={!isHost}
                onClick={() => onUpdateSettings({ allowGuestPolls: !settings.allowGuestPolls })}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  !isHost ? 'opacity-40 cursor-not-allowed' : ''
                } ${settings.allowGuestPolls ? 'bg-rose-600 justify-end' : 'bg-zinc-800 justify-start'}`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {/* Auto Play Next in Queue */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
              <div className="pr-4">
                <span className="font-medium text-white block">Auto-Advance Queue</span>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Automatically plays the next queued film when the current video concludes.
                </p>
              </div>
              <button
                disabled={!isHost}
                onClick={() => onUpdateSettings({ autoPlayNext: !settings.autoPlayNext })}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  !isHost ? 'opacity-40 cursor-not-allowed' : ''
                } ${settings.autoPlayNext ? 'bg-rose-600 justify-end' : 'bg-zinc-800 justify-start'}`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>
          </div>

          {/* Concurrency Stress Test */}
          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
            <div>
              <span className="font-medium text-white block">Concurrent Users Test</span>
              <p className="text-[11px] text-zinc-400">Spawn simulated peers to reach 10+ concurrency</p>
            </div>
            <button
              onClick={() => { onSimulateUsers(); onClose(); }}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-rose-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Simulate 10+</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
