import type { ReactNode, SVGProps } from "react";

/** Shared props for inline 1.5px stroke SVG icons. */
interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

/** Size in pixels of icons that sit beside body text and in buttons. */
const INLINE_SIZE = 16;
/** Size in pixels of icons that stand alone, such as the theme toggle and search field. */
const STANDALONE_SIZE = 18;

/**
 * Builds an icon component from its shapes. Every icon shares one SVG shell: a 24-unit canvas drawn
 * with a 1.5px round stroke, hidden from screen readers because its button or label carries the meaning.
 */
function createIcon(defaultSize: number, shapes: ReactNode) {
  return function Icon({ size = defaultSize, ...props }: IconProps) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        {shapes}
      </svg>
    );
  };
}

/** Sun icon for the light mode toggle. */
export const IconSun = createIcon(
  STANDALONE_SIZE,
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </>,
);

/** Moon icon for the dark mode toggle. */
export const IconMoon = createIcon(STANDALONE_SIZE, <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />);

/** Checkmark icon for completed steps and badges. */
export const IconCheck = createIcon(INLINE_SIZE, <polyline points="20 6 9 17 4 12" />);

/** Cross icon for delete and close. */
export const IconCross = createIcon(
  INLINE_SIZE,
  <>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </>,
);

/** Forward navigation arrow. */
export const IconArrowRight = createIcon(
  INLINE_SIZE,
  <>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </>,
);

/** Geolocation pin icon. */
export const IconLocation = createIcon(
  INLINE_SIZE,
  <>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </>,
);

/** Speaker icon for read aloud. */
export const IconSpeaker = createIcon(
  INLINE_SIZE,
  <>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </>,
);

/** Stop square icon for ending speech. */
export const IconStop = createIcon(INLINE_SIZE, <rect x="6" y="6" width="12" height="12" rx="1.5" />);

/** Copy and clipboard icon for copying the brief. */
export const IconCopy = createIcon(
  INLINE_SIZE,
  <>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </>,
);

/** Share icon. */
export const IconShare = createIcon(
  INLINE_SIZE,
  <>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </>,
);

/** Printer icon for printing the plan. */
export const IconPrint = createIcon(
  INLINE_SIZE,
  <>
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </>,
);

/** Magnifying glass for search fields. */
export const IconSearch = createIcon(
  STANDALONE_SIZE,
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>,
);

/** Map pin for places. */
export const IconPin = createIcon(
  INLINE_SIZE,
  <>
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </>,
);
