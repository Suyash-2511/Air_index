import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  GLOBE_SPIN_RADIANS_PER_SECOND,
  calculateAtmosphereRimColor,
  latLngToCameraRotation,
  shortestAngle,
} from "../mapping";
import {
  atmosphereFragmentShader,
  atmosphereVertexShader,
  earthFragmentShader,
  earthVertexShader,
} from "../shaders";

export interface EarthGlobeProps {
  lat?: number;
  lng?: number;
  density: number;
  isTouch?: boolean;
  /** When true the globe turns to face the chosen city; otherwise it spins freely. */
  focused?: boolean;
}

/**
 * 3D Photorealistic Earth with progressive textures, day/night city lights blending,
 * and a thin atmosphere rim whose colour follows the household's dose.
 */
export function EarthGlobe({
  lat = 28.6139,
  lng = 77.209,
  density,
  isTouch = false,
  focused = false,
}: EarthGlobeProps) {
  const globeGroupRef = useRef<THREE.Group>(null);
  const earthMatRef = useRef<THREE.ShaderMaterial>(null);
  const atmosMatRef = useRef<THREE.ShaderMaterial>(null);

  const loadProgressRef = useRef(0);
  const targetRotationRef = useRef(latLngToCameraRotation(lat, lng));
  // Start facing the chosen city so the first frame shows it, then spin from there.
  const yawRef = useRef(targetRotationRef.current.yaw);
  const tiltRef = useRef({ x: 0, y: 0 });

  // Update target rotation when chosen city coordinates change
  useEffect(() => {
    targetRotationRef.current = latLngToCameraRotation(lat, lng);
  }, [lat, lng]);

  const loader = useMemo(() => new THREE.TextureLoader(), []);

  // Progressive texture loading: low-res first, high-res after
  const { dayTex, nightTex } = useMemo(() => {
    const dTex = loader.load("/textures/earth-day-low.webp", () => {
      loader.load("/textures/earth-day.webp", (highDay) => {
        highDay.colorSpace = THREE.SRGBColorSpace;
        const u = earthMatRef.current?.uniforms;
        if (u?.uDayTexture) u.uDayTexture.value = highDay;
      });
    });
    const nTex = loader.load("/textures/earth-night-low.webp", () => {
      loader.load("/textures/earth-night.webp", (highNight) => {
        highNight.colorSpace = THREE.SRGBColorSpace;
        const u = earthMatRef.current?.uniforms;
        if (u?.uNightTexture) u.uNightTexture.value = highNight;
      });
    });
    dTex.colorSpace = THREE.SRGBColorSpace;
    nTex.colorSpace = THREE.SRGBColorSpace;
    return { dayTex: dTex, nightTex: nTex };
  }, [loader]);

  const earthUniforms = useMemo(
    () => ({
      uDayTexture: { value: dayTex },
      uNightTexture: { value: nightTex },
      // Sun from the upper left, slightly in front, so most of the visible face is
      // daylit and the evening terminator with city lights runs down the right edge.
      uSunDirection: { value: new THREE.Vector3(-0.45, 0.25, 0.86).normalize() },
      uCityLightsBoost: { value: 0.0 },
    }),
    [dayTex, nightTex]
  );

  const atmosUniforms = useMemo(
    () => ({
      uRimColor: { value: new THREE.Color("#8FC8E8") },
      uIntensity: { value: 0.45 },
    }),
    []
  );

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // Scale animation during initial load (0.92 -> 1.0) and city lights brighten
    if (loadProgressRef.current < 1.0) {
      loadProgressRef.current = Math.min(1.0, loadProgressRef.current + delta * 1.1);
      const scale = THREE.MathUtils.lerp(0.92, 1.0, loadProgressRef.current);
      if (globeGroupRef.current) globeGroupRef.current.scale.set(scale, scale, scale);
      if (earthMatRef.current?.uniforms.uCityLightsBoost) {
        earthMatRef.current.uniforms.uCityLightsBoost.value = loadProgressRef.current;
      }
    }

    const globe = globeGroupRef.current;
    if (globe) {
      const target = targetRotationRef.current;

      // Desktop pointer tilt: max 5 degrees (0.087 rad), spring smoothed
      if (!isTouch) {
        const maxTilt = 0.087;
        tiltRef.current.x = THREE.MathUtils.lerp(tiltRef.current.x, -state.pointer.y * maxTilt, delta * 3.5);
        tiltRef.current.y = THREE.MathUtils.lerp(tiltRef.current.y, state.pointer.x * maxTilt, delta * 3.5);
      }

      if (focused) {
        // Settle on the city the short way round, with a gentle sway so it stays alive.
        const goal = target.yaw + Math.sin(t * 0.25) * 0.08;
        yawRef.current += shortestAngle(yawRef.current, goal) * Math.min(1, delta * 1.6);
      } else {
        yawRef.current += delta * GLOBE_SPIN_RADIANS_PER_SECOND;
      }

      // While spinning, keep the city's latitude band near the centre so it passes the front each turn.
      const pitchGoal = target.pitch * (focused ? 1 : 0.7) + tiltRef.current.x;
      globe.rotation.x = THREE.MathUtils.lerp(globe.rotation.x, pitchGoal, Math.min(1, delta * 2));
      globe.rotation.y = yawRef.current + tiltRef.current.y;
    }

    // Atmosphere color shift based on dose reduction
    const rimU = atmosMatRef.current?.uniforms?.uRimColor;
    if (rimU) {
      const rim = calculateAtmosphereRimColor(density);
      rimU.value.setRGB(rim.r, rim.g, rim.b);
    }
  });

  return (
    <group ref={globeGroupRef} scale={0.92}>
      {/* Planetary Surface */}
      <mesh>
        <sphereGeometry args={[1.0, 64, 64]} />
        <shaderMaterial
          ref={earthMatRef}
          vertexShader={earthVertexShader}
          fragmentShader={earthFragmentShader}
          uniforms={earthUniforms}
        />
      </mesh>

      {/* Thin Atmosphere Shell with Fresnel Rim */}
      <mesh>
        <sphereGeometry args={[1.025, 48, 48]} />
        <shaderMaterial
          ref={atmosMatRef}
          vertexShader={atmosphereVertexShader}
          fragmentShader={atmosphereFragmentShader}
          uniforms={atmosUniforms}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

    </group>
  );
}
