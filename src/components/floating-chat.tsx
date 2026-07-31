"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  MessageSquare, X, Send, ArrowLeft, Sparkles,
  Maximize2, Minimize2, ChevronDown, Search, Pin,
  Smile, ImageIcon,
} from "lucide-react";
import Image from "next/image";
import { useUser, useSupabase, useCollection, useStableMemo } from "@/supabase";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  name: string;
  lastMessage?: string;
  updatedAt?: string;
  userId?: string;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  conversationId: string;
}

const STICKER_GROUPS = [
  { label: "⚡", title: "Quick", items: ["👍", "👎", "❤️", "😂", "😮", "😢", "😡", "🎉", "🔥", "💯", "✅", "🙏"] },
  { label: "😊", title: "Faces", items: ["😀", "😍", "🥰", "🤩", "😎", "🥺", "😭", "🤣", "😅", "😊", "🤔", "🫡", "😏", "🤗", "😆", "😤"] },
  { label: "👋", title: "Gestures", items: ["👋", "🤝", "👏", "🙌", "🫶", "✌️", "🤞", "🙏", "💪", "👊", "👌", "🤙", "🫰", "🤌"] },
  { label: "🎉", title: "Fun", items: ["🎁", "🎂", "🎉", "🎊", "🥳", "🎯", "🎮", "🎵", "🌈", "⭐", "✨", "🚀", "💎", "🌟", "🍕", "🧋"] },
];

function isBotConvo(id: string | null | undefined): boolean {
  return !!id && (id === "bella-bot" || id.startsWith("bella-bot-"));
}

function formatTime(ts: string | null | undefined) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatLastMessage(msg: string | undefined): string {
  if (!msg) return "Start a chat";
  if (msg.startsWith("__img__:")) return "📷 Image";
  if (msg.startsWith("__sticker__:")) return msg.slice(12);
  return msg;
}

