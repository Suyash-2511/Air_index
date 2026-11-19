import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { DELHI_DEMO_LOCATION } from "@/data";
import { GLOBE_SPIN_RADIANS_PER_SECOND, calculateAtmosphereRimColor, latLngToCameraRotation } from "../mapping";
import { atmosphereFragmentShader, atmosphereVertexShader, earthFragmentShader, earthVertexShader } from "../shaders";
import {
  ATMOSPHERE_RADIUS,
  EARTH_RADIUS,
  INTRO_START_SCALE,
} from "./constants";
import { advanceIntro, advanceTilt, advanceYaw, applyRotation, type GlobeMotion } from "./globe-motion";
import { useGlobeUniforms } from "./useGlobeUniforms";

interface EarthGlobeProps {
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
  lat = DELHI_DEMO_LOCATION.lat,
  lng = DELHI_DEMO_LOCATION.lng,
  density,
  isTouch = false,
  focused = false,
}: EarthGlobeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const earthMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const atmosphereMaterialRef = useRef<THREE.ShaderMaterial>(null);

  const targetRef = useRef(latLngToCameraRotation(lat, lng));
  // Start facing the chosen city so the first frame shows it, then spin from there.
  const motionRef = useRef<GlobeMotion>({ introProgress: 0, yaw: targetRef.current.yaw, tiltX: 0, tiltY: 0 });

  useEffect(() => {
    targetRef.current = latLngToCameraRotation(lat, lng);
  }, [lat, lng]);

  const { earthUniforms, atmosphereUniforms } = useGlobeUniforms(earthMaterialRef);

  useFrame((state, delta) => {
    const motion = motionRef.current;
    advanceIntro(motion, delta, groupRef.current, earthMaterialRef.current);
    if (!isTouch) advanceTilt(motion, state.pointer, delta);
    advanceYaw(motion, {
      isFocused: focused,
      targetYaw: targetRef.current.yaw,
      elapsed: state.clock.getElapsedTime(),
      delta,
      spinRate: GLOBE_SPIN_RADIANS_PER_SECOND,
    });
    if (groupRef.current) applyRotation(groupRef.current, motion, { targetPitch: targetRef.current.pitch, isFocused: focused, delta });

    // The rim shifts colour as the household's dose falls.
    const rim = calculateAtmosphereRimColor(density);
    atmosphereMaterialRef.current?.uniforms.uRimColor?.value.setRGB(rim.r, rim.g, rim.b);
  });

  return (
    <group ref={groupRef} scale={INTRO_START_SCALE}>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <shaderMaterial ref={earthMaterialRef} vertexShader={earthVertexShader} fragmentShader={earthFragmentShader} uniforms={earthUniforms} />
      </mesh>

      <mesh>
        <sphereGeometry args={[ATMOSPHERE_RADIUS, 48, 48]} />
        <shaderMaterial
          ref={atmosphereMaterialRef}
          vertexShader={atmosphereVertexShader}
          fragmentShader={atmosphereFragmentShader}
          uniforms={atmosphereUniforms}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
