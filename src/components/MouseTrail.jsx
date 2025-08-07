import React, { useEffect, useRef, useState } from 'react';

const asciiCharacters = ['⁕', '※', '⊙', '∘', '∀', '◐'];

const MouseTrail = () => {
  const [trail, setTrail] = useState([]);
  const [visible, setVisible] = useState(false);
  const idleTimeout = useRef(null);
  const trailRef = useRef([]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      setVisible(true);
      clearTimeout(idleTimeout.current);

    const gridSize = Math.floor(Math.random() * 40) + 24; // 24px to 64px
const gridOriginX = Math.random() * gridSize;
const gridOriginY = Math.random() * gridSize;

const spots = Array.from({ length: 4 }).map(() => {
  const angle = Math.random() * 2 * Math.PI;
  const radius = Math.random() * 4 * gridSize; // spread out more, but on grid
  const offsetX = Math.cos(angle) * radius;
  const offsetY = Math.sin(angle) * radius;
  const randomChar = asciiCharacters[Math.floor(Math.random() * asciiCharacters.length)];
  const snappedX = Math.round((x + offsetX - gridOriginX) / gridSize) * gridSize + gridOriginX;
  const snappedY = Math.round((y + offsetY - gridOriginY) / gridSize) * gridSize + gridOriginY;

  return {
    x: snappedX,
    y: snappedY,
    char: randomChar,
    id: Math.random().toString(36).substr(2, 9),
    size: gridSize,
    glitch: false,
  };
});
// ...existing code...

      const newTrail = [...trailRef.current, ...spots].slice(-40);
      trailRef.current = newTrail;
      setTrail(newTrail);

      // Idle timeout for glitch/blink effect
      idleTimeout.current = setTimeout(() => {
        setTrail((oldTrail) =>
          oldTrail.map((item) => ({
            ...item,
            glitch: Math.random() > 0.5,
            char: asciiCharacters[Math.floor(Math.random() * asciiCharacters.length)],
          }))
        );
        setTimeout(() => {
          setTrail([]);
          trailRef.current = [];
          setVisible(false);
        }, 200);
      }, 600);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(idleTimeout.current);
    };
  }, []); // Only run once

  if (!visible) return null;

  return (
    <>
      {trail.map(({ x, y, char, id, size, glitch }) => (
        <span
          key={id}
          style={{
            position: 'fixed',
            left: x,
            top: y,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: `${size}px`,
            height: `${size}px`,
            background: 'black',
          
            color: 'white',
            fontSize: `${size * 0.6}px`,
            fontFamily: 'monospace',
            userSelect: 'none',
            zIndex: 50,
            transform: 'translate(-50%, -50%)',
            opacity: glitch ? Math.random() : 1,
       
            transition: 'opacity 0.1s, filter 0.1s',
          }}
        >
          {char}
        </span>
      ))}
    </>
  );
};

export default MouseTrail;