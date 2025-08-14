// components/AnimatedModel.jsx
"use client";
import React, { useEffect, useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three"; // <-- FIX: WAJIB

/**
 * props:
 *  - url: string => "/models/model.glb"
 *  - clip: string => nama clip (default: clip pertama)
 *  - loop: "repeat" | "once" | "pingpong"
 *  - crossfade: number (detik)
 *  - speed: number
 *  - ...props => position/rotation/scale dll
 */

export default function AnimatedModel({
  url = "/models/model.glb",
  clip,
  loop = "repeat",
  crossfade = 0.2,
  speed = 1,
  ...props
}) {
  const group = useRef();
  const { scene, animations } = useGLTF(url);
  const { actions, names, mixer } = useAnimations(animations, group);

  useEffect(() => {
    if (!animations || animations.length === 0) {
      console.warn(`[AnimatedModel] No animations in ${url}`);
      return;
    }
    const target = clip && names.includes(clip) ? clip : names[0];
    const action = actions[target];
    if (!action) return;

    // set loop
    if (loop === "once") {
      action.setLoop(THREE.LoopOnce, 0);
      action.clampWhenFinished = true;
    } else if (loop === "pingpong") {
      action.setLoop(THREE.LoopPingPong, Infinity);
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity);
    }

    mixer.timeScale = speed;
    action.reset().fadeIn(crossfade).play();
    return () => action.fadeOut(0.15);
  }, [animations, actions, names, mixer, url, clip, loop, crossfade, speed]);

  return <primitive ref={group} object={scene} {...props} />;
}

// Preload agar cepat
useGLTF.preload("/models/model.glb");
