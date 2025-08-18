// components/Canvas3D.js
"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, useGLTF, useAnimations } from "@react-three/drei";
import { EffectComposer, Pixelation, ChromaticAberration, Noise } from "@react-three/postprocessing";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";

/* ================== KNOBS ================== */
// Kamera
const CAMERA_POS = [0, 1.2, 3];
const CAMERA_FOV = 45;

// Posisi/rotasi dasar objek (tanpa mouse)
const BASE_OFFSET   = [0, 0, 0];
const BASE_ROTATION = deg([0, 180, 0]);

// Follow mouse (rotasi)
const MAX_TILT_X  = 0.15;
const MAX_TILT_Y  = 0.30;
const ROT_DAMPING = 0.08;

// Auto-fit tinggi model
const FIT_HEIGHT_RATIO = 0.55;
const SCALE_MULTIPLIER = 1.3;

// Pixel-glitch reveal
const REVEAL_DURATION = 0.7;   // detik total
const START_PIXELS    = 24;
const END_PIXELS      = 1;
const PIXEL_STEPS     = 4;     // step glitch (set 0/1 untuk halus)

// Chromatic Aberration & Noise (tanpa glow)
const CA_START = 0.001;
const CA_END   = 0.001;
const NOISE_OPACITY = 0.15;

// Clip klik acak
const ALLOWED_CLIPS = ["walk", "idle", "win"];

// ====== CRISP / PIXELATED SHADOW SETTINGS ======
const SHADOW_MAP_SIZE = 256;
const SHADOW_OPACITY  = 0.15;
const FLOOR_SIZE      = 12;

// ==== Material tuning (anti-gloss) ====
const MATERIAL_OVERRIDES = {
  roughness: 1.0,
  metalness: 0.0,
  envMapIntensity: 0.06,
  clearcoat: 0.0,
  clearcoatRoughness: 1.0,
};
// Abaikan map dari GLB jika perlu
const STRIP_ROUGH_METAL_MAPS = false;
/* ============================================== */

function deg([x, y, z]) {
  return [x, y, z].map((v) => THREE.MathUtils.degToRad(v));
}

/* ====== PIXEL-GLITCH REVEAL (Pixelation + CA kecil + Noise non-glow) ====== */
function RevealFX({ trigger = 0 }) {
  const [enabled, setEnabled] = useState(true);
  const pixelRef = useRef(null);
  const chromaOffset = useMemo(() => new THREE.Vector2(CA_START, CA_START), []);
  const startRef = useRef(0);

  useEffect(() => {
    startRef.current = performance.now();
    setEnabled(true);
    chromaOffset.set(CA_START, CA_START);
    if (pixelRef.current) pixelRef.current.granularity = START_PIXELS;
  }, [trigger, chromaOffset]);

  useFrame(() => {
    if (!enabled) return;
    const t = (performance.now() - startRef.current) / 1000;
    const u = Math.min(t / REVEAL_DURATION, 1);

    // stepped glitch
    let g;
    if (PIXEL_STEPS && PIXEL_STEPS > 1) {
      const stepIndex = Math.floor(u * (PIXEL_STEPS - 1));
      const steppedU = stepIndex / (PIXEL_STEPS - 1);
      g = THREE.MathUtils.lerp(START_PIXELS, END_PIXELS, steppedU);
    } else {
      g = THREE.MathUtils.lerp(START_PIXELS, END_PIXELS, u);
    }

    if (pixelRef.current) pixelRef.current.granularity = g;

    // CA sangat kecil → tidak bleeding/glow
    chromaOffset.set(
      THREE.MathUtils.lerp(CA_START, CA_END, u),
      THREE.MathUtils.lerp(CA_START, CA_END, u)
    );

    if (u >= 1) setEnabled(false);
  });

  if (!enabled) return null;
  return (
    <EffectComposer multisampling={0}>
      <Pixelation ref={pixelRef} granularity={START_PIXELS} />
      <ChromaticAberration
        offset={chromaOffset}
        radialModulation={false}
        modulationOffset={0}
      />
      <Noise premultiply={false} opacity={NOISE_OPACITY} />
    </EffectComposer>
  );
}

