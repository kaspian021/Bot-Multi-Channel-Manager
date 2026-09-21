'use client';

import React, { useState, useEffect } from 'react';
import { Radio, Plus, Settings, Globe, Clock, CheckCircle2 } from 'lucide-react';

export default function ChannelsPage() {
  const [channels, setChannels] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    language: 'en',
    telegramChatId: '',
    postingFrequency: 3,
    timezone: 'UTC',
    description: '',
  });

  const fetchChannels = () => {
    fetch('/api/channels')
      .then((res) => res.json())
      .then((data) => setChannels(data || []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    setShowModal(false);
    setFormData({ name: '', language: 'en', telegramChatId: '', postingFrequency: 3, timezone: 'UTC', description: '' });
    fetchChannels();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Channels Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure multi-tenant channels, target languages, publishing frequency, and brand settings.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Channel</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {channels.map((ch) => (
          <div key={ch.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  {ch.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-base text-white">{ch.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">{ch.telegram_chat_id || '@unknown'}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${ch.status === 'ACTIVE' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-amber-950 text-amber-300'}`}>
                {ch.status}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {ch.description || 'No channel description configured.'}
            </p>

            <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Language</span>
                <span className="font-semibold text-slate-200">{ch.language.toUpperCase()}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Daily Target</span>
                <span className="font-semibold text-slate-200">{ch.posting_frequency} posts/day</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Timezone</span>
                <span className="font-semibold text-slate-200">{ch.timezone}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-500">Workspace: Demo Workspace</span>
              <a
                href="/brain"
                className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded flex items-center transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                <span>Channel Brain & Rules →</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <h2 className="text-lg font-bold text-white">Create New Channel</h2>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Channel Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. FutureStack Robotics"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Telegram Chat ID / Username</label>
                <input
                  type="text"
                  value={formData.telegramChatId}
                  onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                  placeholder="@futurestack_robotics"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Language (BCP-47)</label>
                  <input
                    type="text"
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Posts / Day</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.postingFrequency}
                    onChange={(e) => setFormData({ ...formData, postingFrequency: parseInt(e.target.value, 10) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium"
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
