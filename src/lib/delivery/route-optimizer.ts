/**
 * Route Optimization Engine
 *
 * Takes an array of delivery addresses plus a pharmacy origin,
 * calculates an optimized delivery sequence using nearest-neighbor,
 * estimates drive times, and produces a route summary.
 */

// ── Types ──────────────────────────────────────────────────────

export interface RouteStop {
  id: string; // shipment or delivery id
  patientName: string;
  address: string;
  line1: string;
  city: string;
  state: string;
  zip: string;
  latitude?: number;
  longitude?: number;
  items: string[]; // drug names
  estimatedArrival?: string; // ISO time
  sortOrder: number;
  status: "pending" | "in_transit" | "delivered" | "skipped";
}

export interface OptimizedRoute {
  stops: RouteStop[];
  totalDistanceMiles: number;
  totalDriveTimeMinutes: number;
  estimatedStartTime: string;
  estimatedEndTime: string;
  pharmacyAddress: string;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

// ── Distance Calculation ───────────────────────────────────────

/**
 * Calculate distance between two geographic coordinates in miles
 * using the Haversine formula.
 */
export function calculateDistance(a: LatLng, b: LatLng): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const calc =
    sinDLat * sinDLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(calc), Math.sqrt(1 - calc));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Estimate drive time in minutes from distance in miles.
 * Uses a simple model: 25 mph average for local pharmacy delivery
 * + 3 minutes per stop for parking / walking / handoff.
 */
function estimateDriveMinutes(distanceMiles: number): number {
  const avgSpeedMph = 25;
  return (distanceMiles / avgSpeedMph) * 60;
}

// ── Geocoding (Simple zip-code centroid fallback) ──────────────

/**
 * Approximate coordinates from a street address.
 * In production this would call a geocoding API; for now it
 * generates deterministic pseudo-coordinates from the zip code
 * so that the nearest-neighbor algorithm has something to work with.
 *
 * The pharmacy (Boudreaux's) is in Gonzales, LA area: ~30.24, -90.92
 */
function pseudoGeocode(address: { city: string; state: string; zip: string }): LatLng {
  // Use zip code digits to create deterministic offsets from a central Louisiana point
  const zipNum = parseInt(address.zip.replace(/\D/g, "").slice(0, 5), 10) || 70737;
  const latOffset = ((zipNum % 100) - 50) * 0.005;
  const lngOffset = (((zipNum / 100) | 0) % 100 - 50) * 0.005;
  return {
    latitude: 30.24 + latOffset,
    longitude: -90.92 + lngOffset,
  };
}

// ── Route Optimization ─────────────────────────────────────────

/**
 * Optimize a route using the nearest-neighbor heuristic.
 * Starts at the pharmacy, greedily picks the closest unvisited stop,
 * and repeats until all stops are visited.
 */
export function optimizeRoute(
  stops: RouteStop[],
  pharmacyAddress: string = "1305 N Burnside Ave, Gonzales, LA 70737"
): OptimizedRoute {
  if (stops.length === 0) {
    return {
      stops: [],
      totalDistanceMiles: 0,
      totalDriveTimeMinutes: 0,
      estimatedStartTime: new Date().toISOString(),
      estimatedEndTime: new Date().toISOString(),
      pharmacyAddress,
    };
  }

  // Geocode each stop if missing coordinates
  const geoStops = stops.map((stop) => ({
    ...stop,
    latitude: stop.latitude ?? pseudoGeocode({ city: stop.city, state: stop.state, zip: stop.zip }).latitude,
    longitude: stop.longitude ?? pseudoGeocode({ city: stop.city, state: stop.state, zip: stop.zip }).longitude,
  }));

  // Pharmacy origin
  const origin: LatLng = { latitude: 30.2437, longitude: -90.9201 };

  // Nearest-neighbor algorithm
  const visited: boolean[] = new Array(geoStops.length).fill(false);
  const ordered: (typeof geoStops)[number][] = [];
  let current: LatLng = origin;
  let totalDistance = 0;

  for (let i = 0; i < geoStops.length; i++) {
    let nearestIdx = -1;
    let nearestDist = Infinity;

    for (let j = 0; j < geoStops.length; j++) {
      if (visited[j]) continue;
      const dist = calculateDistance(current, {
        latitude: geoStops[j].latitude!,
        longitude: geoStops[j].longitude!,
      });
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = j;
      }
    }

    if (nearestIdx === -1) break;

    visited[nearestIdx] = true;
    totalDistance += nearestDist;
    current = {
      latitude: geoStops[nearestIdx].latitude!,
      longitude: geoStops[nearestIdx].longitude!,
    };
    ordered.push(geoStops[nearestIdx]);
  }

  // Calculate estimated times
  const STOP_TIME_MINUTES = 5; // time at each stop
  const startTime = new Date();
  startTime.setMinutes(startTime.getMinutes() + 15); // 15 min prep time
  let runningMinutes = 0;

  const optimizedStops: RouteStop[] = ordered.map((stop, idx) => {
    const segmentDist =
      idx === 0
        ? calculateDistance(origin, { latitude: stop.latitude!, longitude: stop.longitude! })
        : calculateDistance(
            { latitude: ordered[idx - 1].latitude!, longitude: ordered[idx - 1].longitude! },
            { latitude: stop.latitude!, longitude: stop.longitude! }
          );
    runningMinutes += estimateDriveMinutes(segmentDist) + STOP_TIME_MINUTES;

    const arrival = new Date(startTime.getTime() + runningMinutes * 60000);
    return {
      ...stop,
      sortOrder: idx + 1,
      estimatedArrival: arrival.toISOString(),
    };
  });

  const totalDriveTime = estimateDriveMinutes(totalDistance) + STOP_TIME_MINUTES * ordered.length;
  const endTime = new Date(startTime.getTime() + totalDriveTime * 60000);

  return {
    stops: optimizedStops,
    totalDistanceMiles: Math.round(totalDistance * 10) / 10,
    totalDriveTimeMinutes: Math.round(totalDriveTime),
    estimatedStartTime: startTime.toISOString(),
    estimatedEndTime: endTime.toISOString(),
    pharmacyAddress,
  };
}

/**
 * Manually reorder stops — preserves all stop data,
 * just reassigns sortOrder based on the provided ID order.
 */
export function reorderStops(
  stops: RouteStop[],
  newOrder: string[] // array of stop IDs in desired order
): RouteStop[] {
  const stopMap = new Map(stops.map((s) => [s.id, s]));
  return newOrder
    .map((id, idx) => {
      const stop = stopMap.get(id);
      if (!stop) return null;
      return { ...stop, sortOrder: idx + 1 };
    })
    .filter(Boolean) as RouteStop[];
}
