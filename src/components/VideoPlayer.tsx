import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  Clock,
  Sparkles,
  Lock,
  Radio,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { PlaybackState, ReactionBurst, SyncDiagnostics } from '../types/party';

interface VideoPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  playbackState: PlaybackState | null;
  diagnostics: SyncDiagnostics;
  canControl: boolean;
  actionNotification: { message: string; timestamp: number } | null;
  recentReaction: ReactionBurst | null;
  onUserPlay: () => void;
  onUserPause: () => void;
  onUserSeek: (targetSeconds: number) => void;
  onTriggerReaction: (emoji: string, x?: number) => void;
  onOpenDiscovery: () => void;
}

interface FloatingParticle {
  id: string;
  emoji: string;
  userName: string;
  userColor: string;
  x: number;
}

const QUICK_EMOJIS = ['🍿', '❤️', '😂', '🔥', '😱', '👏', '🚀', '💯'];

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoRef,
  playbackState,
  diagnostics,
  canControl,
  actionNotification,
  recentReaction,
  onUserPlay,
  onUserPause,
  onUserSeek,
  onTriggerReaction,
  onOpenDiscovery
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [scrubPreviewTime, setScrubPreviewTime] = useState<number | null>(null);
  const [scrubPreviewX, setScrubPreviewX] = useState(0);
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize local time tracker from video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0) {
        setBufferedEnd(video.buffered.end(video.buffered.length - 1));
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration || playbackState?.currentMedia.duration || 0);
    };

    const handleEnded = () => {
      // Optional auto-play next trigger
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoRef, playbackState]);

  // Volume control
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, videoRef]);

  // Handle incoming reaction bursts
  useEffect(() => {
    if (!recentReaction) return;
    const newParticle: FloatingParticle = {
      id: `${recentReaction.id}-${Date.now()}`,
      emoji: recentReaction.emoji,
      userName: recentReaction.userName,
      userColor: recentReaction.userColor,
      x: recentReaction.x
    };

    setParticles(prev => [...prev.slice(-15), newParticle]);

    const timer = setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== newParticle.id));
    }, 2800);

    return () => clearTimeout(timer);
  }, [recentReaction]);

  // Hotkey support: Space for Play/Pause, Arrow keys for seek, 1-8 for reactions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        skip(-10);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        skip(10);
      } else if (e.key >= '1' && e.key <= '8') {
        const idx = parseInt(e.key, 10) - 1;
        if (QUICK_EMOJIS[idx]) {
          onTriggerReaction(QUICK_EMOJIS[idx]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canControl, playbackState]);

  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (playbackState?.isPlaying) {
        setShowControls(false);
      }
    }, 3200);
  }, [playbackState?.isPlaying]);

  const togglePlayPause = () => {
    if (!canControl) return;
    if (playbackState?.isPlaying) {
      onUserPause();
    } else {
      onUserPlay();
    }
  };

  const skip = (deltaSeconds: number) => {
    if (!canControl || !videoRef.current) return;
    const target = Math.max(0, Math.min(duration || 9999, videoRef.current.currentTime + deltaSeconds));
    onUserSeek(target);
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canControl) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSeconds = clickRatio * (duration || playbackState?.currentMedia.duration || 1);
    onUserSeek(targetSeconds);
  };

  const handleProgressBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const hoverRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetSeconds = hoverRatio * (duration || playbackState?.currentMedia.duration || 1);
    setScrubPreviewTime(targetSeconds);
    setScrubPreviewX(e.clientX - rect.left);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const effectiveDuration = duration || playbackState?.currentMedia.duration || 1;
  const progressPercent = Math.min(100, (currentTime / effectiveDuration) * 100);
  const bufferPercent = Math.min(100, (bufferedEnd / effectiveDuration) * 100);

  return (
    <div
      ref={containerRef}
      onMouseMove={resetControlsTimeout}
      onMouseEnter={() => setShowControls(true)}
      className="relative flex-1 bg-black overflow-hidden flex items-center justify-center select-none group"
    >
      {/* HTML5 Video element */}
      <video
        ref={videoRef}
        playsInline
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlayPause}
        poster={playbackState?.currentMedia.poster}
      />

      {/* Action Notification Banner */}
      {actionNotification && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all duration-300">
          <div className="bg-zinc-950/85 backdrop-blur-md border border-zinc-700/80 text-zinc-100 text-xs px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-2 animate-fade-in">
            <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span className="font-medium tracking-wide">{actionNotification.message}</span>
          </div>
        </div>
      )}

      {/* Floating Emoji Reactions Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
        {particles.map((p) => (
          <div
            key={p.id}
            style={{
              left: `${p.x}%`,
              bottom: '12%'
            }}
            className="absolute flex flex-col items-center animate-reaction-rise"
          >
            <span className="text-4xl drop-shadow-lg filter">{p.emoji}</span>
            <span
              style={{ color: p.userColor }}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-900/80 backdrop-blur-sm mt-1 whitespace-nowrap shadow"
            >
              {p.userName}
            </span>
          </div>
        ))}
      </div>

      {/* Center Big Play/Pause Splash (when paused or hovered) */}
      {!playbackState?.isPlaying && (
        <div
          onClick={togglePlayPause}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-[2px] cursor-pointer"
        >
          <div className="w-20 h-20 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-2xl hover:scale-110 hover:bg-rose-500 transition-all cursor-pointer">
            <Play className="w-10 h-10 ml-1 fill-white" />
          </div>
        </div>
      )}

      {/* Host Only Lock Notice if restricted */}
      {!canControl && (
        <div className="absolute top-4 right-4 z-20 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 text-zinc-300 text-xs px-3 py-1 rounded-md flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-amber-400" />
          <span>Host controls active</span>
        </div>
      )}

      {/* Video Overlay Controls Bar */}
      <div
        className={`absolute bottom-0 inset-x-0 z-30 transition-opacity duration-300 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-12 pb-4 px-4 sm:px-6 flex flex-col gap-2 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Progress Bar with Hover Timestamp Preview */}
        <div
          className="relative h-2 bg-zinc-800/80 rounded-full cursor-pointer group/bar flex items-center"
          onClick={handleProgressBarClick}
          onMouseMove={handleProgressBarMouseMove}
          onMouseLeave={() => setScrubPreviewTime(null)}
        >
          {/* Buffered Progress */}
          <div
            style={{ width: `${bufferPercent}%` }}
            className="absolute left-0 top-0 bottom-0 bg-zinc-600/60 rounded-full transition-all"
          />

          {/* Current Progress */}
          <div
            style={{ width: `${progressPercent}%` }}
            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-rose-600 to-rose-500 rounded-full group-hover/bar:h-2.5 transition-all"
          />

          {/* Scrubber Handle */}
          <div
            style={{ left: `${progressPercent}%` }}
            className="absolute -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md scale-0 group-hover/bar:scale-100 transition-transform"
          />

          {/* Hover Timestamp Tooltip */}
          {scrubPreviewTime !== null && (
            <div
              style={{ left: `${scrubPreviewX}px` }}
              className="absolute -top-8 -translate-x-1/2 bg-zinc-900 border border-zinc-700 text-zinc-100 text-[11px] font-mono px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap"
            >
              {formatTime(scrubPreviewTime)}
            </div>
          )}
        </div>

        {/* Bottom Control Row */}
        <div className="flex items-center justify-between gap-4 mt-1">
          {/* Left Controls: Play, Skip, Time, Volume */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlayPause}
              disabled={!canControl}
              className={`p-2 rounded-lg text-white transition-colors cursor-pointer ${
                canControl ? 'hover:bg-zinc-800/80' : 'opacity-50 cursor-not-allowed'
              }`}
            >
              {playbackState?.isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
            </button>

            <button
              onClick={() => skip(-10)}
              disabled={!canControl}
              title="Skip back 10s"
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => skip(10)}
              disabled={!canControl}
              title="Skip ahead 10s"
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
            </button>

            {/* Time Stamp */}
            <div className="text-xs font-mono text-zinc-300 flex items-center gap-1 ml-1">
              <span className="font-medium text-white">{formatTime(currentTime)}</span>
              <span className="text-zinc-500">/</span>
              <span className="text-zinc-400">{formatTime(effectiveDuration)}</span>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-2 ml-2 group/vol">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  setIsMuted(false);
                }}
                className="w-16 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
            </div>
          </div>

          {/* Center: Quick Emoji Reaction Trigger Bar */}
          <div className="hidden sm:flex items-center gap-1 bg-zinc-900/80 backdrop-blur-md border border-zinc-800/80 rounded-full px-2 py-1 shadow-lg">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onTriggerReaction(emoji)}
                className="w-7 h-7 flex items-center justify-center text-sm rounded-full hover:bg-zinc-800 hover:scale-125 transition-all cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Right Controls: Drift status pill, Fullscreen */}
          <div className="flex items-center gap-3">
            {/* Live Drift Gauge pill */}
            <div
              title={`Live Drift: ${diagnostics.currentDriftMs}ms. Auto-correction: ${diagnostics.driftStatus}`}
              className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded bg-zinc-900/80 border border-zinc-800"
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  diagnostics.driftStatus === 'in-sync'
                    ? 'bg-emerald-400'
                    : diagnostics.driftStatus === 'rate-adjusted'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-rose-400 animate-ping'
                }`}
              />
              <span className="text-zinc-300">
                {diagnostics.driftStatus === 'in-sync'
                  ? `Synced (±${diagnostics.currentDriftMs}ms)`
                  : diagnostics.driftStatus === 'rate-adjusted'
                  ? `Adjusting (${diagnostics.currentDriftMs}ms)`
                  : `Seeking (${diagnostics.currentDriftMs}ms)`}
              </span>
            </div>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function formatTime(seconds: number): string {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
