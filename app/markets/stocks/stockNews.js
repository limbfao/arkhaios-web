"use client";

import { Panel } from "../../components/ui";
import { useMemo } from "react";
import useFetch from "../../hooks/useFetch";
import NewsFeed from "../components/NewsFeed";
import { displaySymbol } from "../components/symbols";

const isoDay = (d) => d.toISOString().split("T")[0];

export default function StockNews({ symbol }) {
  const query = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return `symbol=${encodeURIComponent(symbol)}&startDate=${isoDay(weekAgo)}&endDate=${isoDay(now)}`;
  }, [symbol]);
  const { responseJSON, isLoading, error, reload } = useFetch("/api/account/get-stock-news?" + query);

  return (
    <Panel title={`${displaySymbol(symbol)} news`} bodyClassName="">
      <NewsFeed
        articles={responseJSON?.data}
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        emptyText={`No ${displaySymbol(symbol)} news this week`}
      />
    </Panel>
  );
}
