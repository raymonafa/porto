'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'

export default function My3DModel({ mouse }) {
  const group = useRef()
  const { scene } = useGLTF('/models/model.glb') // pastikan pathnya benar

  useFrame(({ clock }) => {
    if (group.current) {
      group.current.rotation.y = mouse.x * 0.2
      group.current.rotation.x = mouse.y * 0.2
      group.current.position.y = Math.sin(clock.getElapsedTime() * 1) * 0.1
    }
  })

  return <primitive ref={group} object={scene} scale={1.5} />
}
