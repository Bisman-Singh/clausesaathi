import type { IndianState } from "@/lib/statute/jurisdiction";

/**
 * Turning a position into a state without leaving the browser.
 *
 * The browser only shares coordinates after the user presses the location
 * button and accepts the permission prompt. The coordinates are matched to
 * the nearest anchor point here, on the device, and are never sent anywhere.
 * Each state has several anchors (its main cities plus its centre) because a
 * single centre puts Bengaluru in Tamil Nadu. Near a border the nearest
 * anchor can still be the wrong state, so the result is labelled approximate
 * and the user can change it.
 */

/** Rough bounding box of India; anything outside gets no guess at all. */
const INDIA = { minLat: 6, maxLat: 37.5, minLon: 68, maxLon: 97.5 };

type Point = [number, number];

/** Anchor points per state, [latitude, longitude]: major cities and the geographic centre. */
const ANCHORS: Record<IndianState, Point[]> = {
  "Andhra Pradesh": [
    [17.69, 83.22],
    [16.51, 80.65],
    [13.63, 79.42],
    [14.68, 77.6],
    [15.9, 79.7],
  ],
  "Arunachal Pradesh": [
    [27.1, 93.62],
    [28.2, 94.7],
  ],
  Assam: [
    [26.14, 91.74],
    [27.48, 94.91],
    [26.2, 92.9],
  ],
  Bihar: [
    [25.59, 85.14],
    [24.8, 85.0],
    [26.12, 85.36],
    [25.24, 86.97],
  ],
  Chhattisgarh: [
    [21.25, 81.63],
    [22.08, 82.15],
    [21.3, 81.9],
  ],
  Delhi: [[28.61, 77.21]],
  Goa: [
    [15.5, 73.83],
    [15.27, 73.96],
  ],
  Gujarat: [
    [23.02, 72.57],
    [21.17, 72.83],
    [22.31, 73.18],
    [22.3, 70.8],
    [22.3, 71.2],
  ],
  Haryana: [
    [28.46, 77.03],
    [28.41, 77.31],
    [29.39, 76.97],
    [29.1, 76.1],
  ],
  "Himachal Pradesh": [
    [31.1, 77.17],
    [32.24, 76.32],
    [31.9, 77.2],
  ],
  "Jammu and Kashmir": [
    [34.08, 74.8],
    [32.73, 74.87],
  ],
  Jharkhand: [
    [23.34, 85.31],
    [22.8, 86.2],
    [23.8, 86.43],
  ],
  Karnataka: [
    [12.97, 77.59],
    [12.3, 76.65],
    [12.91, 74.86],
    [15.36, 75.12],
    [15.85, 74.5],
    [14.8, 75.8],
  ],
  Kerala: [
    [8.52, 76.94],
    [9.93, 76.27],
    [11.26, 75.78],
    [10.5, 76.3],
  ],
  "Madhya Pradesh": [
    [23.26, 77.41],
    [22.72, 75.86],
    [23.18, 79.99],
    [26.22, 78.18],
    [23.5, 78.5],
  ],
  Maharashtra: [
    [19.08, 72.88],
    [18.52, 73.86],
    [21.15, 79.09],
    [20.0, 73.79],
    [19.88, 75.34],
    [19.6, 76.0],
  ],
  Manipur: [[24.82, 93.94]],
  Meghalaya: [[25.58, 91.89]],
  Mizoram: [[23.73, 92.72]],
  Nagaland: [
    [25.67, 94.11],
    [25.91, 93.73],
  ],
  Odisha: [
    [20.3, 85.82],
    [20.46, 85.88],
    [22.25, 84.9],
    [20.5, 84.4],
  ],
  Punjab: [
    [30.9, 75.86],
    [31.63, 74.87],
    [30.7, 76.72],
    [31.33, 75.58],
  ],
  Rajasthan: [
    [26.91, 75.79],
    [26.24, 73.02],
    [24.58, 73.71],
    [25.21, 75.86],
    [26.6, 73.8],
  ],
  Sikkim: [[27.34, 88.61]],
  "Tamil Nadu": [
    [13.08, 80.27],
    [11.02, 76.96],
    [9.93, 78.12],
    [10.79, 78.7],
    [11.66, 78.15],
    [11.0, 78.4],
  ],
  Telangana: [
    [17.39, 78.49],
    [17.98, 79.59],
    [18.67, 78.1],
  ],
  Tripura: [[23.83, 91.28]],
  "Uttar Pradesh": [
    [26.85, 80.95],
    [26.45, 80.33],
    [25.32, 82.97],
    [27.18, 78.01],
    [28.54, 77.39],
    [25.44, 81.85],
    [26.9, 80.9],
  ],
  Uttarakhand: [
    [30.32, 78.03],
    [29.95, 78.16],
    [29.22, 79.51],
  ],
  "West Bengal": [
    [22.57, 88.36],
    [26.73, 88.4],
    [23.25, 87.86],
    [22.32, 87.32],
    [23.6, 87.8],
  ],
};

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in kilometres. */
export function distanceKm(a: Point, b: Point): number {
  const dLat = toRadians(b[0] - a[0]);
  const dLon = toRadians(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a[0])) * Math.cos(toRadians(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function isInIndia(latitude: number, longitude: number): boolean {
  return (
    latitude >= INDIA.minLat &&
    latitude <= INDIA.maxLat &&
    longitude >= INDIA.minLon &&
    longitude <= INDIA.maxLon
  );
}

/** The state owning the nearest anchor point, or null outside India. */
export function nearestState(latitude: number, longitude: number): IndianState | null {
  if (!isInIndia(latitude, longitude)) return null;
  const here: Point = [latitude, longitude];
  let best: { state: IndianState; km: number } = { state: "Delhi", km: Infinity };
  for (const [state, points] of Object.entries(ANCHORS) as Array<[IndianState, Point[]]>) {
    for (const point of points) {
      const km = distanceKm(here, point);
      if (km < best.km) best = { state, km };
    }
  }
  return best.state;
}
