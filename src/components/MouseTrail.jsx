import React, { useEffect, useRef, useState } from 'react';

const asciiCharacters = ['⁕', '※', '⊙', '∘', '∀', '9', '1', '>', '-', '6'];

const gridSize = 32; // Fixed size for all squares

const MouseTrail = () => {
  const [trail, setTrail] = useState([]);
  const [visible, setVisible] = useState(false);
  const [isHovering, setIsHovering] = useState(false); // <-- Tambahan
  const idleTimeout = useRef(null);
  const trailRef = useRef([]);

  // Event listener untuk hover ke elemen interaktif
  useEffect(() => {
    const handleMouseOver = (e) => {
      const target = e.target;
      if (target.closest('button, a, [data-hover-interactive]')) {
        setIsHovering(true);
      }
    };

    const handleMouseOut = (e) => {
      const related = e.relatedTarget;
      if (!related || !related.closest('button, a, [data-hover-interactive]')) {
        setIsHovering(false);
      }
    };

    window.addEventListener('mouseover', handleMouseOver);
    window.addEventListener('mouseout', handleMouseOut);

    return () => {
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('mouseout', handleMouseOut);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (event) => {
      setVisible(true);
      clearTimeout(idleTimeout.current);

      // Snap mouse position to grid
      const baseX = Math.round(event.clientX / gridSize) * gridSize;
      const baseY = Math.round(event.clientY / gridSize) * gridSize;

      // Random offset for more organic trail
      const offsetX = (Math.floor(Math.random() * 3) - 1) * gridSize;
      const offsetY = (Math.floor(Math.random() * 3) - 1) * gridSize;

      const spot = {
        x: baseX + offsetX,
        y: baseY + offsetY,
        char: asciiCharacters[Math.floor(Math.random() * asciiCharacters.length)],
        id: Math.random().toString(36).substr(2, 9),
        size: gridSize,
        glitch: false,
      };

      const newTrail = [...trailRef.current, spot].slice(-80);
      trailRef.current = newTrail;
      setTrail(newTrail);

      // Glitch effect: repeat a few times before clearing    
      idleTimeout.current = setTimeout(() => {
        let glitchCount = 0;
        const glitchInterval = setInterval(() => {
          setTrail((oldTrail) =>
            oldTrail.map((item) => ({
              ...item,
              glitch: true,
              char: asciiCharacters[Math.floor(Math.random() * asciiCharacters.length)],
              // Randomize position near the original mouse location
              x: item.x + (Math.floor(Math.random() * 3) - 1) * gridSize,
              y: item.y + (Math.floor(Math.random() * 3) - 1) * gridSize,
            }))
          );
          glitchCount++;
          if (glitchCount > 3) { // Number of glitch frames
            clearInterval(glitchInterval);
            setTimeout(() => {
              setTrail([]);
              trailRef.current = [];
              setVisible(false);
            }, 200);
          }
        }, 40); // Speed of glitch flicker
      }, 900);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(idleTimeout.current);
    };
  }, []);

  // Jangan tampilkan trail kalau lagi hover
  if (!visible || isHovering) return null;

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
          }}
        >
          {char}
        </span>
      ))}
    </>
  );
};

export default MouseTrail;
