"use client";

import { useMemo, useState } from "react";
import { VscExtensions, VscVerifiedFilled } from "react-icons/vsc";

import { profile, skills } from "@/data/profile";
import { skillMeta } from "@/data/skill-icons";

import { Section } from "./section";

/** The skills (profile.ts), shown as installed extensions. */
export function ExtensionsView() {
  const [filter, setFilter] = useState("");

  const groups = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return skills
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (s) =>
            !q ||
            s.toLowerCase().includes(q) ||
            g.label.toLowerCase().includes(q) ||
            skillMeta[s]?.description.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.items.length);
  }, [filter]);

  return (
    <div className="flex flex-col">
      <div className="px-3 pt-1 pb-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search Extensions in Marketplace"
          aria-label="Filter skills"
          spellCheck={false}
          className="h-[26px] w-full rounded-[2px] border border-field-border bg-field px-1.5 text-[13px] text-field-foreground outline-none placeholder:text-placeholder focus:border-focus"
        />
      </div>

      {groups.length === 0 && (
        <p className="px-4 text-[13px] text-description">No extensions found.</p>
      )}

      {groups.map((group) => (
        <Section
          key={group.id}
          title={group.label}
          badge={
            <span className="mr-1 rounded-full bg-badge px-1.5 text-[11px] leading-4 text-badge-foreground">
              {group.items.length}
            </span>
          }
        >
          <ul>
            {group.items.map((name) => {
              const meta = skillMeta[name];
              const Icon = meta?.icon ?? VscExtensions;
              return (
                <li
                  key={name}
                  title={`${name} — ${meta?.description ?? group.label}`}
                  className="flex items-center gap-3 px-4 py-2"
                >
                  <span className="grid size-9 shrink-0 place-items-center">
                    <Icon aria-hidden className="size-8" style={{ color: meta?.color }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-side-foreground">{name}</span>
                    <span className="block truncate text-xs text-description">
                      {meta?.description ?? group.label}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-side-foreground/80">
                      <VscVerifiedFilled aria-hidden className="size-3 text-link" />
                      {profile.handle}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>
      ))}
    </div>
  );
}
