"use client";

import { useState, type CSSProperties } from "react";
import { roundForMap, tilesForPreview } from "@/lib/maps/projection";
import styles from "./AreaMap.module.css";

/** Props for the AreaMap component displaying the local PM2.5 heatmap. */
export interface AreaMapProps {
  lat: number;
  lng: number;
  label: string;
}

/**
 * Displays a muted basemap centered on the rounded household coordinates with
 * overlaid PM2.5 heatmap tiles and a subtle ink center marker. Gracefully falls back
 * to an informative message if the basemap cannot be loaded.
 */
export function AreaMap({ lat, lng, label }: AreaMapProps) {
  const [hasError, setHasError] = useState(false);
  const rounded = roundForMap(lat, lng);
  const tiles = tilesForPreview(rounded.lat, rounded.lng);

  return (
    <figure className={styles.figure}>
      <div className={styles.mapBox}>
        {hasError ? (
          <div className={styles.fallback}>
            <p className={styles.fallbackText}>
              The area map could not load right now.
            </p>
          </div>
        ) : (
          <>
            <img
              src={`/api/staticmap?lat=${rounded.lat}&lng=${rounded.lng}`}
              alt={`Street map of ${label} with PM2.5 heatmap overlay`}
              className={styles.basemap}
              onError={() => setHasError(true)}
            />
            <div className={styles.tilesLayer} aria-hidden="true">
              {tiles.map((tile) => (
                <img
                  key={`tile-${tile.x}-${tile.y}`}
                  src={`/api/tiles/12/${tile.x}/${tile.y}`}
                  alt=""
                  aria-hidden="true"
                  className={styles.tile}
                  style={{
                    "--left": `${tile.leftPct}%`,
                    "--top": `${tile.topPct}%`,
                    "--w": `${tile.widthPct}%`,
                    "--h": `${tile.heightPct}%`,
                  } as CSSProperties}
                />
              ))}
            </div>
            <div className={styles.centerMarker} aria-hidden="true" />
          </>
        )}
      </div>
      <figcaption className={styles.caption}>
        {label} · PM2.5 heatmap, Google Air Quality
      </figcaption>
    </figure>
  );
}
