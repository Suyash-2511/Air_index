import type { HTMLAttributes } from "react";
import { useLocale } from "@/hooks";
import styles from "./StaticFallback.module.css";

interface StaticFallbackProps extends HTMLAttributes<HTMLDivElement> {
  pm25?: number | undefined;
  cityName?: string;
}

/**
 * Still image of the Earth, labelled with the city's PM2.5.
 * Displayed when WebGL is absent or when reduced motion is preferred.
 */
export function StaticFallback({
  pm25,
  cityName = "New Delhi",
  className = "",
  ...props
}: StaticFallbackProps) {
  const { t } = useLocale();

  return (
    <div
      className={`${styles.container} ${className}`}
      role="img"
      aria-label={
        pm25 === undefined
          ? t("static_fallback_aria_unmeasured", { cityName })
          : t("static_fallback_aria_measured", { cityName, pm25: Math.round(pm25) })
      }
      {...props}
    >
      <div className={styles.globeWrapper}>
        <img
          src="/textures/earth-static.webp"
          alt=""
          className={styles.earthImage}
          width={600}
          height={600}
          fetchPriority="high"
        />
      </div>
    </div>
  );
}
