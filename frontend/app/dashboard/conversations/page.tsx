"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Send, Bot, PauseCircle, PlayCircle, User, RefreshCw, MessageSquare, ArrowLeft, Phone } from "lucide-react";
import { socket, connectSocket } from "@/lib/socket";
import { HeaderSetter } from "@/components/layout/HeaderContext";

interface Message {
  id: string;
  text: string;
  imageUrl?: string;
  sender: "user" | "bot" | "agent";
  time: string;
}

interface Chat {
  id: string;
  user: {
    name: string;
    phone: string;
    avatar?: string;
  };
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  status: "bot_active" | "human_takeover";
  messages: Message[];
  leadContext?: {
    requirement: string;
    budget: string;
    propertyId: string;
    propertyTitle: string;
  };
}

export default function ConversationsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  // Mobile: false = inbox list, true = chat detail
  const [showChat, setShowChat] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchChats = async () => {
    try {
      const res = await fetch("/api/chats");
      if (res.ok) {
        const data: Chat[] = await res.json();
        setChats(data);
        setActiveChatId((prev) => {
          if (!prev && data.length > 0) {
            const params = new URLSearchParams(window.location.search);
            const phoneSearch = params.get("phone");
            if (phoneSearch) {
              const target = data.find((c) =>
                c.user.phone === phoneSearch ||
                c.user.phone.replace(/[^0-9]/g, '') === phoneSearch.replace(/[^0-9]/g, '')
              );
              if (target) return target.id;
            }
            return data[0].id;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("Failed to fetch chats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d?.user?.email) setUserId(d.user.email); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    connectSocket(userId);
    const onUpdate = () => fetchChats();
    socket.on("webhook", onUpdate);
    socket.on("first", onUpdate);
    return () => {
      socket.off("webhook", onUpdate);
      socket.off("first", onUpdate);
      socket.disconnect();
    };
  }, [userId]);

  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChatId, activeChat?.messages?.length]);

  // Hide the fixed hamburger button while a chat is open so it doesn't
  // cover the back-arrow in the chat header on mobile.
  useEffect(() => {
    const btn = document.getElementById("sidebar-mobile-toggle");
    if (!btn) return;
    btn.style.display = showChat ? "none" : "";
    return () => { btn.style.display = ""; };
  }, [showChat]);

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setChats((prev) => prev.map((c) => c.id === chatId ? { ...c, unread: 0 } : c));
    setShowChat(true);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeChatId || sending) return;
    const text = inputText.trim();
    setInputText("");
    setSending(true);
    try {
      const res = await fetch(`/api/chats/${activeChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) await fetchChats();
    } catch (err) {
      console.error("Error sending:", err);
    } finally {
      setSending(false);
    }
  };

  const toggleAI = async () => {
    if (!activeChatId || !activeChat) return;
    const newStatus = activeChat.status === "bot_active" ? "human_takeover" : "bot_active";
    try {
      await fetch(`/api/chats/${activeChatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setChats((prev) => prev.map((c) => c.id === activeChatId ? { ...c, status: newStatus } : c));
    } catch (err) {
      console.error("Error toggling AI:", err);
    }
  };

  const filteredChats = chats.filter(
    (c) =>
      c.user.name.toLowerCase().includes(search.toLowerCase()) ||
      c.user.phone.includes(search)
  );

  // ─── Avatar helper ───────────────────────────────────────────────
  const Avatar = ({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) => {
    const sz = size === "sm" ? "h-9 w-9 text-sm" : size === "lg" ? "h-12 w-12 text-base" : "h-10 w-10 text-sm";
    return (
      <div className={`${sz} rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0`}>
        {name[0]?.toUpperCase() || "?"}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-[100svh] lg:h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-foreground/50">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm font-medium">Loading conversations...</span>
        </div>
      </div>
    );
  }

  return (
    // Mobile: full-bleed, no padding. Desktop: padded with card wrapper.
    <div className="h-[100svh] lg:h-screen lg:p-6 overflow-hidden flex flex-col lg:block">
      <HeaderSetter
        title="Conversations"
        subtitle="Manage conversations and live chat"
        hideNavbar={isMobile && showChat}
        actions={
          <button
            onClick={fetchChats}
            className="h-9 w-9 rounded-xl bg-muted hover:bg-border transition-colors flex items-center justify-center text-foreground/60 hover:text-foreground"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        }
      />

      {/* ════════════════════════════════════════
          DESKTOP CARD WRAPPER (lg+)
          On mobile we skip padding & the card border
      ════════════════════════════════════════ */}
      <div className="h-full lg:bg-card lg:rounded-[2rem] lg:border lg:border-border lg:shadow-sm flex overflow-hidden">

        {/* ── PANEL 1: INBOX LIST ────────────────────────────────── */}
        <div className={`
          flex flex-col bg-background lg:bg-muted/20
          w-full lg:w-[340px] lg:flex-shrink-0 lg:border-r lg:border-border
          ${showChat ? "hidden lg:flex" : "flex"}
        `}>

          {/* Inbox header — sticky */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3.5 flex-shrink-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
              <input
                type="text"
                placeholder="Search name or number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-muted/60 border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm"
              />
            </div>
          </div>

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {filteredChats.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center gap-3 text-foreground/40">
                <MessageSquare className="h-10 w-10" />
                <div>
                  <p className="font-semibold text-sm text-foreground/60">No conversations yet</p>
                  <p className="text-xs mt-1 max-w-[180px] mx-auto leading-relaxed">
                    Send a WhatsApp message to your connected number to start a chat.
                  </p>
                </div>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isActive = activeChatId === chat.id;
                return (
                  <div
                    key={chat.id}
                    onClick={() => handleSelectChat(chat.id)}
                    className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors relative ${
                      isActive
                        ? "bg-primary/8 lg:bg-primary/5 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-primary before:rounded-r-full lg:before:hidden lg:border-l-4 lg:border-l-primary"
                        : "hover:bg-muted/50 active:bg-muted lg:hover:bg-background"
                    }`}
                  >
                    {/* Avatar with unread badge */}
                    <div className="relative flex-shrink-0">
                      <Avatar name={chat.user.name} size="lg" />
                      {chat.unread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-4.5 w-4.5 min-w-[18px] px-1 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-background">
                          {chat.unread > 9 ? "9+" : chat.unread}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className={`text-sm truncate ${chat.unread > 0 ? "font-bold" : "font-semibold"}`}>
                          {chat.user.name}
                        </h3>
                        <span className={`text-[11px] flex-shrink-0 ${chat.unread > 0 ? "text-primary font-semibold" : "text-foreground/40"}`}>
                          {chat.lastMessageTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {/* AI/Agent pill */}
                        <span className={`flex items-center gap-0.5 px-1.5 py-px rounded text-[9px] font-bold flex-shrink-0 ${
                          chat.status === "bot_active"
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-orange-500/10 text-orange-500"
                        }`}>
                          {chat.status === "bot_active" ? <Bot className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
                        </span>
                        <p className={`text-xs truncate ${chat.unread > 0 ? "text-foreground/80 font-medium" : "text-foreground/50"}`}>
                          {chat.lastMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── PANEL 2: CHAT DETAIL ───────────────────────────────── */}
        <div className={`
          flex-1 flex flex-col min-w-0
          ${!showChat ? "hidden lg:flex" : "flex"}
        `}>
          {activeChat ? (
            <>
              {/* Chat top bar */}
              <div className="flex items-center justify-between px-3 sm:px-5 py-3 border-b border-border bg-background/95 backdrop-blur-sm flex-shrink-0 gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Back arrow — mobile only */}
                  <button
                    onClick={() => setShowChat(false)}
                    className="lg:hidden h-9 w-9 rounded-xl hover:bg-muted transition-colors flex items-center justify-center flex-shrink-0 -ml-1"
                    aria-label="Back to inbox"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>

                  <Avatar name={activeChat.user.name} size="sm" />

                  <div className="min-w-0">
                    <h2 className="font-bold text-sm truncate">{activeChat.user.name}</h2>
                    <div className="flex items-center gap-1 text-xs text-foreground/50">
                      <Phone className="h-3 w-3" />
                      <span className="truncate">{activeChat.user.phone}</span>
                    </div>
                  </div>
                </div>

                {/* AI toggle */}
                <button
                  onClick={toggleAI}
                  className={`h-8 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors flex-shrink-0 border ${
                    activeChat.status === "bot_active"
                      ? "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20"
                      : "bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/20"
                  }`}
                >
                  {activeChat.status === "bot_active" ? (
                    <><PauseCircle className="h-3.5 w-3.5" /><span className="hidden xs:inline">Take Over</span></>
                  ) : (
                    <><PlayCircle className="h-3.5 w-3.5" /><span className="hidden xs:inline">Resume AI</span></>
                  )}
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-3 bg-muted/10">
                {activeChat.messages && activeChat.messages.length > 0 ? (
                  activeChat.messages.map((msg) => {
                    const isUser = msg.sender === "user";
                    return (
                      <div key={msg.id} className={`flex flex-col ${isUser ? "items-start" : "items-end"}`}>
                        <div className={`max-w-[82%] sm:max-w-[70%] rounded-2xl overflow-hidden text-sm shadow-sm ${
                          isUser
                            ? "bg-card border border-border text-foreground rounded-tl-sm"
                            : msg.sender === "agent"
                              ? "bg-primary text-white rounded-tr-sm"
                              : "bg-blue-600 text-white rounded-tr-sm"
                        }`}>
                          {msg.imageUrl && (
                            <div className="overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={msg.imageUrl}
                                alt="Media"
                                className="w-full max-h-56 object-cover hover:scale-105 transition-transform duration-300"
                                onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                              />
                            </div>
                          )}
                          <div className="px-3.5 py-2.5 whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-foreground/35 px-1">
                          <span>{msg.time}</span>
                          {!isUser && (
                            <span className="font-medium">
                              · {msg.sender === "bot" ? "AI Bot" : "Agent"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center text-foreground/40 text-sm py-16">
                    No messages in this conversation yet.
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input bar */}
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-2 px-3 sm:px-4 py-3 bg-background border-t border-border flex-shrink-0"
                style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    activeChat.status === "bot_active"
                      ? "AI is active — type to reply manually..."
                      : "Type your reply as Agent..."
                  }
                  className="flex-1 px-4 py-2.5 bg-muted/50 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm min-w-0"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="h-10 w-10 bg-primary text-white rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-40 flex items-center justify-center flex-shrink-0 shadow-sm"
                >
                  {sending
                    ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <Send className="h-4 w-4" />
                  }
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-foreground/35 p-8">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                <MessageSquare className="h-8 w-8" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm text-foreground/50">No chat selected</p>
                <p className="text-xs mt-1">Pick a conversation from the inbox to start</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
