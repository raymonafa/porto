// src/components/Canvas3D.js
"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Pixelation, ChromaticAberration, Noise } from "@react-three/postprocessing";
import * as THREE from "three";
import { gsap } from "gsap";
import VoxelFromGLB from "@/components/VoxelFromGLB";
import { useGLTF } from "@react-three/drei";

/* ================== KNOBS ================== */
/** CAMERA */
const CAMERA_POS = [0, 0, 3];
const CAMERA_ROT = deg([0, 0, 0]);
const CAMERA_FOV = 45;

/** OBJECT */
const OBJ_POS   = [0, 0.1, 0];
const OBJ_ROT   = deg([3, -164, 0]);
const OBJ_SCALE = 1.0;

/** Mouse-tilt + GSAP intro */
const MAX_TILT_X = 0.15;
const MAX_TILT_Y = 0.35;
const INTRO_SPIN = 0;
const INTRO_TIME = 4;

/** Shadows & Floor (pixelated look) */
const SHADOW_MAP_SIZE = 128;
const SHADOW_OPACITY  = 0.18;
const FLOOR_SIZE      = 12;
const FLOAT_GAP       = 0.18;

/** REVEAL PER-VOXEL — hanya first render (dibuat lebih halus) */
const REVEAL_DURATION = 0.9;
const REVEAL_STAGGER  = 0.003;
const REVEAL_ORDER    = "random";
// // alternatif siap pakai (tinggal ganti di atas):
// const REVEAL_ORDER = "center-out";
// const REVEAL_ORDER = "top-down";
// const REVEAL_ORDER = "random";

/** FLOATING (selalu aktif) */
const FLOAT_ENABLED     =  true;
const FLOAT_AMP         = 0.08;
const FLOAT_SPEED       = 1.25;
const FLOAT_RAMP_TIME   = 0.5;
const FLOAT_SMOOTH_LERP = 0.18;

/** SWITCH MODEL + GLITCH FX */
const MODELS = ["/models/3D.glb", "/models/3D-2.glb"];
const SWITCH_GLITCH_TIME = 0.6;   // up + down
const SWITCH_GLITCH_EASE = "none"; // tanpa power4

/** INITIAL GLITCH on first render (tanpa power) */
const INITIAL_GLITCH_TIME = 0.8;  // fade-out
const INITIAL_GLITCH_EASE = "none";
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

/* Glitch FX: selalu mounted; param di-update per frame dari ref GSAP (p: 0..1) */
function SwitchGlitchFX({ progressRef }) {
  const pixelRef = useRef(null);
  const chromaOffset = useMemo(() => new THREE.Vector2(0, 0), []);

  useFrame(() => {
    const p = Math.max(0, Math.min(1, progressRef.current?.p ?? 0));
    if (pixelRef.current) {
      pixelRef.current.granularity = THREE.MathUtils.lerp(1, 24, p);
    }
    const ca = THREE.MathUtils.lerp(0.0001, 0.0015, p);
    chromaOffset.set(ca, ca);
  });

  return (
    <EffectComposer multisampling={0}>
      <Pixelation ref={pixelRef} granularity={24} />
      <ChromaticAberration offset={chromaOffset} radialModulation={false} modulationOffset={0} />
      <Noise premultiply={false} opacity={0.15} />
    </EffectComposer>
  );
}

