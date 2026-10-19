"use client";

import useFetch from "../../hooks/useFetch";
import { EmptyState, ErrorState, SkeletonRows, Panel } from "../../components/ui";
import AssetRows from "../components/AssetRows";
import { toChartSymbol } from "../components/symbols";

export default function CompanyPeers({ symbol }) {
  const self = toChartSymbol(symbol);
  const peers = useFetch("/api/company-peers?symbol=" + encodeURIComponent(self));
  const list = (peers.responseJSON?.data || []).map(toChartSymbol).filter((s) => s && s !== self).slice(0, 6);
  const snapshot = useFetch(list.length ? "/api/market/snapshot?symbols=" + list.join(",") : null);

  let body;
  if (peers.isLoading || snapshot.isLoading) body = <div className="p-5"><SkeletonRows rows={4} /></div>;
  else if (peers.error || snapshot.error) body = <ErrorState message="Similar companies couldn't be loaded." onRetry={() => { peers.reload(); snapshot.reload(); }} />;
  else if (!snapshot.responseJSON?.data?.length) body = <EmptyState title="No similar companies found" />;
  else body = <AssetRows items={snapshot.responseJSON.data} sparkline={false} />;

  return (
    <Panel title="Similar companies" bodyClassName="">
      {body}
    </Panel>
  );
}
