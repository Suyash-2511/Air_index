import { type RefObject, useMemo } from "react";
import * as THREE from "three";

const TEXTURE_BASE = "/textures";

/** Loads a small texture at once and swaps in the large one when it arrives, so the globe is never blank. */
function loadProgressive(loader: THREE.TextureLoader, name: string, onFull: (texture: THREE.Texture) => void): THREE.Texture {
  const preview = loader.load(`${TEXTURE_BASE}/${name}-low.webp`, () => {
    loader.load(`${TEXTURE_BASE}/${name}.webp`, (full) => {
      full.colorSpace = THREE.SRGBColorSpace;
      onFull(full);
    });
  });
  preview.colorSpace = THREE.SRGBColorSpace;
  return preview;
}

/** Day and night surface textures, upgrading to full resolution on the earth material once loaded. */
export function useEarthTextures(materialRef: RefObject<THREE.ShaderMaterial | null>) {
  return useMemo(() => {
    const loader = new THREE.TextureLoader();
    const swapIn = (uniform: "uDayTexture" | "uNightTexture") => (texture: THREE.Texture) => {
      const target = materialRef.current?.uniforms[uniform];
      if (target) target.value = texture;
    };
    return {
      dayTexture: loadProgressive(loader, "earth-day", swapIn("uDayTexture")),
      nightTexture: loadProgressive(loader, "earth-night", swapIn("uNightTexture")),
    };
  }, [materialRef]);
}
