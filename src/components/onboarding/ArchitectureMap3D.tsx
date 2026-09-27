"use client";

import {
  ComponentRef,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Billboard, Grid, OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { ReactFlowProvider } from "@xyflow/react";
import { Module, Relationship, RepoMapAnalysis } from "@/types/onboarding";
import { ModuleCategory } from "./common";
import { ArchitectureDiagram } from "./ArchitectureDiagram";
import { CityBuilding, CityLayout, CityRoad, computeCityLayout } from "./city-layout";

interface ArchitectureMap3DProps {
  modules: Module[];
  relationships: Relationship[];
  selectedModuleId: string | null;
  onModuleSelect: (moduleId: string | null) => void;
  /**
   * Opening the details drawer is deliberately separate from selecting: the
   * drawer is a full-viewport modal, so letting a single click open it would
   * hide the very road highlighting the selection produces.
   */
  onModuleDetails?: (moduleId: string) => void;
  showLabels?: boolean;
  showRelationships?: boolean;
}

/* -------------------------------------------------------------------------- */
/*                              Visual configuration                          */
/* -------------------------------------------------------------------------- */

const SCENE_BACKGROUND = 0x0b0f16;
const HORIZON = 0x0e131b;

interface CategoryStyle {
  accent: number;
  css: string;
}

const CATEGORY_STYLES: Record<ModuleCategory, CategoryStyle> = {
  infrastructure: { accent: 0x10b981, css: "#10b981" },
  analysis: { accent: 0xf59e0b, css: "#f59e0b" },
  shared: { accent: 0x06b6d4, css: "#06b6d4" },
  features: { accent: 0xa855f7, css: "#a855f7" },
  api: { accent: 0x3b82f6, css: "#3b82f6" },
  other: { accent: 0x64748b, css: "#64748b" },
};

const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  infrastructure: "Infrastructure",
  analysis: "Analysis",
  shared: "Shared",
  features: "Features",
  api: "Api",
  other: "Other",
};

const CATEGORY_ORDER: ModuleCategory[] = [
  "infrastructure",
  "analysis",
  "shared",
  "features",
  "api",
  "other",
];

/** Attractive three-quarter isometric direction used by the default view. */
const DEFAULT_DIRECTION = new THREE.Vector3(1, 0.88, 1).normalize();
const DEFAULT_VIEW_MARGIN = 1.12;
const FIT_VIEW_MARGIN = 1.02;

/* --- Flat map surface ------------------------------------------------------ */
/** Land colour of the map plane. Everything else is read against it. */
const MAP_LAND = 0x2b374a;
/** Colour map detail (blocks, grid) fades towards and is read against. */
const MAP_DETAIL = 0x2a3545;

/** Height of the thin plot plate drawn under every module marker. */
const PLATE_HEIGHT = 0.07;
/** Height of the low module block. The layout height is deliberately ignored. */
const BLOCK_HEIGHT = 0.24;

/** Roads are drawn flat, a hair above the land, so they read as the map. */
const ROAD_Y = 0.03;
const ROAD_CASING_Y = 0.02;
/** Road width as a fraction of the layout cell, and its casing multiplier. */
const ROAD_WIDTH_RATIO = 0.16;
const ROAD_CASING_RATIO = 1.6;
/** Corner fillet radius, in world units, for the orthogonal road routing. */
const ROAD_CORNER_RADIUS = 0.55;

const FOG_COLOR = new THREE.Color(HORIZON);
const BASE_CAMERA: [number, number, number] = [24, 22, 24];

type OrbitControlsRef = ComponentRef<typeof OrbitControls>;
type FocusState = "normal" | "hovered" | "selected" | "connected" | "dimmed";

interface ViewCommand {
  kind: "reset" | "fit";
  nonce: number;
}

interface CameraPose {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

interface CameraAnimation extends CameraPose {
  fromPosition: THREE.Vector3;
  fromTarget: THREE.Vector3;
  progress: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hashUnit(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1000003) / 1000003;
}

function mixColor(hex: number, towards: number, amount: number): number {
  return new THREE.Color(hex).lerp(new THREE.Color(towards), amount).getHex();
}

/* -------------------------------------------------------------------------- */
/*                              Camera framing math                            */
/* -------------------------------------------------------------------------- */

/**
 * Exact framing of the architecture content.
 *
 * Every building corner is projected into the camera basis and the distance is
 * solved from the frustum inequalities, then the target is nudged so the
 * content is optically centred. This works for any module count — 5 modules or
 * 50 — because nothing is derived from a fixed camera distance or from a
 * hard-coded repository.
 */
function frameContent(
  points: THREE.Vector3[],
  fovDegrees: number,
  aspect: number,
  direction: THREE.Vector3,
  margin: number
): CameraPose & { distance: number } {
  const view = direction.clone();
  if (view.lengthSq() < 1e-6) view.copy(DEFAULT_DIRECTION);
  view.normalize();

  // forward points from the camera towards the scene.
  const forward = view.clone().negate();
  const worldUp = Math.abs(forward.y) > 0.985 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(forward, worldUp).normalize();
  const up = new THREE.Vector3().crossVectors(right, forward).normalize();

  const fov = THREE.MathUtils.degToRad(
    Number.isFinite(fovDegrees) && fovDegrees > 0 ? fovDegrees : 45
  );
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const safeMargin = Math.max(1.01, Number.isFinite(margin) ? margin : 1.2);
  const tanVertical = Math.tan(fov / 2) / safeMargin;
  const tanHorizontal = tanVertical * safeAspect;

  const usable = points.filter(
    (point) =>
      Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z)
  );

  if (usable.length === 0) {
    return {
      position: view.clone().multiplyScalar(40),
      target: new THREE.Vector3(),
      distance: 40,
    };
  }

  const target = new THREE.Vector3();
  for (const point of usable) target.add(point);
  target.multiplyScalar(1 / usable.length);

  const projectLocal = (origin: THREE.Vector3) =>
    usable.map((point) => {
      const relative = point.clone().sub(origin);
      return {
        lateral: relative.dot(right),
        vertical: relative.dot(up),
        depth: relative.dot(forward),
      };
    });

