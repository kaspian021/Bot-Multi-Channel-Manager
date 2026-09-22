'use client';

import React, { useState, useEffect } from 'react';
import { Pause, Play, Sparkles, RefreshCw, Bot } from 'lucide-react';
import Link from 'next/link';

export default function Topbar() {
  const [isPaused, setIsPaused] = useState(false);
  const [isRunningResearch, setIsRunningResearch] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setIsPaused(Boolean(data.pausePublishing));
      })
      .catch(() => {});
  }, []);

  const triggerResearch = async () => {
    setIsRunningResearch(true);
    setNotification('Triggering AI research run across active topics...');
    try {
      const res = await fetch('/api/research/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoDraft: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification(`Research completed! Found ${data.candidatesFound} candidates. Draft generated and sent to Telegram!`);
      } else {
        setNotification(`Research error: ${data.error}`);
      }
    } catch {
      setNotification('Failed to contact server for research run.');
    } finally {
      setIsRunningResearch(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const togglePause = async () => {
    const nextState = !isPaused;
    setIsPaused(nextState);
    await fetch('/api/telegram/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: nextState ? '/pause' : '/resume' }),
    }).catch(() => {});
  };

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Active Channel:</span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200">
            Active workspace channel
          </span>
        </div>

        {notification && (
          <div className="text-xs text-blue-400 bg-blue-950/80 border border-blue-500/40 px-3 py-1 rounded-full animate-fade-in flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-2 animate-ping" />
            {notification}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3">
        {/* Emergency Pause Publishing Toggle (Section 68) */}
        <button
          onClick={togglePause}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors ${
            isPaused
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
              : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
          }`}
          title="Emergency toggle to halt automatic Telegram publishing"
        >
          {isPaused ? <Play className="w-3.5 h-3.5 text-amber-400" /> : <Pause className="w-3.5 h-3.5 text-slate-400" />}
          <span>{isPaused ? 'Publishing Paused' : 'Publishing Active'}</span>
        </button>

        {/* Trigger Research */}
        <button
          onClick={triggerResearch}
          disabled={isRunningResearch}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white flex items-center space-x-1.5 transition-colors disabled:opacity-50"
        >
          {isRunningResearch ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          <span>{isRunningResearch ? 'Researching...' : 'Run Research'}</span>
        </button>

        {/* Telegram Bot Simulator Link */}
        <Link
          href="/telegram-bot"
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 flex items-center space-x-1.5"
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Telegram Sim</span>
        </Link>
      </div>
    </header>
  );
}
