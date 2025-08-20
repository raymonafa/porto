// src/components/R3FWorksStage.jsx
"use client";

import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useThree, useFrame, useLoader } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { Effect } from "postprocessing";

/* ===== GRID & MOTION KNOBS ===== */
const CELL_W = 2.6;
const CELL_H = 2.6;
const GAP    = 0.05;

// Kamera TETAP (viewport stabil)
const Z_BASE     = 10;

// Feel gerak (lebih lambat & buttery)
const DAMPING    = 0.965;   // inersia tinggi = halus
const FOLLOW     = 0.12;    // follow smoothing
const DRAG_GAIN  = 0.75;    // sensitivitas drag
const WHEEL_GAIN = 0.16;    // sensitivitas scroll
const MAX_V      = 8;       // normalisasi speed

// “Zoom” & “Tilt” SEMU (di group, bukan kamera)
const ZOOM_SCALE_MAX = 0.08; // skala turun max 8% saat speed tinggi
const TILT_MAX       = 0.10; // rad
const SCALE_SMOOTH   = 0.08;
const ROT_SMOOTH     = 0.10;

/* ===== PostFX: PINCUSHION (cekung) + RGB split ===== */
const PINCUSHION_K   = -0.16;  // k < 0 = cekung
const PINCUSHION_K2  =  0.04;
const RGB_SPLIT      =  0.0020;
const NOISE          =  0.018;
const VIGNETTE       =  0.20;

/* ---------- Custom Effect: Pincushion + RGB Split ---------- */
class BarrelRGBEffect extends Effect {
  constructor({ k = PINCUSHION_K, k2 = PINCUSHION_K2, rgbSplit = RGB_SPLIT, noise = NOISE, vignette = VIGNETTE }) {
    super("BarrelRGBEffect", /* glsl */`
      uniform float k;
      uniform float k2;
      uniform float rgbSplit;
      uniform float noiseStrength;
      uniform float vignette;

      float nrand(vec2 co){
        return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
      }

      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outColor) {
        vec2 c = uv - 0.5;
        float r2 = dot(c, c);
        float r4 = r2 * r2;

        // k<0 => pincushion (cekung)
        vec2 offset = c * (k * r2 + k2 * r4);
        vec2 dUV = uv + offset;

        // RGB split radial
        vec2 dir = normalize(c + 1e-6);
        vec2 rS = dir * rgbSplit;
        vec2 gS = dir * (rgbSplit * 0.5);
        vec2 bS = dir * (-rgbSplit * 0.8);

        vec3 col;
        col.r = texture2D(inputBuffer, clamp(dUV + rS, 0.0, 1.0)).r;
        col.g = texture2D(inputBuffer, clamp(dUV + gS, 0.0, 1.0)).g;
        col.b = texture2D(inputBuffer, clamp(dUV + bS, 0.0, 1.0)).b;

        // vignette
        float v = 1.0 - smoothstep(0.5, 1.0, r2 * 2.0);
        col *= mix(1.0, v, vignette);

        // noise tipis
        float n = (nrand(uv) - 0.5) * 2.0 * noiseStrength;
        col += n;

        outColor = vec4(col, 1.0);
      }
    `, {
      blendFunction: THREE.NoBlending,
      uniforms: new Map([
        ["k", { value: k }],
        ["k2", { value: k2 }],
        ["rgbSplit", { value: rgbSplit }],
        ["noiseStrength", { value: noise }],
        ["vignette", { value: vignette }],
      ])
    });
  }
}
const PincushionRGB = React.forwardRef((props, ref) => {
  const effect = React.useMemo(() => new BarrelRGBEffect(props), [props]);
  return <primitive ref={ref} object={effect} />;
});

/* ---------- Viewport (world units) ---------- */
function useViewportWH() {
  const { size, camera } = useThree();
  const aspect = Math.max(0.01, size.width / Math.max(1, size.height));
  const dist   = Math.max(0.001, camera.position.z); // grid di z=0
  const vH = 2 * dist * Math.tan((camera.fov * Math.PI / 180) * 0.5);
  const vW = vH * aspect;
  return { vW, vH };
}

/* ---------- Infinite Grid (viewport-stable) ---------- */
function WorksGrid({ items = [] }) {
  const { vW, vH } = useViewportWH();
  const cellW = CELL_W + GAP;
  const cellH = CELL_H + GAP;

  // cukup lebar untuk cover + margin, tidak bergantung pada animasi
  const cols = Math.max(5, Math.ceil(vW / cellW) + 6);
  const rows = Math.max(3, Math.ceil(vH / cellH) + 6);

  // URL tekstur (fallback placeholder jika kosong)
  const urls = useMemo(
    () => (items.length ? items : [{}]).map(it => it?.bg || "/images/placeholder.png"),
    [items]
  );
  const textures = useLoader(THREE.TextureLoader, urls);

  // center di sekitar (0,0)
  const cells = useMemo(() => {
    const out = [];
    const cx0 = Math.floor(cols / 2);
    const cy0 = Math.floor(rows / 2);
    let idx = 0;
    for (let j = -cy0; j < -cy0 + rows; j++) {
      for (let i = -cx0; i < -cx0 + cols; i++) {
        out.push({ x: i * cellW, y: -j * cellH, idx: idx++ });
      }
    }
    return out;
  }, [cols, rows, cellW, cellH]);

  return (
    <group>
      {cells.map(({ x, y, idx }) => {
        const t = textures[idx % textures.length];
        if (t) {
          t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
          t.minFilter = THREE.LinearFilter;
          t.magFilter = THREE.LinearFilter;
          t.anisotropy = 4;
        }
        return (
          <mesh key={idx} position={[x, y, 0]} frustumCulled={false}>
            <planeGeometry args={[CELL_W, CELL_H]} />
            {t
              ? <meshBasicMaterial map={t} toneMapped={false} />
              : <meshBasicMaterial color={"#e7e7e7"} toneMapped={false} />
            }
          </mesh>
        );
      })}
    </group>
  );
}

