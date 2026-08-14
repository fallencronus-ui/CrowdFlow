import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  flush,
}: {
  children: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col rounded-sm border border-border bg-panel",
        flush ? "" : "",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  meta,
  accent,
}: {
  title: string;
  meta?: ReactNode;
  accent?: "default" | "critical" | "info";
}) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3 border-b border-border px-3 py-2",
        accent === "critical" && "border-critical/40 bg-critical/5",
        accent === "info" && "bg-panel-raised",
      )}
    >
      <h2 className="tech-label text-foreground/85">{title}</h2>
      {meta ? <div className="tech-label flex items-center gap-2">{meta}</div> : null}
    </header>
  );
}

export function PanelBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("min-h-0 flex-1 p-3", className)}>{children}</div>;
}
