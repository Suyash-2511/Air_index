import { type RefObject, useMemo } from "react";
import * as THREE from "three";
import { ATMOSPHERE_BASE_COLOR, ATMOSPHERE_INTENSITY, SUN_DIRECTION } from "./constants";
import { useEarthTextures } from "./useEarthTextures";

/** The values the earth and atmosphere shaders read, created once and then updated in place by the frame loop. */
export function useGlobeUniforms(earthMaterialRef: RefObject<THREE.ShaderMaterial | null>) {
  const { dayTexture, nightTexture } = useEarthTextures(earthMaterialRef);

  const earthUniforms = useMemo(
    () => ({
      uDayTexture: { value: dayTexture },
      uNightTexture: { value: nightTexture },
      uSunDirection: { value: new THREE.Vector3(...SUN_DIRECTION).normalize() },
      uCityLightsBoost: { value: 0 },
    }),
    [dayTexture, nightTexture],
  );
  const atmosphereUniforms = useMemo(
    () => ({ uRimColor: { value: new THREE.Color(ATMOSPHERE_BASE_COLOR) }, uIntensity: { value: ATMOSPHERE_INTENSITY } }),
    [],
  );

  return { earthUniforms, atmosphereUniforms };
}
