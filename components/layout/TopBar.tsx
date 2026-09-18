export function TopBar({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)]">
        {title}
      </h1>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </header>
  );
}
