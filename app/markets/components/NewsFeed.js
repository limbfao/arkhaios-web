"use client";

import { useState } from "react";
import { NewspaperIcon } from "@heroicons/react/24/outline";
import { EmptyState, ErrorState, Skeleton } from "../../components/ui";
import { timeAgo } from "../../lib/format";

function NewsSkeleton({ rows }) {
  return (
    <ul className="divide-y divide-line">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex gap-4 px-5 py-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <Skeleton className="h-[72px] w-28 shrink-0 rounded-lg" />
        </li>
      ))}
    </ul>
  );
}

function Thumbnail({ src, compact }) {
  const [failed, setFailed] = useState(false);
  const size = compact ? "h-14 w-20" : "h-[72px] w-28";
  if (!src || failed) {
    return (
      <div className={`flex ${size} shrink-0 items-center justify-center rounded-lg border border-line bg-basalt text-muted`}>
        <NewspaperIcon className="h-6 w-6" aria-hidden="true" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${size} shrink-0 rounded-lg border border-line object-cover`}
    />
  );
}

// List of news articles (Finnhub shape: id, headline, summary, source, datetime, image, url)
// `compact` drops summaries and shrinks thumbnails for narrow columns
export default function NewsFeed({ articles, isLoading, error, onRetry, initialCount = 5, emptyText = "No recent news.", compact = false }) {
  const [expanded, setExpanded] = useState(false);

  if (isLoading) return <NewsSkeleton rows={Math.min(initialCount, 4)} />;
  if (error) return <ErrorState message="News couldn't be loaded." onRetry={onRetry} />;
  if (!articles?.length) return <EmptyState title={emptyText} description="Check back later for the latest headlines." />;

  const visible = expanded ? articles : articles.slice(0, initialCount);
  return (
    <>
      <ul className="divide-y divide-line">
        {visible.map((article, i) => (
          <li key={article.id ?? article.url ?? i}>
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex gap-4 px-5 py-4 transition-colors hover:bg-slate/60"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted">
                  <span className="font-medium text-marble/80">{article.source}</span>
                  <span aria-hidden="true"> · </span>
                  <time dateTime={new Date(article.datetime * 1000).toISOString()}>{timeAgo(article.datetime * 1000)}</time>
                </p>
                <h3 className="mt-1 text-sm font-medium leading-snug text-marble group-hover:text-bronze-light">
                  {article.headline}
                </h3>
                {article.summary && !compact ? (
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">{article.summary}</p>
                ) : null}
              </div>
              <Thumbnail src={article.image} compact={compact} />
            </a>
          </li>
        ))}
      </ul>
      {articles.length > initialCount ? (
        <div className="border-t border-line px-5 py-3">
          <button type="button" className="btn btn-ghost btn-sm w-full text-muted hover:text-marble" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Show fewer stories" : `Show ${articles.length - initialCount} more stories`}
          </button>
        </div>
      ) : null}
    </>
  );
}