  const solveDistance = (local: { lateral: number; vertical: number; depth: number }[]) => {
    let result = 1;
    for (const entry of local) {
      result = Math.max(
        result,
        Math.abs(entry.lateral) / tanHorizontal - entry.depth,
        Math.abs(entry.vertical) / tanVertical - entry.depth
      );
    }
    return result;
  };

  // Solve the frustum constraints, then nudge the target so the content's
  // screen bounding box is optically centred instead of merely in-bounds.
  let distance = 1;
  for (let iteration = 0; iteration < 5; iteration += 1) {
    const local = projectLocal(target);
    distance = solveDistance(local);

    let meanDepth = 0;
    for (const entry of local) meanDepth += entry.depth;
    const reference = Math.max(distance + meanDepth / local.length, 1);

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const entry of local) {
      const depth = Math.max(distance + entry.depth, reference * 0.05);
      const x = entry.lateral / (depth * tanHorizontal);
      const y = entry.vertical / (depth * tanVertical);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) break;
    if (Math.abs(centerX) < 1e-4 && Math.abs(centerY) < 1e-4) break;
    target.addScaledVector(right, centerX * reference * tanHorizontal);
    target.addScaledVector(up, centerY * reference * tanVertical);
  }

  distance = solveDistance(projectLocal(target));
  if (!Number.isFinite(distance)) distance = 40;
  distance = Math.max(distance, 2);

  return {
    target,
    position: target.clone().add(view.multiplyScalar(distance)),
    distance,
  };
}

/** Derives a camera pose that frames the whole architecture. */
function computeCameraPose(
  camera: THREE.PerspectiveCamera,
  content: THREE.Vector3[],
  direction: THREE.Vector3,
  margin: number
): CameraPose {
  const framing = frameContent(content, camera.fov, camera.aspect, direction, margin);
  return { position: framing.position, target: framing.target };
}

/* -------------------------------------------------------------------------- */
/*                                 Shared palette                              */
/* -------------------------------------------------------------------------- */

interface BuildingMaterials {
  /** Thin plot plate under the marker. */
  plate: THREE.MeshStandardMaterial;
  /** Neutral sides of the low block. */
  side: THREE.MeshStandardMaterial;
  /** Category-tinted top face — the only place the accent is allowed to show. */
  top: THREE.MeshStandardMaterial;
}

/**
 * Each `mix` value fades that surface towards the map detail colour, so a
 * higher number means a quieter, flatter map element. `dimmed` is the quietest,
 * `selected` the most pronounced; nothing here emits light.
 */
const STATE_TUNING: Record<
  FocusState,
  { plateMix: number; sideMix: number; topMix: number; topGlow: number }
> = {
  normal: { plateMix: 0.88, sideMix: 0.76, topMix: 0.7, topGlow: 0.08 },
  hovered: { plateMix: 0.8, sideMix: 0.62, topMix: 0.52, topGlow: 0.18 },
  selected: { plateMix: 0.7, sideMix: 0.48, topMix: 0.26, topGlow: 0.3 },
  connected: { plateMix: 0.76, sideMix: 0.58, topMix: 0.44, topGlow: 0.22 },
  dimmed: { plateMix: 0.95, sideMix: 0.92, topMix: 0.9, topGlow: 0.02 },
};

function useCityMaterials() {
  const cache = useRef(new Map<string, BuildingMaterials>());

  useEffect(() => {
    const map = cache.current;
    return () => {
      for (const set of map.values()) {
        set.plate.dispose();
        set.side.dispose();
        set.top.dispose();
      }
      map.clear();
    };
  }, []);

  return useCallback((category: ModuleCategory, state: FocusState): BuildingMaterials => {
    const key = `${category}:${state}`;
    const existing = cache.current.get(key);
    if (existing) return existing;

    const accent = CATEGORY_STYLES[category].accent;
    const tuning = STATE_TUNING[state];

    const plate = new THREE.MeshStandardMaterial({
      color: mixColor(MAP_DETAIL, MAP_LAND, tuning.plateMix),
      roughness: 0.96,
      metalness: 0.02,
    });
    const side = new THREE.MeshStandardMaterial({
      color: mixColor(MAP_DETAIL, MAP_LAND, tuning.sideMix),
      roughness: 0.9,
      metalness: 0.04,
    });
    const top = new THREE.MeshStandardMaterial({
      color: mixColor(accent, MAP_DETAIL, tuning.topMix),
      emissive: accent,
      emissiveIntensity: tuning.topGlow,
      roughness: 0.82,
      metalness: 0.06,
    });

    const set: BuildingMaterials = { plate, side, top };
    cache.current.set(key, set);
    return set;
  }, []);
}

/* -------------------------------------------------------------------------- */
/*                                   Buildings                                 */
/* -------------------------------------------------------------------------- */

interface BuildingProps {
  building: CityBuilding;
  state: FocusState;
  showLabel: boolean;
  cell: number;
  onSelect: (id: string) => void;
  onDetails: ((id: string) => void) | undefined;
  onHover: (id: string | null) => void;
  getMaterials: (category: ModuleCategory, state: FocusState) => BuildingMaterials;
}

