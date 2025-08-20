// src/components/CRTRetroOverlay.jsx
"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Overlay CRT/Glitch simulasi di atas DOM (fullscreen, pointer-events:none).
 *
 * Props:
 * - opacity: number 0..1        (default 0.28)
 * - noise: number 0..1          (default 0.35)   // noise statis
 * - scanline: number            (default 10)     // intensitas scanline (punyamu)
 * - bleed: number 0..1          (default 0.2)    // bleed halus global
 * - glitch: number 0..1         (default 0.15)   // probabilitas/intensitas glitch stripes (dasar)
 * - rgbSplit: number 0..2       (default 0.8)    // intensitas warna RGB pada dua garis glitch
 * - glitchSpeed: number 0..2    (default 0.2)    // kecepatan dua garis glitch
 * - glitchThickness: number 0..0.2 (default 0.03)// ketebalan dua garis glitch (fraksi tinggi)
 * - blendMode: CSS mix-blend-mode (default "overlay")
 * - zIndex: number|string       (default 9999)
 */
export default function CRTRetroOverlay({
  opacity = 0.28,
  noise = 0.35,
  scanline = 10,
  bleed = 0.2,
  glitch = 0.15,
  rgbSplit = 0.8,
  glitchSpeed = 0.2,
  glitchThickness = 0.03,
  blendMode = "overlay",
  zIndex = 9999,
}) {
  const mountRef = useRef(null);
  const rafRef = useRef(0);

  if (typeof window === "undefined") return null;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    Object.assign(renderer.domElement.style, {
      position: "fixed",
      inset: "0",
      zIndex: String(zIndex),
      pointerEvents: "none",
      mixBlendMode: blendMode,
    });
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geo = new THREE.PlaneGeometry(2, 2);

    const uniforms = {
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_opacity: { value: opacity },
      u_noise: { value: noise },
      u_scan: { value: scanline },
      u_bleed: { value: bleed },
      u_glitch: { value: glitch },

      // NEW knobs
      u_rgbSplit: { value: rgbSplit },
      u_gSpeed: { value: glitchSpeed },
      u_gThick: { value: glitchThickness },

      // prefers-reduced-motion scaler
      u_prm: {
        value: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0.3 : 1.0,
      },
    };

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        varying vec2 vUv;

        uniform vec2  u_resolution;
        uniform float u_time;
        uniform float u_opacity;
        uniform float u_noise;
        uniform float u_scan;
        uniform float u_bleed;
        uniform float u_glitch;

        // NEW
        uniform float u_rgbSplit;
        uniform float u_gSpeed;
        uniform float u_gThick;

        uniform float u_prm;

        // --- noise utils ---
        float hash(vec2 p) {
          float h = dot(p, vec2(127.1, 311.7));
          return -1.0 + 2.0 * fract(sin(h) * 43758.5453123);
        }
        float noise2d(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f*f*(3.0 - 2.0*f);
          float a = hash(i + vec2(0.0,0.0));
          float b = hash(i + vec2(1.0,0.0));
          float c = hash(i + vec2(0.0,1.0));
          float d = hash(i + vec2(1.0,1.0));
          return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
        }

        void main() {
          vec2 uv = vUv;

          // ---------- SCANLINES ----------
          float rows = u_resolution.y;
          float scan = sin((uv.y * rows) * 3.14159) * 0.5 + 0.5;
          float scanMove = sin((uv.y * rows + u_time * 2.0) * 3.14159);
          float scanline = mix(0.85, 1.0, scan) * (1.0 - u_scan * 0.5) + scanMove * 0.015 * u_scan;

          // ---------- NOISE ----------
          float t = u_time * 60.0;
          float n = noise2d(uv * (vec2(u_resolution.x, u_resolution.y) / 2.0) + vec2(t*0.002, t*0.001));
          float staticNoise = mix(0.0, n * 0.65 + 0.35, u_noise);

          // ---------- ROLL BAR ----------
          float bar = smoothstep(0.0, 0.02, fract(uv.y + u_time * 0.15)) *
                      smoothstep(0.05, 0.03, fract(uv.y + u_time * 0.15));
          float roll = bar * 0.8;

          // ---------- BASE GLITCH STRIPES (random) ----------
          float lineId = floor(uv.y * rows * 0.5);
          float rnd = fract(sin(lineId * 114.514 + floor(u_time*20.0)) * 93758.5453);
          float glitchBand = step(1.0 - u_glitch * 0.6 * u_prm, rnd);
          float glitch = glitchBand * (0.25 + 0.75 * fract(sin(lineId*13.13 + u_time*10.0)));

          // ---------- CHROMATIC BLEED GLOBAL ----------
          float r = 0.95 + 0.05 * sin(uv.y * rows * 0.5 + u_time * 1.7);
          float g = 1.0;
          float b = 0.95 + 0.05 * cos(uv.y * rows * 0.5 - u_time * 1.3);
          vec3 bleedCol = mix(vec3(1.0), vec3(r, g, b), u_bleed * 0.6);

          // ---------- DUA GARIS GLITCH BERWARNA (RGB SPLIT) ----------
          // posisi 2 garis (0..1), bergerak vertikal
          float speed = max(0.001, u_gSpeed) * u_prm;
          float p1 = fract(u_time * speed + 0.17);
          float p2 = fract(u_time * speed * 0.83 + 0.61);

          float d1 = abs(uv.y - p1);
          float d2 = abs(uv.y - p2);

          float thick = clamp(u_gThick, 0.0, 0.2);
          float band1 = smoothstep(thick, 0.0, d1);
          float band2 = smoothstep(thick, 0.0, d2);

          // flicker ringan pada band
          float f1 = 0.75 + 0.25 * sin(u_time * 20.0 + uv.x * 10.0);
          float f2 = 0.75 + 0.25 * cos(u_time * 18.0 + uv.x * 12.0);

          // warna: merah & cyan, diperkuat oleh rgbSplit
          vec3 chroma1 = vec3(1.0, 0.1, 0.1) * band1 * f1 * u_rgbSplit;
          vec3 chroma2 = vec3(0.1, 1.0, 1.0) * band2 * f2 * u_rgbSplit;

          // ---------- VIGNETTE ----------
          vec2 dc = uv - 0.5;
          float vign = smoothstep(0.9, 0.2, dot(dc, dc) * 2.0);

          // luminance dasar (noise + scanline + roll + glitch random)
          float lum = 0.25 * staticNoise + scanline * 0.35 + roll * 0.5 + glitch * 0.8;
          lum *= vign;

          // gabungan akhir
          vec3 col = bleedCol * lum;
          col += chroma1 + chroma2;

          float alpha = u_opacity * (0.9 + 0.1 * sin(u_time * 0.4));
          alpha *= 0.95 + 0.05 * staticNoise;

          gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
        }
      `,
    });

    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    // RAF
    const start = performance.now();
    const loop = () => {
      const now = performance.now();
      const tsec = (now - start) / 1000;
      mat.uniforms.u_time.value = tsec;
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(loop);
    };
    loop();

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h);
      mat.uniforms.u_resolution.value.set(w, h);
    };
    window.addEventListener("resize", onResize);

    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onPRM = () => {
      mat.uniforms.u_prm.value = mql.matches ? 0.3 : 1.0;
    };
    mql.addEventListener?.("change", onPRM);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      mql.removeEventListener?.("change", onPRM);
      scene.clear();
      mesh.geometry.dispose();
      mesh.material.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [
    opacity,
    noise,
    scanline,
    bleed,
    glitch,
    rgbSplit,
    glitchSpeed,
    glitchThickness,
    blendMode,
    zIndex,
  ]);

  return <div ref={mountRef} />;
}
