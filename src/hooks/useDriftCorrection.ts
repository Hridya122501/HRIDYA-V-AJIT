import { useEffect, useRef, useCallback } from 'react';
import { PlaybackState } from '../types/party';

interface UseDriftCorrectionProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  playbackState: PlaybackState | null;
  clockOffsetMs: number;
  reportDrift: (driftMs: number, status: 'in-sync' | 'rate-adjusted' | 'hard-seek') => void;
  onLocalPlay?: (currentTime: number) => void;
  onLocalPause?: (currentTime: number) => void;
  onLocalSeek?: (currentTime: number) => void;
}

export function useDriftCorrection({
  videoRef,
  playbackState,
  clockOffsetMs,
  reportDrift,
  onLocalPlay,
  onLocalPause,
  onLocalSeek
}: UseDriftCorrectionProps) {
  const isApplyingRemoteRef = useRef(false);
  const lastKnownVersionRef = useRef<number>(-1);
  const currentMediaUrlRef = useRef<string>('');

  // Calculate authoritative server time in seconds at this exact moment
  const getAuthoritativeTime = useCallback(() => {
    if (!playbackState) return 0;
    if (!playbackState.isPlaying) {
      return playbackState.currentTime;
    }
    const adjustedNow = Date.now() + clockOffsetMs;
    const elapsedSeconds = (adjustedNow - playbackState.updatedAt) / 1000;
    return Math.max(0, playbackState.currentTime + elapsedSeconds * (playbackState.playbackRate || 1.0));
  }, [playbackState, clockOffsetMs]);

  // Synchronize incoming playback state immediately upon change
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackState) return;

    // Detect media source change
    if (playbackState.currentMedia.url !== currentMediaUrlRef.current) {
      currentMediaUrlRef.current = playbackState.currentMedia.url;
      isApplyingRemoteRef.current = true;
      video.src = playbackState.currentMedia.url;
      video.load();

      const authTime = getAuthoritativeTime();
      video.currentTime = authTime;

      if (playbackState.isPlaying) {
        video.play().catch(e => console.warn('Autoplay blocked or waiting for user interaction:', e));
      } else {
        video.pause();
      }

      setTimeout(() => {
        isApplyingRemoteRef.current = false;
      }, 350);
      return;
    }

    // New version arrived from server (remote play, pause, seek)
    if (playbackState.version !== lastKnownVersionRef.current) {
      lastKnownVersionRef.current = playbackState.version;
      isApplyingRemoteRef.current = true;

      const authTime = getAuthoritativeTime();
      const currentVideoTime = video.currentTime;
      const drift = Math.abs(currentVideoTime - authTime);

      // Seek if difference is significant or if paused/seeked
      if (drift > 0.4 || !playbackState.isPlaying || playbackState.lastActionBy?.action === 'seek') {
        video.currentTime = authTime;
      }

      if (playbackState.isPlaying && video.paused) {
        video.play().catch(() => {});
      } else if (!playbackState.isPlaying && !video.paused) {
        video.pause();
      }

      setTimeout(() => {
        isApplyingRemoteRef.current = false;
      }, 300);
    }
  }, [playbackState, getAuthoritativeTime, videoRef]);

  // Periodic drift evaluation and smooth automatic correction loop (every 400ms)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackState) return;

    const interval = setInterval(() => {
      const v = videoRef.current;
      if (!v || !playbackState || isApplyingRemoteRef.current) return;
      if (v.readyState < 2) return; // not enough data yet

      // If server is paused, ensure local is paused
      if (!playbackState.isPlaying) {
        if (!v.paused) {
          isApplyingRemoteRef.current = true;
          v.pause();
          setTimeout(() => { isApplyingRemoteRef.current = false; }, 200);
        }
        reportDrift(0, 'in-sync');
        return;
      }

      const authTime = getAuthoritativeTime();
      const localTime = v.currentTime;
      const driftSeconds = localTime - authTime; // positive means ahead, negative means lagging
      const absDriftMs = Math.abs(driftSeconds) * 1000;

      if (absDriftMs <= 250) {
        // Tight sync zone (<= 250ms): reset to standard rate 1.0x
        if (v.playbackRate !== 1.0) {
          v.playbackRate = 1.0;
        }
        reportDrift(absDriftMs, 'in-sync');
      } else if (absDriftMs > 250 && absDriftMs <= 1800) {
        // Micro-adjustment zone (250ms - 1800ms): dynamically speed up or slow down
        if (driftSeconds < 0) {
          // Client is lagging: slightly speed up (1.05x)
          v.playbackRate = 1.05;
        } else {
          // Client is ahead: slightly slow down (0.95x)
          v.playbackRate = 0.95;
        }
        reportDrift(absDriftMs, 'rate-adjusted');
      } else {
        // Significant drift (> 1800ms) or late join: snap hard seek
        isApplyingRemoteRef.current = true;
        v.currentTime = authTime;
        v.playbackRate = 1.0;
        reportDrift(absDriftMs, 'hard-seek');
        setTimeout(() => {
          isApplyingRemoteRef.current = false;
        }, 300);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [playbackState, getAuthoritativeTime, reportDrift, videoRef]);

  // Wrapped local user handlers that guard against loop reflection
  const handleUserPlay = useCallback(() => {
    if (isApplyingRemoteRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    onLocalPlay?.(video.currentTime);
  }, [onLocalPlay, videoRef]);

  const handleUserPause = useCallback(() => {
    if (isApplyingRemoteRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    onLocalPause?.(video.currentTime);
  }, [onLocalPause, videoRef]);

  const handleUserSeek = useCallback((targetSeconds: number) => {
    if (isApplyingRemoteRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    isApplyingRemoteRef.current = true;
    video.currentTime = targetSeconds;
    onLocalSeek?.(targetSeconds);
    setTimeout(() => {
      isApplyingRemoteRef.current = false;
    }, 300);
  }, [onLocalSeek, videoRef]);

  return {
    handleUserPlay,
    handleUserPause,
    handleUserSeek,
    getAuthoritativeTime
  };
}
