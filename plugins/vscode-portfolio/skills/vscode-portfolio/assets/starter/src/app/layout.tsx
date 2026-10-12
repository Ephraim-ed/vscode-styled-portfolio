import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";

import { profile } from "@/data/profile";
import { DEFAULT_THEME, THEME_STORAGE_KEY, themes } from "@/data/themes";
import { siteDescription, siteTitle, siteUrl } from "@/lib/site";

import "./globals.css";

const codeFont = JetBrains_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  display: "swap",
});

// JetBrains Mono's box-drawing and block glyphs (U+2500–259F), which Google's "latin" subset leaves
// out: without them the README lettering's █ and ░ fall through to an Arial-based fallback and
// drift out of line. Subset from Google Fonts (OFL-1.1, see fonts/OFL.txt). Listed first in the
// mono stack, but its unicode-range means it only ever draws those characters.
const blockFont = localFont({
  src: "./fonts/jetbrains-mono-blocks.woff2",
  variable: "--font-blocks",
  weight: "400",
  display: "swap",
  adjustFontFallback: false,
  declarations: [{ prop: "unicode-range", value: "U+2500-259F" }],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteTitle, template: `%s · ${profile.name}` },
  description: siteDescription,
  applicationName: `${profile.name} — Portfolio`,
  authors: [{ name: profile.name, url: profile.links.github }],
  keywords: [profile.name, profile.role, "portfolio", ...profile.coreStack],
  openGraph: {
    type: "profile",
    title: siteTitle,
    description: siteDescription,
    siteName: `${profile.name} — Portfolio`,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: siteTitle, description: siteDescription },
};

export const viewport: Viewport = {
  themeColor: "#21222c", // the default theme's (Dracula's) title bar
  colorScheme: "dark light",
};

// Runs before first paint so a saved theme never flashes the default one.
const themeTypes = Object.fromEntries(themes.map((t) => [t.id, t.type]));
const themeScript = `(function(){try{var m=${JSON.stringify(themeTypes)};var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(!m[t])t=${JSON.stringify(DEFAULT_THEME)};var d=document.documentElement;d.dataset.theme=t;d.dataset.themeType=m[t];}catch(e){}})();`;

// Hides the README greeting until its intro decides to play (see Greeting), so the finished greeting
// doesn't flash up first. Never with reduced motion, and never for long, in case scripts are slow.
const introScript = `(function(){try{if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;var d=document.documentElement;d.dataset.intro="";setTimeout(function(){delete d.dataset.intro},3000)}catch(e){}})();`;

// Day or night by the visitor's clock (night from 6pm to 5am, as the greeting's "Good evening!"):
// the README's mountains show the sun or the moon. Set before first paint, so neither flashes up.
const skyScript = `(function(){try{var h=new Date().getHours();document.documentElement.dataset.sky=h>=18||h<5?"night":"day"}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme={DEFAULT_THEME}
      data-theme-type="dark"
      className={`${codeFont.variable} ${blockFont.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
        <script dangerouslySetInnerHTML={{ __html: skyScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
