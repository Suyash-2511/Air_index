import type { HTMLAttributes } from "react";
import styles from "./StaticFallback.module.css";

export interface StaticFallbackProps extends HTMLAttributes<HTMLDivElement> {
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
  return (
    <div
      className={`${styles.container} ${className}`}
      role="img"
      aria-label={
        pm25 === undefined
          ? `Visualisation of Earth centred on ${cityName}`
          : `Visualisation of Earth with ${cityName} air quality: PM2.5 ${Math.round(pm25)} micrograms per cubic metre`
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
        />
      </div>
    </div>
  );
}
