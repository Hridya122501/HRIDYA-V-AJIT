import React, { useState, useMemo } from 'react';
import {
  Search,
  Sparkles,
  Play,
  ListPlus,
  Info,
  Clock,
  Film,
  X,
  Check
} from 'lucide-react';
import { MediaItem } from '../types/party';
import { MOVIE_CATALOG, GENRES, MOODS } from '../data/movies';

interface DiscoveryTabProps {
  canControl: boolean;
  onPlayMovie: (media: MediaItem) => void;
  onQueueMovie: (media: MediaItem) => void;
}

export const DiscoveryTab: React.FC<DiscoveryTabProps> = ({
  canControl,
  onPlayMovie,
  onQueueMovie
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedMood, setSelectedMood] = useState('all');
  const [selectedMovie, setSelectedMovie] = useState<MediaItem | null>(null);
  const [queuedNotification, setQueuedNotification] = useState<string | null>(null);

  // Fuzzy search and filtering
  const filteredMovies = useMemo(() => {
    return MOVIE_CATALOG.filter((movie) => {
      // Genre filter
      if (selectedGenre !== 'All' && !movie.genre.includes(selectedGenre)) {
        return false;
      }

      // Mood filter
      if (selectedMood !== 'all') {
        if (selectedMood === 'chill' && !movie.tags.some(t => ['Relaxation', 'Ambient', '4K', 'Island'].includes(t))) return false;
        if (selectedMood === 'adrenaline' && !movie.tags.some(t => ['Racing', 'Speed', 'Action', 'Adrenaline', 'Robots'].includes(t))) return false;
        if (selectedMood === 'mindbend' && !movie.tags.some(t => ['Surreal', 'Multiverse', 'Time Travel', 'Philosophy'].includes(t))) return false;
        if (selectedMood === 'wholesome' && !movie.tags.some(t => ['Wholesome', 'Cartoon', 'Dragons', 'Fun'].includes(t))) return false;
        if (selectedMood === 'cosmic' && !movie.tags.some(t => ['Space', 'Cosmic', 'Deep Space', 'Ocean', 'Aurora'].includes(t))) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = movie.title.toLowerCase().includes(query);
        const matchesSynopsis = movie.synopsis.toLowerCase().includes(query);
        const matchesDirector = movie.director.toLowerCase().includes(query);
        const matchesTags = movie.tags.some(t => t.toLowerCase().includes(query));
        const matchesCast = movie.cast.some(c => c.toLowerCase().includes(query));
        return matchesTitle || matchesSynopsis || matchesDirector || matchesTags || matchesCast;
      }

      return true;
    });
  }, [searchQuery, selectedGenre, selectedMood]);

  const handleQueue = (movie: MediaItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onQueueMovie(movie);
    setQueuedNotification(movie.title);
    setTimeout(() => setQueuedNotification(null), 2000);
  };

  const handlePlayNow = (movie: MediaItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onPlayMovie(movie);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-4 overflow-y-auto space-y-4">
      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by title, director, actor or tag..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Genre Filter Buttons (Segmented Controls) */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                selectedGenre === genre
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/80'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Mood Quick Filter Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {MOODS.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectedMood(m.id)}
            className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium shrink-0 transition-colors cursor-pointer ${
              selectedMood === m.id
                ? 'bg-zinc-100 text-zinc-950 font-semibold'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-850'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Queue Toast Alert */}
      {queuedNotification && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 animate-fade-in">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>Added "{queuedNotification}" to room playlist!</span>
        </div>
      )}

      {/* Movie Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredMovies.length === 0 ? (
          <div className="col-span-full py-12 text-center text-zinc-500">
            <Film className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
            <p className="text-xs">No movies found matching your filters</p>
            <button
              onClick={() => { setSelectedGenre('All'); setSelectedMood('all'); setSearchQuery(''); }}
              className="mt-2 text-xs text-rose-400 hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredMovies.map((movie) => (
            <div
              key={movie.id}
              onClick={() => setSelectedMovie(movie)}
              className="bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700 rounded-xl overflow-hidden flex flex-col group cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-xl shadow-black/40"
            >
              {/* Poster Image */}
              <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />

                {/* Duration & Rating */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-zinc-300">
                  <span className="font-mono bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded">
                    {Math.floor(movie.duration / 60)} min
                  </span>
                  <span className="font-medium bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded">
                    {movie.rating}
                  </span>
                </div>
              </div>

              {/* Movie Info */}
              <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <h4 className="text-xs font-semibold text-white group-hover:text-rose-400 transition-colors line-clamp-1">
                    {movie.title}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-1">
                    <span>{movie.year}</span>
                    <span>·</span>
                    <span className="truncate">{movie.genre.slice(0, 2).join(', ')}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 line-clamp-2 mt-1.5 leading-relaxed">
                    {movie.synopsis}
                  </p>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-1.5">
                  <button
                    onClick={(e) => handlePlayNow(movie, e)}
                    disabled={!canControl}
                    className="flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Play Now</span>
                  </button>

                  <button
                    onClick={(e) => handleQueue(movie, e)}
                    title="Add to Watch Queue"
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <ListPlus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Movie Details Modal */}
      {selectedMovie && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
            <div className="relative aspect-video w-full bg-black">
              <img
                src={selectedMovie.poster}
                alt={selectedMovie.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-black/40" />
              <button
                onClick={() => setSelectedMovie(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedMovie.title}</h3>
                <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                  <span>{selectedMovie.year}</span>
                  <span>·</span>
                  <span>{Math.floor(selectedMovie.duration / 60)} minutes</span>
                  <span>·</span>
                  <span>{selectedMovie.rating}</span>
                  <span>·</span>
                  <span>Directed by {selectedMovie.director}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">Synopsis</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">{selectedMovie.synopsis}</p>
              </div>

              {selectedMovie.cast.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">Cast</h4>
                  <p className="text-xs text-zinc-400">{selectedMovie.cast.join(', ')}</p>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">Tags</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMovie.tags.map(tag => (
                    <span key={tag} className="text-[11px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-md">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2">
                <button
                  onClick={() => { handleQueue(selectedMovie); setSelectedMovie(null); }}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <ListPlus className="w-4 h-4" />
                  <span>Add to Queue</span>
                </button>

                <button
                  onClick={() => { handlePlayNow(selectedMovie); setSelectedMovie(null); }}
                  disabled={!canControl}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Play Movie Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
