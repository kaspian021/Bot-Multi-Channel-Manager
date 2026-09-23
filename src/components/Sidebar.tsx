'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Radio,
  Sparkles,
  FileText,
  Calendar,
  Send,
  Database,
  Tag,
  Palette,
  Terminal,
  Activity,
  History,
  Bot,
  Settings,
  ShieldCheck,
  CheckCircle,
  BadgeCheck,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Account & Plan', href: '/account', icon: BadgeCheck },
  { name: 'Channels', href: '/channels', icon: Radio },
  { name: 'Channel Brain', href: '/brain', icon: Sparkles },
  { name: 'Research & Runs', href: '/research', icon: Sparkles },
  { name: 'Candidates', href: '/candidates', icon: Database },
  { name: 'Drafts & Approval', href: '/drafts', icon: FileText },
  { name: 'Evidence & Claims', href: '/evidence', icon: ShieldCheck },
  { name: 'Calendar / Schedule', href: '/calendar', icon: Calendar },
  { name: 'Published Posts', href: '/published', icon: Send },
  { name: 'Content Sources', href: '/sources', icon: Database },
  { name: 'Topics', href: '/topics', icon: Tag },
  { name: 'Brand Manager', href: '/brand', icon: Palette },
  { name: 'Telegram Bot & Sim', href: '/telegram-bot', icon: Bot },
  { name: 'Telegram Setup', href: '/telegram-setup', icon: Send },
  { name: 'Production Status', href: '/production', icon: Activity },
  { name: 'Prompts & AI', href: '/prompts', icon: Terminal },
  { name: 'Audit Logs', href: '/audit', icon: History },
  { name: 'System Health', href: '/health', icon: Activity },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
            ⚡
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white">AI Channel Manager</h1>
            <p className="text-xs text-slate-400">Telegram Operations</p>
          </div>
        </div>
      </div>

      {/* Demo Mode Badge */}
      <div className="px-4 pt-3">
        <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-md p-2.5 flex items-center justify-between text-xs">
          <span className="flex items-center text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2"></span>
            Demo Mode Active
          </span>
          <span className="text-[10px] bg-emerald-900 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
            MVP
          </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500">
        <p>Workspace-aware operations</p>
        <p className="text-slate-600 mt-0.5">Multi-Tenant Engine v4.0.0</p>
      </div>
    </aside>
  );
}
