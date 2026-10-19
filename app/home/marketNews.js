"use client";

import useFetch from "../hooks/useFetch";
import { Panel } from "../components/ui";
import NewsFeed from "../markets/components/NewsFeed";

export default function MarketNews({ initialCount = 5, compact = false }) {
  const { responseJSON, isLoading, error, reload } = useFetch("/api/account/get-market-news?category=general");
  return (
    <Panel title="Market news" bodyClassName="">
      <NewsFeed
        articles={Array.isArray(responseJSON?.data) ? responseJSON.data : []}
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        initialCount={initialCount}
        compact={compact}
        emptyText="No market news right now"
      />
    </Panel>
  );
}
