"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { VscLinkExternal, VscRepo, VscStarFull } from "react-icons/vsc";

import { openExternal } from "@/lib/actions";
import { GITHUB_PROFILE, GITHUB_USER, LANGUAGE_COLORS, type ContributionDay, type GithubActivity } from "@/lib/github";
import { cn } from "@/lib/utils";

import { SectionAction, SectionHeader } from "./section";

const HEADER = 22;
const MIN_HEIGHT = HEADER + 90;
/** Space the view above always keeps (its title row is 35px). */
const MIN_ABOVE = 35 + 120;
const DEFAULT_HEIGHT = 330;

let request: Promise<GithubActivity> | null = null;

/** One request per page load, shared by every mount; a failure clears it so Retry asks again. */
function loadActivity() {
  request ??= fetch("/api/github")
    .then(async (res) => {
      const body = (await res.json().catch(() => null)) as GithubActivity | null;
      if (!body || (!body.contributions && !body.repos)) throw new Error(`HTTP ${res.status}`);
      return body;
    })
    .catch((err) => {
      request = null;
      throw err;
    });
  return request;
}

function useGithubActivity() {
  const [state, setState] = useState<{ data?: GithubActivity; failed?: boolean }>({});
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    loadActivity().then(
      (data) => live && setState({ data }),
      () => live && setState({ failed: true }),
    );
    return () => {
      live = false;
    };
  }, [attempt]);
  const retry = () => {
    setState({});
    setAttempt((n) => n + 1);
  };
  return { ...state, retry };
}

const utc = (date: string) => new Date(`${date}T00:00:00Z`);

const dayLabel = (d: ContributionDay) =>
  `${d.count === 0 ? "No" : d.count} contribution${d.count === 1 ? "" : "s"} on ${utc(d.date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })}`;

function timeAgo(iso: string) {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (days < 7) return rtf.format(-days, "day");
  if (days < 30) return rtf.format(-Math.round(days / 7), "week");
  if (days < 365) return rtf.format(-Math.round(days / 30), "month");
  return rtf.format(-Math.round(days / 365), "year");
}

const WEEKDAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

