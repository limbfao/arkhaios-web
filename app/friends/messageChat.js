"use client";

import { Fragment, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { EllipsisHorizontalIcon } from "@heroicons/react/20/solid";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import UserContext from "../UserContext";
import { Avatar, Spinner, fetchJSON, fullName } from "../account/accountUi";
import { ErrorState, Skeleton } from "../components/ui";

const PAGE_SIZE = 50;

function dayLabel(date) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

const timeOf = (iso) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

// Middle column: the conversation with one friend
export default function MessageChat({ friend, websocket, status, onFriendsChanged }) {
  const { user } = useContext(UserContext);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [confirm, setConfirm] = useState(null); // "remove" | "block"

  const scroller = useRef(null);
  const input = useRef(null);
  const keepOffset = useRef(null); // distance from the bottom to restore after older messages load
  const stickToBottom = useRef(true);

  // Load history, newest page first
  useEffect(() => {
    let cancelled = false;
    async function load() {
      page === 1 ? setLoading(true) : setLoadingMore(true);
      try {
        const res = await fetch(`/api/friends/chat-history?friend=${encodeURIComponent(friend.id)}&page=${page}&pageSize=${PAGE_SIZE}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (cancelled) return;
        const older = (data.data || []).map((m) => ({ ...m, key: m._id || m.id })).reverse();
        if (page > 1 && scroller.current) {
          keepOffset.current = scroller.current.scrollHeight - scroller.current.scrollTop;
        }
        setMessages((prev) => (page === 1 ? older : [...older, ...prev]));
        setHasMore(!data.last);
        setError(false);
      } catch (e) {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) { setLoading(false); setLoadingMore(false); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [friend.id, page]);

  // Keep the view pinned: to the bottom for new messages, or in place when older ones are prepended
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (keepOffset.current !== null) {
      el.scrollTop = el.scrollHeight - keepOffset.current;
      keepOffset.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, loading]);

  // Live messages from this friend
  useEffect(() => {
    if (!websocket) return;
    const onMessage = (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch (e) { return; }
      if (data.type === "receiveMessage" && data.senderId === friend.id) {
        setMessages((prev) => [...prev, {
          key: `live-${data.timestamp}-${prev.length}`,
          senderId: data.senderId, message: data.message, timestamp: data.timestamp,
        }]);
      }
    };
    websocket.addEventListener("message", onMessage);
    return () => websocket.removeEventListener("message", onMessage);
  }, [websocket, friend.id]);

  useEffect(() => { input.current?.focus(); }, [friend.id]);

  function onScroll() {
    const el = scroller.current;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop < 40 && hasMore && !loadingMore && !loading) setPage((p) => p + 1);
  }

  function send(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !websocket || websocket.readyState !== WebSocket.OPEN) return;
    const message = {
      senderId: user.accountID,
      receiverId: friend.id,
      timestamp: new Date().toISOString(),
      message: text,
    };
    websocket.send(JSON.stringify({ type: "sendMessage", data: message }));
    stickToBottom.current = true;
    setMessages((prev) => [...prev, { ...message, key: `sent-${message.timestamp}` }]);
    setDraft("");
  }

  async function runAction(action) {
    try {
      await fetchJSON(`/api/friends/${action === "block" ? "block" : "delete"}`, { method: "POST", body: { id: friend.id } });
      setConfirm(null);
      onFriendsChanged();
    } catch (e) {
      setConfirm(null);
    }
  }

  const connected = status === "open";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-line px-5 py-3">
        <Avatar firstName={friend.firstName} lastName={friend.lastName} seed={friend.id} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-marble">{fullName(friend)}</p>
          <p className="truncate text-xs text-muted">@{friend.username}</p>
        </div>
        <div className="dropdown dropdown-end">
          <button tabIndex={0} className="btn btn-ghost btn-sm btn-square text-muted" aria-label="Conversation options">
            <EllipsisHorizontalIcon className="h-5 w-5" />
          </button>
          <ul tabIndex={0} className="menu dropdown-content z-20 mt-1 w-48 rounded-box border border-line bg-slate p-1.5 text-sm shadow-lg">
            <li><button onClick={() => setConfirm("remove")}>Remove friend</button></li>
            <li><button className="text-loss" onClick={() => setConfirm("block")}>Block {friend.firstName}</button></li>
          </ul>
        </div>
      </div>

      <div ref={scroller} onScroll={onScroll} className="flex-1 overflow-y-auto px-5 py-4" aria-live="polite">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="ml-auto h-10 w-2/5" />
            <Skeleton className="h-14 w-3/5" />
          </div>
        ) : error ? (
          <ErrorState message="Messages couldn't be loaded." onRetry={() => { setError(false); setPage(1); setLoading(true); }} />
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Avatar firstName={friend.firstName} lastName={friend.lastName} seed={friend.id} size={56} />
            <p className="mt-3 text-sm font-medium text-marble">{fullName(friend)}</p>
            <p className="mt-1 text-sm text-muted">Say hello to start the conversation.</p>
          </div>
        ) : (
          <>
            {loadingMore ? <div className="flex justify-center py-2 text-muted"><Spinner /></div> : null}
            {messages.map((msg, i) => {
              const prev = messages[i - 1];
              const next = messages[i + 1];
              const date = new Date(msg.timestamp);
              const newDay = !prev || new Date(prev.timestamp).toDateString() !== date.toDateString();
              const mine = msg.senderId === user.accountID;
              const sameAsNext = next && next.senderId === msg.senderId &&
                new Date(next.timestamp) - date < 5 * 60000 && new Date(next.timestamp).toDateString() === date.toDateString();
              const sameAsPrev = !newDay && prev && prev.senderId === msg.senderId && date - new Date(prev.timestamp) < 5 * 60000;
              return (
                <Fragment key={msg.key}>
                  {newDay ? (
                    <div className="my-4 flex items-center gap-3 text-xs text-muted">
                      <span className="h-px flex-1 bg-line" />
                      {dayLabel(date)}
                      <span className="h-px flex-1 bg-line" />
                    </div>
                  ) : null}
                  <div className={`flex items-end gap-2.5 ${mine ? "justify-end" : ""} ${sameAsPrev ? "mt-1" : "mt-3"}`}>
                    {!mine ? (
                      sameAsNext ? <span className="w-8 shrink-0" /> :
                        <Avatar firstName={friend.firstName} lastName={friend.lastName} seed={friend.id} size={32} />
                    ) : null}
                    <div className={`flex max-w-[75%] flex-col ${mine ? "items-end" : "items-start"}`}>
                      <div
                        className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                          mine ? "bg-bronze/20 text-marble" : "bg-slate text-marble"
                        } ${!sameAsNext ? (mine ? "rounded-br-md" : "rounded-bl-md") : ""}`}
                      >
                        {msg.message}
                      </div>
                      {!sameAsNext ? (
                        <time className="mt-1 px-1 text-[11px] text-muted" dateTime={msg.timestamp}>{timeOf(msg.timestamp)}</time>
                      ) : null}
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </>
        )}
      </div>

      <form onSubmit={send} className="border-t border-line p-3">
        {!connected ? (
          <p className="mb-2 flex items-center gap-2 px-1 text-xs text-muted">
            <Spinner className="h-3 w-3" /> {status === "offline" ? "Connection lost. Reconnecting…" : "Connecting…"}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <label htmlFor="chat-input" className="sr-only">Message {friend.firstName}</label>
          <input
            id="chat-input"
            ref={input}
            className="field flex-1"
            placeholder={`Message ${friend.firstName}`}
            autoComplete="off"
            maxLength={2000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={!draft.trim() || !connected} aria-label="Send message">
            <PaperAirplaneIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </form>

      <div className={`modal ${confirm ? "modal-open" : ""}`} role="dialog" aria-modal="true" aria-labelledby="friend-confirm-title">
        <div className="modal-box max-w-sm border border-line bg-stone">
          <h3 id="friend-confirm-title" className="text-base font-semibold text-marble">
            {confirm === "block" ? `Block ${fullName(friend)}?` : `Remove ${fullName(friend)}?`}
          </h3>
          <p className="mt-2 text-sm text-muted">
            {confirm === "block"
              ? "They'll be removed from your friends and won't be able to send you friend requests."
              : "You'll no longer be able to message each other. You can send a new friend request later."}
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(null)}>Cancel</button>
            <button className="btn btn-sm border-loss/40 bg-loss/15 text-loss hover:bg-loss/25" onClick={() => runAction(confirm)}>
              {confirm === "block" ? "Block" : "Remove friend"}
            </button>
          </div>
        </div>
        <div className="modal-backdrop" onClick={() => setConfirm(null)} />
      </div>
    </div>
  );
}
