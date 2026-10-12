import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Heart, ThumbsUp, Sparkles, MessageSquare } from 'lucide-react';
import { ChatMessage } from '../types/party';

interface ChatTabProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (text: string) => void;
  onReactMessage: (messageId: string, emoji: string) => void;
}

const CHAT_REACTION_EMOJIS = ['👍', '❤️', '😂', '🍿', '🔥'];

export const ChatTab: React.FC<ChatTabProps> = ({
  messages,
  currentUserId,
  onSendMessage,
  onReactMessage
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
    setShowEmojiPicker(false);
  };

  const handleAddEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Messages Scroll Area */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-center p-6">
            <MessageSquare className="w-8 h-8 mb-2 text-zinc-600" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs text-zinc-600 mt-1">Start chatting with the watch party!</p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.isSystem) {
              return (
                <div key={msg.id} className="text-center my-2">
                  <span className="text-[11px] text-zinc-500 bg-zinc-900/90 border border-zinc-800/80 px-2.5 py-1 rounded-full inline-block">
                    {msg.text}
                  </span>
                </div>
              );
            }

            const isMine = msg.userId === currentUserId;

            return (
              <div
                key={msg.id}
                className={`flex flex-col group ${isMine ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[11px]">
                  <span
                    style={{ color: msg.userColor }}
                    className="font-medium"
                  >
                    {msg.userName}
                  </span>
                  <span className="text-zinc-600 text-[10px]">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="relative">
                  <div
                    className={`px-3 py-2 rounded-2xl text-xs max-w-xs break-words shadow-sm ${
                      isMine
                        ? 'bg-rose-600 text-white rounded-tr-xs'
                        : 'bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-tl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Floating Action Emojis on hover */}
                  <div
                    className={`absolute -top-3.5 ${
                      isMine ? 'right-0' : 'left-0'
                    } opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 border border-zinc-700 rounded-full px-1.5 py-0.5 flex items-center gap-1 shadow-md z-10`}
                  >
                    {CHAT_REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => onReactMessage(msg.id, emoji)}
                        className="text-xs hover:scale-125 transition-transform cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reaction Badges on Message */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(msg.reactions).map(([emoji, users]) => {
                      if (!users || users.length === 0) return null;
                      const hasVoted = users.includes(currentUserId);
                      return (
                        <button
                          key={emoji}
                          onClick={() => onReactMessage(msg.id, emoji)}
                          className={`flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full border transition-colors cursor-pointer ${
                            hasVoted
                              ? 'bg-rose-950/60 border-rose-600/50 text-rose-300'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <span>{emoji}</span>
                          <span className="text-[10px] font-mono">{users.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Palette Overlay */}
      {showEmojiPicker && (
        <div className="p-2 border-t border-zinc-800 bg-zinc-900/95 flex items-center gap-2 overflow-x-auto">
          {['🍿', '🎬', '🔥', '❤️', '👏', '😂', '😱', '🚀', '💯', '✨', '🎉', '🙌'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleAddEmoji(emoji)}
              className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Chat Input Bar */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`p-2 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer ${
            showEmojiPicker ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-900'
          }`}
        >
          <Smile className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Send a message to room..."
          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white transition-colors cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