/** GitHub's contribution calendar: a column per week, newest on the right, scrolled into view. */
function Calendar({ days }: { days: ContributionDay[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const weeks = useMemo(() => {
    const cols: { days: (ContributionDay | null)[]; month?: string }[] = [];
    for (const d of days) {
      const dow = utc(d.date).getUTCDay();
      if (!cols.length || dow === 0) cols.push({ days: Array(7).fill(null) });
      cols.at(-1)!.days[dow] = d;
    }
    // Label a week when it starts a new month, as GitHub does (skipping a cramped first label).
    cols.forEach((col, i) => {
      const first = col.days.find(Boolean);
      const prev = cols[i - 1]?.days.find(Boolean);
      if (!first || !prev) return;
      const month = utc(first.date).getUTCMonth();
      if (month !== utc(prev.date).getUTCMonth()) {
        col.month = utc(first.date).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
      }
    });
    return cols;
  }, [days]);

  // Keep the newest week in view, including when a hidden sidebar (phones) first opens, until the
  // visitor scrolls back through the year themselves.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let touched = false;
    const pin = () => {
      if (!touched) el.scrollLeft = el.scrollWidth;
    };
    const touch = () => (touched = true);
    pin();
    const observer = new ResizeObserver(pin);
    observer.observe(el);
    el.addEventListener("pointerdown", touch);
    el.addEventListener("wheel", touch, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("pointerdown", touch);
      el.removeEventListener("wheel", touch);
    };
  }, [weeks]);

  return (
    <div ref={scroller} className="gh-calendar vsc-scroll">
      <div className="gh-grid" style={{ gridTemplateColumns: `1.75rem repeat(${weeks.length}, var(--gh-cell))` }}>
        <span className="gh-weekday" />
        {WEEKDAYS.map((label, i) => (
          <span key={i} className="gh-weekday">
            {label}
          </span>
        ))}
        {weeks.map((week, w) => (
          <div key={w} className="contents">
            <span className="gh-month">{week.month}</span>
            {week.days.map((d, i) =>
              d ? (
                <span key={i} className="gh-day" data-level={d.level} title={dayLabel(d)} />
              ) : (
                <span key={i} />
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <span className="flex items-center gap-[3px]" aria-hidden>
      Less
      {[0, 1, 2, 3, 4].map((l) => (
        <span key={l} className="gh-day" data-level={l} />
      ))}
      More
    </span>
  );
}

function ActivityBody() {
  const { data, failed, retry } = useGithubActivity();

  if (failed) {
    return (
      <div className="space-y-2 px-4 py-3 text-[13px]">
        <p className="text-description">Couldn&apos;t reach GitHub just now.</p>
        <div className="flex gap-3">
          <button type="button" onClick={retry} className="text-link hover:underline">
            Retry
          </button>
          <a href={GITHUB_PROFILE} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
            Open github.com/{GITHUB_USER}
          </a>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div aria-busy className="px-4 py-3">
        <div className="mb-2 h-3.5 w-40 animate-pulse rounded-sm bg-side-foreground/10" />
        <div className="h-[110px] animate-pulse rounded-sm bg-side-foreground/5" />
        <span className="sr-only">Loading GitHub activity…</span>
      </div>
    );
  }

  const { contributions, repos } = data;
  const lastActive = contributions?.days.findLast((d) => d.count > 0);

  return (
    <div className="pb-2">
      {contributions && (
        <div className="px-3 pt-1.5">
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-1.5 flex items-baseline gap-1.5 text-[13px] hover:underline"
          >
            <span className="font-semibold text-side-foreground">{contributions.total.toLocaleString("en-US")}</span>
            <span className="truncate text-description">contributions in the last year</span>
          </a>
          <Calendar days={contributions.days} />
          <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-description">
            <span className="truncate">{lastActive && `Last active ${timeAgo(`${lastActive.date}T12:00:00Z`)}`}</span>
            <Legend />
          </div>
        </div>
      )}

      {repos && repos.length > 0 && (
        <>
          <h3 className="mt-3 mb-0.5 px-3 text-[11px] tracking-wide text-description uppercase">Recently pushed</h3>
          <ul>
            {repos.map((repo) => (
              <li key={repo.name}>
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={repo.description ?? repo.name}
                  className="flex items-start gap-2 px-3 py-1 hover:bg-list-hover"
                >
                  <VscRepo aria-hidden className="mt-0.5 size-4 shrink-0 text-description" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] leading-5 text-side-foreground">{repo.name}</span>
                    <span className="flex items-center gap-x-2 text-xs text-description">
                      {repo.language && (
                        <span className="flex items-center gap-1">
                          <span
                            aria-hidden
                            className="size-2 rounded-full"
                            style={{ background: LANGUAGE_COLORS[repo.language] ?? "var(--description)" }}
                          />
                          {repo.language}
                        </span>
                      )}
                      {repo.stars > 0 && (
                        <span className="flex items-center gap-0.5">
                          <VscStarFull aria-hidden className="size-3" />
                          {repo.stars}
                          <span className="sr-only">stars</span>
                        </span>
                      )}
                      <span className="truncate">{timeAgo(repo.pushedAt)}</span>
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/**
 * The sidebar's lower pane, under whichever view is showing: GitHub activity. Drag its top edge
 * to resize (dragging it nearly shut collapses it, like VS Code); the header toggles it.
 */
export function GithubPane() {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(true);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [room, setRoom] = useState(Infinity);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ y: number; height: number } | null>(null);

  useEffect(() => {
    const aside = ref.current?.parentElement;
    if (!aside) return;
    const observer = new ResizeObserver(() => setRoom(aside.clientHeight - MIN_ABOVE));
    observer.observe(aside);
    return () => observer.disconnect();
  }, []);

  const shown = Math.max(MIN_HEIGHT, Math.min(height, room));

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, height: shown };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const next = drag.current.height - (e.clientY - drag.current.y);
    if (next < MIN_HEIGHT - 60) {
      drag.current = null;
      setDragging(false);
      setOpen(false);
      return;
    }
    setHeight(Math.min(Math.max(MIN_HEIGHT, next), room));
  };
  const onPointerUp = () => {
    drag.current = null;
    setDragging(false);
  };

  return (
    <section
      ref={ref}
      aria-label="GitHub activity"
      style={open ? { height: shown } : undefined}
      className="relative flex shrink-0 flex-col border-t border-line"
    >
      {open && (
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize GitHub activity"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={() => setHeight(DEFAULT_HEIGHT)}
          className={cn(
            "absolute inset-x-0 -top-[3px] z-20 h-1.5 cursor-ns-resize touch-none transition-colors delay-150 hover:bg-focus",
            dragging && "bg-focus",
          )}
        />
      )}
      <SectionHeader
        title="GitHub activity"
        open={open}
        onToggle={() => setOpen((o) => !o)}
        actions={
          <SectionAction label={`Open github.com/${GITHUB_USER}`} onClick={() => openExternal(GITHUB_PROFILE)}>
            <VscLinkExternal className="size-3.5" />
          </SectionAction>
        }
      />
      {open && (
        <div className="vsc-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <ActivityBody />
        </div>
      )}
    </section>
  );
}
