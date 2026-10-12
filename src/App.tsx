import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  ListVideo,
  BarChart3,
  Users,
  Compass,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Activity,
  Sliders
} from 'lucide-react';
import { useWatchPartySocket, UserProfile } from './hooks/useWatchPartySocket';
import { useDriftCorrection } from './hooks/useDriftCorrection';
import { RoomHeader } from './components/RoomHeader';
import { VideoPlayer } from './components/VideoPlayer';
import { ChatTab } from './components/ChatTab';
import { PlaylistTab } from './components/PlaylistTab';
import { PollsTab } from './components/PollsTab';
import { ParticipantsTab } from './components/ParticipantsTab';
import { DiscoveryTab } from './components/DiscoveryTab';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { SettingsModal } from './components/SettingsModal';
import { JoinModal } from './components/JoinModal';
import { MediaItem } from './types/party';

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'playlist' | 'polls' | 'participants' | 'discovery'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Check URL query parameters for invite link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setRoomId(roomParam.toUpperCase());
    }
  }, []);

  // Safe fallback profile if user joins
  const currentProfile = userProfile || {
    id: 'user-default',
    name: 'Viewer',
    avatar: '🍿',
    color: '#f43f5e'
  };

  const {
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
  } = useWatchPartySocket(roomId || '', currentProfile);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const {
    handleUserPlay,
    handleUserPause,
    handleUserSeek
  } = useDriftCorrection({
    videoRef,
    playbackState: roomState?.playback || null,
    clockOffsetMs: diagnostics.clockOffsetMs,
    reportDrift,
    onLocalPlay: play,
    onLocalPause: pause,
    onLocalSeek: seek
  });

  const handleJoinRoom = (targetRoomId: string, profile: UserProfile, roomName?: string) => {
    setUserProfile(profile);
    setRoomId(targetRoomId.toUpperCase());
    // Update browser URL query param without full reload
    const newUrl = `${window.location.pathname}?room=${targetRoomId.toUpperCase()}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  if (!roomId || !userProfile) {
    return (
      <div className="h-screen w-screen bg-zinc-950 text-white flex flex-col font-sans">
        <JoinModal
          initialRoomId={roomId || undefined}
          onJoin={handleJoinRoom}
        />
      </div>
    );
  }

  const isHost = roomState?.hostId === userProfile.id;
  const canControl = !roomState?.settings.hostOnlyControl || isHost;
  const unreadPolls = roomState?.polls.filter(p => p.status === 'active' && !p.options.some(o => o.votes.includes(userProfile.id))).length || 0;

  return (
    <div className="h-screen w-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden font-sans select-none">
      {/* Top Application Header */}
      <RoomHeader
        roomState={roomState}
        currentUserId={userProfile.id}
        diagnostics={diagnostics}
        connectionStatus={connectionStatus}
        onOpenDiscovery={() => {
          setActiveTab('discovery');
          setIsSidebarOpen(true);
        }}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSimulateUsers={() => simulateVirtualUsers(9)}
      />

      {/* Main Studio Content Layout */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Cinematic Video Player Stage */}
        <div className="flex-1 flex flex-col min-w-0 bg-black relative">
          <VideoPlayer
            videoRef={videoRef}
            playbackState={roomState?.playback || null}
            diagnostics={diagnostics}
            canControl={canControl}
            actionNotification={actionNotification}
            recentReaction={recentReaction}
            onUserPlay={handleUserPlay}
            onUserPause={handleUserPause}
            onUserSeek={handleUserSeek}
            onTriggerReaction={(emoji) => triggerReactionBurst(emoji)}
            onOpenDiscovery={() => {
              setActiveTab('discovery');
              setIsSidebarOpen(true);
            }}
          />
        </div>

        {/* Collapsible Sidebar Toggle Tab */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          title={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-40 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white p-1 rounded-l-lg shadow-xl cursor-pointer"
          style={{ right: isSidebarOpen ? '380px' : '0' }}
        >
          {isSidebarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Multi-Tab Collaborative Sidebar */}
        {isSidebarOpen && (
          <aside className="w-full md:w-[380px] border-l border-zinc-800 bg-zinc-950 flex flex-col shrink-0 z-30 transition-all shadow-2xl">
            {/* Sidebar Tab Bar */}
            <div className="flex items-center border-b border-zinc-800 bg-zinc-950/90 px-2 pt-2 gap-1 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveTab('chat')}
                className={`py-2 px-3 text-xs font-medium rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'chat'
                    ? 'bg-zinc-900 text-white border-t border-x border-zinc-800 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-rose-500" />
                <span>Chat</span>
              </button>

              <button
                onClick={() => setActiveTab('playlist')}
                className={`py-2 px-3 text-xs font-medium rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'playlist'
                    ? 'bg-zinc-900 text-white border-t border-x border-zinc-800 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                }`}
              >
                <ListVideo className="w-3.5 h-3.5 text-rose-500" />
                <span>Queue</span>
                {roomState?.playlist && roomState.playlist.length > 0 && (
                  <span className="text-[10px] font-mono bg-zinc-800 px-1.5 py-0.2 rounded text-zinc-300">
                    {roomState.playlist.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('polls')}
                className={`py-2 px-3 text-xs font-medium rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 relative ${
                  activeTab === 'polls'
                    ? 'bg-zinc-900 text-white border-t border-x border-zinc-800 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-rose-500" />
                <span>Polls</span>
                {unreadPolls > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('discovery')}
                className={`py-2 px-3 text-xs font-medium rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'discovery'
                    ? 'bg-zinc-900 text-white border-t border-x border-zinc-800 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-rose-500" />
                <span>Discover</span>
              </button>

              <button
                onClick={() => setActiveTab('participants')}
                className={`py-2 px-3 text-xs font-medium rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'participants'
                    ? 'bg-zinc-900 text-white border-t border-x border-zinc-800 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-rose-500" />
                <span>Peers</span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {roomState?.participants.length || 1}
                </span>
              </button>
            </div>

            {/* Active Tab Panel Content */}
            <div className="flex-1 overflow-hidden relative">
              {activeTab === 'chat' && (
                <ChatTab
                  messages={roomState?.chatMessages || []}
                  currentUserId={userProfile.id}
                  onSendMessage={sendChat}
                  onReactMessage={reactChat}
                />
              )}

              {activeTab === 'playlist' && roomState && (
                <PlaylistTab
                  currentMedia={roomState.playback.currentMedia}
                  playlist={roomState.playlist}
                  canControl={canControl}
                  onPlayNext={playNext}
                  onRemoveMedia={removeQueueMedia}
                  onReorder={reorderQueue}
                  onQueueCustomMedia={queueMedia}
                  onOpenDiscovery={() => setActiveTab('discovery')}
                />
              )}

              {activeTab === 'polls' && (
                <PollsTab
                  polls={roomState?.polls || []}
                  currentUserId={userProfile.id}
                  isHost={isHost}
                  canCreatePoll={!roomState?.settings.hostOnlyControl || isHost || !!roomState?.settings.allowGuestPolls}
                  onVote={votePoll}
                  onClosePoll={closePoll}
                  onCreatePoll={createPoll}
                  onPlayMovie={(movie) => changeMedia(movie, true)}
                />
              )}

              {activeTab === 'discovery' && (
                <DiscoveryTab
                  canControl={canControl}
                  onPlayMovie={(movie) => changeMedia(movie, true)}
                  onQueueMovie={queueMedia}
                />
              )}

              {activeTab === 'participants' && roomState && (
                <ParticipantsTab
                  participants={roomState.participants}
                  currentUserId={userProfile.id}
                  hostId={roomState.hostId}
                  settings={roomState.settings}
                  onTransferHost={transferHost}
                  onUpdateSettings={updateSettings}
                  onSimulateUsers={() => simulateVirtualUsers(9)}
                />
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Diagnostics & Documentation Modal */}
      <DiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        diagnostics={diagnostics}
        roomState={roomState}
        onSimulateUsers={() => simulateVirtualUsers(9)}
      />

      {/* Room Host Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        roomState={roomState}
        currentUserId={userProfile.id}
        onUpdateSettings={updateSettings}
        onSimulateUsers={() => simulateVirtualUsers(9)}
      />
    </div>
  );
}
