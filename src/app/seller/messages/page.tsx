"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { SellerLayout } from "@/components/layout/seller-layout";
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Search,
  User,
  Loader2,
} from "lucide-react";
import {
  useSupabaseAuth,
  useSupabase,
  useStableMemo,
  useCollection,
} from "@/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
}

function formatTime(ts: string | null | undefined) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function initials(id: string) {
  return id?.slice(0, 2).toUpperCase() || "??";
}

export default function SellerMessagesPage() {
  const { user } = useSupabaseAuth();
  const supabase = useSupabase();
  const [search, setSearch] = useState("");
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages sent TO this seller
  const receivedConfig = useStableMemo(
    () =>
      user
        ? {
          table: "messages",
          filters: [
            { column: "recipientId", op: "eq" as const, value: user.uid },
          ],
          order: { column: "createdAt", ascending: false },
        }
        : null,
    [user],
  );
  const { data: receivedMessages, isLoading } =
    useCollection<Message>(receivedConfig);

  // Build conversation threads from received messages
  const conversations = useMemo(() => {
    if (!receivedMessages) return [];
    const map = new Map<
      string,
      {
        convoId: string;
        senderId: string;
        lastMessage: string;
        updatedAt: string;
      }
    >();
    for (const msg of receivedMessages) {
      if (!map.has(msg.conversationId)) {
        map.set(msg.conversationId, {
          convoId: msg.conversationId,
          senderId: msg.senderId,
          lastMessage: msg.content,
          updatedAt: msg.createdAt,
        });
      }
    }
    return Array.from(map.values());
  }, [receivedMessages]);

  // Fetch buyer names for display
  const buyerIds = useMemo(() => {
    if (!conversations) return [];
    return [...new Set(conversations.map((c) => c.senderId))];
  }, [conversations]);

  const buyerNamesQuery = useStableMemo(
    () =>
      buyerIds.length > 0
        ? { table: "users", filters: [{ column: "id", op: "in" as const, value: buyerIds }] }
        : null,
    [buyerIds],
  );
  const { data: buyerUsers } = useCollection<{ id: string; firstName?: string; lastName?: string; email?: string }>(buyerNamesQuery);

  const buyerNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    buyerUsers?.forEach((u) => {
      const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
      map[u.id] = name || u.email?.split("@")[0] || "Buyer";
    });
    return map;
  }, [buyerUsers]);

  const filteredConvos = useMemo(
    () =>
      conversations.filter(
        (c) =>
          !search ||
          c.senderId.toLowerCase().includes(search.toLowerCase()) ||
          c.lastMessage?.toLowerCase().includes(search.toLowerCase()),
      ),
    [conversations, search],
  );

  // Fetch full thread for active conversation
  const threadConfig = useStableMemo(
    () =>
      user && activeConvoId
        ? {
          table: "messages",
          filters: [
            {
              column: "conversationId",
              op: "eq" as const,
              value: activeConvoId,
            },
          ],
          order: { column: "createdAt", ascending: true },
        }
        : null,
    [user, activeConvoId],
  );
  const { data: threadMessages } = useCollection<Message>(threadConfig);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages]);

  const activeConvo = conversations.find((c) => c.convoId === activeConvoId);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !user || !activeConvoId || !activeConvo) return;
    setSending(true);
    const content = messageInput.trim();
    setMessageInput("");
    const now = new Date().toISOString();
    try {
      await supabase.from("messages").insert({
        conversationId: activeConvoId,
        senderId: user.uid,
        recipientId: activeConvo.senderId,
        content,
        createdAt: now,
      });
      await supabase.from("conversations").upsert(
        {
          id: activeConvoId,
          lastMessage: content,
          updatedAt: now,
        },
        { onConflict: "id" },
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <SellerLayout>
      <div className="px-4 md:px-6 pt-6 pb-8">
        <div
          className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden flex"
          style={{ minHeight: 520 }}
        >
          {/* Sidebar — conversation list */}
          <div
            className={cn(
              "w-full md:w-72 shrink-0 border-r border-black/[0.06] flex flex-col",
              activeConvoId && "hidden md:flex",
            )}
          >
            {/* Search */}
            <div className="p-3 border-b border-black/[0.06]">
              <div className="flex items-center gap-2 bg-[#f2f2f0] rounded-xl px-3 h-9">
                <Search className="h-3.5 w-3.5 text-[#bbb] shrink-0" />
                <input
                  type="text"
                  placeholder="Search messages…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none text-[#111] placeholder:text-[#bbb]"
                />
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-3 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-28 rounded" />
                        <Skeleton className="h-3 w-40 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredConvos.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 gap-3 h-full">
                  <MessageSquare
                    className="h-10 w-10 text-[#ddd]"
                    strokeWidth={1.5}
                  />
                  <p className="text-sm font-semibold text-[#555]">
                    No messages yet
                  </p>
                  <p className="text-xs text-[#bbb] leading-relaxed max-w-[180px]">
                    When buyers message your store, conversations will appear
                    here.
                  </p>
                </div>
              ) : (
                filteredConvos.map((convo) => (
                  <button
                    key={convo.convoId}
                    onClick={() => setActiveConvoId(convo.convoId)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 border-b border-black/[0.04] text-left transition-colors hover:bg-[#fafafa]",
                      activeConvoId === convo.convoId && "bg-[#f0fdf4]",
                    )}
                  >
                    <div className="h-10 w-10 rounded-full bg-[#29a366]/10 flex items-center justify-center text-[#29a366] text-sm font-bold shrink-0">
                      {initials(convo.senderId)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-1 mb-0.5">
                        <p className="text-sm font-medium text-[#111] truncate">
                          {buyerNameMap[convo.senderId] || "Buyer"}
                        </p>
                        <span className="text-[10px] text-[#bbb] shrink-0">
                          {formatTime(convo.updatedAt)}
                        </span>
                      </div>
                      <p className="text-xs text-[#999] truncate">
                        {convo.lastMessage}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main — thread view */}
          <div
            className={cn(
              "flex-1 flex flex-col min-w-0",
              !activeConvoId && "hidden md:flex",
            )}
          >
            {!activeConvoId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-8">
                <MessageSquare
                  className="h-12 w-12 text-[#ddd]"
                  strokeWidth={1.2}
                />
                <p className="text-sm font-semibold text-[#555]">
                  Select a conversation
                </p>
                <p className="text-xs text-[#bbb]">
                  Choose a message thread from the left to start replying.
                </p>
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div className="h-14 px-4 flex items-center gap-3 border-b border-black/[0.06] shrink-0">
                  <button
                    onClick={() => setActiveConvoId(null)}
                    className="md:hidden p-1.5 rounded-xl hover:bg-[#f2f2f0] transition-colors text-[#555]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="h-8 w-8 rounded-full bg-[#29a366]/10 flex items-center justify-center text-[#29a366] text-xs font-bold shrink-0">
                    {activeConvo ? initials(activeConvo.senderId) : "??"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#111]">Buyer</p>
                    <p className="text-[10px] text-[#aaa]">Customer</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-2.5">
                  {!threadMessages || threadMessages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 opacity-30">
                      <MessageSquare className="h-8 w-8" />
                      <p className="text-xs">No messages in this thread</p>
                    </div>
                  ) : (
                    threadMessages.map((msg) => {
                      const isMe = msg.senderId === user?.uid;
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "max-w-[80%] flex flex-col",
                            isMe
                              ? "self-end items-end"
                              : "self-start items-start",
                          )}
                        >
                          <div
                            className={cn(
                              "px-3.5 py-2 text-sm leading-relaxed rounded-[16px]",
                              isMe
                                ? "text-white rounded-br-[4px]"
                                : "bg-[#f2f2f0] text-[#111] rounded-bl-[4px]",
                            )}
                            style={isMe ? { background: "#29a366" } : {}}
                          >
                            {msg.content}
                          </div>
                          <span className="text-[9px] text-[#bbb] mt-0.5 px-1">
                            {formatTime(msg.createdAt)}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="px-3 py-2.5 border-t border-black/[0.05] shrink-0">
                  <form
                    onSubmit={handleSend}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Reply…"
                      autoFocus
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      className="flex-1 bg-[#f2f2f0] border border-black/[0.08] rounded-full px-3.5 h-9 text-sm outline-none focus:border-[#29a366] transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!messageInput.trim() || sending}
                      className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
                      style={{ background: "#29a366" }}
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 text-white" />
                      )}
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </SellerLayout>
  );
}
