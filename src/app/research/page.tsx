'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function ResearchPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchRuns = () => {
    setLoading(true);
    fetch('/api/research/runs')
      .then((res) => res.json())
      .then((data) => {
        setRuns(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const triggerRun = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/research/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: 'ch-futurestack-001', autoDraft: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotification(`Research run completed! Discovered ${data.candidatesFound} candidate stories.`);
        fetchRuns();
      } else {
        setNotification(`Error: ${data.error}`);
      }
    } catch {
      setNotification('Failed to trigger research');
    } finally {
      setRunning(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Research Engine</h1>
          <p className="text-sm text-slate-400 mt-1">
            Automated multi-source discovery across Web, arXiv, GitHub, and social channels.
          </p>
        </div>

        <button
          onClick={triggerRun}
          disabled={running}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center space-x-2 transition-colors disabled:opacity-50"
        >
          {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          <span>{running ? 'Running Pipeline...' : 'Execute Research Cycle'}</span>
        </button>
      </div>

      {notification && (
        <div className="bg-blue-950/80 border border-blue-500/40 text-blue-300 text-xs px-4 py-3 rounded-lg flex items-center">
          <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Runs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Research Execution History</h2>
          <span className="text-xs text-slate-500">{runs.length} runs recorded</span>
        </div>

        {runs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No research runs recorded yet. Click Execute Research Cycle above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Run ID</th>
                  <th className="py-3 px-4">Topics Query</th>
                  <th className="py-3 px-4">Provider</th>
                  <th className="py-3 px-4">Candidates Found</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-850/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400">{r.id}</td>
                    <td className="py-3 px-4 font-medium text-slate-200">{r.query}</td>
                    <td className="py-3 px-4 text-slate-400">{r.provider}</td>
                    <td className="py-3 px-4 font-semibold text-emerald-400">{r.candidates_found} stories</td>
                    <td className="py-3 px-4 text-slate-400">{r.duration_ms}ms</td>
                    <td className="py-3 px-4 text-slate-400">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Link href="/candidates" className="text-xs text-blue-400 hover:underline flex items-center">
          View all discovered candidates <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Link>
      </div>
    </div>
  );
}
