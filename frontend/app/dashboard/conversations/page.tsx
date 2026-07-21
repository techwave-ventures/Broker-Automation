"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Send, Bot, PauseCircle, PlayCircle, User, RefreshCw, MessageSquare } from "lucide-react";

interface Message {
  id: string;
  text: string;
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchChats = async () => {
    try {
      const res = await fetch("/api/chats");
      if (res.ok) {
        const data: Chat[] = await res.json();
        setChats(data);
        if (data.length > 0 && !activeChatId) {
          setActiveChatId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch chats from database:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChatId, activeChat?.messages?.length]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeChatId || sending) return;

    const messageText = inputText.trim();
    setInputText("");
    setSending(true);

    try {
      const res = await fetch(`/api/chats/${activeChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: messageText }),
      });

      if (res.ok) {
        await fetchChats();
      } else {
        console.error("Failed to dispatch chat message");
      }
    } catch (err) {
      console.error("Error sending message:", err);
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

      setChats((prev) =>
        prev.map((c) => (c.id === activeChatId ? { ...c, status: newStatus } : c))
      );
    } catch (err) {
      console.error("Error updating AI status:", err);
    }
  };

  const filteredChats = chats.filter(
    (c) =>
      c.user.name.toLowerCase().includes(search.toLowerCase()) ||
      c.user.phone.includes(search)
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading conversations from database...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] lg:h-screen p-4 lg:p-6 pb-20 lg:pb-6 relative overflow-hidden">
      <div className="bg-card h-full rounded-[2rem] border border-border shadow-sm flex overflow-hidden">
        {/* ── Left Sidebar (Chat List) ── */}
        <div className="w-full lg:w-[350px] flex-shrink-0 border-r border-border flex flex-col bg-muted/20">
          <div className="p-5 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">Inbox</h1>
              <button
                onClick={fetchChats}
                className="p-2 text-foreground/60 hover:text-foreground hover:bg-muted rounded-xl transition-colors"
                title="Refresh Conversations"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
              <input
                type="text"
                placeholder="Search leads or messages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredChats.length === 0 ? (
              <div className="p-8 text-center text-foreground/50 text-sm flex flex-col items-center gap-2">
                <MessageSquare className="h-8 w-8 text-foreground/30" />
                <p className="font-semibold text-foreground/70">No Conversations Yet</p>
                <p className="text-xs max-w-[200px]">Send a WhatsApp message to your connected number to start a live chat.</p>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => {
                    setActiveChatId(chat.id);
                    setChats((prev) =>
                      prev.map((c) => (c.id === chat.id ? { ...c, unread: 0 } : c))
                    );
                  }}
                  className={`p-4 border-b border-border/50 cursor-pointer transition-colors flex items-center gap-3 ${
                    activeChatId === chat.id
                      ? "bg-primary/5 border-l-4 border-l-primary"
                      : "hover:bg-background"
                  }`}
                >
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0 relative">
                    {chat.user.name[0]?.toUpperCase() || "C"}
                    {chat.unread > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-card">
                        {chat.unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm truncate">{chat.user.name}</h3>
                      <span
                        className={`text-xs ${
                          chat.unread > 0 ? "text-primary font-bold" : "text-foreground/40"
                        }`}
                      >
                        {chat.lastMessageTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs">
                      <span
                        className={`flex items-center gap-1 px-1.5 py-[1px] rounded flex-shrink-0 text-[9px] font-bold uppercase tracking-wider ${
                          chat.status === "bot_active"
                            ? "bg-blue-500/10 text-blue-600"
                            : "bg-orange-500/10 text-orange-600"
                        }`}
                      >
                        {chat.status === "bot_active" ? (
                          <Bot className="h-2.5 w-2.5" />
                        ) : (
                          <User className="h-2.5 w-2.5" />
                        )}
                      </span>
                      <p className="truncate text-foreground/60">{chat.lastMessage}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Main Chat Area ── */}
        {activeChat ? (
          <div className="flex-1 flex flex-col bg-background">
            {/* Chat Header */}
            <div className="h-20 border-b border-border px-6 flex items-center justify-between bg-card shrink-0">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                  {activeChat.user.name[0]?.toUpperCase() || "C"}
                </div>
                <div>
                  <h2 className="font-bold text-lg">{activeChat.user.name}</h2>
                  <p className="text-sm text-foreground/50">{activeChat.user.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={toggleAI}
                  className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${
                    activeChat.status === "bot_active"
                      ? "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"
                      : "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
                  }`}
                >
                  {activeChat.status === "bot_active" ? (
                    <>
                      <PauseCircle className="h-5 w-5" /> Take Over Chat
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-5 w-5" /> Resume AI Bot
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {activeChat.messages && activeChat.messages.length > 0 ? (
                activeChat.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === "user" ? "items-start" : "items-end"
                    }`}
                  >
                    <div
                      className={`max-w-[75%] p-4 rounded-2xl text-sm whitespace-pre-wrap ${
                        msg.sender === "user"
                          ? "bg-muted border border-border text-foreground rounded-tl-sm"
                          : msg.sender === "agent"
                          ? "bg-primary text-white rounded-tr-sm shadow-md"
                          : "bg-blue-600 text-white rounded-tr-sm shadow-md"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[11px] text-foreground/40 px-1">
                      <span>{msg.time}</span>
                      {msg.sender !== "user" && (
                        <span className="font-medium capitalize text-[10px]">
                          • {msg.sender === "bot" ? "AI Bot" : "Agent"}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-foreground/40 text-sm">
                  No message history available for this chat.
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Box */}
            <form onSubmit={handleSendMessage} className="p-4 bg-card border-t border-border flex items-center gap-3">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  activeChat.status === "bot_active"
                    ? "AI Bot is handling replies. Type here to reply manually..."
                    : "Type your reply as Agent..."
                }
                className="flex-1 px-4 py-3 bg-muted/40 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                className="p-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-foreground/40 text-sm">
            Select a conversation from the left to view messages.
          </div>
        )}
      </div>
    </div>
  );
}
