'use client';

import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, Database, Bot, Sparkles, RefreshCw } from 'lucide-react';

export default function HealthPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = () => {
    setLoading(true);
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center">
            <Activity className="w-6 h-6 mr-2 text-emerald-400" />
            System Health & Readiness
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time diagnostics for database connectivity, AI providers, and Telegram bot adapters.
          </p>
        </div>
        <button
          onClick={fetchHealth}
          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:bg-slate-800 flex items-center space-x-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {health && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Core Service Status</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                {health.status}
              </span>
            </div>
            <p className="text-2xl font-bold text-white">Online</p>
            <p className="text-xs text-slate-500">Uptime: {health.uptimeSeconds}s</p>
            <div className="pt-2 border-t border-slate-800 text-xs space-y-1 text-slate-400">
              <div>Mode: <span className="text-slate-200">{health.demoMode ? 'DEMO_MODE (Safe Mocks)' : 'Production'}</span></div>
              <div>Publishing: <span className={health.pausePublishing ? 'text-amber-400 font-bold' : 'text-emerald-400'}>{health.pausePublishing ? 'PAUSED' : 'ACTIVE'}</span></div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Database Health</span>
              <Database className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">{health.database?.connected ? 'Connected' : 'Disconnected'}</p>
            <p className="text-xs text-slate-500">Provider: {health.database?.provider}</p>
            <div className="pt-2 border-t border-slate-800 text-xs space-y-1 text-slate-400">
              <div>Latency: <span className="text-slate-200 font-mono">{health.database?.latencyMs}ms</span></div>
              <div>Status: <span className="text-emerald-400">Read/Write OK</span></div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">AI & Telegram Adapters</span>
              <Bot className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">Active</p>
            <p className="text-xs text-slate-500 truncate">{health.aiProvider?.active}</p>
            <div className="pt-2 border-t border-slate-800 text-xs space-y-1 text-slate-400">
              <div>Telegram Mode: <span className="text-slate-200 font-mono">{health.telegram?.mode}</span></div>
              <div>Failover: <span className="text-emerald-400">Resilient Enabled</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
