// @ts-nocheck
import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles, Loader2 } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import { getSessionId, trackEvent } from "../utils/analytics";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const QUICK_REPLIES = [
  "How do plans work?",
  "Which wallets are supported?",
  "When are payouts?",
  "Refund policy?",
];

const HELLO = {
  id: "welcome",
  sender: "bot",
  text: "Hey there 👋 I'm the MONERO RIG assistant. Ask me anything about plans, payouts, wallets, or share a tx hash for support.",
  created_at: new Date().toISOString(),
};

export function LiveChat() {
  const wallet = useWallet();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([HELLO]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Load past chat history when wallet changes (so reconnecting users see previous conversation)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams();
        if (wallet.address) params.set("wallet", wallet.address);
        else params.set("session_id", getSessionId());
        const res = await fetch(`${API}/chat/messages?${params.toString()}`);
        if (!res.ok) return;
        const list = await res.json();
        if (cancelled || !list?.length) return;
        setMessages([HELLO, ...list]);
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [wallet.address]);

  const handleSend = async (textArg) => {
    const text = (textArg ?? input).trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    trackEvent("chat_message_sent", "chat", { length: text.length });

    const optimistic = {
      id: `tmp-${Date.now()}`,
      sender: "user",
      text,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);

    try {
      const res = await fetch(`${API}/chat/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: wallet.address || null,
          session_id: getSessionId(),
          text,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Replace optimistic with persisted user msg + bot reply
      setMessages((m) => {
        const without = m.filter((x) => x.id !== optimistic.id);
        return [...without, data.user, data.bot];
      });
      if (!open) setUnread((n) => n + 1);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          id: `err-${Date.now()}`,
          sender: "bot",
          text: "Hmm — message couldn't be delivered. Please try again or email support@monerorig.com.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setUnread(0);
    trackEvent("chat_opened", "chat");
  };

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <button
          data-testid="livechat-bubble"
          onClick={handleOpen}
          className="fixed bottom-20 right-5 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-2xl shadow-orange-500/40 flex items-center justify-center transition-transform hover:scale-105 animate-pulse-glow"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6 text-white" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-950">
              {unread}
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          data-testid="livechat-panel"
          className="fixed bottom-5 right-5 z-50 w-[360px] max-w-[calc(100vw-2.5rem)] h-[520px] max-h-[calc(100vh-2.5rem)] bg-gradient-to-br from-slate-900 to-slate-950 border border-orange-500/30 rounded-2xl shadow-2xl shadow-orange-500/10 flex flex-col overflow-hidden animate-fade-in-up"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-gradient-to-r from-orange-500/10 to-amber-500/10">
            <div className="flex items-center gap-2.5">
              <span className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-950" />
              </span>
              <div>
                <div className="font-semibold text-sm">MONERO RIG Support</div>
                <div className="text-[10px] text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  Online · Avg reply &lt; 1m
                </div>
              </div>
            </div>
            <button
              data-testid="livechat-close"
              onClick={() => setOpen(false)}
              className="text-slate-500 hover:text-white p-1"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
            {messages.map((m) => {
              const isBot = m.sender === "bot";
              return (
                <div key={m.id} className={`flex ${isBot ? "justify-start" : "justify-end"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      isBot
                        ? "bg-slate-800/80 border border-slate-700/60 text-slate-100 rounded-bl-sm"
                        : "bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-br-sm"
                    }`}
                    data-testid={`chat-msg-${m.sender}`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm flex items-center gap-2 text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Typing…
                </div>
              </div>
            )}
          </div>

          {/* Quick replies (only when only the welcome msg present) */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 hover:border-orange-500/50 hover:bg-orange-500/10 text-slate-300 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Composer */}
          <form
            className="border-t border-slate-800 p-2.5 flex items-center gap-2"
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          >
            <input
              data-testid="livechat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={wallet.isConnected ? "Type your message…" : "Connect wallet for personalized help"}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm placeholder:text-slate-600 focus:outline-none focus:border-orange-500/50"
              maxLength={2000}
            />
            <button
              type="submit"
              data-testid="livechat-send"
              disabled={sending || !input.trim()}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 flex items-center justify-center disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
