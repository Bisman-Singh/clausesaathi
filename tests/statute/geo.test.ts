import { describe, expect, it } from "vitest";
import { distanceKm, isInIndia, nearestState } from "@/lib/statute/geo";

describe("nearestState", () => {
  it("maps well-known cities to their state", () => {
    expect(nearestState(12.97, 77.59)).toBe("Karnataka");
    expect(nearestState(19.08, 72.88)).toBe("Maharashtra");
    expect(nearestState(28.61, 77.21)).toBe("Delhi");
    expect(nearestState(13.08, 80.27)).toBe("Tamil Nadu");
    expect(nearestState(22.57, 88.36)).toBe("West Bengal");
    expect(nearestState(9.93, 76.27)).toBe("Kerala");
    expect(nearestState(12.3, 76.65)).toBe("Karnataka");
    expect(nearestState(17.39, 78.49)).toBe("Telangana");
    expect(nearestState(28.46, 77.03)).toBe("Haryana");
  });

  it("gives no guess outside India", () => {
    expect(isInIndia(51.5, -0.1)).toBe(false);
    expect(nearestState(51.5, -0.1)).toBeNull();
    expect(nearestState(1.35, 103.8)).toBeNull();
  });

  it("measures distance sensibly", () => {
    expect(distanceKm([12.97, 77.59], [12.97, 77.59])).toBe(0);
    const bengaluruToChennai = distanceKm([12.97, 77.59], [13.08, 80.27]);
    expect(bengaluruToChennai).toBeGreaterThan(280);
    expect(bengaluruToChennai).toBeLessThan(300);
  });
});
