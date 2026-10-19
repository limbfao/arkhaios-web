import AccountHeader from "./accountHeader";

export const metadata = { title: "Account · Arkhaios" };

export default function AccountLayout({ children }) {
  return (
    <div className="page">
      <AccountHeader />
      {children}
    </div>
  );
}
