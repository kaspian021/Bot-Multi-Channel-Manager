'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { BadgeCheck, Clock3, Link2, ShieldCheck, Sparkles, Users } from 'lucide-react';

export default function AccountOperationsPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch('/api/dashboard').then((r) => r.json()).then(setData).catch(() => setData({ error: 'Unable to load account context' })); }, []);
  if (!data) return <div className="text-slate-400 text-sm">Loading account operations…</div>;
  if (data.error) return <div className="text-red-300 text-sm">{data.error}</div>;
  const entitlement = data.entitlement;
  const limit = entitlement?.limits || {};
  const usage = data.usage || {};
  return <div className="max-w-6xl mx-auto space-y-6">
    <header><h1 className="text-2xl font-bold text-white flex gap-2 items-center"><ShieldCheck className="text-emerald-400"/> Account & Entitlements</h1><p className="text-sm text-slate-400 mt-1">Workspace-scoped commercial status, usage, editorial planning, and integration health.</p></header>
    <section className="grid md:grid-cols-3 gap-4">
      <Card icon={<Users/>} title="Account / workspace"><p>{data.account?.id}</p><p className="text-slate-400">Workspace: {data.workspace?.id}</p><p className="text-slate-400">Role: {data.account?.role}</p></Card>
      <Card icon={<BadgeCheck/>} title="Subscription"><p className="text-emerald-300 font-semibold">{entitlement?.status || 'UNAVAILABLE'}</p><p className="text-slate-400">Plan: {entitlement?.planCode || '—'}</p><p className="text-slate-400">Valid until: {entitlement?.validUntil ? new Date(entitlement.validUntil).toLocaleString() : '—'}</p></Card>
      <Card icon={<Link2/>} title="Linked Telegram"><p>{data.telegramIdentity?.telegram_user_id || 'Not linked'}</p><p className="text-slate-400">{data.telegramIdentity?.telegram_username_snapshot ? `@${data.telegramIdentity.telegram_username_snapshot}` : 'Numeric identity verified'}</p></Card>
    </section>
    <section className="grid md:grid-cols-4 gap-4">
      <Metric label="Channels" value={`${data.metrics?.activeChannels || 0} / ${limit.maxChannels ?? '—'}`}/><Metric label="AI requests today" value={`${usage.aiRequests || 0} / ${limit.aiRequestsPerDay ?? '—'}`}/><Metric label="Research today" value={`${usage.researchRuns || 0} / ${limit.researchRunsPerDay ?? '—'}`}/><Metric label="Posts today" value={`${usage.posts || 0} / ${limit.postsPerDay ?? '—'}`}/>
    </section>
    <section className="grid lg:grid-cols-2 gap-4">
      <Card icon={<Clock3/>} title="Autonomous generation"><p>Generation interval: <b>{Math.max(Number(limit.generationIntervalSeconds || 0), 300)} seconds</b></p><p className="text-slate-400">Platform floor is always enforced. Research uses a separate interval.</p>{(data.runtime || []).map((state:any)=><p className="text-xs text-slate-500 mt-2" key={state.channel_id}>{state.channel_id}: last generated {state.last_generated_at ? new Date(state.last_generated_at).toLocaleString() : 'never'}</p>)}</Card>
      <Card icon={<Sparkles/>} title="Daily editorial plans"><div className="space-y-2">{(data.editorialPlans || []).length ? data.editorialPlans.map((plan:any)=><div key={plan.id} className="bg-slate-950 rounded p-2 text-xs"><b>{plan.channel_id}</b> · {plan.target_posts} target posts · {(typeof plan.selected_topics === 'string' ? JSON.parse(plan.selected_topics) : plan.selected_topics || []).join(', ')}</div>) : <p className="text-slate-400">No plan has been generated yet.</p>}</div></Card>
      <Card icon={<Sparkles/>} title="Recent learning signals"><div className="space-y-2">{(data.learningSignals || []).length ? data.learningSignals.slice(0,5).map((signal:any)=><p className="text-xs" key={signal.id}><span className="text-emerald-300">{signal.action}</span> · {signal.signal_key}: {signal.signal_value}</p>) : <p className="text-slate-400">No owner-learning events yet.</p>}</div></Card>
      <Card icon={<Link2/>} title="Integration health"><p>Provider: {data.integrationHealth?.provider}</p><p className="text-slate-400">Cache TTL: {data.integrationHealth?.cacheTtlSeconds}s</p><p className="text-slate-400">Remote endpoint: {data.integrationHealth?.remoteConfigured ? 'configured' : 'not configured (mock is active)'}</p></Card>
    </section>
  </div>;
}
function Card({title,icon,children}:{title:string;icon:ReactNode;children:ReactNode}) { return <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-200"><h2 className="text-xs uppercase tracking-wide text-slate-400 flex gap-2 items-center mb-3">{icon}{title}</h2>{children}</div>; }
function Metric({label,value}:{label:string;value:string}) { return <div className="bg-slate-900 border border-slate-800 rounded-xl p-4"><p className="text-xs text-slate-400">{label}</p><p className="text-xl text-white font-bold mt-1">{value}</p></div>; }
