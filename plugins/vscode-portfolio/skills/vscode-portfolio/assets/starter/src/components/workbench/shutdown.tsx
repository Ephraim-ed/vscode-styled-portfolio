"use client";

import { useEffect, useRef } from "react";
import { TbPower } from "react-icons/tb";

import { assistant, features, profile } from "@/data/profile";
import { powerDown, powerUp } from "@/lib/sounds";
import { SHUTDOWN_AT, useWeather, type Power } from "@/lib/weather";

import { PixelLogo } from "../pixel-logo";

const SHUTDOWN_MS = 950; // the screen collapsing (see crt-off in globals.css)
const BOOT_MS = 2100; // the boot log
const WAKE_MS = 750; // the screen warming back on (crt-on)

const BOOT_LOG = [
  ["", `${profile.monogram}-os 15.0 (high-five edition)`],
  ["  OK  ", `Cooled down after ${SHUTDOWN_AT} high fives`],
  ["  OK  ", "Reset the high-five counter"],
  ["  OK  ", "Cleared the README's weather"],
  ...(features.chat ? [["  OK  ", `Started ${assistant.name} ${assistant.title}`]] : []),
  ["  OK  ", "Mounted ~/portfolio"],
  ["", "Welcome back."],
];

const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The last easter egg: SHUTDOWN_AT high fives and the site shuts down like an old CRT. The workbench
 * collapses to a bright line, then a dot, and goes dark (html[data-power] drives that in CSS); a halt
 * message waits on the black screen. Any key or click restarts it: a boot log, then the screen warms
 * back on, with the high fives (and the weather) reset. With reduced motion it just fades.
 */
export function Shutdown() {
  const power = useWeather((s) => s.power);
  const restartButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const { setPower, reboot } = useWeather.getState();
    if (power === "on") {
      delete root.dataset.power;
      return;
    }
    root.dataset.power = power;
    const after = (ms: number, next: Power) => {
      const timer = setTimeout(() => setPower(next), ms);
      return () => clearTimeout(timer);
    };
    if (power === "shutting-down") {
      powerDown();
      return after(calm() ? 400 : SHUTDOWN_MS, "off");
    }
    if (power === "booting") return after(BOOT_MS, "waking");
    if (power === "waking") return after(calm() ? 300 : WAKE_MS, "on");

    // Off: any key or click restarts (after a beat, so the high five's own click doesn't).
    restartButton.current?.focus();
    const restart = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      powerUp();
      reboot();
    };
    const timer = setTimeout(() => {
      window.addEventListener("keydown", restart, { capture: true });
      window.addEventListener("pointerdown", restart, { capture: true });
    }, 600);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", restart, { capture: true });
      window.removeEventListener("pointerdown", restart, { capture: true });
    };
  }, [power]);

  if (power !== "off" && power !== "booting") return null;
  return (
    <div className="shutdown" role="alertdialog" aria-modal="true" aria-labelledby="shutdown-title">
      {power === "off" ? (
        <div className="shutdown-screen">
          <PixelLogo className="shutdown-logo" />
          <pre className="shutdown-log">
            {`[ ${SHUTDOWN_AT}.000000] high-five: too many high fives\n[ ${SHUTDOWN_AT}.000001] ${profile.monogram}-os: overheating, powering off\n`}
            <span id="shutdown-title" className="shutdown-halted">
              System halted.
            </span>
          </pre>
          <button ref={restartButton} type="button" className="shutdown-restart">
            <TbPower aria-hidden />
            Press any key or click to restart
          </button>
        </div>
      ) : (
        <div className="shutdown-screen">
          <pre className="shutdown-log shutdown-boot" id="shutdown-title" aria-label="Restarting">
            {BOOT_LOG.map(([status, line], i) => (
              <span key={line} style={{ animationDelay: `${i * (BOOT_MS / (BOOT_LOG.length + 1))}ms` }}>
                {status && (
                  <>
                    [<b>{status}</b>]{" "}
                  </>
                )}
                {line}
                {"\n"}
              </span>
            ))}
          </pre>
        </div>
      )}
    </div>
  );
}
