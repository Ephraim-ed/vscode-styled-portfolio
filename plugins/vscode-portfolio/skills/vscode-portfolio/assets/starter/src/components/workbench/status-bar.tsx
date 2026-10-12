"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";
import { VscBell, VscError, VscMute, VscRemote, VscSourceControl, VscUnmute, VscWarning } from "react-icons/vsc";

import { CONTACT_PATH } from "@/data/files";
import { assistant, features, profile } from "@/data/profile";
import { useSounds } from "@/lib/sounds";
import { isPreviewing, useWorkbench } from "@/lib/store";
import { cn } from "@/lib/utils";

import { useWorkspace } from "./workspace-context";

function Item({
  children,
  onClick,
  label,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  label?: string;
  className?: string;
}) {
  const classes = cn("flex h-full items-center gap-1 px-1.5 whitespace-nowrap", className);
  if (!onClick) return <span className={classes}>{children}</span>;
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={cn(classes, "hover:bg-statusbar-hover")}>
      {children}
    </button>
  );
}

export function StatusBar() {
  const { byPath } = useWorkspace();
  const activeTab = useWorkbench((s) => s.activeTab);
  const cursor = useWorkbench((s) => s.cursor);
  const showView = useWorkbench((s) => s.showView);
  const openPanel = useWorkbench((s) => s.openPanel);
  const openFile = useWorkbench((s) => s.openFile);
  const toggleChat = useWorkbench((s) => s.toggleChat);
  const file = activeTab ? byPath.get(activeTab) : undefined;
  const showsCode = useWorkbench((s) => !!file && !isPreviewing(s, file.path));
  const sounds = useSounds((s) => s.enabled);
  const toggleSounds = useSounds((s) => s.toggle);

  return (
    <footer className="flex h-[22px] shrink-0 items-stretch bg-statusbar text-xs text-statusbar-foreground select-none">
      <Item className="bg-statusbar-remote px-2.5 text-statusbar-remote-foreground">
        <VscRemote aria-hidden className="size-3.5" />
        <span className="max-sm:hidden">{profile.location.split(",")[0]}</span>
      </Item>
      <Item label="Source Control: main" onClick={() => showView("scm")}>
        <VscSourceControl aria-hidden className="size-3.5" /> main
      </Item>
      <Item label="No problems" onClick={() => openPanel("problems")}>
        <VscError aria-hidden className="size-3.5" /> 0 <VscWarning aria-hidden className="size-3.5" /> 0
      </Item>
      {profile.openToWork && (
        <Item label="Open to work — contact me" onClick={() => openFile(CONTACT_PATH)}>
          <span aria-hidden className="relative mx-0.5 flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-ansi-green opacity-60" />
            <span className="relative size-2 rounded-full bg-ansi-green" />
          </span>
          Open to work
        </Item>
      )}

      <div className="ml-auto flex items-stretch">
        {features.chat && (
          <Item label={`${assistant.name} — ${profile.firstName}'s personal assistant`} onClick={toggleChat}>
            <span aria-hidden>✻</span> {assistant.name}
          </Item>
        )}
        {file && showsCode && (
          <Item>
            Ln {cursor.line}, Col {cursor.col}
          </Item>
        )}
        {file && showsCode && <Item className="max-md:hidden">Spaces: {file.tabSize}</Item>}
        <Item className="max-md:hidden">UTF-8</Item>
        <Item className="max-lg:hidden">LF</Item>
        {file && <Item className="max-sm:hidden">{file.language}</Item>}
        <Item label={sounds ? "Mute sounds" : "Turn sounds on"} onClick={toggleSounds}>
          {sounds ? <VscUnmute aria-hidden className="size-3.5" /> : <VscMute aria-hidden className="size-3.5" />}
        </Item>
        <Item label="Notifications" onClick={() => toast("No new notifications")}>
          <VscBell aria-hidden className="size-3.5" />
        </Item>
      </div>
    </footer>
  );
}
