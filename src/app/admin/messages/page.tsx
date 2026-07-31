"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Search, Send, ArrowLeft, User } from "lucide-react";
import { useUser, useSupabase, useStableMemo, useCollection } from "@/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import Image from "next/image";

function AdminMessagesContent() {
  const { user, isUserLoading } = useUser();
  const supabase = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin, isAdminLoading } = useIsAdmin();
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(searchParams.get("conversation") || null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAdminLoading && !isAdmin) {
      router.push("/admin");
    }
  }, [isAdmin, isAdminLoading, router]);

  // Fetch conversations
  const convConfig = useStableMemo(() => {
    if (!user || !isAdmin) return null;
    return {
      table: "conversations",
      order: { column: "lastMessageAt", ascending: false },
    };
  }, [user, isAdmin]);
  const { data: conversations, isLoading: convsLoading } =
    useCollection(convConfig);

  // Fetch messages for selected conversation
  const msgConfig = useStableMemo(() => {
    if (!selectedConversation) return null;
    return {
      table: "messages",
      filters: [
        {
          column: "conversationId",
          op: "eq" as const,
          value: selectedConversation,
        },
      ],
      order: { column: "createdAt", ascending: true },
    };
  }, [selectedConversation]);
  const { data: messages, isLoading: msgsLoading } = useCollection(msgConfig);

  // Fetch all users for name resolution
  const usersConfig = useStableMemo(() => {
    if (!user || !isAdmin) return null;
    return { table: "users" };
  }, [user, isAdmin]);
  const { data: allUsers } = useCollection(usersConfig);

  const getUserName = (userId: string) => {
    const u = allUsers?.find((u: any) => u.id === userId);
    return (
      (u as any)?.name ||
      (u as any)?.email?.split("@")[0] ||
      userId?.slice(0, 8)
    );
  };

  const getUserAvatar = (userId: string) => {
    const u = allUsers?.find((u: any) => u.id === userId);
    return (
      (u as any)?.profilePictureUrl ||
      "https://i.pinimg.com/736x/d2/98/4e/d2984ec4b65a8568eab3dc2b640fc58e.jpg"
    );
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;
    setSending(true);
    try {
      await supabase.from("messages").insert({
        conversationId: selectedConversation,
        senderId: user.uid,
        text: newMessage.trim(),
        createdAt: new Date().toISOString(),
      });
      await supabase
        .from("conversations")
        .update({
          lastMessage: newMessage.trim(),
          lastMessageAt: new Date().toISOString(),
        })
        .eq("id", selectedConversation);
      setNewMessage("");
    } catch (err) {
      console.error("Send message error:", err);
    } finally {
      setSending(false);
    }
  };

  if (isAdminLoading || !isAdmin) return null;

  const filteredConversations = (conversations ?? []).filter((c: any) => {
    if (!searchQuery) return true;
    const participants = c.participantNames || "";
    return participants.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6 md:p-8 w-full pt-6 md:pt-32 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-normal font-headline tracking-[-0.05em] text-black dark:text-white">
            Messages
          </h1>
          <p className="text-sm text-muted-foreground font-normal">
            {conversations?.length ?? 0} conversations
          </p>
        </div>

        <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03] overflow-hidden">
          <div className="flex h-[600px] md:h-[700px]">
            {/* Conversation List */}
            <div
              className={cn(
                "w-full md:w-[360px] border-r border-black/[0.04] dark:border-white/[0.04] flex flex-col",
                selectedConversation ? "hidden md:flex" : "flex",
              )}
            >
              <div className="p-4 border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#f8f8f8] dark:bg-white/[0.05] border-none rounded-full pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {convsLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-3">
                        <Skeleton className="h-11 w-11 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-2/3 rounded-full" />
                          <Skeleton className="h-3 w-1/2 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <MessageCircle className="h-10 w-10 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No conversations
                    </p>
                  </div>
                ) : (
                  filteredConversations.map((conv: any) => {
                    const otherParticipant =
                      conv.participants?.find((p: string) => p !== user.uid) ||
                      "";
                    return (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv.id)}
                        className={cn(
                          "w-full flex items-center gap-3 p-4 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors text-left border-b border-black/[0.02] dark:border-white/[0.02]",
                          selectedConversation === conv.id && "bg-primary/5",
                        )}
                      >
                        <div className="h-11 w-11 rounded-full overflow-hidden border border-black/[0.06] shrink-0">
                          <Image
                            src={getUserAvatar(otherParticipant)}
                            alt="Avatar"
                            width={44}
                            height={44}
                            className="object-cover h-full w-full"
                            unoptimized
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">
                              {getUserName(otherParticipant)}
                            </p>
                            <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                              {conv.lastMessageAt
                                ? new Date(
                                    conv.lastMessageAt,
                                  ).toLocaleDateString()
                                : ""}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {conv.lastMessage || "No messages yet"}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div
              className={cn(
                "flex-1 flex flex-col",
                !selectedConversation ? "hidden md:flex" : "flex",
              )}
            >
              {!selectedConversation ? (
                <div className="flex-1 flex items-center justify-center text-center p-8">
                  <div>
                    <MessageCircle className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Select a conversation to start messaging
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Chat header */}
                  <div className="flex items-center gap-3 p-4 border-b border-black/[0.04] dark:border-white/[0.04]">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-full h-9 w-9 md:hidden"
                      onClick={() => setSelectedConversation(null)}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="h-9 w-9 rounded-full overflow-hidden border border-black/[0.06]">
                      <Image
                        src={getUserAvatar(
                          conversations
                            ?.find((c: any) => c.id === selectedConversation)
                            ?.participants?.find(
                              (p: string) => p !== user.uid,
                            ) || "",
                        )}
                        alt="Avatar"
                        width={36}
                        height={36}
                        className="object-cover h-full w-full"
                        unoptimized
                      />
                    </div>
                    <p className="text-sm font-medium">
                      {getUserName(
                        conversations
                          ?.find((c: any) => c.id === selectedConversation)
                          ?.participants?.find((p: string) => p !== user.uid) ||
                          "",
                      )}
                    </p>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {msgsLoading ? (
                      <div className="space-y-3 p-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "flex",
                              i % 2 === 0 ? "justify-start" : "justify-end",
                            )}
                          >
                            <Skeleton
                              className={cn(
                                "h-10 rounded-2xl",
                                i % 2 === 0 ? "w-2/3" : "w-1/2",
                              )}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        {(messages ?? []).map((msg: any) => {
                          const isMe = msg.senderId === user.uid;
                          return (
                            <div
                              key={msg.id}
                              className={cn(
                                "flex",
                                isMe ? "justify-end" : "justify-start",
                              )}
                            >
                              <div
                                className={cn(
                                  "max-w-[75%] px-4 py-2.5 rounded-2xl text-sm",
                                  isMe
                                    ? "bg-primary text-white rounded-br-md"
                                    : "bg-[#f3f3f3] dark:bg-white/[0.05] text-black dark:text-white rounded-bl-md",
                                )}
                              >
                                {msg.text}
                                <p
                                  className={cn(
                                    "text-[10px] mt-1",
                                    isMe
                                      ? "text-white/60"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {msg.createdAt
                                    ? new Date(
                                        msg.createdAt,
                                      ).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })
                                    : ""}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={chatEndRef} />
                      </>
                    )}
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t border-black/[0.04] dark:border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          !e.shiftKey &&
                          handleSendMessage()
                        }
                        className="flex-1 bg-[#f8f8f8] dark:bg-white/[0.05] border-none rounded-full px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <Button
                        size="icon"
                        className="rounded-full h-11 w-11 bg-primary hover:bg-primary/90 shrink-0"
                        disabled={!newMessage.trim() || sending}
                        onClick={handleSendMessage}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}

export default function AdminMessagesPage() {
  return (
    <React.Suspense fallback={null}>
      <AdminMessagesContent />
    </React.Suspense>
  );
}
