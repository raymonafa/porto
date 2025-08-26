// src/components/Canvas3D.js
"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
// Disimpan untuk nanti (sekarang dimatikan)
import { EffectComposer, Pixelation, ChromaticAberration, Noise } from "@react-three/postprocessing";
import * as THREE from "three";
import { gsap } from "gsap";
import VoxelFromGLB from "@/components/VoxelFromGLB";

/* ================== KNOBS ================== */
/** CAMERA */
const CAMERA_POS = [0, 0, 3];              // [x, y, z]
const CAMERA_ROT = deg([0, 0, 0]);         // [degX, degY, degZ]
const CAMERA_FOV = 45;

/** OBJECT */
const OBJ_POS   = [0, 0.1, 0];             // [x, y, z]
const OBJ_ROT   = deg([0, 162, 0]);        // [degX, degY, degZ]
const OBJ_SCALE = 1.0;                     // number atau [x, y, z]

/** Mouse-tilt + GSAP intro (spin berkurang dengan power4.inOut) */
const MAX_TILT_X = 0.15;
const MAX_TILT_Y = 0.30;
const INTRO_SPIN = 3;                      // rad ekstra di awal
const INTRO_TIME = 1.5;                      // detik

/** Glitch FX (awal saja) — DINONAKTIFKAN untuk sekarang */
const ENABLE_GLITCH = false;
const GLITCH_DURATION = 0.25;
const START_PIXELS = 24;
const END_PIXELS = 1;
const PIXEL_STEPS = 4;
const CA_START = 0.0015;
const CA_END = 0.0001;
const NOISE_OPACITY = 0.15;

/** Shadows & Floor (kecil → pixelated) */
const SHADOW_MAP_SIZE = 128;               // 64/32 = lebih kotak
const SHADOW_OPACITY  = 0.18;
const FLOOR_SIZE      = 12;
const FLOAT_GAP       = 0.18;

/** REVEAL PER-VOXEL (di-handle di VoxelFromGLB) */
const REVEAL_DURATION = 0.45;
const REVEAL_STAGGER  = 0.006;
const REVEAL_ORDER    = "bottom-up";          // "random" | "center-out" | "top-down" | "bottom-up"

/** FLOATING: SELALU AKTIF (tanpa syarat intro/reveal) */
const FLOAT_ENABLED    = true;
const FLOAT_AMP        = 0.03;             // world units; naikin kalau mau lebih “goyang”
const FLOAT_SPEED      = 1.25;             // kecepatan
const FLOAT_RAMP_TIME  = 0.5;              // ramp masuk biar halus
const FLOAT_SMOOTH_LERP= 0.18;             // smoothing lerp posisi Y
/* ============================================== */

function deg([x, y, z]) {
  return [x, y, z].map((v) => THREE.MathUtils.degToRad(v));
}

/* Camera knobs applier */
function CameraKnobs({ pos = [0,0,3], rot = [0,0,0] }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.rotation.set(rot[0], rot[1], rot[2]);
    camera.updateProjectionMatrix();
  }, [camera, pos, rot]);
  return null;
}

