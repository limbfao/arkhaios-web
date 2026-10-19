"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import FriendsColumn from "./messaging";
import MessageChat from "./messageChat";
import ModifyFriends from "./modifyFriends";
import { fetchJSON } from "../account/accountUi";

const EMPTY = { receivedRequests: [], sentRequests: [], friends: [], blocked: [] };

// Keeps one chat socket open, reconnecting with backoff if it drops
function useChatSocket() {
  const [socket, setSocket] = useState(null);
  const [status, setStatus] = useState("connecting");

  useEffect(() => {
    let ws;
    let retry;
    let attempts = 0;
    let closed = false;

    function connect() {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      ws = new WebSocket(`${protocol}//${window.location.host}/message-handler`);
      setStatus("connecting");
      ws.addEventListener("open", () => { attempts = 0; setStatus("open"); setSocket(ws); });
      ws.addEventListener("close", () => {
        setSocket(null);
        if (closed) return;
        setStatus("offline");
        retry = setTimeout(connect, Math.min(1000 * 2 ** attempts++, 15000));
      });
    }
    connect();

    return () => {
      closed = true;
      clearTimeout(retry);
      ws?.close();
    };
  }, []);

  return { socket, status };
}

export default function Page() {
  const { socket, status } = useChatSocket();
  const [friendsInfo, setFriendsInfo] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState(null);
  const [unread, setUnread] = useState({}); // friend id -> count of messages received while not open
  const selectedRef = useRef(null);
  selectedRef.current = selected;

  const refresh = useCallback(async () => {
    try {
      const { data } = await fetchJSON("/api/friends/get-friends");
      setFriendsInfo({ ...EMPTY, ...data });
      setError(false);
      return data;
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Count messages from friends whose conversation isn't open
  useEffect(() => {
    if (!socket) return;
    const onMessage = (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch (e) { return; }
      if (data.type === "receiveMessage" && data.senderId !== selectedRef.current?.id) {
        setUnread((u) => ({ ...u, [data.senderId]: (u[data.senderId] || 0) + 1 }));
      }
    };
    socket.addEventListener("message", onMessage);
    return () => socket.removeEventListener("message", onMessage);
  }, [socket]);

  function select(friend) {
    setSelected(friend);
    if (friend) setUnread((u) => ({ ...u, [friend.id]: 0 }));
  }

  async function onFriendsChanged() {
    const data = await refresh();
    // Close the conversation if that person is no longer a friend
    if (data && selectedRef.current && !data.friends.some((f) => f.id === selectedRef.current.id)) setSelected(null);
  }

  return (
    <div className="page">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Friends</h1>
          <p className="mt-1.5 text-sm text-muted">Message friends and fellow fund members.</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="panel flex h-[calc(100vh-15rem)] min-h-[32rem] min-w-0 flex-1 overflow-hidden">
          <FriendsColumn
            friends={friendsInfo.friends}
            loading={loading}
            error={error}
            onRetry={refresh}
            selected={selected}
            onSelect={select}
            unread={unread}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            {selected ? (
              <MessageChat
                key={selected.id}
                friend={selected}
                websocket={socket}
                status={status}
                onFriendsChanged={onFriendsChanged}
              />
            ) : (
              <NoConversation hasFriends={friendsInfo.friends.length > 0} loading={loading} />
            )}
          </div>
        </div>

        <ModifyFriends friendsInfo={friendsInfo} loading={loading} onChanged={onFriendsChanged} />
      </div>
    </div>
  );
}

function NoConversation({ hasFriends, loading }) {
  if (loading) return null;
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate text-muted">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
        </svg>
      </span>
      <p className="mt-4 text-sm font-medium text-marble">{hasFriends ? "Select a conversation" : "No conversations yet"}</p>
      <p className="mt-1 max-w-xs text-sm text-muted">
        {hasFriends
          ? "Choose a friend from the list to see your messages."
          : "Add a friend by username to start chatting."}
      </p>
    </div>
  );
}