/* ====== RIG FOLLOW MOUSE ====== */
function FollowRig({ children, mouse }) {
  const rig = useRef();
  useFrame(() => {
    const g = rig.current;
    if (!g) return;
    const tx = BASE_ROTATION[0] + (mouse?.y || 0) * MAX_TILT_X;
    const ty = BASE_ROTATION[1] + (mouse?.x || 0) * MAX_TILT_Y;
    g.rotation.x += (tx - g.rotation.x) * ROT_DAMPING;
    g.rotation.y += (ty - g.rotation.y) * ROT_DAMPING;
    g.rotation.z  = BASE_ROTATION[2];
  });
  return <group ref={rig}>{children}</group>;
}

/* ====== MODEL ====== */
function CenteredAnimatedModel({
  url = "/models/model.glb",
  initialClip = "Walk",
  fitHeightRatio = FIT_HEIGHT_RATIO,
  scaleMultiplier = SCALE_MULTIPLIER,
  baseOffset = BASE_OFFSET,
  onSwitchedClip,
  onGroundY,
}) {
  const root = useRef();
  const modelRef = useRef();
  const { scene, animations } = useGLTF(url);
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { actions, names, mixer } = useAnimations(animations, root);
  const { camera, size } = useThree();
  const [scale, setScale] = useState(1);

  const nameMap = useMemo(() => {
    const m = new Map();
    names.forEach((n) => m.set(n.toLowerCase(), n));
    return m;
  }, [names]);

  // pose reset + center + shadow + matte override
  useEffect(() => {
    const target = modelRef.current || cloned;
    if (!target || !root.current) return;

 target.traverse((o) => {
  if (o.isSkinnedMesh && o.skeleton) o.skeleton.pose();

  if (o.isMesh) {
    o.castShadow = true;
    o.receiveShadow = false;           // ⬅️ penting: hentikan self-shadow di badan

    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => {
      if (!m) return;

      // anti-gloss (punyamu)
      if ("roughness" in m) m.roughness = 1.0;
      if ("metalness" in m) m.metalness = 0.0;
      if ("envMapIntensity" in m) m.envMapIntensity = 0.06;
      if ("clearcoat" in m) m.clearcoat = 0.0;
      if ("clearcoatRoughness" in m) m.clearcoatRoughness = 1.0;

      // stabilkan shadow casting: gunakan backface untuk shadow map
      m.shadowSide = THREE.BackSide;

      // bila ada material transparan, ubah ke cutout agar depth stabil
      if (m.transparent) {
        m.transparent = false;
        m.alphaTest   = Math.max(m.alphaTest ?? 0, 0.5); // 0.3–0.6 sesuai tekstur
        m.depthWrite  = true;
        m.depthTest   = true;
      }

      // (opsional) kalau curiga peta metal/rough bikin noise:
      // m.roughnessMap = null;
      // m.metalnessMap = null;

      m.needsUpdate = true;
    });
  }
});



    target.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(target);
    const center = new THREE.Vector3();
    box.getCenter(center);

    root.current.position.set(
      -center.x + baseOffset[0],
      -center.y + baseOffset[1],
      -center.z + baseOffset[2]
    );
  }, [cloned, baseOffset]);

  // auto-fit tinggi + groundY
  useEffect(() => {
    const target = modelRef.current || cloned;
    if (!target) return;

    target.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(target);
    const sizeVec = new THREE.Vector3();
    box.getSize(sizeVec);

    const worldH =
      2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.length();
    const targetH = worldH * fitHeightRatio;
    const fitted  = (targetH / Math.max(sizeVec.y, 1e-6)) * scaleMultiplier;
    setScale(fitted);

    const groundY = -0.5 * sizeVec.y * fitted;
    onGroundY?.(groundY);
  }, [cloned, camera.fov, camera.position, size.width, size.height, fitHeightRatio, scaleMultiplier, onGroundY]);

  // current action
  const currentNameRef = useRef(null);

  // play awal
  useEffect(() => {
    if (!animations?.length) return;
    const startName = nameMap.get(initialClip.toLowerCase()) ?? names[0];
    const action = actions[startName];
    if (!action) return;
    currentNameRef.current = startName;
    mixer.timeScale = 1;
    action.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.2).play();
    return () => action.fadeOut(0.1);
  }, [animations, actions, names, mixer, initialClip, nameMap]);

  // click → random clip + crossfade + retrigger FX + suppress trail
  const handlePointerDown = () => {
    window.dispatchEvent(new Event("trail:suppress:on"));
    setTimeout(() => window.dispatchEvent(new Event("trail:suppress:off")), 220);

    if (!animations?.length) return;

    const candidates = ALLOWED_CLIPS.map((n) => nameMap.get(n)).filter(Boolean);
    if (!candidates.length) return;

    let next = candidates[Math.floor(Math.random() * candidates.length)];
    if (next === currentNameRef.current && candidates.length > 1) {
      do { next = candidates[Math.floor(Math.random() * candidates.length)]; }
      while (next === currentNameRef.current);
    }

    const nextAction = actions[next];
    const currAction = currentNameRef.current ? actions[currentNameRef.current] : null;
    if (!nextAction) return;

    mixer.timeScale = 1;
    nextAction.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.25).play();
    if (currAction) currAction.fadeOut(0.25);

    currentNameRef.current = next;
    onSwitchedClip?.(next);
  };

  return (
    <group
      ref={root}
      scale={scale}
      onPointerDown={handlePointerDown}
      onPointerOver={() => window.dispatchEvent(new Event("trail:suppress:on"))}
      onPointerOut={() => window.dispatchEvent(new Event("trail:suppress:off"))}
      onPointerLeave={() => window.dispatchEvent(new Event("trail:suppress:off"))}
    >
      <primitive ref={modelRef} object={cloned} />
    </group>
  );
}
useGLTF.preload("/models/model.glb");

