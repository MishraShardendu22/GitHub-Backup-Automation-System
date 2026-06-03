import Link from "next/link";
import HeaderNav from "@/components/layout/header-nav";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/backups", label: "Backups" },
  { href: "/metrics", label: "Metrics" },
  { href: "/live", label: "Monitor" },
  { href: "/assistant", label: "AI" },
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
