'use client';

import React, { useEffect, useState } from 'react';
import { Search, ShieldAlert, CheckCircle2, AlertTriangle, ExternalLink, HelpCircle, Layers, FileText } from 'lucide-react';

export default function EvidenceInspectorPage() {
  const [data, setData] = useState<{ claims: any[]; evidenceItems: any[] }>({ claims: [], evidenceItems: [] });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    fetch('/api/evidence')
      .then((res) => res.json())
      .then((json) => {
        setData({
          claims: json.claims || [],
          evidenceItems: json.evidenceItems || [],
        });
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredClaims = data.claims.filter((c) => {
    if (filter === 'ALL') return true;
    return c.verification_status === filter;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-3">
          <Layers className="w-7 h-7 text-indigo-400" />
          <span>Evidence Graph & Fact-Checking Inspector</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Atomic factual claims extracted from drafts, grounded in primary evidence items with cross-source verification and conflict detection.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-3">
        {['ALL', 'VERIFIED', 'UNVERIFIED', 'PARTIALLY_VERIFIED', 'CONTRADICTED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Claims List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading evidence graph...</div>
        ) : filteredClaims.length === 0 ? (
          <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-2">
            <p className="text-sm text-slate-300">No claims match the selected filter.</p>
            <p className="text-xs text-slate-500">Autonomous research continuously maps new statements to primary sources.</p>
          </div>
        ) : (
          filteredClaims.map((claim) => (
            <div key={claim.id} className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                    Claim #{claim.id} • Draft {claim.draft_id}
                  </span>
                  <p className="text-sm font-semibold text-white">{claim.text}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      claim.verification_status === 'VERIFIED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : claim.verification_status === 'CONTRADICTED'
                        ? 'bg-red-950 text-red-400 border border-red-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {claim.verification_status}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {Math.round((claim.confidence || 0.9) * 100)}% Conf
                  </span>
                </div>
              </div>

              {/* Underlying Evidence Items */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-400">Primary Supporting Evidence:</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {data.evidenceItems
                    .filter((ev) => ev.channel_id === claim.channel_id)
                    .slice(0, 2)
                    .map((ev) => (
                      <div key={ev.id} className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-300 truncate max-w-[200px]">{ev.source_title}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{ev.source_type}</span>
                        </div>
                        <p className="text-slate-400 text-[11px] line-clamp-2 italic">"{ev.snippet}"</p>
                        <a
                          href={ev.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-[11px] flex items-center space-x-1"
                        >
                          <span className="truncate">{ev.source_url}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
