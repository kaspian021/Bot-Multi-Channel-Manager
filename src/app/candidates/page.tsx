'use client';

import React, { useState, useEffect } from 'react';
import { Database, ExternalLink, ShieldCheck, Copy, Sparkles, Filter } from 'lucide-react';

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDupes, setFilterDupes] = useState<'all' | 'unique' | 'dupes'>('all');

  const fetchCandidates = () => {
    setLoading(true);
    fetch('/api/research/candidates')
      .then((res) => res.json())
      .then((data) => {
        setCandidates(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const filtered = candidates.filter((c) => {
    if (filterDupes === 'unique') return !c.is_duplicate;
    if (filterDupes === 'dupes') return c.is_duplicate;
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Discovered Candidates</h1>
          <p className="text-sm text-slate-400 mt-1">
            Raw research items qualified through the weighted scoring engine and duplicate detection.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setFilterDupes('all')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium ${filterDupes === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}
          >
            All ({candidates.length})
          </button>
          <button
            onClick={() => setFilterDupes('unique')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium ${filterDupes === 'unique' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}
          >
            Unique ({candidates.filter((c) => !c.is_duplicate).length})
          </button>
          <button
            onClick={() => setFilterDupes('dupes')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium ${filterDupes === 'dupes' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}
          >
            Duplicates ({candidates.filter((c) => c.is_duplicate).length})
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-xl">
            No candidates matching current filter.
          </div>
        ) : (
          filtered.map((cand) => (
            <div key={cand.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      {cand.author || 'Web Source'}
                    </span>
                    {cand.is_duplicate ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/30 font-medium">
                        DUPLICATE FILTERED
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-medium">
                        QUALIFIED CANDIDATE
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm text-slate-100 leading-snug">{cand.title}</h3>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-lg font-bold text-blue-400">
                    {cand.score?.overallScore || 85}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Overall Score</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{cand.summary}</p>

              {/* Extracted claims */}
              {cand.extractedClaims && cand.extractedClaims.length > 0 && (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Extracted Claims:
                  </span>
                  <ul className="text-xs text-slate-300 space-y-0.5 list-disc list-inside">
                    {cand.extractedClaims.map((claim: string, idx: number) => (
                      <li key={idx} className="line-clamp-1">{claim}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Score breakdown metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                <div>Relevance: <span className="text-slate-200 font-medium">{cand.score?.relevance || 90}%</span></div>
                <div>Novelty: <span className="text-slate-200 font-medium">{cand.score?.novelty || 85}%</span></div>
                <div>Tech Depth: <span className="text-slate-200 font-medium">{cand.score?.technicalDepth || 92}%</span></div>
                <div>Source Quality: <span className="text-slate-200 font-medium">{cand.score?.sourceQuality || 90}%</span></div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-500">
                <span>Discovered: {new Date(cand.created_at).toLocaleString()}</span>
                <a
                  href={cand.canonical_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:underline flex items-center"
                >
                  Source Link <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
