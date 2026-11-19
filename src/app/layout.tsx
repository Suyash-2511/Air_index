import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { preload } from "react-dom";
import type { ReactNode } from "react";
import { LocaleProvider } from "@/hooks";
import "@/styles/globals.css";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

/** Root application metadata defining document title and description. */
export const metadata: Metadata = {
  title: "Saans — Winter Smog Exposure Planner",
  description:
    "A glass of city air: estimates what your household actually breathes and shows how much each change cuts what you inhale.",
};

/** Root HTML layout wrapper configuring custom typography and texture preloads. */
export default function RootLayout({ children }: { children: ReactNode }) {
  // Hint the globe images early so they are in flight before the 3D scene mounts.
  preload("/textures/earth-static.webp", { as: "image", fetchPriority: "high" });
  preload("/textures/earth-day-low.webp", { as: "image", crossOrigin: "anonymous" });
  preload("/textures/earth-night-low.webp", { as: "image", crossOrigin: "anonymous" });
  preload("/textures/earth-day.webp", { as: "image", crossOrigin: "anonymous", fetchPriority: "low" });
  preload("/textures/earth-night.webp", { as: "image", crossOrigin: "anonymous", fetchPriority: "low" });
  return (
    <html
      lang="en"
      data-theme="light"
      className={`${instrumentSerif.variable} ${geist.variable} ${geistMono.variable}`}
    >
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
