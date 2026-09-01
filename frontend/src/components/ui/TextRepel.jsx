import { useRef, useState, useEffect } from 'react';
import { motion, useSpring } from 'framer-motion';

function RepelChar({ char, mousePos, containerRect, force = 30, radius = 80 }) {
  const charRef = useRef(null);

  const springConfig = { damping: 16, stiffness: 220, mass: 0.2 };
  const springX = useSpring(0, springConfig);
  const springY = useSpring(0, springConfig);

  useEffect(() => {
    if (!charRef.current || !mousePos.x || !containerRect) {
      springX.set(0);
      springY.set(0);
      return;
    }

    const rect = charRef.current.getBoundingClientRect();
    const charCenterX = rect.left + rect.width / 2;
    const charCenterY = rect.top + rect.height / 2;

    const dx = charCenterX - mousePos.x;
    const dy = charCenterY - mousePos.y;
    const dist = Math.hypot(dx, dy);

    if (dist < radius && dist > 0) {
      const power = (1 - dist / radius) * force;
      const angle = Math.atan2(dy, dx);
      springX.set(Math.cos(angle) * power);
      springY.set(Math.sin(angle) * power);
    } else {
      springX.set(0);
      springY.set(0);
    }
  }, [mousePos, containerRect, force, radius, springX, springY]);

  return (
    <motion.span
      ref={charRef}
      style={{
        x: springX,
        y: springY,
        display: 'inline-block',
      }}
      className="inline-block select-none will-change-transform pointer-events-none"
    >
      {char}
    </motion.span>
  );
}

/**
 * TextRepel: Physics-based text animation where letters react to cursor proximity.
 * Groups characters into words so word wrapping is 100% natural with no mid-word cuts.
 */
export default function TextRepel({
  text,
  className = '',
  style = {},
  force = 30,
  radius = 80,
  as: Component = 'span',
}) {
  const containerRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: null, y: null });
  const [containerRect, setContainerRect] = useState(null);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    setMousePos({ x: e.clientX, y: e.clientY });
    setContainerRect(containerRef.current.getBoundingClientRect());
  };

  const handleMouseLeave = () => {
    setMousePos({ x: null, y: null });
  };

  const words = (text || '').split(' ');

  return (
    <Component
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`inline-block cursor-default ${className}`}
      style={style}
    >
      {words.map((word, wordIdx) => (
        <span key={wordIdx} className="inline-block whitespace-nowrap">
          {Array.from(word).map((char, charIdx) => (
            <RepelChar
              key={charIdx}
              char={char}
              mousePos={mousePos}
              containerRect={containerRect}
              force={force}
              radius={radius}
            />
          ))}
          {wordIdx < words.length - 1 && (
            <span className="inline-block">&nbsp;</span>
          )}
        </span>
      ))}
    </Component>
  );
}
