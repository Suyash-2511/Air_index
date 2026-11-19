// @vitest-environment jsdom
import { render } from "@testing-library/react";
import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import { FitCamera } from "@/components/scene/FitCamera";

const mockCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
const mockLookAt = vi.spyOn(mockCamera, "lookAt");
const mockUpdate = vi.spyOn(mockCamera, "updateProjectionMatrix");

vi.mock("@react-three/fiber", () => ({
  useThree: vi.fn((selector) =>
    selector({
      camera: mockCamera,
      size: { width: 800, height: 600 },
    }),
  ),
}));

describe("FitCamera", () => {
  it("computes distance and updates camera position and projection matrix", () => {
    render(<FitCamera margin={1.12} />);
    expect(mockCamera.position.z).toBeGreaterThan(0);
    expect(mockLookAt).toHaveBeenCalledWith(0, 0, 0);
    expect(mockUpdate).toHaveBeenCalled();
  });
});
