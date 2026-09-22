'use client';

import React, { useState, useEffect } from 'react';
import { Bot, Send, User, CheckCircle2, ShieldAlert, Sparkles, RefreshCw, Trash2 } from 'lucide-react';

export default function TelegramBotPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [userId, setUserId] = useState('');
  const [linkedUserId, setLinkedUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const fetchMessages = () => {
    fetch('/api/telegram/messages')
      .then((res) => res.json())
      .then((data) => {
        setMessages(data.messages || []);
        if (data.linkedTelegramUserId) {
          setLinkedUserId(String(data.linkedTelegramUserId));
          setUserId((current) => current || String(data.linkedTelegramUserId));
        }
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  const sendCommand = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/telegram/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, userId }),
      });
      const data = await res.json();
      if (data.result?.responseText) {
        setNotification(`Bot response: ${data.result.responseText}`);
      }
      fetchMessages();
      setInputText('');
    } catch {
      setNotification('Failed to send command to Telegram bot');
    } finally {
      setLoading(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleButtonClick = async (callbackData: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/telegram/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callbackData, userId }),
      });
      const data = await res.json();
      if (data.result?.responseText) {
        setNotification(`Action result: ${data.result.responseText}`);
      }
      fetchMessages();
    } catch {
      setNotification('Failed to process button click');
    } finally {
      setLoading(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const clearMessages = async () => {
    await fetch('/api/telegram/messages', { method: 'DELETE' });
    fetchMessages();
  };

  const isOwner = Boolean(linkedUserId) && userId === linkedUserId;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
            <Bot className="w-6 h-6 mr-2 text-blue-400" />
            Telegram Bot & Workflow Simulator
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Simulate the exact private Telegram interface used by the channel owner to manage proposals.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={clearMessages}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-red-400 bg-slate-900 border border-slate-800 hover:border-red-900/40 rounded-lg flex items-center transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Clear Chat
          </button>
        </div>
      </div>

      {/* Identity & Security Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${isOwner ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
            {isOwner ? <User className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-white">Simulated Telegram User:</span>
              <span className={`text-xs px-2 py-0.5 rounded font-mono ${isOwner ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-red-950 text-red-300 border border-red-500/30'}`}>
                ID: {userId} ({isOwner ? 'Verified Owner' : 'Unauthorized User'})
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Authorization is resolved from the linked Telegram identity and active workspace membership.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <button
            onClick={() => setUserId(linkedUserId)}
            className={`px-3 py-1 text-xs rounded font-medium ${isOwner ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}
          >
            Act as Owner
          </button>
          <button
            onClick={() => setUserId(linkedUserId ? `${linkedUserId}9` : '999999999')}
            className={`px-3 py-1 text-xs rounded font-medium ${!isOwner ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'}`}
          >
            Act as Impostor
          </button>
        </div>
      </div>

      {notification && (
        <div className="bg-blue-950/80 border border-blue-500/40 text-blue-300 text-xs px-4 py-2.5 rounded-lg flex items-center justify-between">
          <span>{notification}</span>
        </div>
      )}

      {/* Telegram Chat Simulation Window */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[600px]">
        {/* Chat Header */}
        <div className="bg-slate-850 p-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
              FS
            </div>
            <div>
              <p className="text-xs font-semibold text-white">FutureStack AI Bot</p>
              <p className="text-[10px] text-emerald-400">● bot online (DEMO_MODE)</p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => sendCommand('/onboard')}
              className="px-2 py-1 text-[11px] bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700/50 rounded"
            >
              /onboard
            </button>
            <button
              onClick={() => sendCommand('/brain')}
              className="px-2 py-1 text-[11px] bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/50 rounded"
            >
              /brain
            </button>
            <button
              onClick={() => sendCommand('/status')}
              className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
            >
              /status
            </button>
            <button
              onClick={() => sendCommand('/drafts')}
              className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
            >
              /drafts
            </button>
            <button
              onClick={() => sendCommand('/pause')}
              className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
            >
              /pause
            </button>
            <button
              onClick={() => sendCommand('/resume')}
              className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
            >
              /resume
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/60">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6">
              <Bot className="w-12 h-12 text-slate-700 mb-2" />
              <p className="text-sm">No messages in chat history.</p>
              <p className="text-xs text-slate-600 mt-1">Send `/start` or trigger a research run to receive a draft!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
                <div className="flex items-center justify-between text-[11px] text-slate-500 pb-2 border-b border-slate-800">
                  <span className="font-semibold text-blue-400">FutureStack Bot → Owner</span>
                  <span>{new Date(msg.sentAt).toLocaleTimeString()}</span>
                </div>

                <div className="text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                  {msg.text}
                </div>

                {/* Inline Buttons (Section 4 & 24) */}
                {msg.replyMarkup?.inline_keyboard && (
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    {msg.replyMarkup.inline_keyboard.map((row: any[], rIdx: number) => (
                      <div key={rIdx} className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {row.map((btn: any, bIdx: number) => {
                          const isApprove = btn.text.includes('Approve') || btn.text.includes('Publish');
                          const isReject = btn.text.includes('Reject');
                          return (
                            <button
                              key={bIdx}
                              onClick={() => handleButtonClick(btn.callback_data)}
                              disabled={loading}
                              className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center text-center ${
                                isApprove
                                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/40'
                                  : isReject
                                  ? 'bg-red-600/30 text-red-300 border border-red-500/40 hover:bg-red-600/40'
                                  : 'bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700'
                              }`}
                            >
                              {btn.text}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendCommand();
          }}
          className="p-3 bg-slate-900 border-t border-slate-800 flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a command (/start, /drafts, /status) or editorial instruction ('Make it shorter')..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
