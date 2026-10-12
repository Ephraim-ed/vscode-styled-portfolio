import { ImageResponse } from "next/og";

import { profile } from "@/data/profile";

export const alt = `${profile.name} — ${profile.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const lines: { text: string; color: string; bold?: boolean }[] = [
  { text: `# Hi, I'm ${profile.name}`, color: "#569cd6", bold: true },
  { text: "", color: "#d4d4d4" },
  { text: profile.role, color: "#d4d4d4" },
  { text: "", color: "#d4d4d4" },
  { text: `> ${profile.yearsOfExperience} years · ${profile.coreStack.join(" · ")}`, color: "#6a9955" },
  { text: `> ${profile.location}`, color: "#6a9955" },
  { text: "", color: "#d4d4d4" },
  { text: "## Quick links", color: "#569cd6", bold: true },
  { text: "- about.tsx · experience.log · projects/ · contact.sh", color: "#ce9178" },
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#1e1e1e" }}>
        <div style={{ display: "flex", alignItems: "center", height: 56, background: "#323233", padding: "0 24px", gap: 12 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <div key={c} style={{ width: 18, height: 18, borderRadius: 9, background: c }} />
          ))}
          <div style={{ display: "flex", flex: 1, justifyContent: "center", color: "#cccccc", fontSize: 24 }}>
            {profile.handle} — portfolio
          </div>
        </div>
        <div style={{ display: "flex", height: 56, background: "#252526" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0 28px",
              background: "#1e1e1e",
              color: "#ffffff",
              fontSize: 24,
              borderTop: "3px solid #007acc",
            }}
          >
            README.md
          </div>
          <div style={{ display: "flex", alignItems: "center", padding: "0 28px", color: "#969696", fontSize: 24 }}>
            about.tsx
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "28px 0" }}>
          {lines.map((l, i) => (
            <div key={i} style={{ display: "flex", fontSize: 32, lineHeight: 1.45 }}>
              <div style={{ display: "flex", width: 90, justifyContent: "flex-end", paddingRight: 32, color: "#858585" }}>
                {i + 1}
              </div>
              <div style={{ display: "flex", color: l.color, fontWeight: l.bold ? 700 : 400 }}>{l.text}</div>
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            height: 40,
            background: "#007acc",
            color: "#ffffff",
            fontSize: 20,
            padding: "0 20px",
            gap: 28,
          }}
        >
          <div style={{ display: "flex" }}>main</div>
          {profile.openToWork && <div style={{ display: "flex" }}>● Open to work</div>}
          <div style={{ display: "flex", marginLeft: "auto" }}>Markdown · UTF-8</div>
        </div>
      </div>
    ),
    size,
  );
}
