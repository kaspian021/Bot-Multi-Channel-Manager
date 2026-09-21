'use client';

import React, { useState, useEffect } from 'react';
import { Terminal, Save, CheckCircle2 } from 'lucide-react';

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [userPromptTemplate, setUserPromptTemplate] = useState('');
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchPrompts = () => {
    fetch('/api/prompts')
      .then((res) => res.json())
      .then((data) => {
        setPrompts(data || []);
        if (data && data.length > 0 && !selectedPrompt) {
          setSelectedPrompt(data[0]);
          setSystemPrompt(data[0].system_prompt);
          setUserPromptTemplate(data[0].user_prompt_template);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const handleSelect = (p: any) => {
    setSelectedPrompt(p);
    setSystemPrompt(p.system_prompt);
    setUserPromptTemplate(p.user_prompt_template);
  };

  const handleSave = async () => {
    if (!selectedPrompt) return;
    setSaving(true);
    try {
      await fetch('/api/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: selectedPrompt.key,
          systemPrompt,
          userPromptTemplate,
        }),
      });
      setNotification(`Prompt template ${selectedPrompt.name} saved! Version bumped.`);
      fetchPrompts();
    } finally {
      setSaving(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center">
          <Terminal className="w-6 h-6 mr-2 text-blue-400" />
          AI Prompt Templates Management
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Versioned prompt templates for research, fact-checking, content generation, and editing.
        </p>
      </div>

      {notification && (
        <div className="bg-blue-950/80 border border-blue-500/40 text-blue-300 text-xs px-4 py-3 rounded-lg flex items-center">
          <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Prompts List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <span className="text-xs font-semibold text-slate-400 block px-2 pb-1">Prompt Engines</span>
          {prompts.map((p) => (
            <button
              key={p.key}
              onClick={() => handleSelect(p)}
              className={`w-full text-left p-3 rounded-lg text-xs transition-colors space-y-1 ${
                selectedPrompt?.key === p.key
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-300 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-100">{p.name}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                  v{p.version}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1">{p.description}</p>
            </button>
          ))}
        </div>

        {/* Prompt Editor */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          {selectedPrompt ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">{selectedPrompt.name}</h2>
                  <p className="text-xs text-slate-400 font-mono">Key: {selectedPrompt.key} (v{selectedPrompt.version})</p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Template'}</span>
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">System Prompt</label>
                <textarea
                  rows={4}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono leading-relaxed"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">User Prompt Template</label>
                <textarea
                  rows={4}
                  value={userPromptTemplate}
                  onChange={(e) => setUserPromptTemplate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono leading-relaxed"
                />
              </div>

              <div>
                <span className="text-[11px] text-slate-500">
                  Supported Template Variables: {(selectedPrompt.variables || []).map((v: string) => `{{${v}}}`).join(', ')}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500">Select a prompt template to inspect and edit.</div>
          )}
        </div>
      </div>
    </div>
  );
}
