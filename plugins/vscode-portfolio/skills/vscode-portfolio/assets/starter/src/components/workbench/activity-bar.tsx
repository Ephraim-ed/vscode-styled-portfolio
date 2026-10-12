"use client";

import type { IconType } from "react-icons";
import { TbBrandLinkedin } from "react-icons/tb";
import {
  VscAccount,
  VscExtensions,
  VscFiles,
  VscGithub,
  VscMail,
  VscSearch,
  VscSettingsGear,
  VscSourceControl,
  VscSymbolColor,
  VscTerminal,
} from "react-icons/vsc";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { profile } from "@/data/profile";
import { isThemeId, themes } from "@/data/themes";
import { composeEmail, openExternal } from "@/lib/actions";
import { linkIcon } from "@/lib/link-icons";
import { keybindings, useKeybindingLabel, type Keybinding } from "@/lib/platform";
import { useWorkbench, type SidebarView } from "@/lib/store";
import { cn } from "@/lib/utils";

const views: { id: SidebarView; label: string; icon: IconType; keybinding: Keybinding }[] = [
  { id: "explorer", label: "Explorer", icon: VscFiles, keybinding: keybindings.explorer },
  { id: "search", label: "Search", icon: VscSearch, keybinding: keybindings.search },
  { id: "scm", label: "Source Control", icon: VscSourceControl, keybinding: keybindings.scm },
  { id: "extensions", label: "Extensions (My skills)", icon: VscExtensions, keybinding: keybindings.extensions },
];

const ExtraIcon = profile.links.extra ? linkIcon(profile.links.extra.url) : null;

const itemClass =
  "relative grid h-12 w-12 place-items-center text-activitybar-inactive transition-colors hover:text-activitybar-foreground";

export function ActivityBar() {
  const label = useKeybindingLabel();
  const sidebarView = useWorkbench((s) => s.sidebarView);
  const sidebarOpen = useWorkbench((s) => s.sidebarOpen);
  const mobileSidebarOpen = useWorkbench((s) => s.mobileSidebarOpen);
  const showView = useWorkbench((s) => s.showView);
  const theme = useWorkbench((s) => s.theme);
  const setTheme = useWorkbench((s) => s.setTheme);
  const openPalette = useWorkbench((s) => s.openPalette);
  const togglePanel = useWorkbench((s) => s.togglePanel);

  return (
    <nav
      aria-label="Activity bar"
      className="flex w-12 shrink-0 flex-col justify-between bg-activitybar"
    >
      <div role="tablist" aria-orientation="vertical">
        {views.map((v) => {
          const active = sidebarView === v.id;
          const Icon = v.icon;
          return (
            <Tooltip key={v.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  role="tab"
                  aria-label={v.label}
                  aria-selected={active}
                  onClick={() => showView(v.id)}
                  className={cn(
                    itemClass,
                    active && "text-activitybar-foreground",
                    active && sidebarOpen && "md:before:absolute md:before:inset-y-0 md:before:left-0 md:before:w-0.5 md:before:bg-activitybar-indicator",
                    active && mobileSidebarOpen && "max-md:before:absolute max-md:before:inset-y-0 max-md:before:left-0 max-md:before:w-0.5 max-md:before:bg-activitybar-indicator",
                  )}
                >
                  <Icon className="size-6" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {v.label} ({label(v.keybinding)})
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <div className="pb-1">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="Accounts" className={itemClass}>
                  <VscAccount className="size-6" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">Accounts</TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="right" align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <div className="text-sm font-medium text-popover-foreground">{profile.name}</div>
              <div className="text-xs text-description">{profile.role}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => openExternal(profile.links.github)}>
              <VscGithub /> GitHub
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openExternal(profile.links.linkedin)}>
              <TbBrandLinkedin /> LinkedIn
            </DropdownMenuItem>
            {ExtraIcon && profile.links.extra && (
              <DropdownMenuItem onSelect={() => openExternal(profile.links.extra!.url)}>
                <ExtraIcon /> {profile.links.extra.label}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => composeEmail()}>
              <VscMail /> {profile.email}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="Manage" className={itemClass}>
                  <VscSettingsGear className="size-6" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right">Manage</TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="right" align="end" className="w-64">
            <DropdownMenuItem onSelect={() => openPalette("commands")}>
              Command Palette…
              <DropdownMenuShortcut>{label(keybindings.commandPalette)}</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => togglePanel("terminal")}>
              <VscTerminal /> Toggle Terminal
              <DropdownMenuShortcut>{label(keybindings.toggleTerminal)}</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <VscSymbolColor /> Themes
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={theme}
                  onValueChange={(v) => isThemeId(v) && setTheme(v)}
                >
                  {themes.map((t) => (
                    <DropdownMenuRadioItem key={t.id} value={t.id}>
                      {t.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onSelect={() => openPalette("themes")}>Color Theme…</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