function Building({
  building,
  state,
  showLabel,
  cell,
  onSelect,
  onDetails,
  onHover,
  getMaterials,
}: BuildingProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>>(null);
  const materials = getMaterials(building.category, state);

  const width = building.width;
  const depth = building.depth;
  const blockTop = PLATE_HEIGHT + BLOCK_HEIGHT;
  const labelSize = clamp(cell * 0.17, 0.4, 0.95);
  const labelY = blockTop + 0.14 + labelSize * 0.35;
  const underlineWidth = clamp(building.name.length * labelSize * 0.26, 0.3, cell * 0.9);
  const ringRadius = Math.max(width, depth) * 0.95;

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (group) {
      const targetScale = state === "selected" ? 1.08 : 1;
      const next = THREE.MathUtils.damp(group.scale.x, targetScale, 9, delta);
      group.scale.setScalar(next);
    }
    const ring = ringRef.current;
    if (ring) {
      // A steady map-style halo rather than a spinning neon ring.
      const baseOpacity = state === "selected" ? 0.85 : state === "connected" ? 0.45 : 0;
      ring.material.opacity = THREE.MathUtils.damp(
        ring.material.opacity,
        baseOpacity,
        8,
        delta
      );
      ring.scale.setScalar(1 + (state === "selected" ? 0.04 : 0));
    }
  });

  return (
    <group
      ref={groupRef}
      position={building.position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(building.id);
      }}
      onDoubleClick={(event) => {
        if (!onDetails) return;
        event.stopPropagation();
        onDetails(building.id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(building.id);
      }}
      onPointerOut={() => onHover(null)}
    >
      {/* Plot plate — gives every module a footprint on the map */}
      <mesh position={[0, PLATE_HEIGHT / 2, 0]} receiveShadow>
        <boxGeometry args={[width * 1.18, PLATE_HEIGHT, depth * 1.18]} />
        <primitive object={materials.plate} attach="material" />
      </mesh>

      {/* Low map block. The layout height is intentionally not used: modules
          read as flat parcels, and the roads stay the dominant element. */}
      <mesh position={[0, PLATE_HEIGHT + BLOCK_HEIGHT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, BLOCK_HEIGHT, depth]} />
        <primitive object={materials.side} attach="material" />
      </mesh>

      {/* Category accent, confined to the top face */}
      <mesh
        position={[0, blockTop + 0.004, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[width * 0.84, depth * 0.84]} />
        <primitive object={materials.top} attach="material" />
      </mesh>

      {/* Selection / connection halo on the ground */}
      <mesh
        ref={ringRef}
        position={[0, 0.015, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        visible={state === "selected" || state === "connected"}
      >
        <ringGeometry args={[ringRadius, ringRadius + 0.07, 48]} />
        <meshBasicMaterial
          color={CATEGORY_STYLES[building.category].accent}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      {showLabel && (
        <Billboard position={[0, labelY, 0]}>
          {/* Isolated so a slow/blocked font load can never blank the map. */}
          <Suspense fallback={null}>
            <Text
              fontSize={labelSize}
              color={state === "dimmed" ? "#7b8798" : state === "selected" ? "#ffffff" : "#c8d3e0"}
              anchorX="center"
              anchorY="bottom"
              maxWidth={cell * 4}
              outlineWidth={labelSize * 0.12}
              outlineColor={MAP_LAND}
              letterSpacing={0}
            >
              {building.name}
            </Text>
          </Suspense>
          <mesh position={[0, -labelSize * 0.3, 0]}>
            <planeGeometry args={[underlineWidth, labelSize * 0.07]} />
            <meshBasicMaterial
              color={CATEGORY_STYLES[building.category].accent}
              transparent
              opacity={state === "dimmed" ? 0.3 : 0.85}
              depthWrite={false}
            />
          </mesh>
        </Billboard>
      )}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    Roads                                   */
/* -------------------------------------------------------------------------- */

interface RoadProps {
  road: CityRoad;
  buildings: Map<string, CityBuilding>;
  cell: number;
  dimmed: boolean;
  highlighted: boolean;
}

/**
 * Rounds the interior corners of an axis-aligned polyline with a quadratic
 * fillet, producing a gently curved but still map-like path.
 */
function roundCorners(points: THREE.Vector3[], radius: number): THREE.Vector3[] {
  if (points.length < 3) return points.map((p) => p.clone());
  const rounded: THREE.Vector3[] = [points[0].clone()];
  for (let i = 1; i < points.length - 1; i += 1) {
    const previous = points[i - 1];
    const corner = points[i];
    const next = points[i + 1];
    const inDir = new THREE.Vector3().subVectors(previous, corner);
    const outDir = new THREE.Vector3().subVectors(next, corner);
    inDir.y = 0;
    outDir.y = 0;
    const inLength = inDir.length();
    const outLength = outDir.length();
    if (inLength < 1e-6 || outLength < 1e-6) {
      rounded.push(corner.clone());
      continue;
    }
    inDir.divideScalar(inLength);
    outDir.divideScalar(outLength);
    const r = Math.min(radius, inLength * 0.5, outLength * 0.5);
    const entry = corner.clone().addScaledVector(inDir, r);
    const exit = corner.clone().addScaledVector(outDir, r);
    const STEPS = 6;
    for (let step = 0; step <= STEPS; step += 1) {
      const t = step / STEPS;
      const inv = 1 - t;
      rounded.push(
        new THREE.Vector3(
          inv * inv * entry.x + 2 * inv * t * corner.x + t * t * exit.x,
          ROAD_Y,
          inv * inv * entry.z + 2 * inv * t * corner.z + t * t * exit.z
        )
      );
    }
  }
  rounded.push(points[points.length - 1].clone());
  return rounded;
}

/**
 * Orthogonal map routing between two module markers: the road leaves the source
 * marker, turns once, and arrives at the target. The shorter of the two possible
 * turns wins, and ties are broken from a hash of the road id so the result stays
 * deterministic across renders.
 */
function buildRoadPath(
  road: CityRoad,
  buildings: Map<string, CityBuilding>
): THREE.Vector3[] | null {
  const source = buildings.get(road.source);
  const target = buildings.get(road.target);
  if (!source || !target) return null;

  const from = new THREE.Vector3(source.position[0], ROAD_Y, source.position[2]);
  const to = new THREE.Vector3(target.position[0], ROAD_Y, target.position[2]);
  const direction = new THREE.Vector3().subVectors(to, from);
  direction.y = 0;
  const span = direction.length();
  if (span < 1e-6) return null;
  direction.divideScalar(span);

  // Stop the road at the edge of each marker so it meets the block cleanly.
  const sourceTrim = Math.max(source.width, source.depth) * 0.5 + 0.08;
  const targetTrim = Math.max(target.width, target.depth) * 0.5 + 0.08;
  const start = from.clone().addScaledVector(direction, Math.min(sourceTrim, span * 0.4));
  const end = to.clone().addScaledVector(direction, -Math.min(targetTrim, span * 0.4));

  const turnTowardsX = new THREE.Vector3(end.x, ROAD_Y, start.z);
  const turnTowardsZ = new THREE.Vector3(start.x, ROAD_Y, end.z);
  const viaX = start.distanceTo(turnTowardsX) + turnTowardsX.distanceTo(end);
  const viaZ = start.distanceTo(turnTowardsZ) + turnTowardsZ.distanceTo(end);
  const turn =
    Math.abs(viaX - viaZ) < 1e-6
      ? hashUnit(`turn:${road.id}`) < 0.5
        ? turnTowardsX
        : turnTowardsZ
      : viaX < viaZ
        ? turnTowardsX
        : turnTowardsZ;

  return roundCorners([start, turn, end], ROAD_CORNER_RADIUS);
}

/** Builds a flat ribbon along a planar path, for drawing roads on the map. */
function buildRoadRibbon(path: THREE.Vector3[], halfWidth: number): THREE.BufferGeometry {
  const count = path.length;
  const positions = new Float32Array(count * 6);
  const normals = new Float32Array(count * 6);
  const uvs = new Float32Array(count * 4);
  const indices: number[] = [];

  for (let i = 0; i < count; i += 1) {
    const previous = path[Math.max(0, i - 1)];
    const next = path[Math.min(count - 1, i + 1)];
    const tangent = new THREE.Vector3().subVectors(next, previous);
    tangent.y = 0;
    if (tangent.lengthSq() < 1e-9) tangent.set(1, 0, 0);
    tangent.normalize();
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x);
    const point = path[i];
    const left = point.clone().addScaledVector(side, halfWidth);
    const right = point.clone().addScaledVector(side, -halfWidth);

    positions.set([left.x, point.y, left.z], i * 6);
    positions.set([right.x, point.y, right.z], i * 6 + 3);
    normals.set([0, 1, 0], i * 6);
    normals.set([0, 1, 0], i * 6 + 3);
    const along = i / Math.max(1, count - 1);
    uvs.set([0, along], i * 4);
    uvs.set([1, along], i * 4 + 2);

    if (i < count - 1) {
      // Counter-clockwise when viewed from above, so the ribbon faces the
      // camera instead of being backface-culled away.
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

function Road({ road, buildings, cell, dimmed, highlighted }: RoadProps) {
  const surfaceMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const casingMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

  const path = useMemo(() => buildRoadPath(road, buildings), [road, buildings]);

  const geometries = useMemo(() => {
    if (!path) return null;
    const halfWidth = cell * ROAD_WIDTH_RATIO * 0.5;
    return {
      surface: buildRoadRibbon(path, halfWidth),
      casing: buildRoadRibbon(path, halfWidth * ROAD_CASING_RATIO),
    };
  }, [path, cell]);

  useEffect(() => {
    if (!geometries) return;
    return () => {
      geometries.surface.dispose();
      geometries.casing.dispose();
    };
  }, [geometries]);

  useFrame((_, delta) => {
    const surface = surfaceMaterialRef.current;
    const casing = casingMaterialRef.current;
    const surfaceTarget = highlighted ? 1 : dimmed ? 0.55 : 0.92;
    const casingTarget = highlighted ? 1 : dimmed ? 0.5 : 0.9;
    if (surface) {
      surface.opacity = THREE.MathUtils.damp(surface.opacity, surfaceTarget, 7, delta);
    }
    if (casing) {
      casing.opacity = THREE.MathUtils.damp(casing.opacity, casingTarget, 7, delta);
    }
  });

  if (!geometries) return null;

  return (
    <group>
      {/* Dark casing first, so each road reads as a clean outlined ribbon */}
      <mesh geometry={geometries.casing} position={[0, ROAD_CASING_Y - ROAD_Y, 0]} renderOrder={1}>
        <meshBasicMaterial
          ref={casingMaterialRef}
          color={highlighted ? "#0b2c52" : dimmed ? "#151a23" : "#1b2431"}
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </mesh>
      <mesh geometry={geometries.surface} renderOrder={2}>
        <meshBasicMaterial
          ref={surfaceMaterialRef}
          color={highlighted ? "#5aa9ff" : dimmed ? "#3d4859" : "#9aa8bd"}
          transparent
          opacity={0.92}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Flow particles                               */
/* -------------------------------------------------------------------------- */

const PARTICLES_PER_ROAD = 3;
const SAMPLES_PER_ROAD = 24;

function buildRoadSamples(
  roads: CityRoad[],
  buildings: Map<string, CityBuilding>
): Map<string, Float32Array> {
  const result = new Map<string, Float32Array>();
  for (const road of roads) {
    const path = buildRoadPath(road, buildings);
    if (!path || path.length < 2) continue;
    // The rounded polyline is already dense, so a curve through it only serves
    // to give the particles an even arc-length parameterisation.
    const curve = new THREE.CatmullRomCurve3(path, false, "centripetal", 0.5);
    const points = curve.getPoints(SAMPLES_PER_ROAD - 1);
    const flat = new Float32Array(SAMPLES_PER_ROAD * 3);
    for (let i = 0; i < points.length; i += 1) {
      flat[i * 3] = points[i].x;
      flat[i * 3 + 1] = ROAD_Y + 0.05;
      flat[i * 3 + 2] = points[i].z;
    }
    result.set(road.id, flat);
  }
  return result;
}

function FlowParticles({
  roads,
  roadSamples,
  accentFor,
}: {
  roads: CityRoad[];
  roadSamples: Map<string, Float32Array>;
  accentFor: (road: CityRoad) => number;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const activeRoadsRef = useRef<CityRoad[]>([]);
  const phasesRef = useRef<Float32Array>(new Float32Array(0));
  const signatureRef = useRef<string | null>(null);
  const scratchColor = useRef(new THREE.Color());

  const capacity = Math.max(1, roads.length * PARTICLES_PER_ROAD);
  const geometry = useMemo(() => {
    const created = new THREE.BufferGeometry();
    created.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(capacity * 3), 3)
    );
    created.setAttribute("color", new THREE.BufferAttribute(new Float32Array(capacity * 3), 3));
    created.setDrawRange(0, 0);
    created.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    return created;
  }, [capacity]);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.2,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    []
  );

  const signature = useMemo(() => roads.map((road) => road.id).join("|"), [roads]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  useFrame((frame) => {
    const points = pointsRef.current;
    if (!points) return;

    if (signatureRef.current !== signature) {
      signatureRef.current = signature;
      activeRoadsRef.current = roads;
      const phases = new Float32Array(capacity);
      for (let i = 0; i < capacity; i += 1) {
        phases[i] = (i * 0.37) % 1;
      }
      phasesRef.current = phases;
      points.geometry.setDrawRange(0, roads.length * PARTICLES_PER_ROAD);
    }

    const active = activeRoadsRef.current;
    if (active.length === 0) return;

    const positionAttribute = points.geometry.attributes
      .position as THREE.BufferAttribute;
    const colorAttribute = points.geometry.attributes.color as THREE.BufferAttribute;
    const positions = positionAttribute.array as Float32Array;
    const colors = colorAttribute.array as Float32Array;
    const phases = phasesRef.current;
    const color = scratchColor.current;
    const time = frame.clock.elapsedTime;

    for (let roadIndex = 0; roadIndex < active.length; roadIndex += 1) {
      const road = active[roadIndex];
      const samples = roadSamples.get(road.id);
      if (!samples) continue;
      color.setHex(accentFor(road));

      for (let p = 0; p < PARTICLES_PER_ROAD; p += 1) {
        const index = roadIndex * PARTICLES_PER_ROAD + p;
        const reverse = p % 2 === 1;
        let t = (time * 0.22 * (1 + road.importance) + phases[index]) % 1;
        if (reverse) t = 1 - t;
        const cursor = t * (SAMPLES_PER_ROAD - 1);
        const lower = Math.min(SAMPLES_PER_ROAD - 2, Math.floor(cursor));
        const mix = cursor - lower;
        const a = lower * 3;
        const b = (lower + 1) * 3;
        positions[index * 3] = samples[a] + (samples[b] - samples[a]) * mix;
        positions[index * 3 + 1] = samples[a + 1] + (samples[b + 1] - samples[a + 1]) * mix;
        positions[index * 3 + 2] = samples[a + 2] + (samples[b + 2] - samples[a + 2]) * mix;
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;
      }
    }

    positionAttribute.needsUpdate = true;
    colorAttribute.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} renderOrder={3} />;
}

/* -------------------------------------------------------------------------- */
/*                                    Ground                                  */
/* -------------------------------------------------------------------------- */

function CityGround({ layout }: { layout: CityLayout }) {
  const { cell, groundSize, bounds } = layout;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;

  return (
    <group>
      {/* Flat land surface: the map itself. A small emissive floor keeps the
          land clearly readable at any camera angle, while the key light still
          lays soft shadows from the module blocks onto it. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centerX, -0.02, centerZ]} receiveShadow>
        <planeGeometry args={[groundSize, groundSize]} />
        <meshStandardMaterial
          color={MAP_LAND}
          emissive={MAP_LAND}
          emissiveIntensity={0.6}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* Quiet reference grid, kept low-contrast so it never competes with roads */}
      <Grid
        args={[groundSize, groundSize]}
        position={[centerX, 0.004, centerZ]}
        cellSize={cell}
        cellThickness={0.6}
        cellColor="#202836"
        sectionSize={cell * 4}
        sectionThickness={0.9}
        sectionColor="#2c3747"
        fadeDistance={groundSize * 0.92}
        fadeStrength={1.2}
        infiniteGrid={false}
        followCamera={false}
      />
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Camera rig                                 */
/* -------------------------------------------------------------------------- */

function CityCameraRig({
  content,
  extent,
  layoutKey,
  command,
}: {
  content: THREE.Vector3[];
  extent: number;
  layoutKey: string;
  command: ViewCommand | null;
}) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const size = useThree((state) => state.size);
  const controlsRef = useRef<OrbitControlsRef>(null);
  const animationRef = useRef<CameraAnimation | null>(null);
  const appliedLayoutRef = useRef<string | null>(null);

  const startAnimation = useCallback(
    (pose: CameraPose, animate: boolean) => {
      const controls = controlsRef.current;
      if (!controls) return;
      if (!animate) {
        animationRef.current = null;
        camera.position.copy(pose.position);
        controls.target.copy(pose.target);
        controls.update();
        return;
      }
      animationRef.current = {
        ...pose,
        fromPosition: camera.position.clone(),
        fromTarget: controls.target.clone(),
        progress: 0,
      };
    },
    [camera]
  );

  const cancelAnimation = useCallback(() => {
    animationRef.current = null;
  }, []);

  useEffect(() => {
    if (size.width < 2 || size.height < 2) return;
    if (appliedLayoutRef.current === layoutKey) return;
    appliedLayoutRef.current = layoutKey;
    // The very first framing is applied immediately so the city is never shown
    // from a stale placeholder pose; Reset/Fit animate from there.
    startAnimation(
      computeCameraPose(camera, content, DEFAULT_DIRECTION, DEFAULT_VIEW_MARGIN),
      false
    );
  }, [camera, content, layoutKey, size.width, size.height, startAnimation]);

  useEffect(() => {
    if (!command) return;
    if (command.kind === "reset") {
      startAnimation(
        computeCameraPose(camera, content, DEFAULT_DIRECTION, DEFAULT_VIEW_MARGIN),
        true
      );
      return;
    }
    const controls = controlsRef.current;
    const currentDirection = controls
      ? camera.position.clone().sub(controls.target)
      : DEFAULT_DIRECTION.clone();
    if (currentDirection.lengthSq() < 1e-6) currentDirection.copy(DEFAULT_DIRECTION);
    startAnimation(
      computeCameraPose(camera, content, currentDirection, FIT_VIEW_MARGIN),
      true
    );
  }, [command, camera, content, startAnimation]);

  useFrame((_, delta) => {
    const animation = animationRef.current;
    const controls = controlsRef.current;
    if (!animation || !controls) return;
    animation.progress = Math.min(1, animation.progress + delta * 1.7);
    const eased = 1 - Math.pow(1 - animation.progress, 3);
    camera.position.lerpVectors(animation.fromPosition, animation.position, eased);
    controls.target.lerpVectors(animation.fromTarget, animation.target, eased);
    controls.update();
    if (animation.progress >= 1) animationRef.current = null;
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      onStart={cancelAnimation}
      enableDamping
      dampingFactor={0.08}
      enablePan
      enableZoom
      enableRotate
      rotateSpeed={0.6}
      zoomSpeed={0.8}
      panSpeed={0.7}
      minDistance={Math.max(2, extent * 0.2)}
      maxDistance={Math.max(20, extent * 4)}
      minPolarAngle={0.12}
      maxPolarAngle={Math.PI / 2 - 0.04}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*                             TEMP DEV DIAGNOSTICS                           */
/* -------------------------------------------------------------------------- */

function SceneDiagnostics({
  layout,
  content,
  framingDistance,
  showLabels,
  showRelationships,
  selectedModuleId,
  highlightedRoads,
  connected,
}: {
  layout: CityLayout;
  content: THREE.Vector3[];
  framingDistance: number;
  showLabels: boolean;
  showRelationships: boolean;
  selectedModuleId: string | null;
  highlightedRoads: number;
  connected: number;
}) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const size = useThree((state) => state.size);
  const controls = useThree((state) => state.controls) as unknown as
    | { target: THREE.Vector3 }
    | null;

  useFrame(() => {
    const target = controls?.target ?? new THREE.Vector3();

    // Project against the *intended* framing pose so the measurement is
    // independent of the camera tween being mid-flight.
    const aspect = size.height > 0 ? size.width / size.height : 1;
    const intended = frameContent(content, 45, aspect, DEFAULT_DIRECTION, DEFAULT_VIEW_MARGIN);
    const probe = new THREE.PerspectiveCamera(45, aspect, 0.5, 4000);
    probe.position.copy(intended.position);
    probe.up.set(0, 1, 0);
    probe.lookAt(intended.target);
    probe.updateMatrixWorld(true);
    probe.updateProjectionMatrix();

    let minX = 9;
    let maxX = -9;
    let minY = 9;
    let maxY = -9;
    for (const point of content) {
      const v = point.clone().project(probe);
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y);
      maxY = Math.max(maxY, v.y);
    }

    let topMinY = 9;
    let topMaxY = -9;
    let topMinX = 9;
    let topMaxX = -9;
    for (const building of layout.buildings) {
      const v = new THREE.Vector3(
        building.position[0],
        PLATE_HEIGHT + BLOCK_HEIGHT + 0.9,
        building.position[2]
      ).project(probe);
      topMinX = Math.min(topMinX, v.x);
      topMaxX = Math.max(topMaxX, v.x);
      topMinY = Math.min(topMinY, v.y);
      topMaxY = Math.max(topMaxY, v.y);
    }

    const lines = [
      `DIAG modules=${layout.buildings.length} buildings=${layout.buildings.length} roads=${layout.roads.length} cell=${layout.cell.toFixed(2)}`,
      `DIAG bbox min=[${layout.bounds.minX.toFixed(1)},${layout.bounds.minY.toFixed(1)},${layout.bounds.minZ.toFixed(1)}] max=[${layout.bounds.maxX.toFixed(1)},${layout.bounds.maxY.toFixed(1)},${layout.bounds.maxZ.toFixed(1)}]`,
      `DIAG intendedPos=[${intended.position.x.toFixed(1)},${intended.position.y.toFixed(1)},${intended.position.z.toFixed(1)}] intendedTarget=[${intended.target.x.toFixed(1)},${intended.target.y.toFixed(1)},${intended.target.z.toFixed(1)}] intendedDist=${intended.distance.toFixed(1)}`,
      `DIAG livePos=[${camera.position.x.toFixed(1)},${camera.position.y.toFixed(1)},${camera.position.z.toFixed(1)}] liveTarget=[${target.x.toFixed(1)},${target.y.toFixed(1)},${target.z.toFixed(1)}] liveDist=${camera.position.distanceTo(target).toFixed(1)} fog=[${framingDistance.toFixed(1)}] aspect=${aspect.toFixed(2)}`,
      `DIAG ndcContent x=[${minX.toFixed(2)},${maxX.toFixed(2)}] y=[${minY.toFixed(2)},${maxY.toFixed(2)}] fillW=${(((maxX - minX) / 2) * 100).toFixed(0)}% fillH=${(((maxY - minY) / 2) * 100).toFixed(0)}%`,
      `DIAG ndcTops x=[${topMinX.toFixed(2)},${topMaxX.toFixed(2)}] y=[${topMinY.toFixed(2)},${topMaxY.toFixed(2)}]`,
    ];
    const invalid = layout.buildings.filter(
      (b) =>
        !Number.isFinite(b.position[0]) ||
        !Number.isFinite(b.position[1]) ||
        !Number.isFinite(b.position[2])
    );
    lines.push(
      `DIAG invalid=${invalid.length} minHeight=${Math.min(...layout.buildings.map((b) => b.height)).toFixed(2)} maxHeight=${Math.max(...layout.buildings.map((b) => b.height)).toFixed(2)}`
    );
    lines.push(
      `DIAG state labels=${showLabels} relationships=${showRelationships} selected=${selectedModuleId ?? "none"} highlightedRoads=${highlightedRoads} connected=${connected}`
    );

    const el = document.getElementById("arch3d-diag");
    if (el) el.textContent = lines.join("\n");
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/*                                    Scene                                   */
/* -------------------------------------------------------------------------- */

function CityScene({
  modules,
  relationships,
  selectedModuleId,
  onModuleSelect,
  onModuleDetails,
  showLabels,
  showRelationships,
  command,
}: ArchitectureMap3DProps & { command: ViewCommand | null }) {
  const [hoveredModuleId, setHoveredModuleId] = useState<string | null>(null);
  const getMaterials = useCityMaterials();
  const size = useThree((state) => state.size);

  const layout = useMemo(() => computeCityLayout(modules, relationships), [modules, relationships]);
  const buildingsById = useMemo(
    () => new Map(layout.buildings.map((building) => [building.id, building])),
    [layout]
  );
  const layoutKey = `${layout.buildings.length}:${layout.roads.length}:${layout.cell}:${modules
    .map((module) => module.id)
    .join(",")}`;

  // The flat map is framed from the marker footprints plus a small band of
  // head-room for the labels, so the camera does not pull back for the old
  // tower heights.
  const contentPoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const top = PLATE_HEIGHT + BLOCK_HEIGHT + 0.9;
    for (const building of layout.buildings) {
      const halfWidth = building.width / 2;
      const halfDepth = building.depth / 2;
      for (let i = 0; i < 8; i += 1) {
        points.push(
          new THREE.Vector3(
            building.position[0] + (i & 1 ? halfWidth : -halfWidth),
            i & 2 ? top : 0,
            building.position[2] + (i & 4 ? halfDepth : -halfDepth)
          )
        );
      }
    }
    return points;
  }, [layout.buildings]);

  const contentExtent = useMemo(() => {
    if (contentPoints.length === 0) return 20;
    const box = new THREE.Box3();
    for (const point of contentPoints) box.expandByPoint(point);
    const size = box.getSize(new THREE.Vector3());
    return Math.max(4, 0.5 * Math.hypot(size.x, size.y, size.z));
  }, [contentPoints]);

  const connectedIds = useMemo(() => {
    const focusId = selectedModuleId ?? hoveredModuleId;
    const result = new Set<string>();
    if (!focusId) return result;
    for (const relationship of relationships) {
      if (relationship.source === focusId && buildingsById.has(relationship.target)) {
        result.add(relationship.target);
      }
      if (relationship.target === focusId && buildingsById.has(relationship.source)) {
        result.add(relationship.source);
      }
    }
    return result;
  }, [relationships, selectedModuleId, hoveredModuleId, buildingsById]);

  const highlightedRoads = useMemo(() => {
    const result = new Set<string>();
    if (!selectedModuleId) return result;
    for (const road of layout.roads) {
      if (road.source === selectedModuleId || road.target === selectedModuleId) result.add(road.id);
    }
    return result;
  }, [layout.roads, selectedModuleId]);

  const focusId = selectedModuleId ?? hoveredModuleId;
  const isDimmed = focusId !== null;

  const stateFor = useCallback(
    (building: CityBuilding): FocusState => {
      if (building.id === selectedModuleId) return "selected";
      if (building.id === hoveredModuleId && building.id !== selectedModuleId) return "hovered";
      if (connectedIds.has(building.id)) return "connected";
      if (isDimmed) return "dimmed";
      return "normal";
    },
    [selectedModuleId, hoveredModuleId, connectedIds, isDimmed]
  );

  const labelledIds = useMemo(() => {
    if (!showLabels) return new Set<string>();
    if (layout.buildings.length <= 36) return new Set(layout.buildings.map((b) => b.id));
    const ranked = [...layout.buildings].sort((a, b) => b.importance - a.importance);
    const keep = Math.ceil(layout.buildings.length * 0.7);
    const ids = new Set(ranked.slice(0, keep).map((b) => b.id));
    if (selectedModuleId) ids.add(selectedModuleId);
    if (hoveredModuleId) ids.add(hoveredModuleId);
    for (const id of connectedIds) ids.add(id);
    return ids;
  }, [showLabels, layout.buildings, selectedModuleId, hoveredModuleId, connectedIds]);

  const roadSamples = useMemo(
    () => (showRelationships ? buildRoadSamples(layout.roads, buildingsById) : new Map()),
    [layout.roads, buildingsById, showRelationships]
  );

  const activeFlowRoads = useMemo(
    () => layout.roads.filter((road) => highlightedRoads.has(road.id)),
    [layout.roads, highlightedRoads]
  );

  const bounds = layout.bounds;
  // Atmosphere and lighting are derived from the real framing distance so the
  // scene never washes out (or goes pitch black) for 5 or for 50 modules.
  const aspect = size.height > 0 ? size.width / size.height : 1;
  const framingDistance = frameContent(
    contentPoints,
    45,
    aspect,
    DEFAULT_DIRECTION,
    DEFAULT_VIEW_MARGIN
  ).distance;
  // Fog is kept far back so it only softens the far edge of the land; a map
  // surface should stay legible all the way to the horizon of the district.
  const fogNear = framingDistance * 2.4;
  const fogFar = framingDistance * 5.2;
  const lightDistance = Math.max(bounds.radius * 1.6, 20);
  const shadowExtent = Math.max(bounds.radius * 1.15, 8);
  const keyLightPosition: [number, number, number] = [
    lightDistance * 0.85,
    lightDistance * 1.15,
    lightDistance * 0.6,
  ];

  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
    };
  }, []);

  const handleHover = useCallback((id: string | null) => {
    setHoveredModuleId(id);
    document.body.style.cursor = id ? "pointer" : "";
  }, []);

  const handleSelect = useCallback(
    (id: string) => {
      onModuleSelect(id === selectedModuleId ? null : id);
    },
    [onModuleSelect, selectedModuleId]
  );

  return (
    <>
      <color attach="background" args={[SCENE_BACKGROUND]} />
      <fog attach="fog" args={[FOG_COLOR, fogNear, fogFar]} />

      <ambientLight intensity={0.78} color="#5a6a82" />
      <hemisphereLight args={["#4a5f7d", "#0b0f16", 0.55]} />
      <directionalLight
        position={keyLightPosition}
        intensity={1.25}
        color="#eef3fa"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={lightDistance * 4}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-bias={-0.0008}
        shadow-normalBias={0.03}
      />
      <directionalLight
        position={[-lightDistance * 0.7, lightDistance * 0.5, -lightDistance * 0.8]}
        intensity={0.3}
        color="#5b76a8"
      />

      <CityGround layout={layout} />

      {showRelationships && layout.roads.length > 0 && (
        <FlowParticles
          roads={activeFlowRoads}
          roadSamples={roadSamples}
          accentFor={(road) =>
            CATEGORY_STYLES[buildingsById.get(road.source)?.category ?? "other"].accent
          }
        />
      )}

      {showRelationships &&
        layout.roads.map((road) => (
          <Road
            key={road.id}
            road={road}
            buildings={buildingsById}
            cell={layout.cell}
            highlighted={highlightedRoads.has(road.id)}
            dimmed={isDimmed && !highlightedRoads.has(road.id)}
          />
        ))}

      {layout.buildings.map((building) => (
        <Building
          key={building.id}
          building={building}
          state={stateFor(building)}
          showLabel={labelledIds.has(building.id)}
          cell={layout.cell}
          onSelect={handleSelect}
          onDetails={onModuleDetails}
          onHover={handleHover}
          getMaterials={getMaterials}
        />
      ))}

      <CityCameraRig
        content={contentPoints}
        extent={contentExtent}
        layoutKey={layoutKey}
        command={command}
      />
      <SceneDiagnostics
        layout={layout}
        content={contentPoints}
        framingDistance={framingDistance}
        showLabels={showLabels !== false}
        showRelationships={showRelationships !== false}
        selectedModuleId={selectedModuleId}
        highlightedRoads={highlightedRoads.size}
        connected={connectedIds.size}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                                2D fallback map                              */
/* -------------------------------------------------------------------------- */

function ArchitectureMap2DFallback(props: ArchitectureMap3DProps) {
  const analysis = useMemo<RepoMapAnalysis>(
    () => ({
      projectSummary:
        "The 3D architecture city is unavailable in this browser, so the 2D architecture map is shown instead.",
      stack: [],
      modules: props.modules,
      recommendedFiles: [],
      gotchas: [],
      relationships: props.relationships,
    }),
    [props.modules, props.relationships]
  );

  return (
    <ReactFlowProvider>
      <ArchitectureDiagram
        analysis={analysis}
        selectedModuleId={props.selectedModuleId}
        onModuleSelect={props.onModuleSelect}
      />
    </ReactFlowProvider>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  WebGL probe                               */
/* -------------------------------------------------------------------------- */

let webglSupport: boolean | null = null;

function detectWebGLOnce(): boolean {
  if (webglSupport !== null) return webglSupport;
  if (typeof window === "undefined") return true;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ??
      canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl");
    if (!gl) {
      webglSupport = false;
      return webglSupport;
    }
    const loseContext = (gl as WebGLRenderingContext).getExtension("WEBGL_lose_context");
    loseContext?.loseContext();
    webglSupport = true;
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

function subscribeToNothing(): () => void {
  return () => {};
}

/* -------------------------------------------------------------------------- */
/*                                   Wrapper                                  */
/* -------------------------------------------------------------------------- */

export function ArchitectureMap3D(props: ArchitectureMap3DProps) {
  const [showLabels, setShowLabels] = useState(true);
  const [showRelationships, setShowRelationships] = useState(true);
  const [command, setCommand] = useState<ViewCommand | null>(null);
  const webglAvailable = useSyncExternalStore(
    subscribeToNothing,
    detectWebGLOnce,
    () => true
  );

  const moduleCount = props.modules.length;
  const relationshipCount = props.relationships.length;

  if (!webglAvailable) {
    return (
      <section aria-labelledby="architecture-heading-3d" className="space-y-4">
        <header>
          <h2
            id="architecture-heading-3d"
            className="text-lg font-semibold text-white flex items-center gap-2"
          >
            Architecture Map (3D)
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            WebGL is unavailable in this browser — showing the 2D architecture map instead.
          </p>
        </header>
        <ArchitectureMap2DFallback {...props} />
      </section>
    );
  }

  return (
    <section aria-labelledby="architecture-heading-3d" className="space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2
            id="architecture-heading-3d"
            className="text-lg font-semibold text-white flex items-center gap-2"
          >
            <svg
              className="w-5 h-5 text-primary-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Architecture Map (3D)
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            {moduleCount} buildings · {relationshipCount} roads · drag to orbit, scroll to zoom, click
            a tower to trace its connections, double-click for details
          </p>
        </div>
      </header>

      <div
        className="relative w-full h-[560px] rounded-xl border border-neutral-800/50 bg-gradient-to-br from-neutral-950/80 to-neutral-900/90 overflow-hidden shadow-[0_4px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.02)]"
        role="application"
        aria-label="3D architecture city showing modules as buildings and relationships as roads"
      >
        <pre id="arch3d-diag" className="hidden" />
        <Canvas
          shadows
          dpr={[1, 1.75]}
          camera={{ position: BASE_CAMERA, fov: 45, near: 0.5, far: 4000 }}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          onPointerMissed={() => props.onModuleSelect(null)}
        >
          <CityScene
            modules={props.modules}
            relationships={props.relationships}
            selectedModuleId={props.selectedModuleId}
            onModuleSelect={props.onModuleSelect}
            onModuleDetails={props.onModuleDetails}
            showLabels={showLabels}
            showRelationships={showRelationships}
            command={command}
          />
        </Canvas>

        <div className="absolute top-4 right-4 flex flex-col gap-2 pointer-events-auto z-10">
          <button
            type="button"
            onClick={() => setCommand((prev) => ({ kind: "reset", nonce: (prev?.nonce ?? 0) + 1 }))}
            className="px-3 py-2 bg-neutral-900/80 border border-neutral-700/50 text-neutral-200 text-xs font-medium rounded-lg backdrop-blur-sm hover:bg-neutral-800/80 hover:border-neutral-600/50 transition-all duration-200 shadow-lg flex items-center gap-2"
            aria-label="Reset view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Reset View
          </button>
          <button
            type="button"
            onClick={() => setCommand((prev) => ({ kind: "fit", nonce: (prev?.nonce ?? 0) + 1 }))}
            className="px-3 py-2 bg-neutral-900/80 border border-neutral-700/50 text-neutral-200 text-xs font-medium rounded-lg backdrop-blur-sm hover:bg-neutral-800/80 hover:border-neutral-600/50 transition-all duration-200 shadow-lg flex items-center gap-2"
            aria-label="Fit architecture"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            Fit Architecture
          </button>
          <label className="px-3 py-2 bg-neutral-900/80 border border-neutral-700/50 text-neutral-200 text-xs font-medium rounded-lg backdrop-blur-sm cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(event) => setShowLabels(event.target.checked)}
              className="w-4 h-4 accent-primary-500 rounded border-neutral-700 bg-neutral-900"
            />
            Labels
          </label>
          <label className="px-3 py-2 bg-neutral-900/80 border border-neutral-700/50 text-neutral-200 text-xs font-medium rounded-lg backdrop-blur-sm cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showRelationships}
              onChange={(event) => setShowRelationships(event.target.checked)}
              className="w-4 h-4 accent-primary-500 rounded border-neutral-700 bg-neutral-900"
            />
            Relationships
          </label>
        </div>

        <div className="absolute bottom-4 left-4 pointer-events-none z-10">
          <div className="bg-neutral-900/80 border border-neutral-700/50 rounded-lg p-3 backdrop-blur-sm shadow-lg min-w-[190px]">
            <div className="text-xs font-medium text-neutral-300 mb-2">Legend</div>
            <div className="space-y-1.5 text-xs">
              {CATEGORY_ORDER.map((category) => (
                <div key={category} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: CATEGORY_STYLES[category].css }}
                  />
                  <span className="text-neutral-300">{CATEGORY_LABELS[category]}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-neutral-700/30 flex items-center gap-2">
                <div className="w-3 h-3 rounded border-2 border-sky-300/70" />
                <span className="text-neutral-300">Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-1 bg-sky-400/70 rounded" />
                <span className="text-neutral-300">Road</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ArchitectureMap3D;
