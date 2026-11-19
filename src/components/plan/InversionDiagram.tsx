"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/hooks";
import styles from "./InversionExplainer.module.css";

/** Frame shared by the three panels: a rounded box with a title, positioned along the strip. */
function Stage({ x, title, children }: { x: number; title: string; children: ReactNode }) {
  return (
    <g transform={`translate(${x}, 10)`}>
      <rect width="180" height="140" rx="6" fill="var(--sky-1)" stroke="var(--rule)" />
      <text x="90" y="24" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--ink)">
        {title}
      </text>
      {children}
    </g>
  );
}

/** An arrow of dashes with a head, used for air sinking or rising. */
function DashedArrow({ path, head }: { path: string; head: string }) {
  return (
    <>
      <path d={path} stroke="var(--ink-secondary)" strokeWidth="1.5" strokeDasharray="3,3" fill="none" />
      <polygon points={head} fill="var(--ink-secondary)" />
    </>
  );
}

function ColdNight() {
  const { t } = useLocale();
  return (
    <Stage x={10} title={t("inversion_stage1_title")}>
      <path d="M 20 120 Q 90 115 160 120" stroke="var(--rule-strong)" strokeWidth="2" fill="none" />
      <circle cx="90" cy="50" r="14" fill="var(--sky-2)" stroke="var(--rule)" />
      <DashedArrow path="M 90 70 L 90 95" head="87,95 90,102 93,95" />
      <text x="90" y="112" textAnchor="middle" fontSize="10" fill="var(--ink-secondary)">
        {t("inversion_stage1_sub")}
      </text>
    </Stage>
  );
}

/** Smoke particles trapped under the warm lid: x, y, radius, opacity. */
const SMOKE_PARTICLES = [
  [45, 85, 4, 0.6],
  [70, 100, 6, 0.7],
  [110, 88, 5, 0.7],
  [140, 102, 4, 0.6],
] as const;

function TrappedLayer() {
  const { t } = useLocale();
  return (
    <Stage x={210} title={t("inversion_stage2_title")}>
      <rect x="20" y="42" width="140" height="20" rx="3" fill="rgba(230, 81, 0, 0.15)" stroke="rgba(230, 81, 0, 0.4)" />
      <text x="90" y="56" textAnchor="middle" fontSize="10" fontWeight="500" fill="var(--ink)">
        {t("inversion_stage2_lid")}
      </text>
      <rect x="20" y="70" width="140" height="50" rx="3" fill="var(--smog-soft)" />
      {SMOKE_PARTICLES.map(([cx, cy, r, opacity]) => (
        <circle key={cx} cx={cx} cy={cy} r={r} fill="var(--smog-deep)" opacity={opacity} />
      ))}
      <text x="90" y="110" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--ink)">
        {t("inversion_stage2_smog")}
      </text>
    </Stage>
  );
}

/** The three rising plumes: x of the stem, and the arrow path and head that go with it. */
const PLUMES = [
  { path: "M 45 110 Q 55 80 45 65", head: "42,65 45,58 48,65" },
  { path: "M 90 110 Q 100 85 90 70", head: "87,70 90,63 93,70" },
  { path: "M 135 110 Q 145 80 135 65", head: "132,65 135,58 138,65" },
] as const;

function SunLifts() {
  const { t } = useLocale();
  return (
    <Stage x={410} title={t("inversion_stage3_title")}>
      <circle cx="90" cy="48" r="10" fill="#f57c00" />
      {PLUMES.map((plume) => (
        <DashedArrow key={plume.path} {...plume} />
      ))}
      <text x="90" y="125" textAnchor="middle" fontSize="10" fill="var(--ink)">
        {t("inversion_stage3_sub")}
      </text>
    </Stage>
  );
}

/** Night, trapped smog, morning lift: the three panels of how an inversion forms and breaks. */
export function InversionDiagram() {
  const { t } = useLocale();
  return (
    <svg viewBox="0 0 600 160" className={styles.svg} role="img" aria-label={t("inversion_svg_aria")}>
      <ColdNight />
      <TrappedLayer />
      <SunLifts />
    </svg>
  );
}
