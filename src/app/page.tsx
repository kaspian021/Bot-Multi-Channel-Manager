'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Radio,
  FileCheck,
  Calendar,
  Send,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDashboard = () => {
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (draftId: string) => {
    setActionLoading(draftId);
    try {
      await fetch(`/api/drafts/${draftId}/approve`, { method: 'POST' });
      fetchDashboard();
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (draftId: string) => {
    setActionLoading(draftId);
    try {
      await fetch(`/api/drafts/${draftId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Rejected from Admin Dashboard' }),
      });
      fetchDashboard();
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm text-slate-400">Loading AI Channel Manager operations...</p>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {
    activeChannels: 1,
    pendingApprovals: 0,
    scheduledPosts: 0,
    publishedPosts: 0,
    totalResearchRuns: 0,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Channel Operations Command</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time multi-channel overview for FutureStack AI and connected feeds.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            AI-Assisted & Owner-Controlled
          </span>
          <span className="px-2.5 py-1 text-xs rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
            DEMO_MODE=true
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Channels</span>
            <Radio className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{metrics.activeChannels}</p>
          <p className="text-[11px] text-slate-500 mt-1">Multi-tenant ready</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Pending Approvals</span>
            <FileCheck className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2">{metrics.pendingApprovals}</p>
          <Link href="/drafts" className="text-[11px] text-blue-400 hover:underline mt-1 flex items-center">
            Review drafts <ArrowRight className="w-3 h-3 ml-0.5" />
          </Link>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Scheduled Posts</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{metrics.scheduledPosts}</p>
          <Link href="/calendar" className="text-[11px] text-blue-400 hover:underline mt-1 flex items-center">
            View queue <ArrowRight className="w-3 h-3 ml-0.5" />
          </Link>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Published Posts</span>
            <Send className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{metrics.publishedPosts}</p>
          <p className="text-[11px] text-slate-500 mt-1">In Telegram channel</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Research Runs</span>
            <Sparkles className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{metrics.totalResearchRuns}</p>
          <Link href="/research" className="text-[11px] text-blue-400 hover:underline mt-1 flex items-center">
            Research logs <ArrowRight className="w-3 h-3 ml-0.5" />
          </Link>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Pending Approvals & Scheduled (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pending Draft Proposals */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-white">Pending Approval Queue</h2>
                <p className="text-xs text-slate-400">Awaiting owner decision before publication (YELLOW boundary)</p>
              </div>
              <Link href="/drafts" className="text-xs text-blue-400 hover:underline flex items-center">
                All drafts <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>

            {(!data?.recentDrafts || data.recentDrafts.length === 0) ? (
              <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-lg">
                No drafts currently pending. Trigger an AI research run from the top bar!
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentDrafts
                  .filter((d: any) => d.status === 'PENDING_APPROVAL')
                  .slice(0, 3)
                  .map((draft: any) => (
                    <div
                      key={draft.id}
                      className="p-4 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-300">
                              {draft.topic}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                              Score: {draft.content_score}/100
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300">
                              Confidence: {draft.confidence_score}%
                            </span>
                          </div>
                          <h3 className="font-semibold text-sm text-slate-100">{draft.headline}</h3>
                        </div>
                        <span className="text-xs text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded">
                          PENDING
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                        {draft.explanation || draft.body}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                        <span className="text-[11px] text-slate-500 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          Suggested: {draft.suggested_publish_time}
                        </span>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleReject(draft.id)}
                            disabled={actionLoading === draft.id}
                            className="px-2.5 py-1 text-xs rounded bg-red-950/60 text-red-400 border border-red-500/30 hover:bg-red-900/40 flex items-center"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            Reject
                          </button>
                          <button
                            onClick={() => handleApprove(draft.id)}
                            disabled={actionLoading === draft.id}
                            className="px-2.5 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Publishing Plan */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-white">Upcoming Publishing Schedule</h2>
                <p className="text-xs text-slate-400">Posts scheduled to be dispatched to Telegram</p>
              </div>
              <Link href="/calendar" className="text-xs text-blue-400 hover:underline flex items-center">
                Schedule calendar <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Link>
            </div>

            {(!data?.recentScheduled || data.recentScheduled.length === 0) ? (
              <p className="text-xs text-slate-500 py-3">No posts currently scheduled.</p>
            ) : (
              <div className="divide-y divide-slate-800">
                {data.recentScheduled.map((item: any) => (
                  <div key={item.id} className="py-3 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-slate-200">{item.headline || 'Scheduled Post'}</p>
                      <p className="text-[11px] text-slate-500">
                        Topic: {item.topic || 'Technology'} • Target: {new Date(item.scheduled_for).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-300">
                      SCHEDULED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Audit Logs & Telegram Simulation Preview */}
        <div className="space-y-6">
          {/* Telegram-First Operation Banner */}
          <div className="bg-gradient-to-br from-blue-950/60 via-slate-900 to-slate-900 border border-blue-500/30 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white flex items-center">
              <span className="w-2 h-2 rounded-full bg-blue-400 mr-2" />
              Telegram-First Workflow
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              The owner can approve, reject, schedule, or instruct natural-language edits directly from private Telegram messages without opening this dashboard.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Telegram Bot: @FutureStackBot</span>
              <Link
                href="/telegram-bot"
                className="text-xs text-blue-400 hover:underline flex items-center font-medium"
              >
                Open Bot Simulator <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
          </div>

          {/* Audit Trail */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white">Recent Audit Trail</h2>
              <Link href="/audit" className="text-xs text-blue-400 hover:underline">
                View all
              </Link>
            </div>

            <div className="space-y-3">
              {(data?.recentAuditLogs || []).slice(0, 5).map((log: any) => (
                <div key={log.id} className="text-xs border-l-2 border-slate-700 pl-3 py-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-blue-400">{log.action}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Actor: <span className="text-slate-300 font-medium">{log.actor_type}</span> ({log.actor_id})
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
