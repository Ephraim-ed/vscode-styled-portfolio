"use client";

import { useState, type ReactNode } from "react";
import { VscChevronRight } from "react-icons/vsc";

import { cn } from "@/lib/utils";

/** Collapsible sidebar pane with a VS Code-style uppercase header. */
export function Section({
  title,
  defaultOpen = true,
  actions,
  badge,
  className,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  actions?: ReactNode;
  badge?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={cn("border-t border-line first:border-t-0", className)}>
      <SectionHeader
        title={title}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        actions={actions}
        badge={badge}
        className="sticky top-0 z-10"
      />
      {open && children}
    </section>
  );
}

/** A pane's header row: chevron and uppercase title, with badge and hover actions on the right. */
export function SectionHeader({
  title,
  open,
  onToggle,
  actions,
  badge,
  className,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  actions?: ReactNode;
  badge?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("group/section flex h-[22px] shrink-0 items-center bg-side pr-2", className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex h-full min-w-0 flex-1 items-center gap-0.5 text-[11px] font-bold tracking-wide uppercase"
      >
        <VscChevronRight aria-hidden className={cn("size-4 shrink-0 transition-transform", open && "rotate-90")} />
        <span className="truncate">{title}</span>
      </button>
      {badge}
      {actions && (
        <div className="flex items-center opacity-0 group-hover/section:opacity-100 focus-within:opacity-100 max-md:opacity-100">
          {actions}
        </div>
      )}
    </div>
  );
}

export function SectionAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-5 place-items-center rounded-sm hover:bg-list-hover"
    >
      {children}
    </button>
  );
}
