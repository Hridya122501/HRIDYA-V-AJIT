import React, { useState, useEffect } from 'react';
import { Film, Users, Sparkles, ArrowRight, Play, Compass } from 'lucide-react';
import { UserProfile } from '../hooks/useWatchPartySocket';

interface JoinModalProps {
  initialRoomId?: string;
  onJoin: (roomId: string, profile: UserProfile, roomName?: string) => void;
}

const AVATAR_OPTIONS = ['🍿', '🎬', '🚀', '👾', '🎧', '⭐', '🍕', '🐱', '🕶️', '⚡'];
const COLOR_OPTIONS = ['#f43f5e', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

export const JoinModal: React.FC<JoinModalProps> = ({ initialRoomId, onJoin }) => {
  const [tab, setTab] = useState<'create' | 'join'>(initialRoomId ? 'join' : 'create');
  const [roomCode, setRoomCode] = useState(initialRoomId || '');
  const [partyName, setPartyName] = useState('Sci-Fi Movie Night');
  const [userName, setUserName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🍿');
  const [selectedColor, setSelectedColor] = useState('#f43f5e');

  useEffect(() => {
    // Generate random default name if empty
    const randomAdjectives = ['Cosmic', 'Midnight', 'Hyper', 'Velvet', 'Cyber', 'Neon', 'Stellar', 'Golden'];
    const randomNouns = ['Viewer', 'Voyager', 'Pilot', 'Cinephile', 'Nomad', 'Director', 'Ranger'];
    const generated = `${randomAdjectives[Math.floor(Math.random() * randomAdjectives.length)]} ${randomNouns[Math.floor(Math.random() * randomNouns.length)]}`;
    setUserName(generated);
  }, []);

  const handleRoomCodeInput = (val: string) => {
    // If user pasted a full URL like http://localhost:3000/?room=ABC-123
    try {
      if (val.includes('room=')) {
        const url = new URL(val);
        const r = url.searchParams.get('room');
        if (r) {
          setRoomCode(r.toUpperCase());
          return;
        }
      }
    } catch {}
    setRoomCode(val.toUpperCase());
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newRoomCode = `CINE-${Math.floor(100 + Math.random() * 900)}`;
    const profile: UserProfile = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: userName.trim() || 'Cinema Host',
      avatar: selectedAvatar,
      color: selectedColor
    };
    onJoin(newRoomCode, profile, partyName.trim() || `Party ${newRoomCode}`);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    const profile: UserProfile = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: userName.trim() || 'Guest',
      avatar: selectedAvatar,
      color: selectedColor
    };
    onJoin(roomCode.trim().toUpperCase(), profile);
  };

  const handleQuickDemo = () => {
    const profile: UserProfile = {
      id: `user-${Date.now()}`,
      name: 'Alex Rivera',
      avatar: '🍿',
      color: '#f43f5e'
    };
    onJoin('DEMO-MAIN', profile, 'Premiere Room');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-fade-in flex flex-col">
        {/* Modal Banner */}
        <div className="bg-gradient-to-r from-rose-950 via-zinc-900 to-zinc-950 p-6 border-b border-zinc-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-rose-950/50">
            <Film className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">SyncCinema</h2>
            <p className="text-xs text-zinc-400">
              Synchronized watch party with zero-lag control
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/80 p-1">
          <button
            onClick={() => setTab('create')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              tab === 'create'
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Create Room
          </button>
          <button
            onClick={() => setTab('join')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              tab === 'join'
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Join with Code
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {/* User Profile Config */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                Your Display Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                Choose Avatar & Accent Color
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {AVATAR_OPTIONS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setSelectedAvatar(av)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg border cursor-pointer transition-all ${
                      selectedAvatar === av
                        ? 'border-rose-500 bg-rose-500/20 scale-105'
                        : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                      selectedColor === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : 'hover:scale-110 opacity-80'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="h-px bg-zinc-800" />

          {/* Action Tabs */}
          {tab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                  Party Name (Optional)
                </label>
                <input
                  type="text"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="e.g. Friday Movie Marathon"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-semibold shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Launch Watch Party</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                  Enter Room Code or Invite Link
                </label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => handleRoomCodeInput(e.target.value)}
                  placeholder="e.g. CINE-882 or paste invite link"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!roomCode.trim()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Join Party Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Quick Demo Room Launch */}
          <div className="pt-2">
            <button
              onClick={handleQuickDemo}
              className="w-full py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>Instant 1-Click Demo Room</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
