'use client';

import React, { useState, useEffect } from 'react';
import { Send, ExternalLink, CheckCircle2 } from 'lucide-react';

export default function PublishedPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/published-posts')
      .then((res) => res.json())
      .then((data) => {
        setPosts(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Published Posts Archive</h1>
        <p className="text-sm text-slate-400 mt-1">
          Historical record of all posts successfully published to Telegram channels with Telegram Message IDs.
        </p>
      </div>

      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-xl">
            No published posts in history yet.
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-300">
                      {post.topic || 'Technology'}
                    </span>
                    <span className="text-xs text-slate-400">
                      Channel: <span className="text-slate-200">{post.channel_name || 'FutureStack AI'}</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30">
                      Telegram Msg ID: #{post.telegram_message_id}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-white">{post.headline || 'Published Telegram Update'}</h3>
                </div>

                <span className="text-[11px] text-slate-500">
                  {new Date(post.published_at).toLocaleString()}
                </span>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                {post.published_text}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Target Chat: {post.telegram_chat_id}</span>
                <span className="text-emerald-400 flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Delivered to Channel
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
