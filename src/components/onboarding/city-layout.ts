import { Module, Relationship } from "@/types/onboarding";
import { inferCategory, ModuleCategory } from "./common";

/**
 * Deterministic "miniature city" layout for the 3D architecture map.
 *
 * Produces a bounded, overlap-free, graph-aware arrangement of modules on a
 * street grid, centred on [0, 0, 0]. Everything here is pure and stable: the
 * same modules[]/relationships[] always yield the exact same city, so the
 * camera can frame it without any hard-coded knowledge of the repository.
 */

/** Nominal world-space radius of the generated district. */
const BASE_CITY_RADIUS = 18;
const MIN_CELL = 3;
const MAX_CELL = 9;
const IDEAL_SPACING = 6;
const MIN_BUILDING_HEIGHT = 1.8;
const LAYOUT_ITERATIONS = 260;
const GRID_SEARCH_RADIUS = 24;

export interface CityBuilding {
  id: string;
  name: string;
  path: string;
  category: ModuleCategory;
  /** Base position of the building footprint (ground level). */
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
  floors: number;
  /** Normalised 0..1 architectural importance. */
  importance: number;
  degree: number;
  fileCount: number;
  depCount: number;
  hasAntenna: boolean;
  hasBeacon: boolean;
}

export interface CityRoad {
  id: string;
  source: string;
  target: string;
  type: string;
  sourcePosition: [number, number, number];
  targetPosition: [number, number, number];
  /** Normalised 0..1 prominence derived from the endpoints' degrees. */
  importance: number;
  radius: number;
  lift: number;
}

export interface CityBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  center: [number, number, number];
  size: [number, number, number];
  /** Radius of the bounding sphere centred on `center`. */
  radius: number;
}

export interface CityLayout {
  buildings: CityBuilding[];
  roads: CityRoad[];
  bounds: CityBounds;
  /** Street grid cell size in world units. */
  cell: number;
  /** Ground plane size (square). */
  groundSize: number;
  /** Max degree across the graph (>= 1). */
  maxDegree: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

/** Stable 0..1 hash used for deterministic per-module variation. */
function hashUnit(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000003) / 1000003;
}

interface LayoutNode {
  id: string;
  index: number;
  x: number;
  z: number;
  weight: number;
  degree: number;
}