/* ====== MAIN CANVAS ====== */
export default function Canvas3D() {
  // mouse -1..1 (X), +1..-1 (Y)
  const mouse = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * -2;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const [fxTrigger, setFxTrigger] = useState(0); // mount & on clip switch
  const [groundY, setGroundY] = useState(-0.5);

  return (
    <Canvas
      className="w-full h-full"
      frameloop="always"
      camera={{ position: CAMERA_POS, fov: CAMERA_FOV }}
      dpr={[1, 2]}
      style={{ touchAction: "none" }}
      gl={{ antialias: false, powerPreference: "high-performance" }}  // cegah smoothing/bleed
      shadows={{ type: THREE.BasicShadowMap }}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.BasicShadowMap;
        gl.toneMapping = THREE.NoToneMapping;   // no glow dari tone mapping
        gl.toneMappingExposure = 1;
      }}
    >
      {/* lighting untuk shadow tegas */}
      <ambientLight intensity={1} />
      <directionalLight
        position={[2, 10, 6]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={SHADOW_MAP_SIZE}
        shadow-mapSize-height={SHADOW_MAP_SIZE}
        shadow-camera-near={0.1}
        shadow-camera-far={24}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-1}
        shadow-bias={-0.0002}
        shadow-normalBias={0.25}  
      />

      <Suspense fallback={null}>
        {/* Pixelation + CA/Noise aman (tanpa glow) */}
        <RevealFX trigger={fxTrigger} />

        {/* Model + follow mouse */}
        <FollowRig mouse={mouse.current}>
          <CenteredAnimatedModel
            url="/models/model.glb"
            initialClip="Walk"
            onSwitchedClip={() => setFxTrigger((t) => t + 1)}
            onGroundY={setGroundY}
          />
        </FollowRig>

        {/* Plane penerima bayangan */}
        <mesh
          receiveShadow
          rotation-x={-Math.PI / 2}
          position={[0, groundY + 0.001, 0]}
        >
          <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
          <shadowMaterial transparent opacity={SHADOW_OPACITY} color="#000000" />
        </mesh>

        {/* <Environment preset="studio" /> */}
      </Suspense>
    </Canvas>
  );
}
