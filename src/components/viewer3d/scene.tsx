"use client";

import { createContext, Suspense, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Archetype, MeshSpec, PartInfo, PartSpec, V3 } from "./types";
import { getTexture } from "./textures";

export type ViewPreset = "front" | "rear" | "top" | "side" | "iso";

export interface SceneState {
  exploded: boolean;
  paused: boolean;
  speed: number;
  distance: number;
  selected: string | null;
  hidden: Set<string>;
  showLabels: boolean;
  /** Slow automatic turntable rotation ("Rotate 360°"). */
  autoRotate: boolean;
  locale: "ar" | "en";
  view: { preset: ViewPreset; nonce: number };
}

/** What the scene draws: an illustrative archetype, or a real GLB with configured parts. */
export type SceneModel = { type: "illustrative"; archetype: Archetype } | { type: "verified"; url: string; parts: PartInfo[] };

interface Props {
  model: SceneModel;
  state: SceneState;
  onSelect: (id: string | null) => void;
  reducedMotion: boolean;
  /** Dark stage background (showcase layout). */
  dark?: boolean;
  /** false = rotate only (no zoom/pan), e.g. on the homepage so scrolling the page is not captured. */
  interactive?: boolean;
}

/** Camera distance relative to model size — leaves room for the exploded parts. */
const CAMERA_FACTOR = 2.7;
const DURATION = 1.4;
/** Real models are scaled so their largest side is this many units (same scale as the illustrative models). */
const GLB_SIZE = 3.2;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

type PartGeom = { center: THREE.Vector3; explode: THREE.Vector3 };
const SceneCtx = createContext<{ progress: { current: number }; geom: Map<string, PartGeom> }>({ progress: { current: 0 }, geom: new Map() });

/** Minimal shape of drei OrbitControls used by the camera rig. */
type OrbitControlsImpl = { target: THREE.Vector3; update: () => void };

export function partCenter(part: PartSpec): THREE.Vector3 {
  const v = new THREE.Vector3();
  part.meshes.forEach((m) => v.add(new THREE.Vector3(...m.pos)));
  return v.divideScalar(Math.max(part.meshes.length, 1));
}

function useHoverCursor(hover: boolean) {
  useEffect(() => {
    document.body.style.cursor = hover ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hover]);
}

