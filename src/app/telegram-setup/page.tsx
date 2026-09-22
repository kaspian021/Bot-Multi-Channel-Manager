'use client';

import React, { useState } from 'react';
import { Send, CheckCircle2, AlertCircle, ShieldAlert, Key, MessageSquare, Terminal } from 'lucide-react';

export default function TelegramSetupPage() {
  const [channelChatId, setChannelChatId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    try {
      setVerifying(true);
      setError(null);
      setVerificationResult(null);

      const res = await fetch('/api/telegram/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelChatId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setVerificationResult(data.verification);
    } catch (err: any) {
      setError(err?.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleSendTestMessage = async () => {
    try {
      setTestSending(true);
      setError(null);
      setTestResult(null);

      const res = await fetch('/api/telegram/test-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelChatId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Test message failed');
      setTestResult(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to send test message');
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-3">
          <Send className="w-7 h-7 text-blue-400" />
          <span>Telegram Channel Connection Wizard</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Verify channel administrator privileges, test posting permissions, and link Telegram users to their account/workspace context.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-500/50 rounded-lg text-red-300 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Requirements Checklist */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <h2 className="text-base font-semibold text-white">Telegram Channel Connection Checklist</h2>
        <div className="space-y-3 text-xs text-slate-300">
          <div className="flex items-start space-x-3">
            <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
            <div>
              <p className="font-semibold text-white">Create Bot via @BotFather</p>
              <p className="text-slate-400">Generate a new Telegram bot token using /newbot and set TELEGRAM_BOT_TOKEN in your environment.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</span>
            <div>
              <p className="font-semibold text-white">Add Bot to Channel as Administrator</p>
              <p className="text-slate-400">Open your Telegram Channel settings → Administrators → Add Bot with <strong>Post Messages</strong> and <strong>Edit Messages</strong> permissions.</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</span>
            <div>
              <p className="font-semibold text-white">Link Telegram account securely</p>
              <p className="text-slate-400">Generate an account-link challenge from the website integration, open its Telegram deep link, then choose an active workspace/channel. Numeric Telegram IDs are verified; usernames are only display snapshots.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: Verification and Test Form */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-6">
        <h2 className="text-base font-semibold text-white">Verify Channel & Permissions</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Target Channel Username or Chat ID
            </label>
            <div className="flex space-x-3">
              <input
                type="text"
                value={channelChatId}
                onChange={(e) => setChannelChatId(e.target.value)}
                placeholder="@your_channel or -1001234567890"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-lg text-sm font-medium transition"
              >
                {verifying ? 'Verifying...' : 'Verify Channel Permissions'}
              </button>
            </div>
          </div>

          {/* Verification Results Card */}
          {verificationResult && (
            <div className="p-5 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
              <div className="flex items-center space-x-2">
                {verificationResult.isValid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                )}
                <span className="text-sm font-semibold text-white">
                  {verificationResult.isValid ? 'Channel Verification Passed' : 'Channel Verification Failed'}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-2">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="text-slate-400">Channel Title</div>
                  <div className="font-semibold text-white mt-1">{verificationResult.channelTitle || 'N/A'}</div>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="text-slate-400">Admin Status</div>
                  <div className={`font-semibold mt-1 ${verificationResult.isAdministrator ? 'text-emerald-400' : 'text-red-400'}`}>
                    {verificationResult.isAdministrator ? 'ADMINISTRATOR' : 'NOT ADMIN'}
                  </div>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="text-slate-400">Can Post Messages</div>
                  <div className={`font-semibold mt-1 ${verificationResult.canPostMessages ? 'text-emerald-400' : 'text-red-400'}`}>
                    {verificationResult.canPostMessages ? 'ALLOWED' : 'DENIED'}
                  </div>
                </div>
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="text-slate-400">Can Edit Messages</div>
                  <div className={`font-semibold mt-1 ${verificationResult.canEditMessages ? 'text-emerald-400' : 'text-red-400'}`}>
                    {verificationResult.canEditMessages ? 'ALLOWED' : 'DENIED'}
                  </div>
                </div>
              </div>

              {/* Action to send safe test post */}
              {verificationResult.isValid && (
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Send a verified test post to confirm live broadcast formatting and delivery.
                  </p>
                  <button
                    onClick={handleSendTestMessage}
                    disabled={testSending}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white rounded-lg text-xs font-medium transition"
                  >
                    {testSending ? 'Sending Test...' : 'Send Test Post to Channel'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Test Post Result */}
          {testResult && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs flex items-center justify-between">
              <div>
                <p className="font-semibold">✅ Test message published successfully!</p>
                <p className="text-slate-400 mt-0.5">Message ID: #{testResult.messageId}</p>
              </div>
              {testResult.messageUrl && (
                <a
                  href={testResult.messageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs"
                >
                  View in Telegram →
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
