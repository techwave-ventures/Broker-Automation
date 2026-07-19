"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Phone, MoreVertical, Send, Bot, Check, CheckCheck, PauseCircle, PlayCircle, Building2, MapPin, Smile, Paperclip, User, IndianRupee } from "lucide-react";
import Link from "next/link";

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
    leadContext: {
        requirement: string;
        budget: string;
        propertyId: string;
        propertyTitle: string;
    };
}

const MOCK_CHATS: Chat[] = [
    {
        id: "C1",
        user: { name: "Rahul Sharma", phone: "+91 98765 43210" },
        lastMessage: "Okay, 4 PM today works perfectly.",
        lastMessageTime: "10:32 AM",
        unread: 0,
        status: "human_takeover",
        leadContext: {
            requirement: "3 BHK, Semi-Furnished",
            budget: "₹80L - ₹90L",
            propertyId: "1",
            propertyTitle: "Luxury 3 BHK Apartment"
        },
        messages: [
            { id: "m1", text: "Hi, I am looking for a 3BHK in Baner.", sender: "user", time: "10:15 AM" },
            { id: "m2", text: "Hello Rahul! I can help you with that. What is your approximate budget?", sender: "bot", time: "10:15 AM" },
            { id: "m3", text: "Around 80-90 lakhs. Need semi-furnished.", sender: "user", time: "10:17 AM" },
            { id: "m4", text: "Great! Based on your criteria, I highly recommend this property: \n\n📍 Luxury 3 BHK Apartment, Baner\n💰 ₹85,000,000\n\nClick here for photos & details:\nhttp://localhost:3000/p/1", sender: "bot", time: "10:20 AM" },
            { id: "m5", text: "Wow, the photos look great. Can I visit today?", sender: "user", time: "10:28 AM" },
            { id: "m6", text: "Hi Rahul, this is Vishal (Human Agent). I just took over the chat from the AI. Yes, I can arrange a visit for you today. How about 4 PM?", sender: "agent", time: "10:30 AM" },
            { id: "m7", text: "Okay, 4 PM today works perfectly.", sender: "user", time: "10:32 AM" },
        ]
    },
    {
        id: "C2",
        user: { name: "Sneha Patil", phone: "+91 95555 44444" },
        lastMessage: "Is this negotiable?",
        lastMessageTime: "11:05 AM",
        unread: 1,
        status: "bot_active",
        leadContext: {
            requirement: "1 BHK, Near Metro",
            budget: "₹60L",
            propertyId: "",
            propertyTitle: ""
        },
        messages: [
            { id: "m1", text: "I need a 1BHK in Kothrud near the metro station.", sender: "user", time: "11:00 AM" },
            { id: "m2", text: "Hello! I can definitely help. Your budget?", sender: "bot", time: "11:01 AM" },
            { id: "m3", text: "Max 60L.", sender: "user", time: "11:02 AM" },
            { id: "m4", text: "I found 3 great options matching '1 BHK' and '60L' in Kothrud. One is a new launch just 2 mins from the metro station. Would you like me to send you the links?", sender: "bot", time: "11:03 AM" },
            { id: "m5", text: "Is this negotiable?", sender: "user", time: "11:05 AM" },
        ]
    }
];

