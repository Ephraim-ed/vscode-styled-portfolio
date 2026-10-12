"use client";

import { toast } from "sonner";

import { profile } from "@/data/profile";

export async function copyToClipboard(text: string, message = "Copied to clipboard") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(message, { description: text });
  } catch {
    toast.error("Couldn't access the clipboard", { description: text });
  }
}

export function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export function composeEmail(body?: string) {
  const params = new URLSearchParams({ subject: "Hello from your portfolio" });
  if (body) params.set("body", body);
  // URLSearchParams encodes spaces as "+", which mail clients show literally.
  window.location.href = `mailto:${profile.email}?${params.toString().replace(/\+/g, "%20")}`;
}

export function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.().catch(() => {});
}

export function fileLink(path: string) {
  return `${window.location.origin}${window.location.pathname}#${path}`;
}