/* ---------- Rig: drag/scroll + wrap, zoom/tilt di GROUP ---------- */
function Rig({ items }) {
  const stageRef = useRef(); // scale+tilt di sini (bukan kamera)
  const tilesRef = useRef(); // translasi wrap per cell
  const { camera, gl } = useThree();

  // offset/vel
  const off   = useRef({ x: 0, y: 0 });
  const target= useRef({ x: 0, y: 0 });
  const vel   = useRef({ x: 0, y: 0 });
  const drag  = useRef({ down: false, lx: 0, ly: 0, lastT: 0 });

  // view state (smooth)
  const view  = useRef({ scale: 1, rx: 0, ry: 0 });

  const cellW = CELL_W + GAP;
  const cellH = CELL_H + GAP;

  React.useLayoutEffect(() => {
    camera.position.set(0, 0, Z_BASE);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  React.useEffect(() => {
    const el = gl.domElement;

    const onDown = (e) => {
      const p = e.touches ? e.touches[0] : e;
      drag.current.down = true;
      drag.current.lx = p.clientX;
      drag.current.ly = p.clientY;
      drag.current.lastT = performance.now();
      vel.current.x = 0; vel.current.y = 0;
    };

    const onMove = (e) => {
      const p = e.touches ? e.touches[0] : e;
      if (!drag.current.down) return;

      const dx = (p.clientX - drag.current.lx) * DRAG_GAIN;
      const dy = (p.clientY - drag.current.ly) * DRAG_GAIN;

      drag.current.lx = p.clientX; drag.current.ly = p.clientY;

      target.current.x += dx;
      target.current.y -= dy;

      const now = performance.now();
      const dt = Math.max(1, now - drag.current.lastT);
      drag.current.lastT = now;
      const k = 16 / dt;
      vel.current.x = THREE.MathUtils.clamp(dx * k, -MAX_V, MAX_V);
      vel.current.y = THREE.MathUtils.clamp(-dy * k, -MAX_V, MAX_V);

      e.preventDefault?.();
    };

    const onUp = () => { drag.current.down = false; };

    const onWheel = (e) => {
      target.current.x += (e.deltaX || 0) * WHEEL_GAIN;
      target.current.y += (-e.deltaY || 0) * WHEEL_GAIN;
      vel.current.x = THREE.MathUtils.clamp(vel.current.x + (e.deltaX || 0) * 0.25, -MAX_V, MAX_V);
      vel.current.y = THREE.MathUtils.clamp(vel.current.y + (-e.deltaY || 0) * 0.25, -MAX_V, MAX_V);
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("wheel", onWheel, { passive: true });

    el.addEventListener("touchstart", onDown, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);

    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onDown);
      el.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [gl]);

  useFrame(() => {
    // follow + inersia
    target.current.x += vel.current.x;
    target.current.y += vel.current.y;
    vel.current.x *= DAMPING;
    vel.current.y *= DAMPING;

    off.current.x += (target.current.x - off.current.x) * FOLLOW;
    off.current.y += (target.current.y - off.current.y) * FOLLOW;

    // wrap per CELL (viewport stabil → tak ada gap)
    const ox = ((off.current.x % cellW) + cellW) % cellW;
    const oy = ((off.current.y % cellH) + cellH) % cellH;
    if (tilesRef.current) tilesRef.current.position.set(-ox, oy, 0);

    // speed → scale & tilt di stageRef
    const speed = Math.min(1, Math.hypot(vel.current.x, vel.current.y) / MAX_V);
    const tScale = 1 - speed * ZOOM_SCALE_MAX;
    const tRy = (-vel.current.x / MAX_V) * TILT_MAX;
    const tRx = ( vel.current.y / MAX_V) * TILT_MAX;

    view.current.scale += (tScale - view.current.scale) * SCALE_SMOOTH;
    view.current.ry    += (tRy    - view.current.ry)    * ROT_SMOOTH;
    view.current.rx    += (tRx    - view.current.rx)    * ROT_SMOOTH;

    if (stageRef.current) {
      stageRef.current.scale.setScalar(view.current.scale);
      stageRef.current.rotation.set(view.current.rx, view.current.ry, 0);
    }
  });

  return (
    <group ref={stageRef}>
      <group ref={tilesRef}>
        <WorksGrid items={items} />
      </group>
    </group>
  );
}

/* ---------- Canvas entry ---------- */
export default function R3FWorksStage({ items = [] }) {
  return (
    <Canvas
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: 45, near: 0.1, far: 100, position: [0, 0, Z_BASE] }}
      dpr={[1, 2]}
      style={{ position: "absolute", inset: 0, pointerEvents: "auto", zIndex: 10 }} // zIndex rendah → navbar di atas
    >
      <color attach="background" args={["#e7e7e7"]} />
      <Rig items={items} />
      <EffectComposer multisampling={0}>
        <PincushionRGB
          k={PINCUSHION_K}
          k2={PINCUSHION_K2}
          rgbSplit={RGB_SPLIT}
          noise={NOISE}
          vignette={VIGNETTE}
        />
      </EffectComposer>
    </Canvas>
  );
}
