"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

import type { HighlightedFile } from "@/lib/highlight";
import { navigateHref } from "@/lib/navigation";
import { useWorkbench } from "@/lib/store";

const scrollPositions = new Map<string, number>();
// Module-level so remounting a tab doesn't replay an old reveal.
let handledReveal = 0;
const MINIMAP_SCALE = 0.12;
const MINIMAP_WIDTH = 84;

function lineAt(root: HTMLElement | null, line: number) {
  return root?.querySelector<HTMLElement>(`.line[data-line="${line}"]`) ?? null;
}

export function CodeView({ file }: { file: HighlightedFile }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);
  const cursorLine = useWorkbench((s) => s.cursor.line);
  const reveal = useWorkbench((s) => s.reveal);
  const setCursor = useWorkbench((s) => s.setCursor);
  const [metrics, setMetrics] = useState({ top: 0, scrollHeight: 1, clientHeight: 1 });

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    scrollPositions.set(file.path, el.scrollTop);
    setMetrics({ top: el.scrollTop, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight });
  }, [file.path]);

  // Restore the scroll position when coming back to a tab.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = scrollPositions.get(file.path) ?? 0;
  }, [file.path]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  // Current-line highlight. The markup is static HTML, so toggle the class directly.
  useEffect(() => {
    const root = codeRef.current;
    root?.querySelector(".line.is-active")?.classList.remove("is-active");
    lineAt(root, cursorLine)?.classList.add("is-active");
  }, [cursorLine, file.html]);

  // Scroll to and flash a line requested by search, the SCM graph or extensions.
  useEffect(() => {
    if (!reveal || reveal.path !== file.path || reveal.nonce === handledReveal) return;
    const el = lineAt(codeRef.current, reveal.line);
    if (!el) return;
    handledReveal = reveal.nonce;
    el.scrollIntoView({ block: "center" });
    el.classList.remove("is-flash");
    void el.offsetWidth;
    el.classList.add("is-flash");
  }, [reveal, file.path]);

  const onClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest<HTMLElement>("[data-href]");
    if (link?.dataset.href) {
      navigateHref(link.dataset.href);
      return;
    }
    const line = target.closest<HTMLElement>(".line");
    if (!line) return;
    let col = 1;
    const sel = window.getSelection();
    if (sel?.anchorNode && line.contains(sel.anchorNode)) {
      const range = document.createRange();
      range.setStart(line, 0);
      range.setEnd(sel.anchorNode, sel.anchorOffset);
      col = range.toString().length + 1;
    }
    setCursor(Number(line.dataset.line), col);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const href = (e.target as HTMLElement).dataset.href;
    if (href && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      navigateHref(href);
    }
  };

  return (
    <div className="flex min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={measure}
        className="code-view vsc-scroll min-w-0 flex-1 overflow-y-auto pt-1"
        style={{ "--tab": file.tabSize } as CSSProperties}
      >
        <div
          ref={codeRef}
          role="document"
          aria-label={`${file.path} source`}
          onClick={onClick}
          onKeyDown={onKeyDown}
          dangerouslySetInnerHTML={{ __html: file.html }}
        />
      </div>
      <Minimap html={file.html} metrics={metrics} scrollRef={scrollRef} />
    </div>
  );
}

function Minimap({
  html,
  metrics,
  scrollRef,
}: {
  html: string;
  metrics: { top: number; scrollHeight: number; clientHeight: number };
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const dragging = useRef(false);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight * MINIMAP_SCALE));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const ratio = height / metrics.scrollHeight;
  const sliderTop = metrics.top * ratio;
  const sliderHeight = Math.max(12, metrics.clientHeight * ratio);

  const scrollTo = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || !height) return;
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    el.scrollTop = (y / height) * el.scrollHeight - el.clientHeight / 2;
  };

  return (
    <div
      aria-hidden
      className="relative hidden shrink-0 cursor-default overflow-hidden xl:block"
      style={{ width: MINIMAP_WIDTH }}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        scrollTo(e);
      }}
      onPointerMove={(e) => dragging.current && scrollTo(e)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <div
        ref={contentRef}
        inert
        className="minimap pointer-events-none absolute top-0 left-1 origin-top-left opacity-80 select-none"
        style={{ width: (MINIMAP_WIDTH - 8) / MINIMAP_SCALE, transform: `scale(${MINIMAP_SCALE})` }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {height > 0 && (
        <div
          className="absolute inset-x-0 bg-editor-foreground/10 hover:bg-editor-foreground/15"
          style={{ top: sliderTop, height: sliderHeight }}
        />
      )}
    </div>
  );
}
