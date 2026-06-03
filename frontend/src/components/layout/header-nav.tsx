"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
};

interface HeaderNavProps {
  items: NavItem[];
}

export default function HeaderNav({ items }: HeaderNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="header-nav">
      <button
        type="button"
        className="nav-toggle"
        aria-expanded={open}
        aria-controls="primary-nav"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="nav-toggle__icon" aria-hidden="true" />
        Menu
      </button>
      <nav
        id="primary-nav"
        className={cn("nav-links", open && "nav-links--open")}
        aria-label="Primary"
      >
        {items.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("nav-link", isActive && "nav-link--active")}
              aria-current={isActive ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
