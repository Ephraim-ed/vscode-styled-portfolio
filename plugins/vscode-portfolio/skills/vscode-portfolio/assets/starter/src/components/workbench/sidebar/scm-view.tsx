"use client";

import { useMemo, useState } from "react";
import { VscCheck } from "react-icons/vsc";

import { education, experience, profile } from "@/data/profile";
import { composeEmail } from "@/lib/actions";
import { useIsMac } from "@/lib/platform";
import { useWorkbench } from "@/lib/store";
import { cn } from "@/lib/utils";

import { useWorkspace } from "../workspace-context";
import { Section } from "./section";

type Commit = { message: string; date: string; refs?: string[]; path: string; find?: string };

const commits: Commit[] = [
  ...experience.map((job, i) => ({
    message: `feat: ${job.role} @ ${job.company}`,
    date: `${job.start.split(" ")[0].slice(0, 3)} ${job.start.split(" ")[1]}`,
    refs: i === 0 && job.current ? ["HEAD", "main"] : undefined,
    path: "experience.log",
    find: job.company,
  })),
  {
    message: `release: ${[education.degree, education.honors].filter(Boolean).join(" · ")}`,
    date: education.end,
    refs: education.grade ? [education.grade] : undefined,
    path: "education.yml",
  },
  {
    message: `init: start ${education.degree} @ ${education.school}`,
    date: education.start,
    path: "education.yml",
  },
].sort((a, b) => sortKey(b.date) - sortKey(a.date));

function sortKey(date: string) {
  const [mon, year] = date.includes(" ") ? date.split(" ") : ["Jun", date];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return Number(year) * 12 + months.indexOf(mon);
}

export function ScmView() {
  const isMac = useIsMac();
  const { byPath } = useWorkspace();
  const openFile = useWorkbench((s) => s.openFile);
  const [message, setMessage] = useState("");

  const lineOf = useMemo(
    () => (c: Commit) => {
      if (!c.find) return 1;
      const lines = byPath.get(c.path)?.source.split("\n") ?? [];
      return Math.max(1, lines.findIndex((l) => l.includes(c.find!)) + 1);
    },
    [byPath],
  );

  const submit = () => composeEmail(message.trim() || undefined);

  return (
    <>
      <Section title="Send me a message!">
        <form
          className="space-y-2 px-3 pt-1 pb-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor="scm-message" className="sr-only">
            Message to {profile.name}
          </label>
          <textarea
            id="scm-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            rows={4}
            placeholder={`Message (${isMac ? "⌘Enter" : "Ctrl+Enter"} to send to ${profile.firstName})`}
            className="block w-full resize-y rounded-[2px] border border-field-border bg-field px-2 py-1 text-[13px] text-field-foreground outline-none placeholder:text-placeholder focus:border-focus"
          />
          <button
            type="submit"
            className="flex h-7 w-full items-center justify-center gap-1.5 rounded-[2px] bg-button text-[13px] text-button-foreground hover:bg-button-hover"
          >
            <VscCheck className="size-4" /> Commit &amp; Push
          </button>
          <p className="text-xs leading-relaxed text-description">
            Opens your email client with this message, addressed to {profile.email}.
          </p>
        </form>
      </Section>

      <Section title="Career timeline">
        <ol className="relative py-1">
          {commits.map((c, i) => (
            <li key={c.message}>
              <button
                type="button"
                onClick={() => openFile(c.path, { line: lineOf(c) })}
                className="group/commit relative flex w-full items-start gap-2 py-1 pr-3 pl-3 text-left hover:bg-list-hover"
              >
                <span aria-hidden className="relative flex w-3 shrink-0 justify-center self-stretch">
                  <span
                    className={cn(
                      "absolute w-0.5 bg-ansi-blue",
                      i === 0 ? "top-2.5" : "-top-1",
                      i === commits.length - 1 ? "h-3" : "-bottom-1",
                    )}
                  />
                  <span
                    className={cn(
                      "relative mt-[5px] size-2.5 rounded-full border-2 border-ansi-blue bg-side",
                      i === 0 && "bg-ansi-blue",
                    )}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] leading-5 text-side-foreground">{c.message}</span>
                  <span className="flex flex-wrap items-center gap-1 text-xs text-description">
                    {c.date}
                    {c.refs?.map((r) => (
                      <span key={r} className="rounded-full bg-badge px-1.5 text-[10px] leading-4 text-badge-foreground">
                        {r}
                      </span>
                    ))}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}