/* FollowRig: mouse tilt + GSAP intro + floating (selalu jalan) */
function FollowRig({
  children,
  mouse,
  baseRot = [0,0,0],
  position = [0,0,0],
  scale = 1,
  floatEnabled = false,
  floatAmp = 0.03,
  floatSpeed = 1.0,
  introKey // restart INTRO_SPIN saat ganti model
}) {
  const rig = useRef();

  // Intro spin state (1 -> 0)
  const intro = useRef({ v: 1 });
  const introTweenRef = useRef(null);

  // Floating gain 0->1
  const floatState = useRef({ g: 0 });
  const floatTweenRef = useRef(null);

  const baseY = position[1];
  const phase = useRef(Math.random() * Math.PI * 2);
  const targetY = useRef(baseY);

  // GSAP intro: restart tiap introKey berubah (ganti model)
  useEffect(() => {
    introTweenRef.current?.kill();
    intro.current.v = 1;
    introTweenRef.current = gsap.to(intro.current, {
      v: 0,
      duration: INTRO_TIME,
      ease: "power4.inOut"
    });
    return () => introTweenRef.current?.kill();
  }, [introKey]);

  // Floating ramp (sekali saat mount)
  useEffect(() => {
    floatTweenRef.current?.kill();
    floatState.current.g = 0;
    floatTweenRef.current = gsap.to(floatState.current, {
      g: 1,
      duration: FLOAT_RAMP_TIME,
      ease: "power4.inOut"
    });
    return () => floatTweenRef.current?.kill();
  }, []);

  useFrame((state) => {
    const g = rig.current;
    if (!g) return;

    const spin = INTRO_SPIN * intro.current.v;

    // mouse tilt
    const tx = baseRot[0] + (mouse?.y || 0) * MAX_TILT_X;
    const ty = baseRot[1] + (mouse?.x || 0) * MAX_TILT_Y + spin;

    g.rotation.x += (tx - g.rotation.x) * 0.08;
    g.rotation.y += (ty - g.rotation.y) * 0.08;
    g.rotation.z  = baseRot[2];

    // floating
    if (floatEnabled) {
      const t = state.clock.getElapsedTime();
      const off = Math.sin(t * floatSpeed + phase.current) * floatAmp * floatState.current.g;
      targetY.current = baseY + off;
    } else {
      targetY.current = baseY;
    }

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

  // Preload kedua model biar mulus saat switch
  useEffect(() => {
    try {
      useGLTF.preload(MODELS[0]);
      useGLTF.preload(MODELS[1]);
    } catch {}
  }, []);

  const [groundY, setGroundY] = useState(-0.5);
  const floorY = groundY - FLOAT_GAP;

  // Model pertama: random 0/1
  const [modelIndex, setModelIndex] = useState(() => (Math.random() < 0.5 ? 0 : 1));
  const currentURL = MODELS[modelIndex];

  // Reveal hanya untuk render pertama
  const [firstRevealDone, setFirstRevealDone] = useState(false);

  // MouseTrail integration
  const handleHoverOn = () => { try { window.dispatchEvent(new Event("trail:suppress:on")); } catch {} };
  const handleHoverOff = () => { try { window.dispatchEvent(new Event("trail:suppress:off")); } catch {} };

  // Glitch progress (0..1) dibaca oleh SwitchGlitchFX
  // NOTE: start = 1 supaya compositor aktif sejak frame pertama
  const glitch = useRef({ p: 1 });
  const glitchTL = useRef(null);
  const switchingRef = useRef(false);

  // INITIAL GLITCH: aktif dari awal render lalu fade out (linear)
  useEffect(() => {
    glitchTL.current?.kill();
    glitchTL.current = gsap.to(glitch.current, {
      p: 0,
      duration: INITIAL_GLITCH_TIME,
      ease: INITIAL_GLITCH_EASE
    });
    return () => glitchTL.current?.kill();
  }, []);

  // Switch model on click (glitch naik → ganti → turun) — linear
  const switchModel = () => {
    if (switchingRef.current) return;
    switchingRef.current = true;
    const nextIndex = (modelIndex + 1) % MODELS.length;

    glitchTL.current?.kill();
    glitchTL.current = gsap.timeline({
      onComplete: () => { switchingRef.current = false; }
    })
      .to(glitch.current, { p: 1, duration: SWITCH_GLITCH_TIME * 0.5, ease: SWITCH_GLITCH_EASE }, 0)
      .add(() => {
        setModelIndex(nextIndex);
        setFirstRevealDone(true); // switch selanjutnya tanpa reveal
      }, ">")
      .to(glitch.current, { p: 0, duration: SWITCH_GLITCH_TIME * 0.5, ease: SWITCH_GLITCH_EASE }, ">");
  };

  // Prop reveal utk VoxelFromGLB — hanya saat first render
  const revealProps = firstRevealDone
    ? { revealDuration: 0, revealStagger: 0, revealOrder: REVEAL_ORDER }
    : { revealDuration: REVEAL_DURATION, revealStagger: REVEAL_STAGGER, revealOrder: REVEAL_ORDER };

  return (
    <Canvas
      className="w-full h-full"
      frameloop="always"
      camera={{ position: CAMERA_POS, fov: CAMERA_FOV }}
      dpr={1}
      style={{ touchAction: "none" }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      shadows
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.BasicShadowMap;
        gl.toneMapping = THREE.NoToneMapping;
        gl.toneMappingExposure = 1;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      <CameraKnobs pos={CAMERA_POS} rot={CAMERA_ROT} />

      {/* Lighting */}
      <ambientLight intensity={1} />
      <directionalLight
        position={[2, 8, 6]}
        intensity={2}
        castShadow
        shadow-mapSize-width={SHADOW_MAP_SIZE}
        shadow-mapSize-height={SHADOW_MAP_SIZE}
        shadow-camera-near={2.5}
        shadow-camera-far={24}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-1}
        shadow-bias={0.00015}
        shadow-normalBias={0.35}
      />

      <Suspense fallback={null}>
        <FollowRig
          mouse={mouse.current}
          baseRot={OBJ_ROT}
          position={OBJ_POS}
          scale={OBJ_SCALE}
          floatEnabled={FLOAT_ENABLED}
          floatAmp={FLOAT_AMP}
          floatSpeed={FLOAT_SPEED}
          introKey={currentURL}
        >
          <VoxelFromGLB
            url={currentURL}
            shrink={1}
            useGLBColors
            hoverRadius={0.2}
            repel={4}
            spring={6}
            damping={4}
            {...revealProps}
            onBounds={({ minY }) => setGroundY(minY + OBJ_POS[1])}
            onRevealDone={() => setFirstRevealDone(true)} // tandai selesai reveal pertama
            onPointerOver={handleHoverOn}
            onPointerOut={handleHoverOff}
            onClick={switchModel} // klik = glitch + switch (tanpa reveal)
          />
        </FollowRig>

        {/* Floor */}
        <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, floorY, 0]}>
          <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
          <shadowMaterial transparent opacity={SHADOW_OPACITY} color="#000" />
        </mesh>
      </Suspense>

      {/* Glitch FX: initial & switch (selalu mounted) */}
      <SwitchGlitchFX progressRef={glitch} />
    </Canvas>
  );
}
