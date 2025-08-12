// components/Canvas3D.js
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

export default function Canvas3D() {
  return (
    <Canvas className="absolute top-0 left-0 w-full h-full z-0">
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} />
     
      <OrbitControls enableZoom={false} />
    </Canvas>
  )
}
    