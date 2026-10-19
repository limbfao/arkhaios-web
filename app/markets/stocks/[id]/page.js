import AssetDetail from "../../components/AssetDetail";

export function generateMetadata({ params }) {
  return { title: `${decodeURIComponent(params.id).toUpperCase()} · Arkhaios` };
}

export default function Page({ params }) {
  return <AssetDetail symbol={decodeURIComponent(params.id)} kind="stock" />;
}
