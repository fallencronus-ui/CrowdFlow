import type { ReactNode } from "react";
import { TopBar } from "./TopBar";
import { DemoTimeControl } from "./DemoTimeControl";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-background">
      <TopBar />
      <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      <DemoTimeControl />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-6 border-b border-border px-5 py-4">
      <div>
        <h1 className="font-mono text-lg font-bold tracking-[0.1em] uppercase">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {actions}
    </div>
  );
}