function PartLabel({ text, selected, locale, position }: { text: string; selected: boolean; locale: "ar" | "en"; position: V3 }) {
  return (
    <Html position={position} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <span
        dir={locale === "ar" ? "rtl" : "ltr"}
        className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[12px] font-semibold shadow-md transition-colors ${
          selected ? "border-teal bg-teal text-white" : "border-line bg-white/95 text-navy"
        }`}
      >
        {text}
      </span>
    </Html>
  );
}

/* ------------------------------------------------------------------ */
/* Illustrative models (built from simple shapes)                      */
/* ------------------------------------------------------------------ */

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

function IllustrativePart({ part, state, dimmed, onSelect }: { part: PartSpec; state: SceneState; dimmed: boolean; onSelect: (id: string) => void }) {
  const ref = useRef<THREE.Group>(null);
  const { progress, geom } = useContext(SceneCtx);
  const [hover, setHover] = useState(false);
  useHoverCursor(hover);
  const selected = state.selected === part.id;
  const center = useMemo(() => partCenter(part), [part]);

  useEffect(() => {
    geom.set(part.id, { center, explode: new THREE.Vector3(...part.explode) });
  }, [geom, part, center]);

  useFrame(() => {
    if (!ref.current) return;
    const k = ease(progress.current) * state.distance;
    ref.current.position.set(part.explode[0] * k, part.explode[1] * k, part.explode[2] * k);
  });

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
            key={`${dimmed ? "dim" : "solid"}-${m.texture ?? ""}`}
            map={m.texture ? getTexture(m.texture) : null}
            color={m.texture ? "#ffffff" : m.color}
            metalness={m.glass ? 0.1 : (m.metal ?? 0.1)}
            roughness={m.glass ? 0.05 : (m.rough ?? 0.55)}
            emissive={selected ? "#167d83" : hover ? "#3fb8be" : (m.emissive ?? "#000000")}
            emissiveIntensity={selected ? 0.55 : hover ? 0.25 : m.emissive ? 0.6 : 0}
            transparent={dimmed || m.glass}
            opacity={dimmed ? 0.15 : m.glass ? 0.22 : 1}
            depthWrite={!(dimmed || m.glass)}
          />
        </mesh>
      ))}
      {state.showLabels && !state.hidden.has(part.id) && ((state.exploded && !part.parent) || selected) && (
        <PartLabel text={state.locale === "ar" ? part.ar : part.en} selected={selected} locale={state.locale} position={[center.x, center.y + 0.25, center.z]} />
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Real GLB models                                                     */
/* ------------------------------------------------------------------ */

type MatState = { mat: THREE.MeshStandardMaterial; emissive: THREE.Color; emissiveIntensity: number };

function GlbModel({ url, parts, state, onSelect }: { url: string; parts: PartInfo[]; state: SceneState; onSelect: (id: string | null) => void }) {
  const { scene } = useGLTF(url);
  const { progress, geom } = useContext(SceneCtx);
  const [hoverId, setHoverId] = useState<string | null>(null);
  useHoverCursor(!!hoverId);

  // Clone (materials too, so highlighting never leaks into the cache), centre and scale to a standard size.
  const setup = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const mesh = o as THREE.Mesh;
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map((m) => m.clone()) : mesh.material.clone();
        mesh.castShadow = mesh.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const scale = GLB_SIZE / Math.max(size.x, size.y, size.z, 1e-6);
    const wrapper = new THREE.Group();
    wrapper.add(root);
    root.position.sub(box.getCenter(new THREE.Vector3()));
    wrapper.scale.setScalar(scale);
    wrapper.updateMatrixWorld(true);
    return { wrapper, root };
  }, [scene]);

  // Map configured parts to scene objects; remember base positions and world centres.
  const items = useMemo(() => {
    const modelCenter = new THREE.Box3().setFromObject(setup.wrapper).getCenter(new THREE.Vector3());
    return parts
      .map((p) => {
        const obj = p.node ? setup.root.getObjectByName(p.node) : undefined;
        if (!obj) return null;
        const center = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
        const auto = center.clone().sub(modelCenter);
        const explode = p.explode ? new THREE.Vector3(...p.explode) : auto.lengthSq() < 1e-6 ? new THREE.Vector3(0, 1.2, 0) : auto.normalize().multiplyScalar(1.4);
        const mats: MatState[] = [];
        obj.traverse((o) => {
          const m = (o as THREE.Mesh).material;
          (Array.isArray(m) ? m : m ? [m] : []).forEach((mat) => {
            if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
              const sm = mat as THREE.MeshStandardMaterial;
              mats.push({ mat: sm, emissive: sm.emissive.clone(), emissiveIntensity: sm.emissiveIntensity });
            }
          });
        });
        return { part: p, obj, base: obj.position.clone(), baseWorld: obj.getWorldPosition(new THREE.Vector3()), center, explode, mats };
      })
      .filter((x) => x !== null);
  }, [parts, setup]);

  useEffect(() => {
    geom.clear();
    items.forEach((it) => geom.set(it.part.id, { center: it.center, explode: it.explode }));
  }, [items, geom]);

  // Highlight / dim / visibility
  useEffect(() => {
    for (const it of items) {
      const selected = state.selected === it.part.id;
      const dimmed = !!state.selected && !selected;
      it.obj.visible = !state.hidden.has(it.part.id);
      for (const m of it.mats) {
        if (selected || hoverId === it.part.id) {
          m.mat.emissive.set(selected ? "#167d83" : "#3fb8be");
          m.mat.emissiveIntensity = selected ? 0.55 : 0.25;
        } else {
          m.mat.emissive.copy(m.emissive);
          m.mat.emissiveIntensity = m.emissiveIntensity;
        }
        if (m.mat.transparent !== dimmed) {
          m.mat.transparent = dimmed;
          m.mat.needsUpdate = true;
        }
        m.mat.opacity = dimmed ? 0.15 : 1;
        m.mat.depthWrite = !dimmed;
      }
    }
  }, [items, state.selected, state.hidden, hoverId]);

  // Explode: move each part along its vector (scene units), converted to the parent's local space.
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const k = ease(progress.current) * state.distance;
    for (const it of items) {
      if (k === 0) {
        it.obj.position.copy(it.base);
        continue;
      }
      tmp.copy(it.baseWorld).addScaledVector(it.explode, k);
      if (it.obj.parent) it.obj.parent.worldToLocal(tmp);
      it.obj.position.copy(tmp);
    }
  });

  const findPart = (o: THREE.Object3D | null): string | null => {
    for (let cur = o; cur; cur = cur.parent) {
      const hit = items.find((it) => it.obj === cur);
      if (hit) return hit.part.id;
    }
    return null;
  };

  return (
    <>
      <primitive
        object={setup.wrapper}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onSelect(findPart(e.object));
        }}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHoverId(findPart(e.object));
        }}
        onPointerOut={() => setHoverId(null)}
      />
      {state.showLabels && items.map((it) => <GlbLabel key={it.part.id} item={it} state={state} />)}
    </>
  );
}

function GlbLabel({ item, state }: { item: { part: PartInfo; center: THREE.Vector3; explode: THREE.Vector3 }; state: SceneState }) {
  const ref = useRef<THREE.Group>(null);
  const { progress } = useContext(SceneCtx);
  useFrame(() => {
    if (!ref.current) return;
    const k = ease(progress.current) * state.distance;
    ref.current.position.copy(item.center).addScaledVector(item.explode, k);
    ref.current.position.y += 0.2;
  });
  const selected = state.selected === item.part.id;
  if (state.hidden.has(item.part.id) || !((state.exploded && !item.part.parent) || selected)) return null;
  const text = state.locale === "ar" ? item.part.ar || item.part.en : item.part.en || item.part.ar;
  return (
    <group ref={ref}>
      <PartLabel text={text} selected={selected} locale={state.locale} position={[0, 0, 0]} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Camera rig + canvas                                                 */
/* ------------------------------------------------------------------ */

function Rig({ size, state, reducedMotion }: { size: number; state: SceneState; reducedMotion: boolean }) {
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const camera = useThree((s) => s.camera);
  const { progress, geom } = useContext(SceneCtx);
  const goal = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const r = size * CAMERA_FACTOR;

  useEffect(() => {
    const presets: Record<ViewPreset, V3> = {
      front: [0, 0.15 * r, r],
      rear: [0, 0.15 * r, -r],
      top: [0, r, 0.001],
      side: [r, 0.15 * r, 0],
      iso: [0.72 * r, 0.55 * r, 0.72 * r],
    };
    goal.current = { pos: new THREE.Vector3(...presets[state.view.preset]), target: new THREE.Vector3(0, 0, 0) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.view.nonce]);

  // When the device is taken apart, aim at the middle of the spread parts and step back so everything stays in view.
  useEffect(() => {
    if (!controls) return;
    let maxUp = 0;
    let maxDown = 0;
    geom.forEach((g) => {
      maxUp = Math.max(maxUp, g.center.y + g.explode.y * state.distance);
      maxDown = Math.min(maxDown, g.center.y + g.explode.y * state.distance);
    });
    const lift = state.exploded ? (maxUp + maxDown) / 2 : 0;
    const target = new THREE.Vector3(0, lift, 0);
    const dir = camera.position.clone().sub(controls.target).normalize();
    const dist = r * (state.exploded ? 1.25 + 0.15 * state.distance : 1);
    goal.current = { pos: target.clone().add(dir.multiplyScalar(dist)), target };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.exploded, state.distance]);

  useEffect(() => {
    if (!state.selected) return;
    const g = geom.get(state.selected);
    if (!g) return;
    const c = g.center.clone().addScaledVector(g.explode, state.exploded ? state.distance : 0);
    const dir = camera.position.clone().sub(controls?.target ?? new THREE.Vector3()).normalize();
    goal.current = { pos: c.clone().add(dir.multiplyScalar(size * 1.9)), target: c };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selected]);

  useFrame((_, dt) => {
    const target = state.exploded ? 1 : 0;
    if (!state.paused && progress.current !== target) {
      const step = reducedMotion ? 1 : (dt * state.speed) / DURATION;
      progress.current = target > progress.current ? Math.min(1, progress.current + step) : Math.max(0, progress.current - step);
    }
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

function Loading() {
  return (
    <Html center>
      <span className="block size-8 animate-spin rounded-full border-4 border-teal-light border-t-teal" />
    </Html>
  );
}

export function EquipmentScene({ model, state, onSelect, reducedMotion, dark = false, interactive = true }: Props) {
  const ctx = useMemo(() => ({ progress: { current: 0 }, geom: new Map<string, PartGeom>() }), []);
  const size = model.type === "illustrative" ? model.archetype.size : GLB_SIZE;
  const r = size * CAMERA_FACTOR;
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0.72 * r, 0.55 * r, 0.72 * r], fov: 38, near: 0.05, far: 200 }}
      onPointerMissed={() => onSelect(null)}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
    >
      <color attach="background" args={[dark ? "#0e2236" : "#eef3f4"]} />
      <hemisphereLight args={["#ffffff", dark ? "#4d6680" : "#b9c7cc", dark ? 1.35 : 1.1]} />
      <directionalLight position={[5, 8, 6]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-6, 3, -4]} intensity={0.5} />
      <SceneCtx.Provider value={ctx}>
        {model.type === "illustrative" ? (
          <group>
            {model.archetype.parts.map((p) => (
              <IllustrativePart key={p.id} part={p} state={state} dimmed={!!state.selected && state.selected !== p.id} onSelect={onSelect} />
            ))}
          </group>
        ) : (
          <Suspense fallback={<Loading />}>
            <GlbModel url={model.url} parts={model.parts} state={state} onSelect={onSelect} />
          </Suspense>
        )}
        <Rig size={size} state={state} reducedMotion={reducedMotion} />
      </SceneCtx.Provider>
      <ContactShadows position={[0, -size * 0.62, 0]} opacity={dark ? 0.6 : 0.35} scale={size * 4} blur={2.4} far={4} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={size * 0.6} maxDistance={size * 5} autoRotate={state.autoRotate && !reducedMotion} autoRotateSpeed={1.4} enableZoom={interactive} enablePan={interactive} />
    </Canvas>
  );
}
