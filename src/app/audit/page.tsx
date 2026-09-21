'use client';

import React, { useState, useEffect } from 'react';
import { History, ShieldCheck, User, Bot, Server } from 'lucide-react';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/audit-logs')
      .then((res) => res.json())
      .then((data) => {
        setLogs(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center">
          <History className="w-6 h-6 mr-2 text-blue-400" />
          System Audit Trail
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Complete, tamper-evident record of all AI actions, owner decisions, scheduling, and publication events.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Event Log</h2>
          <span className="text-xs text-slate-500">{logs.length} audit events</span>
        </div>

        {logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No audit logs recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Metadata</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {logs.map((log) => {
                  const isOwner = log.actor_type === 'OWNER';
                  const isWorker = log.actor_type === 'AI_WORKER';
                  return (
                    <tr key={log.id} className="hover:bg-slate-850/60 transition-colors">
                      <td className="py-3 px-4">
                        <span className="text-blue-400 font-semibold">{log.action}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${isOwner ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : isWorker ? 'bg-sky-950 text-sky-300 border border-sky-500/30' : 'bg-slate-800 text-slate-400'}`}>
                          {log.actor_type} ({log.actor_id})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {log.entity_type} <span className="text-slate-500">({log.entity_id.substring(0, 14)})</span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate font-sans text-[11px]">
                        {JSON.stringify(log.metadata)}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-sans text-[11px]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
