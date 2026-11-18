import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  GLOBE_SPIN_RADIANS_PER_SECOND,
  calculateAtmosphereRimColor,
  cameraDistanceToFit,
  latLngToCameraRotation,
  latLngToSphereCoords,
  shortestAngle,
} from "../../src/components/scene/mapping";

describe("latLngToSphereCoords", () => {
  it("maps Equator and Prime Meridian (0, 0) to [1, 0, 0], as THREE.SphereGeometry textures do", () => {
    const [x, y, z] = latLngToSphereCoords(0, 0, 1.0);
    expect(x).toBeCloseTo(1, 4);
    expect(y).toBeCloseTo(0, 4);
    expect(z).toBeCloseTo(0, 4);
  });

  it("maps North Pole (90, 0) to [0, 1, 0]", () => {
    const [x, y, z] = latLngToSphereCoords(90, 0, 1.0);
    expect(x).toBeCloseTo(0, 4);
    expect(y).toBeCloseTo(1, 4);
    expect(z).toBeCloseTo(0, 4);
  });

  it("maps 90 deg East (0, 90) to [0, 0, -1] and 90 deg West (0, -90) to [0, 0, 1]", () => {
    const [x, y, z] = latLngToSphereCoords(0, 90, 1.0);
    expect(x).toBeCloseTo(0, 4);
    expect(y).toBeCloseTo(0, 4);
    expect(z).toBeCloseTo(-1, 4);
    expect(latLngToSphereCoords(0, -90, 1.0)[2]).toBeCloseTo(1, 4);
  });

  it("scales proportionally with sphere radius", () => {
    const [x] = latLngToSphereCoords(0, 0, 2.5);
    expect(x).toBeCloseTo(2.5, 4);
  });
});

describe("latLngToCameraRotation", () => {
  function facingPoint(lat: number, lng: number): THREE.Vector3 {
    const rot = latLngToCameraRotation(lat, lng);
    const holder = new THREE.Object3D();
    holder.rotation.set(rot.pitch, rot.yaw, 0);
    holder.updateMatrixWorld();
    return new THREE.Vector3(...latLngToSphereCoords(lat, lng)).applyMatrix4(holder.matrixWorld);
  }

  it.each([
    ["New Delhi", 28.6139, 77.209],
    ["Mumbai", 19.076, 72.8777],
    ["Equator, prime meridian", 0, 0],
    ["São Paulo", -23.55, -46.63],
  ])("turns %s to face the camera on +Z", (_name, lat, lng) => {
    const p = facingPoint(lat, lng);
    expect(p.x).toBeCloseTo(0, 3);
    expect(p.y).toBeCloseTo(0, 3);
    expect(p.z).toBeCloseTo(1, 3);
  });

  it("clamps out of bounds latitudes safely", () => {
    expect(latLngToCameraRotation(150, 0).pitch).toBeCloseTo(Math.PI / 2, 4);
  });
});

describe("latLngToSphereCoords matches the textured globe", () => {
  it("puts a city on the same spot as the SphereGeometry vertex with that city's UV", () => {
    const geometry = new THREE.SphereGeometry(1, 72, 36);
    const uv = geometry.attributes.uv;
    const pos = geometry.attributes.position;
    if (!uv || !pos) throw new Error("sphere geometry missing attributes");
    const lat = 30;
    const lng = 75;
    const target = { u: (lng + 180) / 360, v: (lat + 90) / 180 };
    let best = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < uv.count; i += 1) {
      const d = (uv.getX(i) - target.u) ** 2 + (uv.getY(i) - target.v) ** 2;
      if (d < bestDistance) {
        bestDistance = d;
        best = i;
      }
    }
    const vertex = new THREE.Vector3().fromBufferAttribute(pos, best);
    const coords = new THREE.Vector3(...latLngToSphereCoords(lat, lng));
    expect(vertex.distanceTo(coords)).toBeLessThan(0.01);
  });
});

describe("calculateAtmosphereRimColor", () => {
  it("returns base atmosphere with subtle amber shift at baseline dose", () => {
    const color = calculateAtmosphereRimColor(1.0);
    expect(color.r).toBeGreaterThan(143 / 255);
    expect(color.b).toBeLessThan(232 / 255);
  });

  it("shifts toward clean teal as dose drops toward 0.0", () => {
    const cleanColor = calculateAtmosphereRimColor(0.0);
    expect(cleanColor.g).toBeGreaterThan(calculateAtmosphereRimColor(1.0).g);
  });
});

describe("shortestAngle", () => {
  it("takes the short way round across the ±π seam", () => {
    expect(shortestAngle(3, -3)).toBeCloseTo(2 * Math.PI - 6, 6);
    expect(shortestAngle(-3, 3)).toBeCloseTo(6 - 2 * Math.PI, 6);
  });

  it("ignores whole turns accumulated while spinning", () => {
    expect(shortestAngle(10 * Math.PI + 0.2, 0.5)).toBeCloseTo(0.3, 6);
  });

  it("never asks for more than half a turn", () => {
    for (let a = -20; a <= 20; a += 0.7) {
      expect(Math.abs(shortestAngle(a, 0))).toBeLessThanOrEqual(Math.PI + 1e-9);
    }
  });
});

describe("GLOBE_SPIN_RADIANS_PER_SECOND", () => {
  it("turns the globe visibly but slowly (one turn every 20–90 s)", () => {
    const secondsPerTurn = (2 * Math.PI) / GLOBE_SPIN_RADIANS_PER_SECOND;
    expect(secondsPerTurn).toBeGreaterThanOrEqual(20);
    expect(secondsPerTurn).toBeLessThanOrEqual(90);
  });
});

describe("cameraDistanceToFit", () => {
  function visibleHalfHeightAt(distance: number, fov: number): number {
    return distance * Math.tan((fov * Math.PI) / 360);
  }

  it("keeps the whole globe in view on a landscape canvas", () => {
    const d = cameraDistanceToFit(1.03, 45, 16 / 9, 1.12);
    expect(visibleHalfHeightAt(d, 45)).toBeGreaterThan(1.03);
  });

  it("backs off further on a portrait canvas, where width is the limit", () => {
    const landscape = cameraDistanceToFit(1.03, 45, 1.5);
    const portrait = cameraDistanceToFit(1.03, 45, 0.5);
    expect(portrait).toBeGreaterThan(landscape);
    expect(visibleHalfHeightAt(portrait, 45) * 0.5).toBeGreaterThan(1.03);
  });

  it("falls back to a square canvas for a zero or invalid aspect", () => {
    expect(cameraDistanceToFit(1, 45, 0)).toBeCloseTo(cameraDistanceToFit(1, 45, 1), 6);
    expect(cameraDistanceToFit(1, 45, Number.NaN)).toBeCloseTo(cameraDistanceToFit(1, 45, 1), 6);
  });
});