function linkifyText(text: string): React.ReactNode {
  const urlRegex = /(https?:\/\/[^\s<>"']+)/gi;
  const parts = text.split(urlRegex);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//i.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-dotted break-all hover:opacity-80"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

function renderMsgContent(content: string): { node: React.ReactNode; bubbleless: boolean } {
  if (content.startsWith("__sticker__:")) {
    return {
      node: <span className="text-5xl leading-none select-none">{content.slice(12)}</span>,
      bubbleless: true,
    };
  }
  if (content.startsWith("__img__:")) {
    const url = content.slice(8);
    return {
      node: (
        <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
          <img
            src={url}
            alt="Image"
            className="max-w-[200px] max-h-[200px] rounded-[10px] object-cover hover:opacity-90 transition-opacity"
          />
        </a>
      ),
      bubbleless: true,
    };
  }
  return { node: linkifyText(content), bubbleless: false };
}

export function FloatingChat() {
  const { user } = useUser();
  const supabase = useSupabase();
  const pathname = usePathname();

  // Core
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [chatCleared, setChatCleared] = useState(false);
  const [lastOpened, setLastOpened] = useState(0);
  const [convoSearch, setConvoSearch] = useState("");

  // Features
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [convoReadTimes, setConvoReadTimes] = useState<Record<string, number>>({});
  const [filterTab, setFilterTab] = useState<"all" | "unread" | "pinned">("all");
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [activeStickerGroup, setActiveStickerGroup] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Animation
  const [cardRendered, setCardRendered] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [convoVisible, setConvoVisible] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load localStorage
  useEffect(() => {
    const stored = localStorage.getItem("emoorm_chat_last_opened");
    if (stored) setLastOpened(Number(stored));
    try {
      const pinned = localStorage.getItem("emoorm_pinned_convos");
      if (pinned) setPinnedIds(JSON.parse(pinned));
    } catch { }
    try {
      const rt = localStorage.getItem("emoorm_convo_read_times");
      if (rt) setConvoReadTimes(JSON.parse(rt));
    } catch { }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showStickerPicker) { setShowStickerPicker(false); return; }
        setIsFullscreen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showStickerPicker]);

  // Convo slide-in (single-column only)
  useEffect(() => {
    if (!activeConvoId || isFullscreen) { setConvoVisible(false); return; }
    setConvoVisible(false);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setConvoVisible(true)));
    return () => cancelAnimationFrame(id);
  }, [activeConvoId, isFullscreen]);

  // Close sticker picker on outside click
  useEffect(() => {
    if (!showStickerPicker) return;
    const handler = () => setShowStickerPicker(false);
    const t = setTimeout(() => document.addEventListener("click", handler), 0);
    return () => { clearTimeout(t); document.removeEventListener("click", handler); };
  }, [showStickerPicker]);

  // Data
  const conversationsQuery = useStableMemo(() => {
    if (!user) return null;
    return {
      table: "conversations",
      filters: [{ column: "userId", op: "eq" as const, value: user.uid }],
      order: { column: "updatedAt", ascending: false },
    };
  }, [user]);

  const { data: userConversations } = useCollection<Conversation>(conversationsQuery);

  const botConvoId = user ? `bella-bot-${user.uid}` : "bella-bot";

  const conversations = useMemo(() => {
    const list = userConversations ? [...userConversations] : [];
    if (!list.find((c) => isBotConvo(c.id))) {
      list.unshift({
        id: botConvoId,
        name: "Moormy Bot",
        lastMessage: "Hi! I'm your shopping assistant.",
        updatedAt: new Date().toISOString(),
      });
    }
    return list;
  }, [userConversations, botConvoId]);

  const unreadCount = useMemo(() => {
    if (!user) return 0;
    if (!lastOpened) return Math.min(conversations.length, 9);
    return conversations.filter(
      (c) => c.updatedAt && new Date(c.updatedAt).getTime() > lastOpened,
    ).length;
  }, [conversations, lastOpened, user]);

  const filteredConversations = useMemo(() => {
    const q = convoSearch.trim().toLowerCase();
    let list = q
      ? conversations.filter(
        (c) => c.name?.toLowerCase().includes(q) || c.lastMessage?.toLowerCase().includes(q),
      )
      : [...conversations];

    if (filterTab === "unread") {
      list = list.filter((c) => {
        if (!c.updatedAt) return false;
        return new Date(c.updatedAt).getTime() > (convoReadTimes[c.id] || 0);
      });
    } else if (filterTab === "pinned") {
      list = list.filter((c) => pinnedIds.includes(c.id));
    }

    list.sort((a, b) => {
      const ap = pinnedIds.includes(a.id);
      const bp = pinnedIds.includes(b.id);
      if (ap !== bp) return ap ? -1 : 1;
      return (b.updatedAt ? new Date(b.updatedAt).getTime() : 0) -
        (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
    });

    return list;
  }, [conversations, convoSearch, filterTab, pinnedIds, convoReadTimes]);

  const messagesQuery = useStableMemo(() => {
    if (!user || !activeConvoId) return null;
    return {
      table: "messages",
      filters: [{ column: "conversationId", op: "eq" as const, value: activeConvoId }],
      order: { column: "createdAt", ascending: true },
    };
  }, [user, activeConvoId]);

  const { data: rawMessages } = useCollection<Message>(messagesQuery);
  const messages = chatCleared ? [] : rawMessages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isBotTyping]);

  // ── Handlers ─────────────────────────────────────────────────────

  const handleOpen = () => {
    setIsMinimized(false);
    setCardRendered(true);
    const now = Date.now();
    setLastOpened(now);
    localStorage.setItem("emoorm_chat_last_opened", String(now));
    requestAnimationFrame(() => requestAnimationFrame(() => setCardVisible(true)));
  };

  const handleClose = () => {
    setCardVisible(false);
    setIsFullscreen(false);
    setShowStickerPicker(false);
    setTimeout(() => {
      setCardRendered(false);
      setActiveConvoId(null);
      setMessageInput("");
    }, 260);
  };

  const openConvo = (id: string) => {
    setActiveConvoId(id);
    setShowStickerPicker(false);
    const now = Date.now();
    setConvoReadTimes((prev) => {
      const next = { ...prev, [id]: now };
      localStorage.setItem("emoorm_convo_read_times", JSON.stringify(next));
      return next;
    });
  };

  const togglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem("emoorm_pinned_convos", JSON.stringify(next));
      return next;
    });
  };

  const sendContent = async (content: string, preview: string) => {
    if (!user || !activeConvoId) return;
    const now = new Date().toISOString();
    await supabase.from("messages").insert({
      conversationId: activeConvoId,
      senderId: user.uid,
      recipientId: isBotConvo(activeConvoId) ? "bella-bot" : "admin",
      content,
      createdAt: now,
    });
    await supabase.from("conversations").upsert(
      {
        id: activeConvoId,
        userId: user.uid,
        lastMessage: preview,
        updatedAt: now,
        name: isBotConvo(activeConvoId) ? "Moormy Bot" : "Customer Support",
      },
      { onConflict: "id" },
    );
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !user || !activeConvoId) return;
    const content = messageInput.trim();
    setMessageInput("");
    setChatCleared(false);
    await sendContent(content, content);

    if (isBotConvo(activeConvoId)) {
      setIsBotTyping(true);
      const typingTimeout = setTimeout(() => setIsBotTyping(false), 30000);
      try {
        const controller = new AbortController();
        const fetchTimeout = setTimeout(() => controller.abort(), 25000);
        const chatHistory = (messages ?? []).slice(-10).map((msg) => ({
          role: msg.senderId === user.uid ? "user" : "assistant",
          content: msg.content,
        }));
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content, language: "english", history: chatHistory, userName: user.displayName || undefined }),
          signal: controller.signal,
        });
        clearTimeout(fetchTimeout);
        let replyText = "Sorry, I'm having trouble right now. Please try again.";
        if (res.ok) {
          const ai = await res.json();
          if (ai.reply) replyText = ai.reply;
        }
        const replyTime = new Date().toISOString();
        await supabase.from("messages").insert({
          conversationId: activeConvoId,
          senderId: "bella-bot",
          recipientId: user.uid,
          content: replyText,
          createdAt: replyTime,
        });
        await supabase.from("conversations").upsert(
          { id: activeConvoId, lastMessage: replyText, updatedAt: replyTime },
          { onConflict: "id" },
        );
      } catch {
        // silent fail
      } finally {
        clearTimeout(typingTimeout);
        setIsBotTyping(false);
      }
    }
  };

  const handleSendSticker = async (emoji: string) => {
    setShowStickerPicker(false);
    await sendContent(`__sticker__:${emoji}`, emoji);
  };

  const handleImageFile = async (file: File) => {
    if (!user || !activeConvoId || !file.type.startsWith("image/")) return;
    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.uid}/${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage
        .from("chat-media")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("chat-media").getPublicUrl(data.path);
      await sendContent(`__img__:${urlData.publicUrl}`, "📷 Image");
    } catch (err) {
      console.error("Image upload failed:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (pathname !== "/") return null;

  const activeConvo = conversations.find((c) => c.id === activeConvoId);

  const isConvoUnread = (convo: Conversation) => {
    if (!convo.updatedAt) return false;
    return new Date(convo.updatedAt).getTime() > (convoReadTimes[convo.id] || 0);
  };

  const cardAnimStyle: React.CSSProperties = {
    opacity: cardVisible ? 1 : 0,
    transform: cardVisible ? "scale(1) translateY(0)" : "scale(0.92) translateY(24px)",
    transition: "opacity 240ms cubic-bezier(0.25,1,0.5,1), transform 240ms cubic-bezier(0.25,1,0.5,1)",
    transformOrigin: "bottom right",
  };

  // ── Render helpers ────────────────────────────────────────────────

  const renderConvoItem = (convo: Conversation) => {
    const isPinned = pinnedIds.includes(convo.id);
    const hasUnread = isConvoUnread(convo);
    return (
      <div
        key={convo.id}
        className={cn(
          "group relative w-full flex items-center gap-3 px-4 py-3 border-b border-black/[0.04] hover:bg-[#f5faf7] transition-colors cursor-pointer select-none",
          activeConvoId === convo.id && isFullscreen ? "bg-[#edf7f2]" : "",
        )}
        onClick={() => openConvo(convo.id)}
      >
        {isPinned && (
          <div className="absolute left-0 top-[20%] bottom-[20%] w-[3px] rounded-r-full bg-[#29a366]" />
        )}
        <div
          className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden",
            isBotConvo(convo.id) ? "bg-black" : "bg-[#29a366]",
          )}
        >
          {isBotConvo(convo.id) ? (
            <Image src="/icons/moormy-bot-v2.jpg" alt="Moormy Bot" width={40} height={40} className="object-cover h-full w-full" />
          ) : (
            convo.name?.[0] || "S"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-1 mb-0.5">
            <p className="text-sm font-medium text-[#111] truncate flex items-center gap-1">
              {isPinned && <Pin className="h-2.5 w-2.5 text-[#29a366] shrink-0" style={{ fill: "#29a366" }} />}
              {convo.name}
              {isBotConvo(convo.id) && (
                <span className="text-[8px] font-bold text-[#29a366] border border-[#29a366]/30 rounded-full px-1.5 py-0.5 leading-none ml-0.5">
                  AI
                </span>
              )}
            </p>
            <span className="text-[10px] text-[#bbb] shrink-0">{formatTime(convo.updatedAt)}</span>
          </div>
          <p className={cn("text-xs truncate", hasUnread ? "text-[#111] font-semibold" : "text-[#999]")}>
            {formatLastMessage(convo.lastMessage)}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {hasUnread && <div className="h-2 w-2 rounded-full bg-[#29a366]" />}
          <button
            onClick={(e) => { e.stopPropagation(); togglePin(convo.id); }}
            className={cn(
              "p-1 rounded-full transition-all",
              isPinned
                ? "text-[#29a366]"
                : "text-[#ccc] opacity-0 group-hover:opacity-100 hover:text-[#29a366]",
            )}
            title={isPinned ? "Unpin" : "Pin"}
          >
            <Pin className="h-3 w-3" style={{ fill: isPinned ? "#29a366" : "none" }} />
          </button>
        </div>
      </div>
    );
  };

  const renderConvoListPanel = () => {
    const unreadTabCount = conversations.filter((c) => isConvoUnread(c)).length;
    return (
      <>
        {/* Search */}
        <div className="px-3 py-2.5 border-b border-black/[0.05] shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#bbb]" />
            <input
              type="text"
              placeholder="Search conversations…"
              value={convoSearch}
              onChange={(e) => setConvoSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-7 rounded-[7px] bg-[#f2f2f0] border border-black/[0.06] text-xs outline-none focus:border-[#29a366] transition-colors"
            />
            {convoSearch && (
              <button onClick={() => setConvoSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#bbb] hover:text-[#888]">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-black/[0.05] shrink-0 bg-white">
          {(["all", "unread", "pinned"] as const).map((tab) => {
            const label = tab === "all" ? "All" : tab === "unread" ? "Unread" : "Pinned";
            const badge =
              tab === "unread" ? unreadTabCount
                : tab === "pinned" ? pinnedIds.length
                  : null;
            return (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={cn(
                  "flex-1 py-2 text-[11px] font-semibold flex items-center justify-center gap-1 border-b-2 transition-colors",
                  filterTab === tab
                    ? "text-[#29a366] border-[#29a366]"
                    : "text-[#aaa] border-transparent hover:text-[#777]",
                )}
              >
                {label}
                {badge !== null && badge > 0 && (
                  <span className={cn(
                    "text-[9px] font-bold rounded-full px-1.5 py-0.5 leading-none",
                    filterTab === tab ? "bg-[#29a366] text-white" : "bg-[#eee] text-[#888]",
                  )}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((convo) => renderConvoItem(convo))
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-10 opacity-40 text-center px-4">
              <Search className="h-6 w-6" />
              <p className="text-xs">
                {filterTab === "pinned" ? "No pinned conversations" : filterTab === "unread" ? "All caught up!" : "No results"}
              </p>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderStickerPicker = () => (
    <div
      className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-black/[0.08] rounded-[12px] shadow-xl z-10 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex border-b border-black/[0.05]">
        {STICKER_GROUPS.map((g, i) => (
          <button
            key={i}
            onClick={() => setActiveStickerGroup(i)}
            title={g.title}
            className={cn(
              "flex-1 py-2 text-lg transition-colors",
              activeStickerGroup === i ? "bg-[#f0faf5]" : "hover:bg-[#fafafa]",
            )}
          >
            {g.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-6 gap-0.5 p-2 max-h-[144px] overflow-y-auto">
        {STICKER_GROUPS[activeStickerGroup].items.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleSendSticker(emoji)}
            className="text-2xl p-1.5 rounded-[6px] hover:bg-[#f2f2f0] transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );

  const renderChatInput = () => (
    <div className="px-3 py-2.5 border-t border-black/[0.05] shrink-0 relative">
      {showStickerPicker && renderStickerPicker()}
      <form onSubmit={handleSendMessage} className="flex items-center gap-1.5">
        {/* Image upload */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 bg-[#f2f2f0] hover:bg-[#e8e8e5] transition-colors disabled:opacity-40"
          title="Send image"
        >
          {isUploading ? (
            <div className="h-4 w-4 border-2 border-[#29a366] border-t-transparent rounded-full animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4 text-[#888]" />
          )}
        </button>

        {/* Text input */}
        <input
          type="text"
          placeholder="Message…"
          autoFocus
          className="flex-1 bg-[#f2f2f0] border border-black/[0.08] rounded-full px-3.5 h-9 text-sm outline-none focus:border-[#29a366] transition-all"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
        />

        {/* Sticker toggle */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowStickerPicker((v) => !v); }}
          className={cn(
            "h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-colors",
            showStickerPicker ? "bg-[#29a366]" : "bg-[#f2f2f0] hover:bg-[#e8e8e5]",
          )}
          title="Stickers"
        >
          <Smile className={cn("h-4 w-4", showStickerPicker ? "text-white" : "text-[#888]")} />
        </button>

        {/* Send */}
        <button
          type="submit"
          disabled={!messageInput.trim() || isBotTyping}
          className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
          style={{ background: "#29a366" }}
        >
          <Send className="h-4 w-4 text-white" />
        </button>
      </form>
    </div>
  );

  const renderMessages = () => (
    <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-2.5">
      {(!messages || messages.length === 0) && !isBotTyping ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 opacity-30">
          {isBotConvo(activeConvoId) ? <Sparkles className="h-8 w-8" /> : <MessageSquare className="h-8 w-8" />}
          <p className="text-xs">Start the conversation!</p>
        </div>
      ) : (
        <>
          {messages?.map((msg) => {
            const isMe = msg.senderId === user!.uid;
            const { node, bubbleless } = renderMsgContent(msg.content);
            return (
              <div
                key={msg.id}
                className={cn("max-w-[85%] flex flex-col", isMe ? "self-end items-end" : "self-start items-start")}
              >
                {bubbleless ? (
                  <div className="px-1">{node}</div>
                ) : (
                  <div
                    className={cn(
                      "px-3.5 py-2 text-[13px] leading-relaxed rounded-[16px]",
                      isMe ? "text-white rounded-br-[4px]" : "bg-[#f2f2f0] text-[#111] rounded-bl-[4px]",
                    )}
                    style={isMe ? { background: "#29a366" } : {}}
                  >
                    {node}
                  </div>
                )}
                <span className="text-[9px] text-[#bbb] mt-0.5 px-1">{formatTime(msg.createdAt)}</span>
              </div>
            );
          })}
          {isBotTyping && (
            <div className="self-start flex gap-1 items-center bg-[#f2f2f0] rounded-[16px] rounded-bl-[4px] px-3.5 py-3">
              {[0, 100, 200].map((d) => (
                <div key={d} className="h-1.5 w-1.5 bg-[#aaa] rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          )}
        </>
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  // ── JSX ──────────────────────────────────────────────────────────

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); }}
      />

      {/* Floating trigger — bottom-right edge tab */}
      <button
        onClick={cardRendered && cardVisible ? handleClose : handleOpen}
        aria-label={cardVisible ? "Close chat" : "Open messages"}
        className="fixed bottom-0 right-6 z-[10001] flex items-center gap-2.5 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.12)] px-4 pt-3 pb-3 hover:pt-4 transition-all duration-200 active:scale-95 border border-b-0 border-black/[0.08]"
        style={{ borderRadius: "12px 12px 0 0" }}
      >
        <div className="relative shrink-0">
          <MessageSquare className="h-5 w-5" style={{ color: "#1a5c4f", fill: "#1a5c4f" }} />
          <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-white" style={{ background: "#1a5c4f" }} />
        </div>
        <span className="text-sm font-semibold whitespace-nowrap" style={{ color: "#1a5c4f" }}>
          {cardVisible ? "Close" : "Messages"}
        </span>
        {unreadCount > 0 && !cardVisible && (
          <span className="h-5 min-w-[20px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Chat card */}
      {cardRendered && (
        <div
          className={cn(
            "z-[10000] bg-white rounded-[14px] shadow-2xl border border-black/[0.08] flex flex-col overflow-hidden",
            isFullscreen ? "fixed inset-4" : "fixed bottom-24 right-6 w-[calc(100vw-3rem)] max-w-[360px]",
          )}
          style={{ ...cardAnimStyle, height: isFullscreen ? undefined : isMinimized ? "auto" : 500 }}
        >
          {/* Header */}
          <div className="px-4 flex items-center gap-2 shrink-0" style={{ background: "#29a366", height: 56 }}>
            {activeConvoId && !isFullscreen && (
              <button
                onClick={() => { setActiveConvoId(null); setConvoVisible(false); setMessageInput(""); setShowStickerPicker(false); }}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors shrink-0"
              >
                <ArrowLeft className="h-4 w-4 text-white" />
              </button>
            )}

            <div className="h-8 w-8 rounded-full overflow-hidden bg-white/20 flex items-center justify-center shrink-0">
              {activeConvoId && !isFullscreen ? (
                isBotConvo(activeConvoId) ? (
                  <Image src="/icons/moormy-bot.jpg" alt="Moormy Bot" width={32} height={32} className="object-cover h-full w-full" />
                ) : (
                  <span className="text-white text-sm font-bold">{activeConvo?.name?.[0] || "S"}</span>
                )
              ) : (
                <MessageSquare className="h-4 w-4 text-white" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {activeConvoId && !isFullscreen ? (activeConvo?.name || "Chat") : "Messages"}
              </p>
              <p className="text-[10px] text-white/70">
                {activeConvoId && !isFullscreen
                  ? isBotConvo(activeConvoId) ? "Shopping Assistant" : "Support"
                  : user
                    ? `${conversations.length} conversation${conversations.length !== 1 ? "s" : ""}`
                    : "Sign in to chat"}
              </p>
            </div>

            <div className="flex items-center shrink-0">
              {!isFullscreen && (
                <button
                  onClick={() => setIsMinimized((m) => !m)}
                  className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
                  title={isMinimized ? "Expand" : "Minimize"}
                >
                  <ChevronDown
                    className="h-4 w-4 text-white/90 transition-transform duration-200"
                    style={{ transform: isMinimized ? "rotate(180deg)" : "rotate(0deg)" }}
                  />
                </button>
              )}
              <button
                onClick={() => { setIsFullscreen((f) => !f); setIsMinimized(false); }}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4 text-white/90" /> : <Maximize2 className="h-4 w-4 text-white/90" />}
              </button>
              <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors" title="Close">
                <X className="h-4 w-4 text-white/90" />
              </button>
            </div>
          </div>

          {/* Body */}
          {!isMinimized && (
            <>
              {!user ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
                  <MessageSquare className="h-10 w-10 text-[#ddd]" strokeWidth={1.5} />
                  <p className="text-sm text-[#888] leading-relaxed">Sign in to chat with sellers or our AI shopping assistant.</p>
                  <a href="/login" className="text-sm font-semibold px-5 py-2.5 rounded-[8px] text-white transition-opacity hover:opacity-90" style={{ background: "#29a366" }}>
                    Sign In
                  </a>
                </div>
              ) : isFullscreen ? (
                /* ── Two-column fullscreen ── */
                <div className="flex flex-1 min-h-0">
                  <div className="w-[300px] shrink-0 border-r border-black/[0.07] flex flex-col bg-[#fafafa]">
                    {renderConvoListPanel()}
                  </div>
                  <div className="flex-1 flex flex-col min-h-0 bg-white">
                    {activeConvoId ? (
                      <>
                        <div className="px-4 h-12 flex items-center gap-3 border-b border-black/[0.06] shrink-0">
                          <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden", isBotConvo(activeConvoId) ? "bg-black" : "bg-[#29a366]")}>
                            {isBotConvo(activeConvoId) ? (
                              <Image src="/icons/moormy-bot.jpg" alt="Moormy Bot" width={32} height={32} className="object-cover h-full w-full" />
                            ) : (
                              <span>{activeConvo?.name?.[0] || "S"}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#111] truncate">{activeConvo?.name || "Chat"}</p>
                            <p className="text-[10px] text-[#999]">{isBotConvo(activeConvoId) ? "Shopping Assistant" : "Support"}</p>
                          </div>
                        </div>
                        {renderMessages()}
                        {renderChatInput()}
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
                        <MessageSquare className="h-12 w-12 text-[#ddd]" strokeWidth={1.5} />
                        <p className="text-sm text-[#bbb]">Select a conversation to start chatting</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : activeConvoId ? (
                /* ── Single-column: active chat ── */
                <div
                  className="flex-1 flex flex-col min-h-0"
                  style={{
                    opacity: convoVisible ? 1 : 0,
                    transform: convoVisible ? "translateX(0)" : "translateX(20px)",
                    transition: "opacity 200ms ease, transform 200ms ease",
                  }}
                >
                  {renderMessages()}
                  {renderChatInput()}
                </div>
              ) : (
                /* ── Single-column: list ── */
                <div className="flex-1 flex flex-col min-h-0">
                  {renderConvoListPanel()}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
