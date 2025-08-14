import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import My3DModel from './My3DModel';

export default function CenterCube() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    setMouse({ x, y });
  };

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-30 pointer-events-auto"
      onMouseMove={handleMouseMove}
    >
      <Canvas style={{ width: '100%', height: '100%' }}>
        <ambientLight intensity={0.1} />
        <directionalLight position={[2, 2, 5]} />
        <My3DModel mouse={mouse} />
      </Canvas>
    </div>
  );
}
