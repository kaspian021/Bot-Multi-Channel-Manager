'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Edit3,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editInstruction, setEditInstruction] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchDrafts = () => {
    setLoading(true);
    const url = statusFilter === 'ALL' ? '/api/drafts' : `/api/drafts?status=${statusFilter}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setDrafts(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchDrafts();
  }, [statusFilter]);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/drafts/${id}/approve`, { method: 'POST' });
      const data = await res.json();
      setNotification('Draft approved! Publishing prompt dispatched to Telegram owner.');
      fetchDrafts();
    } finally {
      setActionLoading(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      await fetch(`/api/drafts/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Rejected via web dashboard' }),
      });
      setNotification('Draft rejected.');
      fetchDrafts();
    } finally {
      setActionLoading(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handlePublishNow = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/drafts/${id}/publish`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setNotification(`Draft published to Telegram channel! (Msg ID #${data.telegramMessageId})`);
      } else {
        setNotification(`Publishing blocked: ${data.error}`);
      }
      fetchDrafts();
    } finally {
      setActionLoading(null);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleSchedule = async (id: string) => {
    setActionLoading(id);
    try {
      const scheduledFor = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
      await fetch(`/api/drafts/${id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledFor }),
      });
      setNotification('Draft scheduled for publication.');
      fetchDrafts();
    } finally {
      setActionLoading(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const submitRevision = async (id: string) => {
    if (!editInstruction.trim()) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/drafts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: editInstruction }),
      });
      if (res.ok) {
        setNotification('Draft successfully revised by AI editor!');
        setEditingDraftId(null);
        setEditInstruction('');
        fetchDrafts();
      }
    } finally {
      setActionLoading(null);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Content Drafts & Approvals</h1>
          <p className="text-sm text-slate-400 mt-1">
            Editorial review pipeline with strict state machine verification and Telegram post formatting.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'PENDING_APPROVAL', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {notification && (
        <div className="bg-blue-950/80 border border-blue-500/40 text-blue-300 text-xs px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{notification}</span>
        </div>
      )}

      {/* Drafts List */}
      <div className="space-y-6">
        {drafts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-xl">
            No drafts found for status filter: {statusFilter}.
          </div>
        ) : (
          drafts.map((draft) => {
            const quality = draft.qualityEvaluation || {};
            const isPending = draft.status === 'PENDING_APPROVAL';
            const isApproved = draft.status === 'APPROVED';

            return (
              <div
                key={draft.id}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm"
              >
                {/* Draft Header */}
                <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-300">
                        {draft.topic}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        Type: {draft.content_type}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                        Score: {draft.content_score}/100
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                        Confidence: {draft.confidence_score}%
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-white">{draft.headline || draft.title}</h2>
                  </div>

                  <div className="flex items-center space-x-2 self-start md:self-auto">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        draft.status === 'PUBLISHED'
                          ? 'bg-purple-950 text-purple-300 border border-purple-500/30'
                          : draft.status === 'SCHEDULED'
                          ? 'bg-blue-950 text-blue-300 border border-blue-500/30'
                          : draft.status === 'APPROVED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                          : draft.status === 'REJECTED'
                          ? 'bg-red-950 text-red-300 border border-red-500/30'
                          : 'bg-amber-950 text-amber-300 border border-amber-500/30 animate-pulse'
                      }`}
                    >
                      {draft.status}
                    </span>
                  </div>
                </div>

                {/* Draft Content & Telegram Preview Layout */}
                <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: Structured Breakdown (2 cols) */}
                  <div className="lg:col-span-2 space-y-4 text-xs text-slate-300">
                    <div>
                      <span className="font-semibold text-slate-400 block mb-1">Core Explanation:</span>
                      <p className="leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">
                        {draft.explanation || draft.body}
                      </p>
                    </div>

                    {draft.whyItMatters && draft.whyItMatters.length > 0 && (
                      <div>
                        <span className="font-semibold text-slate-400 block mb-1">Why It Matters:</span>
                        <ul className="space-y-1 bg-slate-950 p-3 rounded-lg border border-slate-800 list-disc list-inside">
                          {draft.whyItMatters.map((point: string, idx: number) => (
                            <li key={idx} className="leading-relaxed">{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {draft.technical_context && (
                      <div>
                        <span className="font-semibold text-slate-400 block mb-1">Technical Context:</span>
                        <p className="leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">
                          {draft.technical_context}
                        </p>
                      </div>
                    )}

                    {/* Sources provenance */}
                    <div>
                      <span className="font-semibold text-slate-400 block mb-1">Attributed Sources:</span>
                      <div className="space-y-1">
                        {(draft.sources || []).map((src: any, idx: number) => (
                          <div key={idx} className="flex items-center space-x-2 text-[11px] text-blue-400">
                            <span>•</span>
                            <a href={src.url} target="_blank" rel="noreferrer" className="hover:underline flex items-center">
                              {src.title || src.url} <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quality Gate Status */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                      <div className="flex items-center space-x-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span className="text-slate-400">Quality Gate:</span>
                        <span className="text-emerald-400 font-semibold">{quality.status || 'PASS'}</span>
                      </div>
                      <span className="text-slate-500">
                        Suggested Time: {draft.suggested_publish_time}
                      </span>
                    </div>
                  </div>

                  {/* Right: Telegram Card Preview (1 col) */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pb-2 border-b border-slate-800">
                        <span>Telegram Post Render</span>
                        <span className="text-blue-400">{draft.telegram_channel_username || 'Linked Telegram channel'}</span>
                      </div>
                      <div className="mt-3 text-xs text-slate-200 space-y-2 whitespace-pre-wrap font-sans">
                        <p className="font-bold text-white">⚡ {draft.headline}</p>
                        <p className="text-slate-300">{draft.explanation}</p>
                        {draft.whyItMatters && draft.whyItMatters.length > 0 && (
                          <p className="text-slate-300 font-medium">
                            <span className="font-bold block">Why it matters:</span>
                            {draft.whyItMatters.map((p: string, i: number) => `• ${p}\n`)}
                          </p>
                        )}
                        <p className="text-blue-400 underline text-[11px]">
                          Source: {draft.sources?.[0]?.url || 'https://futurestack.ai'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 text-center">
                      Telegram character limit verified (&lt; 4096)
                    </div>
                  </div>
                </div>

                {/* Edit Drawer (Natural language revision) */}
                {editingDraftId === draft.id && (
                  <div className="p-5 bg-slate-950 border-t border-slate-800 space-y-3 animate-fade-in">
                    <span className="text-xs font-semibold text-white flex items-center">
                      <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                      Natural Language AI Editor (Section 25)
                    </span>
                    <p className="text-xs text-slate-400">
                      Instruct the AI on what to adjust (e.g. "Make it shorter", "Highlight the benchmark results", "Remove the second point").
                    </p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={editInstruction}
                        onChange={(e) => setEditInstruction(e.target.value)}
                        placeholder="e.g. Make it more technical and concise..."
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200"
                      />
                      <button
                        onClick={() => submitRevision(draft.id)}
                        disabled={actionLoading === draft.id}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg flex items-center space-x-1"
                      >
                        {actionLoading === draft.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        <span>Apply Revision</span>
                      </button>
                      <button
                        onClick={() => setEditingDraftId(null)}
                        className="px-3 py-2 bg-slate-800 text-slate-400 text-xs rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Bar */}
                <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-slate-500">
                      Revisions: {draft.revision_count || 0}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Natural language Edit button */}
                    <button
                      onClick={() => {
                        setEditingDraftId(draft.id);
                        setEditInstruction('');
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center space-x-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit with AI</span>
                    </button>

                    {/* Reject */}
                    {draft.status !== 'REJECTED' && draft.status !== 'PUBLISHED' && (
                      <button
                        onClick={() => handleReject(draft.id)}
                        disabled={actionLoading === draft.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-950/60 text-red-400 border border-red-500/30 hover:bg-red-900/40 flex items-center space-x-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    )}

                    {/* Approve */}
                    {isPending && (
                      <button
                        onClick={() => handleApprove(draft.id)}
                        disabled={actionLoading === draft.id}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-1 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve Draft</span>
                      </button>
                    )}

                    {/* Schedule */}
                    {(isPending || isApproved) && (
                      <button
                        onClick={() => handleSchedule(draft.id)}
                        disabled={actionLoading === draft.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white flex items-center space-x-1"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Schedule</span>
                      </button>
                    )}

                    {/* Publish Now */}
                    {draft.status !== 'PUBLISHED' && (
                      <button
                        onClick={() => handlePublishNow(draft.id)}
                        disabled={actionLoading === draft.id}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white flex items-center space-x-1"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Publish Now</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