/* Glitch FX (pixelation + CA + noise) — DISABLED by ENABLE_GLITCH */
function GlitchFX({ trigger = 0 }) {
  const pixelRef = useRef(null);
  const chromaOffset = useMemo(() => new THREE.Vector2(CA_START, CA_START), []);
  const startRef = useRef(0);
  const doneRef = useRef(false);
  const lastTrigger = useRef(trigger);

  useFrame(() => {
    if (!ENABLE_GLITCH) return;

    if (lastTrigger.current !== trigger) {
      lastTrigger.current = trigger;
      startRef.current = 0;
      doneRef.current = false;
      chromaOffset.set(CA_START, CA_START);
      if (pixelRef.current) pixelRef.current.granularity = START_PIXELS;
    }

    if (doneRef.current) return;

    if (startRef.current === 0) {
      startRef.current = performance.now();
      chromaOffset.set(CA_START, CA_START);
      if (pixelRef.current) pixelRef.current.granularity = START_PIXELS;
    }

    const t = (performance.now() - startRef.current) / 1000;
    const u = Math.min(t / GLITCH_DURATION, 1);

    let g;
    if (PIXEL_STEPS > 1) {
      const stepIndex = Math.floor(u * (PIXEL_STEPS - 1));
      const steppedU = stepIndex / (PIXEL_STEPS - 1);
      g = THREE.MathUtils.lerp(START_PIXELS, END_PIXELS, steppedU);
    } else {
      g = THREE.MathUtils.lerp(START_PIXELS, END_PIXELS, u);
    }
    if (pixelRef.current) pixelRef.current.granularity = g;

    chromaOffset.set(
      THREE.MathUtils.lerp(CA_START, CA_END, u),
      THREE.MathUtils.lerp(CA_START, CA_END, u)
    );

    if (u >= 1) doneRef.current = true;
  });

  if (!ENABLE_GLITCH || doneRef.current) return null;

  return (
    <EffectComposer multisampling={0}>
      <Pixelation ref={pixelRef} granularity={START_PIXELS} />
      <ChromaticAberration offset={chromaOffset} radialModulation={false} modulationOffset={0} />
      <Noise premultiply={false} opacity={NOISE_OPACITY} />
    </EffectComposer>
  );
}

/* FollowRig: mouse tilt + GSAP intro + floating (SELALU jalan) */
function FollowRig({
  children,
  mouse,
  baseRot = [0,0,0],
  position = [0,0,0],
  scale = 1,
  floatEnabled = false,
  floatAmp = 0.03,
  floatSpeed = 1.0,
  // tetap diterima, tapi tidak dipakai lagi untuk gating
  revealDone = false
}) {
  const rig = useRef();

  // Intro spin state (1 -> 0), eased by GSAP power4.inOut
  const intro = useRef({ v: 1 });
  const introTweenRef = useRef(null);

  // Floating gain 0->1 untuk transisi halus (SELALU dimulai pada mount)
  const floatState = useRef({ g: 0 });
  const floatTweenRef = useRef(null);

  const baseY = position[1];
  const phase = useRef(Math.random() * Math.PI * 2); // beda fase tiap mount
  const targetY = useRef(baseY);

  // GSAP intro (sekali)
  useEffect(() => {
    introTweenRef.current?.kill();
    intro.current.v = 1;
    introTweenRef.current = gsap.to(intro.current, {
      v: 0,
      duration: INTRO_TIME,
      ease: "power2.inOut"
    });

    // Mulai floating LANGSUNG setelah mount (tanpa syarat)
    floatTweenRef.current?.kill();
    floatState.current.g = 0;
    floatTweenRef.current = gsap.to(floatState.current, {
      g: 1,
      duration: FLOAT_RAMP_TIME,
      ease: "power2.out"
    });

    return () => {
      introTweenRef.current?.kill();
      floatTweenRef.current?.kill();
    };
  }, []);

  useFrame((state) => {
    const g = rig.current;
    if (!g) return;

    // micro intro spin (reduce over time dengan GSAP)
    const spin = INTRO_SPIN * intro.current.v;

    // mouse tilt
    const tx = baseRot[0] + (mouse?.y || 0) * MAX_TILT_X;
    const ty = baseRot[1] + (mouse?.x || 0) * MAX_TILT_Y + spin;

    g.rotation.x += (tx - g.rotation.x) * 0.08;
    g.rotation.y += (ty - g.rotation.y) * 0.08;
    g.rotation.z  = baseRot[2];

    // floating: SELALU aktif (jika di-enable), dengan gain ramp
    if (floatEnabled) {
      const t = state.clock.getElapsedTime();
      const off = Math.sin(t * floatSpeed + phase.current) * floatAmp * floatState.current.g;
      targetY.current = baseY + off;
    } else {
      targetY.current = baseY;
    }

    // Smoothing biar gerak terlihat jelas & tidak “patah”
    g.position.y = THREE.MathUtils.lerp(g.position.y, targetY.current, FLOAT_SMOOTH_LERP);
    g.position.x = position[0];
    g.position.z = position[2];
  });

  return (
    <group ref={rig} position={position} scale={scale}>
      {children}
    </group>
  );
}