function collectEdges(
  modules: Module[],
  relationships: Relationship[]
): { edges: [number, number][]; degrees: number[]; indexById: Map<string, number> } {
  const indexById = new Map<string, number>();
  modules.forEach((module, index) => indexById.set(module.id, index));

  const degrees = new Array<number>(modules.length).fill(0);
  const edges: [number, number][] = [];
  const seen = new Set<string>();

  for (const relationship of relationships) {
    const source = indexById.get(relationship.source);
    const target = indexById.get(relationship.target);
    if (source === undefined || target === undefined || source === target) continue;
    const key = source < target ? `${source}:${target}` : `${target}:${source}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push([source, target]);
    degrees[source] += 1;
    degrees[target] += 1;
  }

  return { edges, degrees, indexById };
}

/** Fruchterman–Reingold style relaxation in the x/z plane, fully deterministic. */
function relax(nodes: LayoutNode[], edges: [number, number][], idealDistance: number): void {
  const count = nodes.length;
  if (count < 2) return;

  const idealSquared = idealDistance * idealDistance;
  const maxWeight = nodes.reduce((max, node) => Math.max(max, node.weight), 0) || 1;

  let temperature = idealDistance * count * 0.5;
  const cooling = temperature / (LAYOUT_ITERATIONS + 1);

  for (let iteration = 0; iteration < LAYOUT_ITERATIONS; iteration += 1) {
    const vx = new Float64Array(count);
    const vz = new Float64Array(count);

    for (let i = 0; i < count; i += 1) {
      const a = nodes[i];
      for (let j = i + 1; j < count; j += 1) {
        const b = nodes[j];
        let dx = a.x - b.x;
        let dz = a.z - b.z;
        let squared = dx * dx + dz * dz;
        if (squared < 1e-4) {
          dx = 0.05 + ((i % 5) - 2) * 0.02;
          dz = 0.05 + ((j % 7) - 3) * 0.02;
          squared = dx * dx + dz * dz;
        }
        const distance = Math.sqrt(squared);
        const force = idealSquared / distance;
        const ux = dx / distance;
        const uz = dz / distance;
        vx[i] += ux * force;
        vz[i] += uz * force;
        vx[j] -= ux * force;
        vz[j] -= uz * force;
      }
    }

    for (const [sourceIndex, targetIndex] of edges) {
      const a = nodes[sourceIndex];
      const b = nodes[targetIndex];
      let dx = a.x - b.x;
      let dz = a.z - b.z;
      let squared = dx * dx + dz * dz;
      if (squared < 1e-4) {
        dx = 0.05;
        dz = 0.05;
        squared = 0.005;
      }
      const distance = Math.sqrt(squared);
      const force = (squared / idealDistance) * 0.72;
      const ux = dx / distance;
      const uz = dz / distance;
      vx[sourceIndex] -= ux * force;
      vz[sourceIndex] -= uz * force;
      vx[targetIndex] += ux * force;
      vz[targetIndex] += uz * force;
    }

    let centerX = 0;
    let centerZ = 0;
    for (let i = 0; i < count; i += 1) {
      const node = nodes[i];
      const centrality = node.weight / maxWeight;
      const pull = 0.012 + 0.055 * centrality;
      vx[i] -= node.x * pull;
      vz[i] -= node.z * pull;

      const magnitude = Math.hypot(vx[i], vz[i]);
      if (magnitude > 1e-9) {
        const step = Math.min(magnitude, temperature);
        node.x += (vx[i] / magnitude) * step;
        node.z += (vz[i] / magnitude) * step;
      }
      centerX += node.x;
      centerZ += node.z;
    }

    centerX /= count;
    centerZ /= count;
    for (const node of nodes) {
      node.x -= centerX;
      node.z -= centerZ;
    }

    temperature -= cooling;
  }
}

/** Deterministic ring-ordered candidate cells for the street grid. */
function spiralCells(radius: number): [number, number][] {
  const cells: [number, number][] = [];
  for (let ring = 0; ring <= radius; ring += 1) {
    for (let gx = -ring; gx <= ring; gx += 1) {
      for (let gz = -ring; gz <= ring; gz += 1) {
        if (Math.max(Math.abs(gx), Math.abs(gz)) !== ring) continue;
        cells.push([gx, gz]);
      }
    }
  }
  return cells;
}

function pickCell(
  nodes: LayoutNode[],
  cell: number,
  occupied: Set<string>
): Map<number, [number, number]> {
  const candidates = spiralCells(GRID_SEARCH_RADIUS);
  const tolerances = [1, 2, 3, 5, 8, 12, Number.POSITIVE_INFINITY];
  const placement = new Map<number, [number, number]>();

  const ordered = [...nodes].sort((a, b) => b.weight - a.weight || a.index - b.index);

  for (const node of ordered) {
    const idealX = Math.round(finite(node.x, 0) / cell);
    const idealZ = Math.round(finite(node.z, 0) / cell);
    let chosen: [number, number] | null = null;

    for (const tolerance of tolerances) {
      let bestDistance = Number.POSITIVE_INFINITY;
      let best: [number, number] | null = null;
      for (const [gx, gz] of candidates) {
        if (gx < idealX - tolerance || gx > idealX + tolerance) continue;
        if (gz < idealZ - tolerance || gz > idealZ + tolerance) continue;
        const key = `${gx}:${gz}`;
        if (occupied.has(key)) continue;
        const dx = gx - idealX;
        const dz = gz - idealZ;
        const distance = dx * dx + dz * dz;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = [gx, gz];
        }
      }
      if (best) {
        chosen = best;
        break;
      }
    }

    if (!chosen) {
      // Guaranteed fallback: the spiral covers a radius far larger than needed.
      chosen = [0, 0];
    }
    occupied.add(`${chosen[0]}:${chosen[1]}`);
    placement.set(node.index, chosen);
  }

  return placement;
}

function computeBounds(
  buildings: CityBuilding[],
  cell: number
): { bounds: CityBounds; groundSize: number } {
  if (buildings.length === 0) {
    return {
      bounds: {
        minX: -cell,
        maxX: cell,
        minY: 0,
        maxY: MIN_BUILDING_HEIGHT,
        minZ: -cell,
        maxZ: cell,
        center: [0, MIN_BUILDING_HEIGHT * 0.42, 0],
        size: [cell * 2, MIN_BUILDING_HEIGHT, cell * 2],
        radius: cell * 1.5,
      },
      groundSize: cell * 12,
    };
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  let maxY = 0;

  for (const building of buildings) {
    const halfWidth = building.width / 2;
    const halfDepth = building.depth / 2;
    minX = Math.min(minX, building.position[0] - halfWidth);
    maxX = Math.max(maxX, building.position[0] + halfWidth);
    minZ = Math.min(minZ, building.position[2] - halfDepth);
    maxZ = Math.max(maxZ, building.position[2] + halfDepth);
    maxY = Math.max(maxY, building.height);
  }

  const sizeX = Math.max(maxX - minX, cell);
  const sizeY = Math.max(maxY, MIN_BUILDING_HEIGHT);
  const sizeZ = Math.max(maxZ - minZ, cell);
  const center: [number, number, number] = [
    (minX + maxX) / 2,
    maxY * 0.42,
    (minZ + maxZ) / 2,
  ];
  const radius = 0.5 * Math.sqrt(sizeX * sizeX + sizeY * sizeY + sizeZ * sizeZ);

  return {
    bounds: {
      minX,
      maxX,
      minY: 0,
      maxY,
      minZ,
      maxZ,
      center,
      size: [sizeX, sizeY, sizeZ],
      radius,
    },
    groundSize: Math.max(Math.max(sizeX, sizeZ) + cell * 5, cell * 10),
  };
}

export function computeCityLayout(
  modules: Module[],
  relationships: Relationship[]
): CityLayout {
  const empty: CityLayout = {
    buildings: [],
    roads: [],
    bounds: computeBounds([], MIN_CELL).bounds,
    cell: MIN_CELL,
    groundSize: MIN_CELL * 10,
    maxDegree: 1,
  };
  if (modules.length === 0) return empty;

  const { edges, degrees } = collectEdges(modules, relationships);
  const maxDegree = Math.max(1, ...degrees);
  const maxFiles = Math.max(1, ...modules.map((module) => module.files?.length ?? 0));

  // Nominal district radius: grows gently with sqrt(moduleCount) so a
  // 5-module city and a 50-module city both read well from the same framing.
  const targetRadius = clamp(
    BASE_CITY_RADIUS + Math.sqrt(modules.length) * 0.6,
    BASE_CITY_RADIUS,
    26
  );

  const nodes: LayoutNode[] = modules.map((module, index) => {
    const files = module.files?.length ?? 0;
    const deps = module.dependencies?.length ?? 0;
    // Degree dominates so the visual hierarchy mirrors the dependency graph,
    // with file/dep counts and a small stable hash adding texture.
    const weight =
      (0.7 * (degrees[index] / maxDegree) +
        0.2 * Math.min(1, files / maxFiles) +
        0.1 * Math.min(1, deps / 6)) *
      (0.9 + 0.2 * hashUnit(module.id));
    const radius = Math.sqrt((index + 0.5) / modules.length) * IDEAL_SPACING * modules.length;
    const angle = index * 2.399963229728653;
    return {
      id: module.id,
      index,
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      weight,
      degree: degrees[index],
    };
  });

  const cell = clamp(
    (targetRadius * 1.12) / Math.sqrt(modules.length),
    MIN_CELL,
    MAX_CELL
  );
  const idealDistance = cell * 0.98;

  relax(nodes, edges, idealDistance);

  const maxRadius = nodes.reduce(
    (max, node) => Math.max(max, Math.hypot(node.x, node.z)),
    0
  );
  if (maxRadius > 1e-6) {
    const scale = targetRadius / maxRadius;
    for (const node of nodes) {
      node.x *= scale;
      node.z *= scale;
    }
  }

  const placement = pickCell(nodes, cell, new Set<string>());

  let minGridX = Number.POSITIVE_INFINITY;
  let maxGridX = Number.NEGATIVE_INFINITY;
  let minGridZ = Number.POSITIVE_INFINITY;
  let maxGridZ = Number.NEGATIVE_INFINITY;
  for (const [gx, gz] of placement.values()) {
    minGridX = Math.min(minGridX, gx);
    maxGridX = Math.max(maxGridX, gx);
    minGridZ = Math.min(minGridZ, gz);
    maxGridZ = Math.max(maxGridZ, gz);
  }
  const offsetX = -Math.round((minGridX + maxGridX) / 2);
  const offsetZ = -Math.round((minGridZ + maxGridZ) / 2);

  const heightRange = clamp(cell * 1.35, 4.5, 12);

  const buildings: CityBuilding[] = modules.map((module, index) => {
    const node = nodes[index];
    const [gx, gz] = placement.get(index) ?? [0, 0];
    const x = finite((gx + offsetX) * cell, 0);
    const z = finite((gz + offsetZ) * cell, 0);

    const importance = clamp(node.weight, 0, 1);
    const span = cell * (0.3 + 0.42 * importance);
    const width = clamp(span * (0.82 + 0.36 * hashUnit(`${module.id}:w`)), cell * 0.18, cell * 0.72);
    const depth = clamp(span * (0.82 + 0.36 * hashUnit(`${module.id}:d`)), cell * 0.18, cell * 0.72);
    const height = finite(
      MIN_BUILDING_HEIGHT + Math.pow(importance, 0.7) * heightRange,
      MIN_BUILDING_HEIGHT
    );
    const floors = clamp(Math.round(height / 1.05), 3, 9);

    return {
      id: module.id,
      name: module.name,
      path: module.path,
      category: inferCategory(module),
      position: [x, 0, z],
      width,
      depth,
      height: Math.max(height, MIN_BUILDING_HEIGHT),
      floors,
      importance,
      degree: node.degree,
      fileCount: module.files?.length ?? 0,
      depCount: module.dependencies?.length ?? 0,
      hasAntenna: importance > 0.45,
      hasBeacon: importance > 0.72,
    };
  });

  const byId = new Map(buildings.map((building) => [building.id, building]));

  const roads: CityRoad[] = [];
  const seenRoads = new Set<string>();
  for (const relationship of relationships) {
    const source = byId.get(relationship.source);
    const target = byId.get(relationship.target);
    if (!source || !target || source.id === target.id) continue;
    const key =
      source.id < target.id ? `${source.id}->${target.id}` : `${target.id}->${source.id}`;
    if (seenRoads.has(key)) continue;
    seenRoads.add(key);

    const importance = clamp(
      Math.max(source.importance, target.importance) * 0.6 +
        (0.4 * (source.degree + target.degree)) / (2 * maxDegree),
      0,
      1
    );

    roads.push({
      id: `road-${key}`,
      source: source.id,
      target: target.id,
      type: relationship.type,
      sourcePosition: source.position,
      targetPosition: target.position,
      importance,
      radius: 0.045 + importance * 0.085,
      lift: 0.45 + importance * 2.2,
    });
  }

  const { bounds, groundSize } = computeBounds(buildings, cell);

  return { buildings, roads, bounds, cell, groundSize, maxDegree };
}
