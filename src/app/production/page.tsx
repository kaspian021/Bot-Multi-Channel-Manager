'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Activity, Cpu, Bot, AlertTriangle, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function ProductionStatusPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/production/status');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-3">
            <Activity className="w-7 h-7 text-emerald-400" />
            <span>Production Intelligence & Provider Health</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time status of AI search grounding, failover pipelines, Telegram publisher, and content source health.
          </p>
        </div>
        <button
          onClick={fetchStatus}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-500/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Mode Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Environment Mode</div>
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${data?.mode === 'PRODUCTION' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-lg font-bold text-white">{data?.mode || 'LOADING'}</span>
          </div>
          <p className="text-xs text-slate-500">
            {data?.mode === 'PRODUCTION' ? 'Connected to live external APIs and Telegram Bot API' : 'High-fidelity offline simulation mode active'}
          </p>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Publishing State</div>
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${data?.pausePublishing ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <span className="text-lg font-bold text-white">{data?.pausePublishing ? 'PAUSED' : 'ACTIVE'}</span>
          </div>
          <p className="text-xs text-slate-500">Controlled via PAUSE_PUBLISHING environment toggle</p>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Telegram Bot Publisher</div>
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-blue-400" />
            <span className="text-lg font-bold text-white">{data?.providers?.telegram?.status || 'UNKNOWN'}</span>
          </div>
          <p className="text-xs text-slate-500">Owner Telegram ID: {data?.providers?.telegram?.ownerUserId}</p>
        </div>
      </div>

      {/* AI Grounding & Provider Status */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-6">
        <h2 className="text-base font-semibold text-white flex items-center space-x-2">
          <Cpu className="w-5 h-5 text-indigo-400" />
          <span>Research AI Providers (Multi-Provider Resilient Failover)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200">Google Gemini Grounding (Primary)</span>
              <span className={`text-xs px-2 py-0.5 rounded font-mono ${data?.providers?.research?.primary?.status === 'OPERATIONAL' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}`}>
                {data?.providers?.research?.primary?.status}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live web grounded search via Google Search Grounding with source URLs and grounding metadata.
            </p>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200">OpenAI Web Search (Fallback)</span>
              <span className={`text-xs px-2 py-0.5 rounded font-mono ${data?.providers?.research?.fallback?.status === 'OPERATIONAL' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}`}>
                {data?.providers?.research?.fallback?.status}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Automatic transparent failover with circuit-breaker and audit logging in case of Google quota exhaustion or timeouts.
            </p>
          </div>
        </div>
      </div>

      {/* Connectors Status */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>Ingestion Connectors & SSRF Defense</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-1">
            <div className="text-xs text-slate-400 font-medium">Safe URL & HTML Readability</div>
            <div className="text-sm font-semibold text-emerald-400 flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>SSRF Filter Active</span>
            </div>
            <p className="text-[11px] text-slate-500">Blocked private IPs, 5MB limit, 15s timeout, max 3 redirects</p>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-1">
            <div className="text-xs text-slate-400 font-medium">YouTube Data API v3</div>
            <div className="text-sm font-semibold text-slate-200">
              {data?.providers?.connectors?.youtube?.status}
            </div>
            <p className="text-[11px] text-slate-500">Channel uploads & tech video metadata parsing</p>
          </div>

          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-lg space-y-1">
            <div className="text-xs text-slate-400 font-medium">Reddit OAuth Connector</div>
            <div className="text-sm font-semibold text-slate-200">
              {data?.providers?.connectors?.reddit?.status}
            </div>
            <p className="text-[11px] text-slate-500">Subreddit top post signals and discussion parsing</p>
          </div>
        </div>
      </div>

      {/* Recent Provider Failover Logs */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <span>Provider Failure & Failover Audit History</span>
        </h2>

        {(!data?.recentFailovers || data?.recentFailovers.length === 0) ? (
          <div className="text-xs text-slate-500 italic p-4 text-center bg-slate-950/40 rounded-lg">
            No provider failover incidents recorded. Systems operating cleanly.
          </div>
        ) : (
          <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden">
            {data.recentFailovers.map((f: any) => (
              <div key={f.id} className="p-3 bg-slate-950/40 text-xs flex items-center justify-between">
                <div>
                  <span className="font-semibold text-amber-400">{f.provider}</span> failed on action{' '}
                  <span className="font-mono text-slate-300">{f.action}</span>
                  {f.fallback_provider && (
                    <span className="text-slate-400"> → failed over to <strong className="text-emerald-400">{f.fallback_provider}</strong></span>
                  )}
                  <p className="text-[11px] text-slate-500 mt-0.5">{f.error_message}</p>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {new Date(f.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
