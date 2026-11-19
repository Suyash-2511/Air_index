"use client";

import { useState } from "react";
import type { CurrentAirReading } from "@/client/api";
import { DELHI_DEMO_LOCATION } from "@/data/locations";
import type { Location } from "@/lib/types";
import { useBrowserLocation } from "./useBrowserLocation";
import { useLandingAir } from "./useLandingAir";

/** The visitor's own position and the air there, or New Delhi's until it is known or when sharing is blocked. */
export interface LiveHome {
  /** Set once the browser has shared the visitor's position. */
  liveLocation: Location | undefined;
  lat: number;
  lng: number;
  /** Today's outdoor reading at that position. */
  air: CurrentAirReading | undefined;
}

/** Live location is the default start; New Delhi stands in until it is known. */
export function useLiveHome(): LiveHome {
  const [liveLocation, setLiveLocation] = useState<Location | undefined>();
  useBrowserLocation({ onLocationResolved: setLiveLocation });

  const lat = liveLocation?.lat ?? DELHI_DEMO_LOCATION.lat;
  const lng = liveLocation?.lng ?? DELHI_DEMO_LOCATION.lng;
  return { liveLocation, lat, lng, air: useLandingAir(lat, lng) };
}
