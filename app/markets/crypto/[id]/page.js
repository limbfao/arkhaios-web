import AssetDetail from "../../components/AssetDetail";

export function generateMetadata({ params }) {
  const ticker = decodeURIComponent(params.id).toUpperCase().replace(/[-/]?USD$/, "");
  return { title: `${ticker} · Arkhaios` };
}

export default function Page({ params }) {
  return <AssetDetail symbol={decodeURIComponent(params.id)} kind="crypto" />;
}
