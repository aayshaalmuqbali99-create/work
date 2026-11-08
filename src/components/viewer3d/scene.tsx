"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Archetype, MeshSpec, PartSpec, V3 } from "./types";

export type ViewPreset = "front" | "rear" | "top" | "side" | "iso";

export interface SceneState {
  exploded: boolean;
  paused: boolean;
  speed: number; // 0.25 – 3
  distance: number; // 0.3 – 2
  selected: string | null;
  hidden: Set<string>;
  showLabels: boolean;
  locale: "ar" | "en";
  /** Incremented on every camera request so the same preset can be re-applied. */
  view: { preset: ViewPreset; nonce: number };
}

interface Props {
  archetype: Archetype;
  state: SceneState;
  onSelect: (id: string | null) => void;
  reducedMotion: boolean;
}

/** Camera distance relative to model size — leaves room for the exploded parts. */
const CAMERA_FACTOR = 2.7;
const DURATION = 1.4; // seconds for a full explode at speed 1
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Minimal shape of drei OrbitControls used by the camera rig. */
type OrbitControlsImpl = { target: THREE.Vector3; update: () => void };

const ProgressCtx = createContext<{ current: number }>({ current: 0 });

/** Geometric centre of a part (before explosion). */
export function partCenter(part: PartSpec): THREE.Vector3 {
  const v = new THREE.Vector3();
  part.meshes.forEach((m) => v.add(new THREE.Vector3(...m.pos)));
  return v.divideScalar(Math.max(part.meshes.length, 1));
}

function Geometry({ m }: { m: MeshSpec }) {
  const s = m.shape;
  switch (s.kind) {
    case "box":
      return <boxGeometry args={s.size} />;
    case "cyl":
      return <cylinderGeometry args={[s.rTop ?? s.r, s.r, s.h, s.seg ?? 32]} />;
    case "torus":
      return <torusGeometry args={[s.r, s.tube, 16, 48, s.arc ?? Math.PI * 2]} />;
    case "sphere":
      return <sphereGeometry args={[s.r, 32, 16]} />;
  }
}

function Part({
  part,
  state,
  dimmed,
  onSelect,
}: {
  part: PartSpec;
  state: SceneState;
  dimmed: boolean;
  onSelect: (id: string) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const progress = useContext(ProgressCtx);
  const [hover, setHover] = useState(false);
  const selected = state.selected === part.id;
  const center = useMemo(() => partCenter(part), [part]);
  const labelPos: V3 = [center.x, center.y + 0.25, center.z];

  useFrame(() => {
    if (!ref.current) return;
    const k = ease(progress.current) * state.distance;
    ref.current.position.set(part.explode[0] * k, part.explode[1] * k, part.explode[2] * k);
  });

  useEffect(() => {
    document.body.style.cursor = hover ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hover]);

  return (
    <group
      ref={ref}
      visible={!state.hidden.has(part.id)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(part.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
      }}
      onPointerOut={() => setHover(false)}
    >
      {part.meshes.map((m, i) => (
        <mesh key={i} position={m.pos} rotation={m.rot ?? [0, 0, 0]} castShadow receiveShadow>
          <Geometry m={m} />
          <meshStandardMaterial
            key={dimmed ? "dim" : "solid"}
            color={m.color}
            metalness={m.metal ?? 0.1}
            roughness={m.rough ?? 0.55}
            emissive={selected ? "#167d83" : hover ? "#3fb8be" : (m.emissive ?? "#000000")}
            emissiveIntensity={selected ? 0.55 : hover ? 0.25 : m.emissive ? 0.6 : 0}
            transparent={dimmed}
            opacity={dimmed ? 0.15 : 1}
            depthWrite={!dimmed}
          />
        </mesh>
      ))}
      {state.showLabels && !state.hidden.has(part.id) && (state.exploded || selected) && (
        <Html position={labelPos} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <span
            dir={state.locale === "ar" ? "rtl" : "ltr"}
            className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[12px] font-semibold shadow-md transition-colors ${
              selected ? "border-teal bg-teal text-white" : "border-line bg-white/95 text-navy"
            }`}
          >
            {state.locale === "ar" ? part.ar : part.en}
          </span>
        </Html>
      )}
    </group>
  );
}

/** Animates explode progress, camera presets and focus on the selected part. */
function Rig({ archetype, state, reducedMotion, progress }: { archetype: Archetype; state: SceneState; reducedMotion: boolean; progress: { current: number } }) {
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const camera = useThree((s) => s.camera);
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const r = archetype.size * CAMERA_FACTOR;

  const presets: Record<ViewPreset, V3> = {
    front: [0, 0.15 * r, r],
    rear: [0, 0.15 * r, -r],
    top: [0, r, 0.001],
    side: [r, 0.15 * r, 0],
    iso: [0.72 * r, 0.55 * r, 0.72 * r],
  };

  useEffect(() => {
    goal.current = { pos: new THREE.Vector3(...presets[state.view.preset]), target: new THREE.Vector3(0, 0, 0) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.view.nonce]);

  useEffect(() => {
    if (!state.selected) return;
    const part = archetype.parts.find((p) => p.id === state.selected);
    if (!part) return;
    const k = state.exploded ? state.distance : 0;
    const c = partCenter(part).add(new THREE.Vector3(...part.explode).multiplyScalar(k));
    const dir = camera.position.clone().sub(controls?.target ?? new THREE.Vector3()).normalize();
    goal.current = { pos: c.clone().add(dir.multiplyScalar(archetype.size * 1.9)), target: c };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selected]);

  useFrame((_, dt) => {
    // explode / reassemble
    const target = state.exploded ? 1 : 0;
    if (!state.paused && progress.current !== target) {
      const step = reducedMotion ? 1 : (dt * state.speed) / DURATION;
      progress.current = target > progress.current ? Math.min(1, progress.current + step) : Math.max(0, progress.current - step);
    }
    // camera tween
    if (goal.current && controls) {
      const t = reducedMotion ? 1 : 1 - Math.pow(0.0015, dt);
      camera.position.lerp(goal.current.pos, t);
      controls.target.lerp(goal.current.target, t);
      controls.update();
      if (camera.position.distanceTo(goal.current.pos) < 0.01 && controls.target.distanceTo(goal.current.target) < 0.01) goal.current = null;
    }
  });
  return null;
}

export function EquipmentScene({ archetype, state, onSelect, reducedMotion }: Props) {
  const progress = useRef(0);
  const r = archetype.size * CAMERA_FACTOR;
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0.72 * r, 0.55 * r, 0.72 * r], fov: 38, near: 0.1, far: 100 }}
      onPointerMissed={() => onSelect(null)}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      <color attach="background" args={["#eef3f4"]} />
      <hemisphereLight args={["#ffffff", "#b9c7cc", 1.1]} />
      <directionalLight position={[5, 8, 6]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-6, 3, -4]} intensity={0.5} />
      <ProgressCtx.Provider value={progress}>
        <group>
          {archetype.parts.map((p) => (
            <Part key={p.id} part={p} state={state} dimmed={!!state.selected && state.selected !== p.id} onSelect={onSelect} />
          ))}
        </group>
      </ProgressCtx.Provider>
      <ContactShadows position={[0, -archetype.size * 0.62, 0]} opacity={0.35} scale={archetype.size * 4} blur={2.4} far={4} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={archetype.size * 0.6} maxDistance={archetype.size * 5} />
      <Rig archetype={archetype} state={state} reducedMotion={reducedMotion} progress={progress} />
    </Canvas>
  );
}
