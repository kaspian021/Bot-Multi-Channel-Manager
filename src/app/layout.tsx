import React from 'react';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export const metadata = {
  title: 'AI Multi-Channel Telegram Manager',
  description: 'Autonomous AI Content Discovery, Fact-Checking, and Telegram Channel Manager',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-row antialiased">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
