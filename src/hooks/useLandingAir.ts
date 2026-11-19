"use client";

import { useEffect, useState } from "react";
import { type CurrentAirReading, fetchCurrentAir } from "@/client/api";

/** The outdoor reading shown on the landing page, refetched when the home coordinates change. */
export function useLandingAir(lat: number, lng: number): CurrentAirReading | undefined {
  const [reading, setReading] = useState<CurrentAirReading | undefined>();

  useEffect(() => {
    // A late response for an earlier position must not overwrite the current one.
    let isStale = false;
    setReading(undefined);
    void fetchCurrentAir(lat, lng).then((value) => {
      if (!isStale) setReading(value);
    });
    return () => {
      isStale = true;
    };
  }, [lat, lng]);

  return reading;
}
