"use client";

import React from "react";
import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";

/**
 * Represent each mesh in a GLB as one oriented cube (center, rotation, size).
 * Colors:
 * - If material has .color -> use it (converted SRGB->linear)
 * - Else if material has .map (baseColorTexture) -> sample average color from the texture via <canvas>
 * - Else use fallbackColor
 */
export default function VoxelFromGLB({
  url = "/models/3D.glb",
  shrink = 1.0,              // 1 = sama persis; <1 beri celah antar kubus
  useGLBColors = false,
  fallbackColor = 0x9fdc8a,
  hoverRadius = 1.1,
  repel = 6.0,
  spring = 10.0,
  damping = 4.5,
  onBounds,
  ...props
}) {
  const { camera } = useThree();
  const group = React.useRef();
  const instRef = React.useRef(null);
  const hoverRef = React.useRef(null);

  const { scene: gltfScene } = useGLTF(url);

  // buffers
  const NRef = React.useRef(0);
  const posRef = React.useRef(null);
  const velRef = React.useRef(null);
  const tgtRef = React.useRef(null);
  const scaleRef = React.useRef(null);
  const quatRef  = React.useRef(null);

  const tmpObj = React.useMemo(() => new THREE.Object3D(), []);
  const raycaster = React.useMemo(() => new THREE.Raycaster(), []);
  const planeLocalZ0 = React.useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);

  React.useEffect(() => {
    if (!gltfScene || !group.current) return;

    gltfScene.updateWorldMatrix(true, true);

    const centers = [];
    const sizes = [];
    const quats = [];
    const colors = [];

    const tmpPos = new THREE.Vector3();
    const tmpQuat = new THREE.Quaternion();
    const tmpScl = new THREE.Vector3();
    const localCenter = new THREE.Vector3();

    const worldBB = new THREE.Box3().makeEmpty();

    gltfScene.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;

      const g = o.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      const bb = g.boundingBox;

      // local center
      localCenter.set(
        (bb.min.x + bb.max.x) * 0.5,
        (bb.min.y + bb.max.y) * 0.5,
        (bb.min.z + bb.max.z) * 0.5
      );

      // world transform
      o.matrixWorld.decompose(tmpPos, tmpQuat, tmpScl);

      // world center
      const wCenter = localCenter.clone().applyMatrix4(o.matrixWorld);
      centers.push(wCenter.clone());
      quats.push(tmpQuat.clone());

      // world size (tanpa rotasi)
      const ldx = (bb.max.x - bb.min.x) * shrink;
      const ldy = (bb.max.y - bb.min.y) * shrink;
      const ldz = (bb.max.z - bb.min.z) * shrink;
      const size = new THREE.Vector3(
        Math.max(ldx * Math.abs(tmpScl.x), 1e-6),
        Math.max(ldy * Math.abs(tmpScl.y), 1e-6),
        Math.max(ldz * Math.abs(tmpScl.z), 1e-6)
      );
      sizes.push(size);

      // warna material (color atau sample dari texture)
      let col = null;
      if (useGLBColors) {
        const mat = Array.isArray(o.material) ? o.material[0] : o.material;
        if (mat) {
          if (mat.color) {
            col = mat.color.clone();
          } else if (mat.map && mat.map.image) {
            col = sampleTextureAverage(mat.map.image); // THREE.Color
          }
        }
      }
      colors.push(col); // boleh null -> fallback nanti

      // approx bounds
      const half = size.clone().multiplyScalar(0.5);
      worldBB.expandByPoint(wCenter.clone().sub(half));
      worldBB.expandByPoint(wCenter.clone().add(half));
    });

    const count = centers.length;
    if (!count) return;

    // centerkan objek global
    const globalCenter = worldBB.getCenter(new THREE.Vector3());
    const minY = worldBB.min.y - globalCenter.y;
    const maxY = worldBB.max.y - globalCenter.y;
    const height = maxY - minY;
    try { onBounds && onBounds({ minY, maxY, height }); } catch {}

    // BUFFERS
    NRef.current = count;
    posRef.current = new Float32Array(count * 3);
    velRef.current = new Float32Array(count * 3);
    tgtRef.current = new Float32Array(count * 3);
    scaleRef.current = new Float32Array(count * 3);
    quatRef.current  = new Float32Array(count * 4);

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const iq = i * 4;

      const cx = centers[i].x - globalCenter.x;
      const cy = centers[i].y - globalCenter.y;
      const cz = centers[i].z - globalCenter.z;

      tgtRef.current[ix]   = cx;
      tgtRef.current[ix+1] = cy;
      tgtRef.current[ix+2] = cz;

      posRef.current[ix]   = cx + (Math.random() - 0.5) * 0.02 * sizes[i].x;
      posRef.current[ix+1] = cy + (Math.random() - 0.5) * 0.02 * sizes[i].y;
      posRef.current[ix+2] = cz + (Math.random() - 0.5) * 0.02 * sizes[i].z;
      velRef.current[ix] = velRef.current[ix+1] = velRef.current[ix+2] = 0;

      scaleRef.current[ix]   = sizes[i].x;
      scaleRef.current[ix+1] = sizes[i].y;
      scaleRef.current[ix+2] = sizes[i].z;

      quatRef.current[iq]   = quats[i].x;
      quatRef.current[iq+1] = quats[i].y;
      quatRef.current[iq+2] = quats[i].z;
      quatRef.current[iq+3] = quats[i].w;
    }

    // INSTANCES
    disposeInstanced(instRef);
    const geom = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.65,
      metalness: 0.0,
      flatShading: true,
    });
    const inst = new THREE.InstancedMesh(geom, mat, count);
    inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    inst.castShadow = true;

    // pastikan instanceColor ada di semua versi three
    if (!inst.instanceColor) {
      inst.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3, false);
    }

    // set warna per instance (linearized)
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const col = colors[i];
      if (col) {
        const cc = col.clone();
        if (cc.convertSRGBToLinear) cc.convertSRGBToLinear();
        inst.setColorAt(i, cc);
      } else {
        c.set(fallbackColor);
        if (c.convertSRGBToLinear) c.convertSRGBToLinear();
        inst.setColorAt(i, c);
      }
    }
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;

    // isi matrix awal
    const tpos = new THREE.Vector3();
    const tquat = new THREE.Quaternion();
    const tscl = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const ix = i * 3, iq = i * 4;
      tpos.set(posRef.current[ix], posRef.current[ix+1], posRef.current[ix+2]);
      tquat.set(quatRef.current[iq], quatRef.current[iq+1], quatRef.current[iq+2], quatRef.current[iq+3]);
      tscl.set(scaleRef.current[ix], scaleRef.current[ix+1], scaleRef.current[ix+2]);
      tmpObj.position.copy(tpos);
      tmpObj.quaternion.copy(tquat);
      tmpObj.scale.copy(tscl);
      tmpObj.updateMatrix();
      inst.setMatrixAt(i, tmpObj.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;

    group.current.add(inst);
    instRef.current = inst;

    return () => cleanupInstanced(instRef);
  }, [gltfScene, shrink, useGLBColors, fallbackColor, onBounds]);

  // Raycast pointer → titik hover di z=0 lokal
  useFrame(({ mouse }) => {
    const g = group.current;
    if (!g) return;
    raycaster.setFromCamera(new THREE.Vector2(mouse.x, mouse.y), camera);
    const planeWorld = planeLocalZ0.clone().applyMatrix4(g.matrixWorld);
    const hit = new THREE.Vector3();
    const ok = raycaster.ray.intersectPlane(planeWorld, hit);
    hoverRef.current = ok ? g.worldToLocal(hit.clone()) : null;
  });

  // Physics posisi (rot & scale tetap)
  useFrame((_, dtRaw) => {
    const inst = instRef.current;
    const N = NRef.current;
    if (!inst || !N) return;

    const pos = posRef.current, vel = velRef.current, tgt = tgtRef.current;
    const hover = hoverRef.current;
    const hr2 = hoverRadius * hoverRadius;
    const k = spring, d = damping, rep = repel;
    const dt = Math.min(Math.max(dtRaw, 1/240), 1/30);

    const tpos = new THREE.Vector3();
    const tquat = new THREE.Quaternion();
    const tscl = new THREE.Vector3();

    for (let i = 0; i < N; i++) {
      const ix = i * 3, iq = i * 4;

      let ax = -k * (pos[ix]   - tgt[ix])   - d * vel[ix];
      let ay = -k * (pos[ix+1] - tgt[ix+1]) - d * vel[ix+1];
      let az = -k * (pos[ix+2] - tgt[ix+2]) - d * vel[ix+2];

      if (hover) {
        const dx = pos[ix]   - hover.x;
        const dy = pos[ix+1] - hover.y;
        const dz = pos[ix+2] - hover.z;
        const dist2 = dx*dx + dy*dy + dz*dz;
        if (dist2 < hr2) {
          const dist = Math.max(Math.sqrt(dist2), 1e-6);
          const f = rep * (1.0 - dist / Math.sqrt(hr2));
          ax += (dx / dist) * f;
          ay += (dy / dist) * f;
          az += (dz / dist) * f;
        }
      }

      vel[ix]   += ax * dt;  vel[ix+1] += ay * dt;  vel[ix+2] += az * dt;
      pos[ix]   += vel[ix] * dt;  pos[ix+1] += vel[ix+1] * dt;  pos[ix+2] += vel[ix+2] * dt;

      tpos.set(pos[ix], pos[ix+1], pos[ix+2]);
      tquat.set(quatRef.current[iq], quatRef.current[iq+1], quatRef.current[iq+2], quatRef.current[iq+3]);
      tscl.set(scaleRef.current[ix], scaleRef.current[ix+1], scaleRef.current[ix+2]);
      tmpObj.position.copy(tpos);
      tmpObj.quaternion.copy(tquat);
      tmpObj.scale.copy(tscl);
      tmpObj.updateMatrix();
      inst.setMatrixAt(i, tmpObj.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  });

  return <group ref={group} {...props} />;
}

/* ================= helpers ================= */

// Ambil rata-rata warna dari image HTMLImageElement/ImageBitmap/Canvas
function sampleTextureAverage(imgLike) {
  try {
    const canvas = document.createElement("canvas");
    const w = 8, h = 8;                 // kecil saja cukup untuk average
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    // ImageBitmap punya width/height & bisa drawImage langsung
    ctx.drawImage(imgLike, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    let r = 0, g = 0, b = 0, n = w * h;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    const col = new THREE.Color(r / (255 * n), g / (255 * n), b / (255 * n));
    // data dari <canvas> adalah sRGB → convert to linear untuk shading PBR
    if (col.convertSRGBToLinear) col.convertSRGBToLinear();
    return col;
  } catch {
    return null;
  }
}

function disposeInstanced(ref) {
  if (ref.current?.parent) ref.current.parent.remove(ref.current);
  ref.current?.geometry?.dispose?.();
  ref.current?.material?.dispose?.();
  ref.current = null;
}
function cleanupInstanced(ref) {
  if (ref.current?.parent) ref.current.parent.remove(ref.current);
  ref.current?.geometry?.dispose?.();
  ref.current?.material?.dispose?.();
  ref.current = null;
}

useGLTF.preload("/models/3D.glb");
