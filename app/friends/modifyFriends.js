"use client";

import { useState } from "react";
import { UserPlusIcon } from "@heroicons/react/24/outline";
import { Avatar, Spinner, fetchJSON, fullName } from "../account/accountUi";
import { Skeleton } from "../components/ui";

const ADD_ERRORS = {
  "user does not exist": "No one has that username. Usernames look like Bold-Amber-Falcon-417.",
  "user already befriended": "You're already friends.",
  "cannot add self": "That's your own username.",
  "cannot add a blocked user": "You can't add this person.",
};

function PersonRow({ person, children }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Avatar firstName={person.firstName} lastName={person.lastName} seed={person.id} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-marble">{fullName(person)}</p>
        <p className="truncate text-xs text-muted">@{person.username}</p>
      </div>
      <div className="flex shrink-0 gap-1.5">{children}</div>
    </li>
  );
}

function Section({ title, count, children }) {
  return (
    <div className="border-t border-line px-5 py-4 md:border-t-0 xl:border-t">
      <h3 className="flex items-center gap-2 text-xs font-medium text-muted">
        {title}
        {count ? <span className="rounded-full bg-slate px-1.5 text-[11px] text-marble tabular">{count}</span> : null}
      </h3>
      {children}
    </div>
  );
}

// Right column: add friends and handle pending requests
export default function ModifyFriends({ friendsInfo, loading, onChanged }) {
  const [username, setUsername] = useState("");
  const [feedback, setFeedback] = useState(null); // { tone, text }
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(null); // id of the request being handled

  async function addFriend(e) {
    e.preventDefault();
    const name = username.trim();
    if (!name) return;
    setAdding(true); setFeedback(null);
    try {
      await fetchJSON("/api/friends/add", { method: "POST", body: { username: name } });
      setFeedback({ tone: "gain", text: `Friend request sent to @${name}.` });
      setUsername("");
      onChanged();
    } catch (err) {
      setFeedback({ tone: "loss", text: ADD_ERRORS[err.message] || "The request couldn't be sent. Try again." });
    } finally {
      setAdding(false);
    }
  }

  async function act(url, body, key) {
    setBusy(key);
    try {
      await fetchJSON(url, { method: "POST", body });
      await onChanged();
    } catch (e) {
      setFeedback({ tone: "loss", text: "That didn't work. Try again." });
    } finally {
      setBusy(null);
    }
  }

  const { receivedRequests, sentRequests } = friendsInfo;

  return (
    <aside className="panel grid shrink-0 grid-cols-1 divide-line self-stretch md:grid-cols-3 md:divide-x xl:w-80 xl:grid-cols-1 xl:divide-x-0 xl:self-start"
      aria-label="Manage friends">
      <div className="px-5 py-4">
        <h2 className="panel-title">Add a friend</h2>
        <form onSubmit={addFriend} className="mt-3">
          <label htmlFor="addFriend" className="field-label">Username</label>
          <div className="flex gap-2">
            <input
              id="addFriend"
              className="field"
              placeholder="Their username"
              autoComplete="off"
              spellCheck={false}
              value={username}
              onChange={(e) => { setUsername(e.target.value); setFeedback(null); }}
            />
            <button type="submit" className="btn btn-primary shrink-0" disabled={!username.trim() || adding} aria-label="Send friend request">
              {adding ? <Spinner /> : <UserPlusIcon className="h-4 w-4" />}
              <span>Add</span>
            </button>
          </div>
          <p className={`mt-2 min-h-[1rem] text-xs ${feedback?.tone === "loss" ? "text-loss" : feedback ? "text-gain" : "text-muted"}`}
            role="status">
            {feedback?.text || "Ask friends for their username to send a request."}
          </p>
        </form>
      </div>

      <Section title="Requests for you" count={receivedRequests.length}>
        {loading ? (
          <Skeleton className="mt-3 h-9 w-full" />
        ) : receivedRequests.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No pending requests.</p>
        ) : (
          <ul className="mt-1">
            {receivedRequests.map((person) => (
              <PersonRow key={person.id} person={person}>
                <button className="btn btn-primary btn-xs" disabled={busy === person.id}
                  onClick={() => act("/api/friends/respond", { id: person.id, action: "accept" }, person.id)}
                  aria-label={`Accept friend request from ${fullName(person)}`}>
                  {busy === person.id ? <Spinner className="h-3 w-3" /> : null} Accept
                </button>
                <button className="btn btn-ghost btn-xs border border-line text-muted" disabled={busy === person.id}
                  onClick={() => act("/api/friends/respond", { id: person.id, action: "reject" }, person.id)}
                  aria-label={`Decline friend request from ${fullName(person)}`}>
                  Decline
                </button>
              </PersonRow>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Sent requests" count={sentRequests.length}>
        {loading ? (
          <Skeleton className="mt-3 h-9 w-full" />
        ) : sentRequests.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Requests you send will wait here until they're accepted.</p>
        ) : (
          <ul className="mt-1">
            {sentRequests.map((person) => (
              <PersonRow key={person.id} person={person}>
                <button className="btn btn-ghost btn-xs border border-line text-muted" disabled={busy === person.id}
                  onClick={() => act("/api/friends/cancel", { id: person.id }, person.id)}
                  aria-label={`Cancel friend request to ${fullName(person)}`}>
                  {busy === person.id ? <Spinner className="h-3 w-3" /> : null} Cancel
                </button>
              </PersonRow>
            ))}
          </ul>
        )}
      </Section>
    </aside>
  );
}