/* ====== MAIN CANVAS ====== */
export default function Canvas3D() {
  const mouse = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * -2;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const [fxTrigger] = useState(0);
  const [groundY, setGroundY] = useState(-0.5);
  const floorY = groundY - FLOAT_GAP; // floating + shadow tegas

  // MouseTrail integration (cocok dengan MouseTrail.jsx)
  const handleHoverOn = () => {
    try { window.dispatchEvent(new Event("trail:suppress:on")); } catch {}
  };
  const handleHoverOff = () => {
    try { window.dispatchEvent(new Event("trail:suppress:off")); } catch {}
  };

  return (
    <Canvas
      className="w-full h-full"
      frameloop="always"
      camera={{ position: CAMERA_POS, fov: CAMERA_FOV }}
      dpr={1}                                         // DPR 1 → bayangan makin “kotak”
      style={{ touchAction: "none" }}
      gl={{ antialias: false, powerPreference: "high-performance" }} // no AA → tegas
      shadows
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.BasicShadowMap;     // hard/aliased shadow
        gl.toneMapping = THREE.NoToneMapping;
        gl.toneMappingExposure = 1;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      {/* Terapkan knobs camera (pos & rot) */}
      <CameraKnobs pos={CAMERA_POS} rot={CAMERA_ROT} />

      {/* Lighting: ambient minim + 1 directional tajam */}
      <ambientLight intensity={1} />
      <directionalLight
        position={[2, 8, 6]}
        intensity={2}
        castShadow
        shadow-mapSize-width={SHADOW_MAP_SIZE}        // kecilkan → lebih pixelated
        shadow-mapSize-height={SHADOW_MAP_SIZE}
        shadow-camera-near={2.5}
        shadow-camera-far={24}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-1}
        shadow-bias={0.00015}                         // tweak anti-acne
        shadow-normalBias={0.35}
      />

      {/* Konten 3D */}
      <Suspense fallback={null}>
        <FollowRig
          mouse={mouse.current}
          baseRot={OBJ_ROT}
          position={OBJ_POS}
          scale={OBJ_SCALE}
          floatEnabled={FLOAT_ENABLED}
          floatAmp={FLOAT_AMP}
          floatSpeed={FLOAT_SPEED}
          // revealDone tidak dipakai untuk gating lagi
          revealDone={true}
        >
          <VoxelFromGLB
            url="/models/3D.glb"
            shrink={0.99}
            useGLBColors
            hoverRadius={0.3}
            repel={8}
            spring={12}
            damping={4}
            // REVEAL PER-VOXEL (tetap jalan di komponen ini)
            revealDuration={REVEAL_DURATION}
            revealStagger={REVEAL_STAGGER}
            revealOrder={REVEAL_ORDER}
            // info ground
            onBounds={({ minY }) => setGroundY(minY + OBJ_POS[1])}
            // MouseTrail interop
            onPointerOver={handleHoverOn}
            onPointerOut={handleHoverOff}
          />
        </FollowRig>

        {/* Floor sedikit di bawah objek → floating, shadow tegas */}
        <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, floorY, 0]}>
          <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
          <shadowMaterial transparent opacity={SHADOW_OPACITY} color="#000" />
        </mesh>
      </Suspense>

      {/* Glitch FX awal — dimatikan untuk sekarang */}
      <GlitchFX trigger={fxTrigger} />
    </Canvas>
  );
}
