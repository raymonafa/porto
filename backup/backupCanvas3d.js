"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Pixelation, ChromaticAberration, Noise } from "@react-three/postprocessing";
import * as THREE from "three";
import VoxelFromGLB from "@/components/VoxelFromGLB";

/* ================== KNOBS ================== */
const CAMERA_POS = [0, 1.2, 3];
const CAMERA_FOV = 45;

const BASE_ROT = deg([0, 180, 0]);
const MAX_TILT_X = 0.15;
const MAX_TILT_Y = 0.30;

const REVEAL_DURATION = 0.7;
const START_PIXELS = 24;
const END_PIXELS = 1;
const PIXEL_STEPS = 4;

const CA_START = 0.0015;
const CA_END = 0.0001;
const NOISE_OPACITY = 0.15;

const SHADOW_MAP_SIZE = 256;
const SHADOW_OPACITY = 0.18;
const FLOOR_SIZE = 12;
/* ============================================== */

function deg([x, y, z]) {
  return [x, y, z].map((v) => THREE.MathUtils.degToRad(v));
}

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

    if (u >= 1) setEnabled(false);
  });

  if (!enabled) return null;
  return (
    <EffectComposer multisampling={0}>
      <Pixelation ref={pixelRef} granularity={START_PIXELS} />
      <ChromaticAberration offset={chromaOffset} radialModulation={false} modulationOffset={0} />
      <Noise premultiply={false} opacity={NOISE_OPACITY} />
    </EffectComposer>
  );
}

function FollowRig({ children, mouse }) {
  const rig = useRef();
  useFrame(() => {
    const g = rig.current;
    if (!g) return;
    const tx = BASE_ROT[0] + (mouse?.y || 0) * MAX_TILT_X;
    const ty = BASE_ROT[1] + (mouse?.x || 0) * MAX_TILT_Y;
    g.rotation.x += (tx - g.rotation.x) * 0.08;
    g.rotation.y += (ty - g.rotation.y) * 0.08;
    g.rotation.z  = BASE_ROT[2];
  });
  return <group ref={rig}>{children}</group>;
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

  return (
    <Canvas
      className="w-full h-full"
      frameloop="always"
      camera={{ position: CAMERA_POS, fov: CAMERA_FOV }}
      dpr={[1, 2]}
      style={{ touchAction: "none" }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      shadows={{ type: THREE.BasicShadowMap }}
      onCreated={({ gl }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.BasicShadowMap;
        gl.toneMapping = THREE.NoToneMapping;
        gl.toneMappingExposure = 1;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      {/* Cahaya cukup biar tidak gelap */}
      <ambientLight intensity={0.8} />
      <hemisphereLight intensity={0.6} groundColor="#808080" />
      <directionalLight
        position={[2, 10, 6]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={SHADOW_MAP_SIZE}
        shadow-mapSize-height={SHADOW_MAP_SIZE}
        shadow-camera-near={0.1}
        shadow-camera-far={24}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-1}
        shadow-bias={0.0002}
        shadow-normalBias={0.25}
      />

      <Suspense fallback={null}>
        <RevealFX trigger={fxTrigger} />
        <FollowRig mouse={mouse.current}>
          <VoxelFromGLB
            url="/models/3D.glb"
            shrink={1.0}                // 1 = ukuran persis GLB; 0.94 beri celah
            useGLBColors                // ambil warna dari material/tekstur GLB
            hoverRadius={0.6}
            repel={7}
            spring={12}
            damping={5.2}
            position={[0, 0.2, 0]}
            onBounds={({ minY }) => setGroundY(minY)}
          />
        </FollowRig>

        {/* Floor */}
        <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, groundY + 0.001, 0]}>
          <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
          <shadowMaterial transparent opacity={SHADOW_OPACITY} color="#000" />
        </mesh>
      </Suspense>
    </Canvas>
  );
}
