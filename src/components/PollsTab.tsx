import React, { useState } from 'react';
import {
  Vote,
  Plus,
  CheckCircle2,
  Trophy,
  Play,
  X,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { Poll, MediaItem } from '../types/party';
import { MOVIE_CATALOG } from '../data/movies';

interface PollsTabProps {
  polls: Poll[];
  currentUserId: string;
  isHost: boolean;
  canCreatePoll: boolean;
  onVote: (pollId: string, optionId: string) => void;
  onClosePoll: (pollId: string) => void;
  onCreatePoll: (question: string, options: string[], mediaIds?: string[]) => void;
  onPlayMovie: (media: MediaItem) => void;
}

export const PollsTab: React.FC<PollsTabProps> = ({
  polls,
  currentUserId,
  isHost,
  canCreatePoll,
  onVote,
  onClosePoll,
  onCreatePoll,
  onPlayMovie
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, '']);
    }
  };

  const handleOptionChange = (idx: number, val: string) => {
    const updated = [...options];
    updated[idx] = val;
    setOptions(updated);
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== idx));
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.map(o => o.trim()).filter(Boolean);
    if (!question.trim() || validOptions.length < 2) return;

    onCreatePoll(question.trim(), validOptions);
    setQuestion('');
    setOptions(['', '']);
    setShowCreateModal(false);
  };

  const handlePresetMoviePoll = () => {
    const sampleMovies = [MOVIE_CATALOG[1], MOVIE_CATALOG[2], MOVIE_CATALOG[5]];
    onCreatePoll(
      'Which film should we watch next?',
      sampleMovies.map(m => m.title),
      sampleMovies.map(m => m.id)
    );
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-4 overflow-y-auto space-y-4">
      {/* Top Header & New Poll Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-rose-500" />
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Group Polls</span>
        </div>

        {canCreatePoll && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Poll</span>
          </button>
        )}
      </div>

      {/* Preset Suggestion Banner if no active polls */}
      {polls.length === 0 && canCreatePoll && (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 text-center">
          <Sparkles className="w-6 h-6 text-amber-400 mx-auto mb-2" />
          <h4 className="text-xs font-semibold text-white">No Active Polls</h4>
          <p className="text-[11px] text-zinc-400 mt-1 mb-3">
            Ask the party what movie to watch next, vote on scenes, or take a quick group consensus.
          </p>
          <button
            onClick={handlePresetMoviePoll}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <Vote className="w-3.5 h-3.5 text-rose-400" />
            <span>Launch "Next Movie" Poll</span>
          </button>
        </div>
      )}

      {/* Poll Cards List */}
      <div className="space-y-4">
        {polls.map((poll) => {
          const totalVotes = poll.options.reduce((acc, opt) => acc + opt.votes.length, 0);
          const isPollActive = poll.status === 'active';
          const canClose = isPollActive && (isHost || poll.createdBy === currentUserId);

          return (
            <div
              key={poll.id}
              className={`border rounded-xl p-3.5 space-y-3 ${
                isPollActive ? 'bg-zinc-900 border-zinc-800 shadow-md' : 'bg-zinc-925 border-zinc-850 opacity-90'
              }`}
            >
              {/* Question Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-xs font-semibold text-white leading-snug break-words">
                    {poll.question}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                    <span>By {poll.createdByName}</span>
                    <span>·</span>
                    <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
                    <span>·</span>
                    <span className={isPollActive ? 'text-emerald-400' : 'text-zinc-500 font-medium'}>
                      {isPollActive ? 'Active' : 'Closed'}
                    </span>
                  </div>
                </div>

                {canClose && (
                  <button
                    onClick={() => onClosePoll(poll.id)}
                    className="text-[11px] text-zinc-400 hover:text-rose-400 font-medium px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                  >
                    Close Poll
                  </button>
                )}
              </div>

              {/* Options & Progress Bars */}
              <div className="space-y-2">
                {poll.options.map((opt) => {
                  const voteCount = opt.votes.length;
                  const percent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                  const hasUserVoted = opt.votes.includes(currentUserId);
                  const isWinner = !isPollActive && poll.winnerOptionId === opt.id;

                  return (
                    <div
                      key={opt.id}
                      onClick={() => isPollActive && onVote(poll.id, opt.id)}
                      className={`relative overflow-hidden rounded-lg border p-2.5 transition-all select-none ${
                        isPollActive ? 'cursor-pointer hover:border-zinc-600' : ''
                      } ${
                        hasUserVoted
                          ? 'border-rose-500/70 bg-rose-950/20'
                          : isWinner
                          ? 'border-amber-500/60 bg-amber-950/20'
                          : 'border-zinc-800 bg-zinc-950/60'
                      }`}
                    >
                      {/* Live Fill Bar */}
                      <div
                        style={{ width: `${percent}%` }}
                        className={`absolute left-0 top-0 bottom-0 opacity-20 transition-all duration-500 ${
                          hasUserVoted ? 'bg-rose-500' : isWinner ? 'bg-amber-400' : 'bg-zinc-500'
                        }`}
                      />

                      <div className="relative flex items-center justify-between gap-2 z-10">
                        <div className="flex items-center gap-2 min-w-0">
                          {hasUserVoted ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          ) : isWinner ? (
                            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-zinc-600 shrink-0" />
                          )}
                          <span className="text-xs text-zinc-200 truncate">{opt.text}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 text-xs font-mono">
                          <span className="text-zinc-400">{voteCount}</span>
                          <span className="font-semibold text-zinc-200">{percent}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Winner Action: If closed and linked to movie */}
              {!isPollActive && poll.winnerOptionId && (
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                  <span className="text-amber-400 font-medium flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" />
                    Winner Chosen
                  </span>

                  {/* If winner has mediaId, allow 1-click play */}
                  {(() => {
                    const winOpt = poll.options.find(o => o.id === poll.winnerOptionId);
                    const movie = winOpt?.mediaId ? MOVIE_CATALOG.find(m => m.id === winOpt.mediaId) : null;
                    if (movie && isHost) {
                      return (
                        <button
                          onClick={() => onPlayMovie(movie)}
                          className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          <span>Play "{movie.title}"</span>
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Poll Modal Form */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSubmit}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-4 space-y-3.5 shadow-2xl animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Vote className="w-4 h-4 text-rose-500" />
                Launch Watch Party Poll
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Question</label>
              <input
                type="text"
                placeholder="e.g. Which sci-fi movie should we watch next?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-medium text-zinc-400 block">Options</label>
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500"
                    required
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {options.length < 5 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 pt-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add another option</span>
                </button>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer"
              >
                Start Poll
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
