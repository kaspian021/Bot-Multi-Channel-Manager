'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Globe,
  History,
  Lightbulb,
  ShieldCheck,
  CheckCircle2,
  RotateCcw,
  Plus,
  Save,
  Languages,
  BookOpen,
  ArrowRight,
  Sliders,
  AlertTriangle,
  Bot,
} from 'lucide-react';

export default function ChannelBrainPage() {
  const [activeTab, setActiveTab] = useState<'brain' | 'language' | 'preferences' | 'recommendations' | 'versions'>('brain');
  const [channelId, setChannelId] = useState('');
  const [brain, setBrain] = useState<any>(null);
  const [languageSettings, setLanguageSettings] = useState<any>(null);
  const [preferences, setPreferences] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // New preference modal state
  const [showPrefModal, setShowPrefModal] = useState(false);
  const [newPref, setNewPref] = useState({
    preferenceType: 'CONTENT',
    key: '',
    value: '',
    source: 'EXPLICIT',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [brainRes, langRes, prefRes, recRes, verRes] = await Promise.all([
        fetch(`/api/channels/${channelId}/brain`),
        fetch(`/api/channels/${channelId}/language`),
        fetch(`/api/channels/${channelId}/preferences`),
        fetch(`/api/channels/${channelId}/strategy-recommendations`),
        fetch(`/api/channels/${channelId}/brain/versions`),
      ]);

      if (brainRes.ok) setBrain(await brainRes.json());
      if (langRes.ok) setLanguageSettings(await langRes.json());
      if (prefRes.ok) setPreferences(await prefRes.json());
      if (recRes.ok) setRecommendations(await recRes.json());
      if (verRes.ok) setVersions(await verRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [channelId]);

  const handleSaveBrain = async () => {
    try {
      const res = await fetch(`/api/channels/${channelId}/brain`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brain),
      });
      if (res.ok) {
        setNotification('Channel Brain updated successfully and new version snapshot recorded!');
        loadData();
      }
    } catch {
      setNotification('Failed to update Channel Brain');
    }
  };

  const handleSaveLanguage = async () => {
    try {
      const res = await fetch(`/api/channels/${channelId}/language`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(languageSettings),
      });
      if (res.ok) {
        setNotification('Language settings saved successfully!');
        loadData();
      }
    } catch {
      setNotification('Failed to update language settings');
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    try {
      const res = await fetch(`/api/channels/${channelId}/brain/restore/${versionId}`, {
        method: 'POST',
      });
      if (res.ok) {
        setNotification(`Brain restored to version snapshot!`);
        loadData();
      }
    } catch {
      setNotification('Failed to restore brain version');
    }
  };

  const handleApplyRecommendation = async (recId: string) => {
    try {
      const res = await fetch(`/api/channels/${channelId}/strategy-recommendations/${recId}/apply`, {
        method: 'POST',
      });
      if (res.ok) {
        setNotification('Strategy recommendation applied with owner approval (YELLOW tier)!');
        loadData();
      }
    } catch {
      setNotification('Failed to apply recommendation');
    }
  };

  const handleAddPreference = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/channels/${channelId}/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newPref,
          confidence: newPref.source === 'EXPLICIT' ? 1.0 : 0.8,
        }),
      });
      if (res.ok) {
        setShowPrefModal(false);
        setNewPref({ preferenceType: 'CONTENT', key: '', value: '', source: 'EXPLICIT' });
        setNotification('Preference recorded successfully!');
        loadData();
      }
    } catch {
      setNotification('Failed to add preference');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Sparkles className="w-6 h-6 text-emerald-400" />
            <span>Channel Brain & Intelligence</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Persistent channel DNA: persona, editorial voice, multilingual intelligence, version history, and learning preferences.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs text-slate-400">Current Channel:</span>
          <span className="px-2.5 py-1 text-xs font-semibold bg-slate-800 text-blue-400 rounded-lg border border-slate-700">
            FutureStack AI Tech
          </span>
        </div>
      </div>

      {notification && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs px-4 py-2.5 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('brain')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center space-x-2 ${
            activeTab === 'brain'
              ? 'bg-slate-900 border-t border-x border-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4 text-emerald-400" />
          <span>Channel DNA & Rules (v{brain?.version || 1})</span>
        </button>

        <button
          onClick={() => setActiveTab('language')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center space-x-2 ${
            activeTab === 'language'
              ? 'bg-slate-900 border-t border-x border-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Languages className="w-4 h-4 text-blue-400" />
          <span>Multilingual Architecture</span>
        </button>

        <button
          onClick={() => setActiveTab('preferences')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center space-x-2 ${
            activeTab === 'preferences'
              ? 'bg-slate-900 border-t border-x border-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4 text-purple-400" />
          <span>Explicit vs Inferred Preferences</span>
        </button>

        <button
          onClick={() => setActiveTab('recommendations')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center space-x-2 ${
            activeTab === 'recommendations'
              ? 'bg-slate-900 border-t border-x border-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <span>Strategy Recommendations ({recommendations.filter(r => r.status === 'PENDING').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('versions')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors flex items-center space-x-2 ${
            activeTab === 'versions'
              ? 'bg-slate-900 border-t border-x border-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4 text-cyan-400" />
          <span>Brain Version History ({versions.length})</span>
        </button>
      </div>

      {/* TAB 1: Channel Brain DNA */}
      {activeTab === 'brain' && brain && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <span>Structured Channel Brain</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-500/30 rounded">
                    Version {brain.version}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Extracted during AI onboarding interview and refined via editorial feedback.
                </p>
              </div>

              <button
                onClick={handleSaveBrain}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes & Snapshot</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Identity & Audience */}
              <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                <h3 className="font-semibold text-slate-200 text-sm flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>Channel Identity & Audience</span>
                </h3>

                <div>
                  <label className="text-slate-400 block mb-1">Channel Name</label>
                  <input
                    type="text"
                    value={brain.identity?.name || ''}
                    onChange={(e) => setBrain({ ...brain, identity: { ...brain.identity, name: e.target.value } })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Target Persona</label>
                  <textarea
                    rows={2}
                    value={brain.identity?.persona || ''}
                    onChange={(e) => setBrain({ ...brain, identity: { ...brain.identity, persona: e.target.value } })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Audience Expertise Level</label>
                  <select
                    value={brain.audience?.expertiseLevel || 'intermediate'}
                    onChange={(e) => setBrain({ ...brain, audience: { ...brain.audience, expertiseLevel: e.target.value } })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate / Practitioner</option>
                    <option value="advanced">Advanced / Engineer</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Tone & Voice</label>
                  <input
                    type="text"
                    value={brain.style?.tone || ''}
                    onChange={(e) => setBrain({ ...brain, style: { ...brain.style, tone: e.target.value } })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
                  />
                </div>
              </div>

              {/* Content & Publishing Strategy */}
              <div className="space-y-4 bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                <h3 className="font-semibold text-slate-200 text-sm flex items-center space-x-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span>Content Strategy & Restrictions</span>
                </h3>

                <div>
                  <label className="text-slate-400 block mb-1">Primary Topics (comma separated)</label>
                  <input
                    type="text"
                    value={(brain.content?.primaryTopics || []).join(', ')}
                    onChange={(e) => setBrain({
                      ...brain,
                      content: { ...brain.content, primaryTopics: e.target.value.split(',').map((s: string) => s.trim()) }
                    })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Excluded Topics / Blacklist (comma separated)</label>
                  <input
                    type="text"
                    value={(brain.content?.excludedTopics || []).join(', ')}
                    onChange={(e) => setBrain({
                      ...brain,
                      content: { ...brain.content, excludedTopics: e.target.value.split(',').map((s: string) => s.trim()) }
                    })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Excluded Keywords (Anti-Hallucination & Spam Filter)</label>
                  <input
                    type="text"
                    value={(brain.restrictions?.excludedKeywords || []).join(', ')}
                    onChange={(e) => setBrain({
                      ...brain,
                      restrictions: { ...brain.restrictions, excludedKeywords: e.target.value.split(',').map((s: string) => s.trim()) }
                    })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Daily Target Posts</label>
                    <input
                      type="number"
                      value={brain.publishing?.postsPerDay || 3}
                      onChange={(e) => setBrain({
                        ...brain,
                        publishing: { ...brain.publishing, postsPerDay: parseInt(e.target.value, 10) }
                      })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Approval Workflow</label>
                    <select
                      value={brain.approval?.mode || 'HUMAN_APPROVE'}
                      onChange={(e) => setBrain({
                        ...brain,
                        approval: { ...brain.approval, mode: e.target.value }
                      })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
                    >
                      <option value="HUMAN_APPROVE">Manual Approval Required</option>
                      <option value="AUTO_PILOT">Auto-Pilot (GREEN level)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Multilingual Architecture */}
      {activeTab === 'language' && languageSettings && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <Languages className="w-5 h-5 text-blue-400" />
                  <span>Multilingual Channel Intelligence (Section 10 & 11)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Language is channel identity. Separate owner notification language from published channel language.
                </p>
              </div>

              <button
                onClick={handleSaveLanguage}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Language Settings</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4 bg-slate-950/60 p-5 rounded-xl border border-slate-850">
                <h3 className="font-semibold text-slate-200 text-sm">Channel & Owner Language Independence</h3>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Owner Communication Language</label>
                  <p className="text-[11px] text-slate-500 mb-2">Language used for private Telegram notifications, proposals, and approval prompts.</p>
                  <select
                    value={languageSettings.ownerCommunicationLanguage}
                    onChange={(e) => setLanguageSettings({ ...languageSettings, ownerCommunicationLanguage: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
                  >
                    <option value="fa">Persian / فارسی (fa)</option>
                    <option value="en">English (en)</option>
                    <option value="de">German / Deutsch (de)</option>
                    <option value="es">Spanish / Español (es)</option>
                    <option value="ja">Japanese / 日本語 (ja)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Content / Post Language</label>
                  <p className="text-[11px] text-slate-500 mb-2">The actual language in which drafts and Telegram channel posts are written.</p>
                  <select
                    value={languageSettings.contentLanguage}
                    onChange={(e) => setLanguageSettings({ ...languageSettings, contentLanguage: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
                  >
                    <option value="en">English (en)</option>
                    <option value="fa">Persian / فارسی (fa)</option>
                    <option value="de">German / Deutsch (de)</option>
                    <option value="es">Spanish / Español (es)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Primary Channel Language</label>
                  <input
                    type="text"
                    value={languageSettings.primaryChannelLanguage}
                    onChange={(e) => setLanguageSettings({ ...languageSettings, primaryChannelLanguage: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="space-y-4 bg-slate-950/60 p-5 rounded-xl border border-slate-850">
                <h3 className="font-semibold text-slate-200 text-sm">Multilingual Ingestion & Synthesis</h3>

                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Allowed Source Languages (Ingestion)</label>
                  <p className="text-[11px] text-slate-500 mb-2">AI research crawls and synthesizes discoveries from these languages into the target content language.</p>
                  <input
                    type="text"
                    value={(languageSettings.allowedSourceLanguages || []).join(', ')}
                    onChange={(e) => setLanguageSettings({
                      ...languageSettings,
                      allowedSourceLanguages: e.target.value.split(',').map((s: string) => s.trim())
                    })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>

                <div className="pt-2">
                  <label className="text-slate-400 block mb-1 font-medium">Technical Term Preservation</label>
                  <p className="text-[11px] text-slate-500 mb-2">Preserve technical concepts (e.g. AI, CUDA, Transformer, LLM, Git) without inaccurate literal translation.</p>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={languageSettings.preserveTechnicalTerms}
                      onChange={(e) => setLanguageSettings({ ...languageSettings, preserveTechnicalTerms: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-900 border-slate-700"
                    />
                    <span className="text-slate-300">Preserve original technical terms during synthesis</span>
                  </div>
                </div>

                <div className="p-3 bg-blue-950/30 border border-blue-500/20 rounded-lg text-slate-300">
                  <p className="font-semibold text-blue-400 mb-1">Live Multilingual Flow:</p>
                  <p className="text-[11px] leading-relaxed">
                    A Japanese robotics paper (<code className="text-blue-300">ja</code>) is discovered → synthesized into English (<code className="text-blue-300">en</code>) → presented to Persian owner with Persian approval buttons (<code className="text-blue-300">fa</code>) → published to English channel subscribers!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Preferences (Explicit vs Inferred) */}
      {activeTab === 'preferences' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <Sliders className="w-5 h-5 text-purple-400" />
                  <span>Explicit vs Inferred Preferences (Section 13)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Explicit owner rules ALWAYS override inferred preferences. Inferred rules learn continuously from Telegram edits and feedback.
                </p>
              </div>

              <button
                onClick={() => setShowPrefModal(true)}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Explicit Rule</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2.5 font-semibold">Precedence & Source</th>
                    <th className="pb-2.5 font-semibold">Preference Key</th>
                    <th className="pb-2.5 font-semibold">Value / Policy</th>
                    <th className="pb-2.5 font-semibold">Confidence</th>
                    <th className="pb-2.5 font-semibold">Evidence / Signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {preferences.map((p) => {
                    const isExplicit = p.source === 'EXPLICIT';
                    return (
                      <tr key={p.id} className="hover:bg-slate-850/50">
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
                              isExplicit
                                ? 'bg-purple-950 text-purple-300 border border-purple-500/40'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {isExplicit ? '★ EXPLICIT (HIGHEST)' : '⚡ INFERRED'}
                          </span>
                        </td>
                        <td className="py-3 font-mono font-medium text-slate-200">{p.key}</td>
                        <td className="py-3 text-slate-300">{p.value}</td>
                        <td className="py-3 font-mono text-emerald-400">{(p.confidence * 100).toFixed(0)}%</td>
                        <td className="py-3 text-slate-500 text-[11px]">{p.evidence || 'Configured by owner'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Strategy Recommendations */}
      {activeTab === 'recommendations' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <Lightbulb className="w-5 h-5 text-amber-400" />
                  <span>Autonomous Strategy Recommendations (Section 16)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  AI continuously analyzes audience engagement and suggests strategic evolutions. Changes require owner approval (YELLOW permission tier).
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {recommendations.length === 0 ? (
                <p className="text-xs text-slate-500">No strategy recommendations currently pending.</p>
              ) : (
                recommendations.map((rec) => (
                  <div key={rec.id} className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-bold text-white">{rec.title}</h3>
                          <span className={`px-2 py-0.5 text-[10px] rounded font-semibold ${
                            rec.status === 'APPLIED' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                          }`}>
                            {rec.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1">{rec.description}</p>
                      </div>

                      {rec.status === 'PENDING' && (
                        <button
                          onClick={() => handleApplyRecommendation(rec.id)}
                          className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shrink-0"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve & Apply (YELLOW)</span>
                        </button>
                      )}
                    </div>

                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-850 font-mono text-[11px] text-slate-400">
                      Proposed Brain Patch: {JSON.stringify(rec.proposedChange || rec.proposed_change)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Version History & Rollback */}
      {activeTab === 'versions' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <History className="w-5 h-5 text-cyan-400" />
                  <span>Channel Brain Version History & Instant Rollback (Section 12)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Every change creates an immutable version snapshot with reason and diff tracking. Restore to any past version with 1-click.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {versions.map((ver) => (
                <div key={ver.id} className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-sm text-cyan-400">v{ver.version}</span>
                      <span className="text-xs text-slate-300 font-medium">{ver.change_reason || 'Manual snapshot'}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Changed by: <span className="text-slate-400 font-mono">{ver.changed_by || 'owner'}</span> • {new Date(ver.created_at).toLocaleString()}
                    </p>
                  </div>

                  <button
                    onClick={() => handleRestoreVersion(ver.id)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center space-x-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Restore This Version</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Preference Modal */}
      {showPrefModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <h2 className="text-lg font-bold text-white">Add Explicit Preference Rule</h2>
            <form onSubmit={handleAddPreference} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Preference Key</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. max_tokens_per_post, preferred_tone"
                  value={newPref.key}
                  onChange={(e) => setNewPref({ ...newPref, key: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Value</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Always include 3 actionable takeaways"
                  value={newPref.value}
                  onChange={(e) => setNewPref({ ...newPref, value: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Rule Precedence</label>
                <select
                  value={newPref.source}
                  onChange={(e) => setNewPref({ ...newPref, source: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                >
                  <option value="EXPLICIT">EXPLICIT (Highest Priority Rule)</option>
                  <option value="INFERRED">INFERRED (AI Learning Signal)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPrefModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
