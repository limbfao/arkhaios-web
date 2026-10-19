"use client";

import { useContext } from "react";
import UserContext from "../UserContext.js";
import useFetch from "../hooks/useFetch";
import PortfolioHero from "./PortfolioHero.js";
import Holdings from "./Holdings.js";
import Watchlist from "./watchlist.js";
import MarketNews from "./marketNews.js";
import Orders from "./Orders.js";
import VerifyPrompt from "./VerifyPrompt.js";

function VerifiedHome() {
  const trading = useFetch("/api/account/trading");
  const positions = useFetch("/api/positions");
  const orders = useFetch("/api/orders");

  function refresh() {
    trading.reload();
    positions.reload();
    orders.reload();
  }

  return (
    <div className="space-y-6">
      <PortfolioHero trading={trading.responseJSON?.data} tradingLoading={trading.isLoading} />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <Holdings
            positions={positions.responseJSON?.data}
            isLoading={positions.isLoading}
            error={positions.error}
            onRetry={positions.reload}
          />
          <Orders
            orders={orders.responseJSON?.data}
            isLoading={orders.isLoading}
            error={orders.error}
            onRetry={orders.reload}
            onChanged={refresh}
          />
        </div>
        <div className="space-y-6">
          <Watchlist />
          <MarketNews compact initialCount={4} />
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const { user } = useContext(UserContext);

  return (
    <div className="page">
      <div className="mb-8">
        <h1 className="page-title">
          {user?.kycVerified ? "Welcome back" : "Welcome"}{user?.firstName ? `, ${user.firstName}` : ""}
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          {user?.kycVerified ? "Here's how your portfolio is doing." : "Welcome to Arkhaios."}
        </p>
      </div>

      {user?.kycVerified ? (
        <VerifiedHome />
      ) : (
        <div className="space-y-6">
          <VerifyPrompt />
          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <Watchlist />
            <MarketNews />
          </div>
        </div>
      )}
    </div>
  );
}
