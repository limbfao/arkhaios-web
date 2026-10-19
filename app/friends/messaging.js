"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { Avatar, fullName } from "../account/accountUi";
import { ErrorState, Skeleton } from "../components/ui";

// Left column: searchable list of friends to chat with
export default function FriendsColumn({ friends, loading, error, onRetry, selected, onSelect, unread }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return friends
      .filter((f) => !q || `${fullName(f)} ${f.username}`.toLowerCase().includes(q))
      .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  }, [friends, searchTerm]);

  return (
    <div className="flex w-64 shrink-0 flex-col border-r border-line lg:w-72">
      <div className="border-b border-line p-3">
        <label htmlFor="friend-search" className="sr-only">Search friends</label>
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            id="friend-search"
            type="search"
            className="field py-2 pl-9"
            placeholder="Search friends"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="space-y-2 p-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-3 w-20" /></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState message="Friends couldn't be loaded." onRetry={onRetry} />
        ) : filtered.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted">
            {friends.length ? `No friends match "${searchTerm}".` : "Your friends will appear here."}
          </p>
        ) : (
          <ul className="space-y-0.5" aria-label="Conversations">
            {filtered.map((friend) => {
              const active = selected?.id === friend.id;
              const count = unread[friend.id] || 0;
              return (
                <li key={friend.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(friend)}
                    aria-current={active ? "true" : undefined}
                    className={`flex w-full items-center gap-3 rounded-btn px-2.5 py-2 text-left transition-colors ${
                      active ? "bg-slate" : "hover:bg-slate/50"
                    }`}
                  >
                    <Avatar firstName={friend.firstName} lastName={friend.lastName} seed={friend.id} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm ${count ? "font-semibold text-marble" : "text-marble"}`}>{fullName(friend)}</span>
                      <span className="block truncate text-xs text-muted">@{friend.username}</span>
                    </span>
                    {count ? (
                      <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-bronze px-1.5 text-[11px] font-semibold text-basalt">
                        {count}
                        <span className="sr-only"> unread</span>
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
