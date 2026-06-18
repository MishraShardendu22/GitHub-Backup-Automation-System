import Link from "next/link";
import HeaderNav from "@/components/layout/header-nav";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/backups", label: "Backups" },
  { href: "/analytics", label: "Analytics" },
  { href: "/live", label: "Live" },
  { href: "/ai", label: "AI" },
];

export default function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand">
          Backup Observatory
        </Link>
        <HeaderNav items={navItems} />
      </div>
    </header>
  );
}
