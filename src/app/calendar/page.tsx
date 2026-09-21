'use client';

import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, Send, AlertCircle, RefreshCw } from 'lucide-react';

export default function CalendarPage() {
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchScheduled = () => {
    setLoading(true);
    fetch('/api/scheduled-posts')
      .then((res) => res.json())
      .then((data) => {
        setScheduled(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchScheduled();
  }, []);

  const handlePublishNow = async (draftId: string) => {
    setActionLoading(draftId);
    try {
      const res = await fetch(`/api/drafts/${draftId}/publish`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setNotification(`Post successfully published to Telegram!`);
      } else {
        setNotification(`Publish error: ${data.error}`);
      }
      fetchScheduled();
    } finally {
      setActionLoading(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Publishing Calendar & Queue</h1>
          <p className="text-sm text-slate-400 mt-1">
            Scheduled posts queue managed by the background publishing scheduler.
          </p>
        </div>
      </div>

      {notification && (
        <div className="bg-blue-950/80 border border-blue-500/40 text-blue-300 text-xs px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{notification}</span>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center">
            <CalendarIcon className="w-4 h-4 mr-2 text-blue-400" />
            Scheduled Queue
          </h2>
          <span className="text-xs text-slate-400">{scheduled.length} items</span>
        </div>

        {scheduled.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No scheduled posts in queue. Approve or schedule drafts to populate the queue.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {scheduled.map((item) => (
              <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-850/40 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-300">
                      {item.topic || 'AI'}
                    </span>
                    <span className="text-xs text-slate-400">
                      Channel: <span className="text-slate-200 font-medium">{item.channel_name || 'FutureStack AI'}</span>
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white">{item.headline || item.title || 'Scheduled Post'}</h3>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center text-blue-400">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      Scheduled for: {new Date(item.scheduled_for).toLocaleString()}
                    </span>
                    <span>Idempotency Key: {item.idempotency_key}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 self-end md:self-auto">
                  <span className={`px-2 py-0.5 text-xs rounded font-medium ${item.status === 'PUBLISHED' ? 'bg-purple-950 text-purple-300 border border-purple-500/30' : 'bg-blue-950 text-blue-300 border border-blue-500/30'}`}>
                    {item.status}
                  </span>

                  {item.status === 'PENDING' && (
                    <button
                      onClick={() => handlePublishNow(item.draft_id)}
                      disabled={actionLoading === item.draft_id}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Publish Now</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
