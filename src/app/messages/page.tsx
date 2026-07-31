"use client";

import React, { useState, useEffect, useRef, Suspense, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProfileSidebar } from "@/app/profile/page";
import { FirstTimeIntro } from "@/components/first-time-intro";
import Image from "next/image";
import {
  MessagesSquare,
  Send,
  ArrowLeft,
  MoreVertical,
  Sparkles,
  Search,
  Languages,
  Trash2,
  Info,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useUser,
  useSupabase,
  useCollection,
  useStableMemo,
  useSupabaseAuth,
} from "@/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

interface Conversation {
  id: string;
  name: string;
  lastMessage?: string;
  updatedAt?: string;
  userId?: string;
  recipientId?: string;
  avatar?: string;
}

interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
}

function formatMessageTime(timestamp: string | null) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function isBotConvo(id: string | null | undefined): boolean {
  return !!id && (id === "bella-bot" || id.startsWith("bella-bot-"));
}

function MessagesContent() {
  const { user, isUserLoading } = useUser();
  const { auth } = useSupabaseAuth();
  const supabase = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeConversationId = searchParams.get("id");
  const [messageInput, setMessageInput] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [botLanguage, setBotLanguage] = useState<"english" | "tagalog">(
    "english",
  );
  const [chatCleared, setChatCleared] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChatHidden, setIsChatHidden] = useState(false);
  const [mobileSlideIn, setMobileSlideIn] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/login");
    } catch {}
  };

  useEffect(() => {
    const check = () => setIsMobileView(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Escape key exits fullscreen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsFullscreen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Mobile slide-in animation: two-frame pattern (start off-screen, then transition in)
  useEffect(() => {
    if (!activeConversationId) { setMobileSlideIn(false); return; }
    setMobileSlideIn(false);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setMobileSlideIn(true)));
    return () => cancelAnimationFrame(id);
  }, [activeConversationId]);

  // Desktop chat fade-in animation
  useEffect(() => {
    if (!activeConversationId || isChatHidden) { setChatVisible(false); return; }
    setChatVisible(false);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setChatVisible(true)));
    return () => cancelAnimationFrame(id);
  }, [activeConversationId, isChatHidden]);

  const conversationsQuery = useStableMemo(() => {
    if (!user) return null;
    return {
      table: "conversations",
      filters: [{ column: "userId", op: "eq" as const, value: user.uid }],
      order: { column: "updatedAt", ascending: false },
    };
  }, [user]);

  const { data: userConversations } =
    useCollection<Conversation>(conversationsQuery);

  const botConvoId = user ? `bella-bot-${user.uid}` : "bella-bot";

  const conversations = useMemo(() => {
    const list = userConversations ? [...userConversations] : [];
    if (!list.find((c) => isBotConvo(c.id))) {
      list.unshift({
        id: botConvoId,
        name: "Moormy Bot",
        lastMessage: "Hi! I'm your shopping assistant. How can I help?",
        updatedAt: new Date().toISOString(),
      });
    }
    return list;
  }, [userConversations, botConvoId]);

  const messagesQuery = useStableMemo(() => {
    if (!user || !activeConversationId) return null;
    return {
      table: "messages",
      filters: [
        {
          column: "conversationId",
          op: "eq" as const,
          value: activeConversationId,
        },
      ],
      order: { column: "createdAt", ascending: true },
    };
  }, [user, activeConversationId]);

  const { data: rawMessages } = useCollection<Message>(messagesQuery);
  const messages = chatCleared ? [] : rawMessages;

  useEffect(() => {
    if (chatCleared && rawMessages && rawMessages.length > 0)
      setChatCleared(false);
  }, [chatCleared, rawMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isBotTyping]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !user || !activeConversationId) return;

    const content = messageInput.trim();
    setMessageInput("");
    setChatCleared(false);
    const now = new Date().toISOString();

    await supabase.from("messages").insert({
      conversationId: activeConversationId,
      senderId: user.uid,
      recipientId: isBotConvo(activeConversationId)
        ? "bella-bot"
        : (activeConversation?.recipientId || "admin"),
      content,
      createdAt: now,
    });

    await supabase.from("conversations").upsert(
      {
        id: activeConversationId,
        userId: user.uid,
        lastMessage: content,
        updatedAt: now,
        name: isBotConvo(activeConversationId)
          ? "Moormy Bot"
          : (activeConversation?.name || "Customer Support"),
        ...(activeConversation?.recipientId
          ? { recipientId: activeConversation.recipientId }
          : {}),
        ...(activeConversation?.avatar
          ? { avatar: activeConversation.avatar }
          : {}),
      },
      { onConflict: "id" },
    );

    if (isBotConvo(activeConversationId)) {
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
          body: JSON.stringify({
            message: content,
            language: botLanguage,
            history: chatHistory,
            userName: user.displayName || undefined,
          }),
          signal: controller.signal,
        });
        clearTimeout(fetchTimeout);

        let replyText =
          "Sorry, I'm having trouble right now. Please try again later.";
        if (res.ok) {
          const aiResponse = await res.json();
          if (aiResponse.reply) replyText = aiResponse.reply;
        }

        const replyTime = new Date().toISOString();
        await supabase.from("messages").insert({
          conversationId: activeConversationId,
          senderId: "bella-bot",
          recipientId: user.uid,
          content: replyText,
          createdAt: replyTime,
        });
        await supabase.from("conversations").upsert(
          {
            id: activeConversationId,
            lastMessage: replyText,
            updatedAt: replyTime,
          },
          { onConflict: "id" },
        );
      } catch (error) {
        const fallbackTime = new Date().toISOString();
        const fallbackMsg =
          "Sorry, I'm having trouble responding right now. Please try again in a moment.";
        try {
          await supabase.from("messages").insert({
            conversationId: activeConversationId,
            senderId: "bella-bot",
            recipientId: user.uid,
            content: fallbackMsg,
            createdAt: fallbackTime,
          });
          await supabase.from("conversations").upsert(
            {
              id: activeConversationId,
              lastMessage: fallbackMsg,
              updatedAt: fallbackTime,
            },
            { onConflict: "id" },
          );
        } catch (_) {}
      } finally {
        clearTimeout(typingTimeout);
        setIsBotTyping(false);
      }
    }
  };

  const activeConversation = conversations?.find(
    (c) => c.id === activeConversationId,
  );
  const showList = !isMobileView || !activeConversationId;
  const showChat = !isMobileView || activeConversationId;

  // ── Loading ──────────────────────────────────────────────────────────
  if (isUserLoading)
    return (
      <div
        className="flex min-h-screen flex-col"
        style={{ backgroundColor: "#f2f2f0" }}
      >
        <Header />
        <main className="flex-grow pt-6">
          <div className="max-w-[1280px] mx-auto px-4 md:px-8 pb-8 flex gap-5 items-start">
            <div className="hidden md:flex flex-col w-[200px] shrink-0 gap-2.5">
              <Skeleton className="h-[280px] rounded-[5px]" />
              <Skeleton className="h-[110px] rounded-[5px]" />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <Skeleton className="h-[72px] rounded-[5px]" />
              <Skeleton
                className="rounded-[5px]"
                style={{ height: "calc(100vh - 260px)", minHeight: 480 }}
              />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );

  // ── Mobile active chat: full-screen overlay ─────────────────────────
  if (isMobileView && activeConversationId) {
    return (
      <div
        className="fixed inset-0 z-[1001] flex flex-col bg-white"
        style={{
          transform: mobileSlideIn ? "translateX(0)" : "translateX(100%)",
          transition: "transform 300ms cubic-bezier(0.25,1,0.5,1)",
        }}
      >
        {/* Mobile chat header */}
        <div className="h-14 px-4 border-b border-black/[0.05] flex items-center gap-3 shrink-0 bg-white">
          <button
            onClick={() => router.push("/messages")}
            className="p-1.5 hover:bg-[#f2f2f0] rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div
            className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden",
              isBotConvo(activeConversationId) ? "bg-black" : "bg-[#29a366]",
            )}
          >
            {isBotConvo(activeConversationId) ? (
              <Image
                src="/icons/moormy-bot.jpg"
                alt="Moormy Bot"
                width={36}
                height={36}
                className="object-cover h-full w-full"
              />
            ) : activeConversation?.avatar ? (
              <img
                src={activeConversation.avatar}
                alt={activeConversation.name}
                className="h-full w-full object-cover"
              />
            ) : (
              activeConversation?.name?.[0]?.toUpperCase() || "S"
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#111] truncate">
              {activeConversation?.name}
            </p>
            <p className="text-[11px] text-[#29a366]">
              {isBotConvo(activeConversationId)
                ? "Shopping Assistant"
                : "Online"}
            </p>
          </div>
          {isBotConvo(activeConversationId) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 hover:bg-[#f2f2f0] rounded-full">
                  <MoreVertical className="h-5 w-5 text-[#999]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-52 rounded-[10px] p-1.5 border border-black/[0.06] bg-white shadow-lg z-[1100]"
              >
                <DropdownMenuItem
                  onClick={() =>
                    setBotLanguage((p) =>
                      p === "english" ? "tagalog" : "english",
                    )
                  }
                  className="rounded-[5px] px-3 py-2.5 cursor-pointer gap-2.5"
                >
                  <Languages className="h-4 w-4" />
                  <span className="text-sm">
                    {botLanguage === "english"
                      ? "Switch to Tagalog"
                      : "Switch to English"}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    if (!user) return;
                    setChatCleared(true);
                    await supabase
                      .from("messages")
                      .delete()
                      .eq("conversationId", activeConversationId!);
                    await supabase
                      .from("conversations")
                      .update({ lastMessage: "Chat cleared" })
                      .eq("id", activeConversationId!);
                  }}
                  className="rounded-[5px] px-3 py-2.5 cursor-pointer gap-2.5 text-red-500 focus:text-red-600 focus:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="text-sm">Clear Chat</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
          {(!messages || messages.length === 0) && !isBotTyping ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
              {isBotConvo(activeConversationId) ? (
                <Sparkles className="h-10 w-10 mb-3" />
              ) : (
                <MessagesSquare className="h-10 w-10 mb-3 text-[#29a366]" />
              )}
              <p className="text-sm">How can we help you today?</p>
            </div>
          ) : (
            <>
              {messages?.map((msg) => {
                const isMe = msg.senderId === user?.uid;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "max-w-[80%] flex flex-col",
                      isMe ? "self-end items-end" : "self-start items-start",
                    )}
                  >
                    <div
                      className={cn(
                        "px-4 py-2.5 text-sm rounded-[18px]",
                        isMe
                          ? "bg-[#29a366] text-white rounded-br-[4px]"
                          : "bg-[#f2f2f0] text-[#111] rounded-bl-[4px]",
                      )}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[9px] text-[#bbb] mt-1 px-1">
                      {formatMessageTime(msg.createdAt)}
                    </span>
                  </div>
                );
              })}
              {isBotTyping && (
                <div className="self-start flex gap-1 items-center bg-[#f2f2f0] rounded-[18px] rounded-bl-[4px] px-4 py-3">
                  {[0, 100, 200].map((d) => (
                    <div
                      key={d}
                      className="h-1.5 w-1.5 bg-[#aaa] rounded-full animate-bounce"
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} className="h-2" />
        </div>

        {/* Input */}
        <div
          className="px-4 py-3 border-t border-black/[0.05] bg-white"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
        >
          <form
            onSubmit={handleSendMessage}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Message…"
              className="flex-1 bg-[#f2f2f0] border border-black/[0.08] rounded-full px-4 h-10 text-sm outline-none focus:border-[#29a366] transition-all"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
            />
            <button
              type="submit"
              disabled={!messageInput.trim() || isBotTyping}
              className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
              style={{ background: "#29a366" }}
            >
              <Send className="h-4 w-4 text-white" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Desktop / tablet layout ─────────────────────────────────────────
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: "#f2f2f0" }}
    >
      <Header />
      <main className="flex-grow pt-6">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 pb-8 flex gap-5 items-start">
          <ProfileSidebar onLogout={handleLogout} />

          <div className="flex-1 min-w-0 space-y-3">
            {/* Page header card */}
            <div className="bg-white rounded-[5px] border border-black/[0.06] px-6 py-5">
              <h1 className="text-lg font-semibold text-[#111]">Messages</h1>
              <p className="text-sm text-[#888]">
                {conversations.length} conversation
                {conversations.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Chat card */}
            <div
              className={cn(
                "bg-white overflow-hidden flex",
                isFullscreen
                  ? "fixed inset-0 z-[200]"
                  : "rounded-[5px] border border-black/[0.06]",
              )}
              style={isFullscreen ? {} : { height: "calc(100vh - 260px)", minHeight: 500 }}
            >
              {/* Conversations list */}
              {showList && (
                <aside className="w-[280px] shrink-0 flex flex-col border-r border-black/[0.05]">
                  {/* Search */}
                  <div className="px-4 py-3 border-b border-black/[0.05]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#bbb]" />
                      <input
                        type="text"
                        placeholder="Search conversations…"
                        className="w-full bg-[#f2f2f0] border border-black/[0.08] rounded-md pl-8 pr-3 py-2 text-xs text-[#111] placeholder:text-[#bbb] outline-none focus:border-[#29a366] transition-all"
                      />
                    </div>
                  </div>

                  {/* List */}
                  <div className="flex-1 overflow-y-auto">
                    {conversations.map((convo) => (
                      <div
                        key={convo.id}
                        onClick={() => { router.push(`/messages?id=${convo.id}`); setIsChatHidden(false); }}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-black/[0.04] transition-colors",
                          activeConversationId === convo.id
                            ? "bg-[#f2f2f0]"
                            : "hover:bg-[#fafafa]",
                        )}
                      >
                        <div
                          className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden",
                            isBotConvo(convo.id) ? "bg-black" : "bg-[#29a366]",
                          )}
                        >
                          {isBotConvo(convo.id) ? (
                            <Image
                              src="/icons/moormy-bot-v2.jpg"
                              alt="Moormy Bot"
                              width={40}
                              height={40}
                              className="object-cover h-full w-full"
                            />
                          ) : convo.avatar ? (
                            <img
                              src={convo.avatar}
                              alt={convo.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            convo.name?.[0]?.toUpperCase() || "S"
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-1 mb-0.5">
                            <p className="text-sm font-medium text-[#111] truncate flex items-center gap-1.5">
                              {convo.name}
                              {isBotConvo(convo.id) && (
                                <span className="text-[8px] font-bold text-[#29a366] border border-[#29a366]/30 rounded-full px-1.5 py-0.5 leading-none ">
                                  AI
                                </span>
                              )}
                            </p>
                            <span className="text-[10px] text-[#bbb] shrink-0">
                              {formatMessageTime(convo.updatedAt || null)}
                            </span>
                          </div>
                          <p className="text-xs text-[#999] truncate">
                            {convo.lastMessage || "Start a chat"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </aside>
              )}

              {/* Chat window — hidden placeholder */}
              {showChat && isChatHidden && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
                  <MessagesSquare className="h-10 w-10 text-[#ddd]" strokeWidth={1.5} />
                  <p className="text-sm text-[#888]">Chat hidden</p>
                  <button
                    onClick={() => setIsChatHidden(false)}
                    className="text-xs font-semibold hover:underline"
                    style={{ color: "#29a366" }}
                  >
                    Show chat
                  </button>
                </div>
              )}

              {/* Chat window */}
              {showChat && !isChatHidden && (
                <section
                  className="flex-1 flex flex-col min-w-0"
                  style={{
                    opacity: chatVisible ? 1 : 0,
                    transform: chatVisible ? "translateX(0)" : "translateX(14px)",
                    transition: "opacity 220ms ease, transform 220ms ease",
                  }}
                >
                  {activeConversationId ? (
                    <>
                      {/* Chat header */}
                      <div className="h-14 px-5 border-b border-black/[0.05] flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden",
                              isBotConvo(activeConversationId)
                                ? "bg-black"
                                : "bg-[#29a366]",
                            )}
                          >
                            {isBotConvo(activeConversationId) ? (
                              <Image
                                src="/icons/moormy-bot.jpg"
                                alt="Moormy Bot"
                                width={36}
                                height={36}
                                className="object-cover h-full w-full"
                              />
                            ) : activeConversation?.avatar ? (
                              <img
                                src={activeConversation.avatar}
                                alt={activeConversation.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              activeConversation?.name?.[0]?.toUpperCase() || "S"
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#111]">
                              {activeConversation?.name}
                            </p>
                            <p className="text-[11px] text-[#29a366]">
                              {isBotConvo(activeConversationId)
                                ? "Shopping Assistant Active"
                                : "Online"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {/* Fullscreen toggle */}
                          <button
                            onClick={() => setIsFullscreen((f) => !f)}
                            className="p-2 hover:bg-[#f2f2f0] rounded-full transition-colors outline-none"
                            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                          >
                            {isFullscreen
                              ? <Minimize2 className="h-4 w-4 text-[#999]" />
                              : <Maximize2 className="h-4 w-4 text-[#999]" />}
                          </button>
                          {/* Hide chat */}
                          <button
                            onClick={() => { setIsChatHidden(true); setIsFullscreen(false); }}
                            className="p-2 hover:bg-[#f2f2f0] rounded-full transition-colors outline-none"
                            title="Hide chat"
                          >
                            <X className="h-4 w-4 text-[#999]" />
                          </button>
                          {isBotConvo(activeConversationId) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-2 hover:bg-[#f2f2f0] rounded-full transition-colors outline-none">
                                <MoreVertical className="h-4 w-4 text-[#999]" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-52 rounded-[10px] p-1.5 border border-black/[0.06] bg-white shadow-lg z-[1100]"
                              sideOffset={8}
                            >
                              <DropdownMenuLabel className="px-3 py-1.5 text-[10px] font-bold text-[#aaa] ">
                                Bot Options
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-black/[0.05]" />
                              <DropdownMenuItem
                                onClick={() =>
                                  setBotLanguage((p) =>
                                    p === "english" ? "tagalog" : "english",
                                  )
                                }
                                className="rounded-[5px] px-3 py-2.5 cursor-pointer gap-2.5 text-sm"
                              >
                                <Languages className="h-4 w-4" />
                                {botLanguage === "english"
                                  ? "Switch to Tagalog"
                                  : "Switch to English"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={async () => {
                                  if (!user) return;
                                  setChatCleared(true);
                                  try {
                                    await supabase
                                      .from("messages")
                                      .delete()
                                      .eq(
                                        "conversationId",
                                        activeConversationId!,
                                      );
                                    await supabase
                                      .from("conversations")
                                      .update({ lastMessage: "Chat cleared" })
                                      .eq("id", activeConversationId!);
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="rounded-[5px] px-3 py-2.5 cursor-pointer gap-2.5 text-sm text-red-500 focus:text-red-600 focus:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                Clear Chat
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  alert(
                                    "Moormy Bot — AI shopping assistant.\nPowered by Qwen2.5-72B-Instruct.\nAsk me about products, stores, orders, and more!",
                                  )
                                }
                                className="rounded-[5px] px-3 py-2.5 cursor-pointer gap-2.5 text-sm"
                              >
                                <Info className="h-4 w-4" />
                                About Moormy Bot
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-3">
                        {(!messages || messages.length === 0) &&
                        !isBotTyping ? (
                          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
                            {isBotConvo(activeConversationId) ? (
                              <Sparkles className="h-10 w-10 mb-3" />
                            ) : (
                              <MessagesSquare className="h-10 w-10 mb-3 text-[#29a366]" />
                            )}
                            <p className="text-sm">
                              How can we help you today?
                            </p>
                          </div>
                        ) : (
                          <>
                            {messages?.map((msg) => {
                              const isMe = msg.senderId === user?.uid;
                              return (
                                <div
                                  key={msg.id}
                                  className={cn(
                                    "max-w-[75%] flex flex-col",
                                    isMe
                                      ? "self-end items-end"
                                      : "self-start items-start",
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "px-4 py-2.5 text-sm rounded-[18px]",
                                      isMe
                                        ? "bg-[#29a366] text-white rounded-br-[4px]"
                                        : "bg-[#f2f2f0] text-[#111] rounded-bl-[4px]",
                                    )}
                                  >
                                    {msg.content
                                      .split("\n")
                                      .map((line: string, i: number) => {
                                        if (
                                          /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)/i.test(
                                            line.trim(),
                                          ) ||
                                          /supabase\.co\/storage/.test(
                                            line.trim(),
                                          )
                                        ) {
                                          return (
                                            <img
                                              key={i}
                                              src={line.trim()}
                                              alt="Shared image"
                                              className="max-w-[200px] rounded-[10px] mt-1 mb-1 border border-white/20"
                                            />
                                          );
                                        }
                                        return (
                                          <span key={i}>
                                            {line}
                                            {i <
                                              msg.content.split("\n").length -
                                                1 && <br />}
                                          </span>
                                        );
                                      })}
                                  </div>
                                  <span className="text-[9px] text-[#bbb] mt-1 px-1">
                                    {formatMessageTime(msg.createdAt)}
                                  </span>
                                </div>
                              );
                            })}
                            {isBotTyping && (
                              <div className="self-start flex gap-1 items-center bg-[#f2f2f0] rounded-[18px] rounded-bl-[4px] px-4 py-3">
                                {[0, 100, 200].map((d) => (
                                  <div
                                    key={d}
                                    className="h-1.5 w-1.5 bg-[#aaa] rounded-full animate-bounce"
                                    style={{ animationDelay: `${d}ms` }}
                                  />
                                ))}
                              </div>
                            )}
                          </>
                        )}
                        <div ref={messagesEndRef} className="h-2" />
                      </div>

                      {/* Input bar */}
                      <div className="px-5 py-3 border-t border-black/[0.05] shrink-0">
                        <form
                          onSubmit={handleSendMessage}
                          className="flex items-center gap-2"
                        >
                          <input
                            type="text"
                            placeholder="Message…"
                            className="flex-1 bg-[#f2f2f0] border border-black/[0.08] rounded-full px-4 h-9 text-sm outline-none focus:border-[#29a366] focus:bg-white transition-all"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                          />
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
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                      <div className="h-20 w-20 rounded-full bg-[#f2f2f0] border border-black/[0.06] flex items-center justify-center mb-4">
                        <MessagesSquare
                          className="h-10 w-10 text-[#ccc]"
                          strokeWidth={1.5}
                        />
                      </div>
                      <h2 className="text-base font-semibold text-[#111] mb-1">
                        Select a conversation
                      </h2>
                      <p className="text-sm text-[#888] max-w-[240px] leading-relaxed">
                        Connect with sellers or chat with our AI shopping
                        assistant.
                      </p>
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>
      </main>

      <FirstTimeIntro
        storageKey="messages"
        title="Messages"
        description="Chat with sellers, get support, and use Moormy Bot for instant help in English or Tagalog."
        icon={<MessagesSquare className="h-7 w-7" />}
      />
      <Footer />
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesContent />
    </Suspense>
  );
}
