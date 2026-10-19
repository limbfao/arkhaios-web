import SettingsNav from "./settingsHeader";

export default function SettingsLayout({ children }) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <SettingsNav />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