export default function ConversationsPage() {
    const [chats, setChats] = useState<Chat[]>(MOCK_CHATS);
    const [activeChatId, setActiveChatId] = useState<string>("C1");
    const [search, setSearch] = useState("");
    const [inputText, setInputText] = useState("");

    const activeChat = chats.find(c => c.id === activeChatId) || chats[0];
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when active chat changes or new message added
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeChatId, activeChat.messages]);

    const handleSendMessage = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputText.trim()) return;

        setChats(prev => prev.map(chat => {
            if (chat.id === activeChatId) {
                return {
                    ...chat,
                    status: "human_takeover", // Sending a message auto-takes over
                    lastMessage: inputText,
                    lastMessageTime: "Just now",
                    messages: [...chat.messages, {
                        id: `msg-${Date.now()}`,
                        text: inputText,
                        sender: "agent",
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }]
                };
            }
            return chat;
        }));
        setInputText("");
    };

    const toggleAI = () => {
        setChats(prev => prev.map(chat => {
            if (chat.id === activeChatId) {
                return {
                    ...chat,
                    status: chat.status === "bot_active" ? "human_takeover" : "bot_active",
                };
            }
            return chat;
        }));
    };

    const filteredChats = chats.filter(c =>
        c.user.name.toLowerCase().includes(search.toLowerCase()) ||
        c.user.phone.includes(search)
    );

    return (
        <div className="h-[calc(100vh-theme(spacing.16))] lg:h-screen p-4 lg:p-6 pb-20 lg:pb-6 relative overflow-hidden">
            <div className="bg-card h-full rounded-[2rem] border border-border shadow-sm flex overflow-hidden">

                {/* ── Left Sidebar (Chat List) ── */}
                <div className="w-full lg:w-[350px] flex-shrink-0 border-r border-border flex flex-col bg-muted/20">
                    <div className="p-5 border-b border-border">
                        <h1 className="text-2xl font-bold mb-4">Inbox</h1>
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
                        {filteredChats.map(chat => (
                            <div
                                key={chat.id}
                                onClick={() => {
                                    setActiveChatId(chat.id);
                                    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unread: 0 } : c));
                                }}
                                className={`p-4 border-b border-border/50 cursor-pointer transition-colors flex items-center gap-3 ${activeChatId === chat.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-background'
                                    }`}
                            >
                                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0 relative">
                                    {chat.user.name[0]}
                                    {chat.unread > 0 && (
                                        <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-card">
                                            {chat.unread}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-sm truncate">{chat.user.name}</h3>
                                        <span className={`text-xs ${chat.unread > 0 ? 'text-primary font-bold' : 'text-foreground/40'}`}>
                                            {chat.lastMessageTime}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5 text-xs">
                                        <span className={`flex items-center gap-1 px-1.5 py-[1px] rounded flex-shrink-0 text-[9px] font-bold uppercase tracking-wider ${chat.status === 'bot_active' ? 'bg-blue-500/10 text-blue-600' : 'bg-orange-500/10 text-orange-600'
                                            }`}>
                                            {chat.status === 'bot_active' ? <Bot className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
                                        </span>
                                        <p className="truncate text-foreground/60">{chat.lastMessage}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Main Chat Area ── */}
                <div className={`flex-1 flex flex-col bg-background ${!activeChatId && 'hidden lg:flex'}`}>

                    {/* Chat Header */}
                    <div className="h-20 border-b border-border px-6 flex items-center justify-between bg-card shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                {activeChat.user.name[0]}
                            </div>
                            <div>
                                <h2 className="font-bold text-lg">{activeChat.user.name}</h2>
                                <p className="text-sm text-foreground/50">{activeChat.user.phone}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={toggleAI}
                                className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${activeChat.status === "bot_active"
                                    ? "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"
                                    : "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
                                    }`}
                            >
                                {activeChat.status === "bot_active" ? (
                                    <><PauseCircle className="h-5 w-5" /> Take Over Chat</>
                                ) : (
                                    <><PlayCircle className="h-5 w-5" /> Resume AI Bot</>
                                )}
                            </button>
                            <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted text-foreground/60 transition-colors">
                                <Phone className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-muted/10 relative">
                        {/* Status banner */}
                        <div className="flex justify-center sticky top-0 z-10">
                            <div className={`px-4 py-1.5 rounded-full text-xs font-bold shadow-sm backdrop-blur-md flex items-center gap-2 ${activeChat.status === "bot_active"
                                ? "bg-blue-500/10 text-blue-700 border border-blue-500/20"
                                : "bg-orange-500/10 text-orange-700 border border-orange-500/20"
                                }`}>
                                {activeChat.status === "bot_active"
                                    ? <><Bot className="h-3.5 w-3.5" /> AI Bot is automatically managing this conversation</>
                                    : <><User className="h-3.5 w-3.5" /> Human agent explicitly managing this chat</>
                                }
                            </div>
                        </div>

                        {activeChat.messages.map((msg, i) => {
                            const isMe = msg.sender !== "user";
                            const isBot = msg.sender === "bot";

                            return (
                                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    {isMe && (
                                        <span className="text-[10px] uppercase font-bold text-foreground/40 mb-1 flex items-center gap-1">
                                            {isBot ? <><Bot className="h-3 w-3" /> Sent by Bot</> : <><User className="h-3 w-3" /> Sent by You</>}
                                        </span>
                                    )}
                                    <div className={`max-w-[75%] lg:max-w-[60%] px-5 py-3.5 rounded-2xl whitespace-pre-wrap text-[15px] leading-relaxed shadow-sm ${isMe
                                        ? isBot
                                            ? 'bg-blue-50 text-blue-950 border border-blue-100 rounded-tr-sm dark:bg-blue-900/20 dark:text-blue-100 dark:border-blue-800'
                                            : 'bg-primary text-primary-foreground rounded-tr-sm'
                                        : 'bg-card text-foreground border border-border rounded-tl-sm'
                                        }`}>
                                        {msg.text}
                                    </div>
                                    <div className="flex items-center gap-1 mt-1 text-[11px] text-foreground/40 font-medium px-1">
                                        {msg.time}
                                        {isMe && <CheckCheck className="h-3 w-3 ml-1 text-primary/60" />}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="p-4 bg-card border-t border-border shrink-0">
                        {activeChat.status === "bot_active" && (
                            <div className="mb-3 text-xs font-semibold text-foreground/50 text-center flex items-center justify-center gap-2">
                                <Bot className="h-4 w-4 text-blue-500" />
                                AI Bot is currently active. If you send a message, it will automatically pause the bot.
                            </div>
                        )}
                        <form onSubmit={handleSendMessage} className="flex flex-col gap-3">
                            <div className="flex items-end gap-3 bg-muted/40 p-2 rounded-2xl border border-border focus-within:border-primary/50 focus-within:ring-2 ring-primary/20 transition-all">
                                <button type="button" className="p-3 text-foreground/40 hover:text-foreground">
                                    <Smile className="h-5 w-5" />
                                </button>
                                <button type="button" className="p-3 text-foreground/40 hover:text-foreground">
                                    <Paperclip className="h-5 w-5" />
                                </button>
                                <textarea
                                    className="flex-1 max-h-32 bg-transparent outline-none resize-none pt-3 pb-2 placeholder:text-foreground/40 min-h-[44px]"
                                    placeholder="Type a message to take over..."
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    rows={1}
                                />
                                <button
                                    type="submit"
                                    disabled={!inputText.trim()}
                                    className="m-1 h-10 w-10 flex items-center justify-center bg-primary text-white rounded-xl shadow-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                                >
                                    <Send className="h-5 w-5 ml-0.5" />
                                </button>
                            </div>
                        </form>
                    </div>

                </div>

                {/* ── Right Sidebar (Lead Context) ── */}
                <div className="hidden xl:flex w-[320px] flex-shrink-0 border-l border-border flex-col bg-card">
                    <div className="p-6 border-b border-border text-center">
                        <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg mb-4">
                            {activeChat.user.name[0]}
                        </div>
                        <h2 className="font-bold text-lg">{activeChat.user.name}</h2>
                        <p className="text-sm text-foreground/50">{activeChat.user.phone}</p>

                        <div className="mt-4 flex items-center gap-2">
                            <button className="flex-1 py-2 bg-emerald-500/10 text-emerald-600 font-bold text-sm rounded-xl hover:bg-emerald-500/20 transition-colors">WhatsApp Call</button>
                            <button className="flex-1 py-2 bg-muted font-bold text-sm rounded-xl hover:bg-foreground/10 transition-colors">Profile</button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div>
                            <p className="text-xs font-bold text-foreground/40 uppercase tracking-wider mb-3">AI Context Extracted</p>
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <div className="mt-0.5"><Building2 className="h-4 w-4 text-primary" /></div>
                                    <div>
                                        <p className="text-xs font-medium text-foreground/50">Property Requirement</p>
                                        <p className="font-bold text-sm">{activeChat.leadContext.requirement}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="mt-0.5"><IndianRupee className="h-4 w-4 text-emerald-500" /></div>
                                    <div>
                                        <p className="text-xs font-medium text-foreground/50">Budget Range</p>
                                        <p className="font-bold text-sm">{activeChat.leadContext.budget}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {activeChat.leadContext.propertyId && (
                            <div>
                                <p className="text-xs font-bold text-foreground/40 uppercase tracking-wider mb-3">Target Property</p>
                                <div className="bg-muted p-4 rounded-2xl border border-border">
                                    <div className="h-10 w-10 bg-primary/20 rounded-lg flex items-center justify-center mb-3">
                                        <Building2 className="h-5 w-5 text-primary" />
                                    </div>
                                    <p className="font-bold text-sm leading-tight mb-3 line-clamp-2">{activeChat.leadContext.propertyTitle}</p>
                                    <Link href={`/dashboard/properties/${activeChat.leadContext.propertyId}`} className="w-full py-2 bg-background border border-border shadow-sm rounded-lg flex items-center justify-center text-xs font-bold hover:bg-foreground/5 transition-colors">
                                        View Listing
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
