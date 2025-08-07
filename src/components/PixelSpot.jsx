import React, { useEffect, useState } from 'react';

const PixelSpot = () => {
  const [spots, setSpots] = useState([]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const newSpot = {
        x: e.clientX + Math.random() * 10 - 5,
        y: e.clientY + Math.random() * 10 - 5,
      };
      setSpots((prevSpots) => [...prevSpots, newSpot]);

      // Limit the number of spots on the screen
      if (spots.length > 100) {
        setSpots((prevSpots) => prevSpots.slice(1));
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [spots]);

  return (
    <div>
      {spots.map((spot, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            top: spot.y,
            left: spot.x,
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            backgroundColor: 'rgba(211, 251, 67, 0.8)',
            pointerEvents: 'none',
          }}
        />
      ))}
    </div>
  );
};

export default PixelSpot;