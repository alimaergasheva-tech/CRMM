"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@/types/crm.types";

const links = [
  { href: "/dashboard", label: "Дашборд" },
  { href: "/leads", label: "Заявки" },
  { href: "/clients", label: "Клиенты" },
  { href: "/tasks", label: "Задачи" },
  { href: "/content", label: "Контент" },
  { href: "/users", label: "Сотрудники", adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void fetch("/api/me")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (cancelled || !data) return;
          setUser(data.user);
          setOverdueCount(data.overdueCount ?? 0);
        })
        .catch(() => undefined);
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--panel)]">
      <div className="border-b border-[var(--border)] px-5 py-6">
        <p className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--ink)]">
          Pulse CRM
        </p>
        <p className="mt-1 text-xs text-[var(--muted)]">Заявки и клиенты</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {links
          .filter((link) => !link.adminOnly || user?.role === "admin")
          .map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-[var(--accent-soft)] font-medium text-[var(--accent)]"
                    : "text-[var(--ink)] hover:bg-black/5"
                }`}
              >
                <span>{link.label}</span>
                {link.href === "/tasks" && overdueCount > 0 ? (
                  <span className="rounded-md bg-[var(--danger)] px-1.5 py-0.5 text-[11px] text-white">
                    {overdueCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
      </nav>

      <div className="border-t border-[var(--border)] p-4">
        <p className="truncate text-sm font-medium text-[var(--ink)]">{user?.name ?? "…"}</p>
        <p className="truncate text-xs text-[var(--muted)]">{user?.email}</p>
        <button
          type="button"
          onClick={logout}
          className="mt-3 text-xs text-[var(--muted)] underline-offset-2 hover:text-[var(--ink)] hover:underline"
        >
          Выйти
        </button>
      </div>
    </aside>
  );
}
