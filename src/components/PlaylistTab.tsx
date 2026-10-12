import React, { useState } from 'react';
import {
  ListPlus,
  Play,
  Trash2,
  ArrowUp,
  ArrowDown,
  Plus,
  Link,
  Film,
  Sparkles,
  Check
} from 'lucide-react';
import { MediaItem } from '../types/party';

interface PlaylistTabProps {
  currentMedia: MediaItem;
  playlist: MediaItem[];
  canControl: boolean;
  onPlayNext: () => void;
  onRemoveMedia: (mediaId: string) => void;
  onReorder: (newList: MediaItem[]) => void;
  onQueueCustomMedia: (media: MediaItem) => void;
  onOpenDiscovery: () => void;
}

export const PlaylistTab: React.FC<PlaylistTabProps> = ({
  currentMedia,
  playlist,
  canControl,
  onPlayNext,
  onRemoveMedia,
  onReorder,
  onQueueCustomMedia,
  onOpenDiscovery
}) => {
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [customDuration, setCustomDuration] = useState('600');
  const [addedSuccess, setAddedSuccess] = useState(false);

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || !customUrl.trim()) return;

    const newItem: MediaItem = {
      id: `custom-${Date.now()}`,
      title: customTitle.trim(),
      url: customUrl.trim(),
      poster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
      duration: parseInt(customDuration, 10) || 600,
      synopsis: 'Custom streaming video added to party queue.',
      genre: ['Custom'],
      director: 'User Queued',
      cast: [],
      rating: 'NR',
      year: new Date().getFullYear(),
      tags: ['Custom', 'Direct Link']
    };

    onQueueCustomMedia(newItem);
    setCustomTitle('');
    setCustomUrl('');
    setShowAddCustom(false);
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 2000);
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (!canControl) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= playlist.length) return;

    const updated = [...playlist];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    onReorder(updated);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-4 overflow-y-auto space-y-5">
      {/* Currently Playing Card */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Now Playing</span>
          <span className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Live Stream
          </span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex gap-3 shadow-lg">
          <img
            src={currentMedia.poster}
            alt={currentMedia.title}
            className="w-20 h-14 object-cover rounded-lg shrink-0 border border-zinc-750"
          />
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h4 className="text-sm font-semibold text-white truncate">{currentMedia.title}</h4>
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1">
              <span>{Math.floor(currentMedia.duration / 60)} mins</span>
              <span>·</span>
              <span className="truncate">{currentMedia.genre.slice(0, 2).join(', ')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Shared Queue Header & Actions */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Upcoming Queue</span>
            <span className="text-xs font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">
              {playlist.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {playlist.length > 0 && canControl && (
              <button
                onClick={onPlayNext}
                className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Play className="w-3 h-3 fill-rose-400" />
                <span>Play Next</span>
              </button>
            )}
          </div>
        </div>

        {/* Queue Items */}
        {playlist.length === 0 ? (
          <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-6 text-center text-zinc-500">
            <Film className="w-6 h-6 mx-auto mb-2 text-zinc-600" />
            <p className="text-xs">Queue is empty</p>
            <p className="text-[11px] text-zinc-600 mt-1">Browse our movie catalog or add a custom video URL</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                onClick={onOpenDiscovery}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Browse Catalog
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {playlist.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-2.5 flex items-center gap-3 group hover:border-zinc-700 transition-colors"
              >
                <span className="text-xs font-mono text-zinc-500 w-4 text-center shrink-0">
                  {index + 1}
                </span>

                <img
                  src={item.poster}
                  alt={item.title}
                  className="w-14 h-10 object-cover rounded shrink-0 border border-zinc-800"
                />

                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-medium text-white truncate">{item.title}</h5>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                    <span>{Math.floor(item.duration / 60)}m</span>
                    <span>·</span>
                    <span className="truncate">By {item.addedBy || 'Party'}</span>
                  </div>
                </div>

                {canControl && (
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                      title="Move up"
                      className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === playlist.length - 1}
                      title="Move down"
                      className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onRemoveMedia(item.id)}
                      title="Remove"
                      className="p-1 rounded text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Custom Video URL Section */}
      <div className="pt-2 border-t border-zinc-800">
        {!showAddCustom ? (
          <button
            onClick={() => setShowAddCustom(true)}
            className="w-full py-2 px-3 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Video URL</span>
          </button>
        ) : (
          <form onSubmit={handleAddCustom} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-rose-400" />
                Add Direct Video Stream
              </span>
              <button
                type="button"
                onClick={() => setShowAddCustom(false)}
                className="text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <input
              type="text"
              placeholder="Video Title (e.g. My Sci-Fi Clip)"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
              required
            />

            <input
              type="url"
              placeholder="Direct Video URL (MP4 / WebM / HLS)"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
              required
            />

            <button
              type="submit"
              className="w-full py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Add to Playlist
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
