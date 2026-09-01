import { useEffect, useRef } from 'react';

/**
 * TopographicCanvas: A lightweight, high-performance HTML5 canvas 3D topographic
 * wireframe & ambient particle field following Friday's signature Green + White aesthetic (#00261D, #BBEAD5).
 */
export default function TopographicCanvas({ className = '', variant = 'hero' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      targetMouseX = e.clientX - rect.left;
      targetMouseY = e.clientY - rect.top;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Particle nodes for depth
    const particleCount = variant === 'hero' ? 45 : 30;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 1,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.5 + 0.2,
    }));

    let time = 0;

    const render = () => {
      time += 0.015;
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // 1. Draw crisp & rich 3D Topographic Contour Wave Lines
      const lines = variant === 'hero' ? 16 : 10;
      const stepY = height / (lines + 2);

      for (let i = 1; i <= lines; i++) {
        const baseY = i * stepY;
        ctx.beginPath();

        // Increased opacity for vivid visibility on light backgrounds
        const baseOpacity = variant === 'dark' ? 0.35 : 0.28;
        const opacity = baseOpacity + Math.sin(time * 0.6 + i * 0.4) * 0.08;
        ctx.strokeStyle = `rgba(0, 38, 29, ${opacity})`;
        ctx.lineWidth = i % 2 === 0 ? 1.8 : 1.2;

        for (let x = 0; x <= width; x += 12) {
          // Calculate 3D mountain contour height with multi-sine wave interference
          const distToMouse = Math.hypot(x - mouseX, baseY - mouseY);
          const mouseInfluence = Math.max(0, 1 - distToMouse / 400) * 35;

          const wave1 = Math.sin(x * 0.005 + time + i * 0.35) * 26;
          const wave2 = Math.cos(x * 0.012 - time * 0.7 + i * 0.45) * 16;
          const wave3 = Math.sin((x + baseY) * 0.003 + time * 0.4) * 20;

          const yOffset = wave1 + wave2 + wave3 - mouseInfluence;
          const currentY = baseY + yOffset;

          if (x === 0) {
            ctx.moveTo(x, currentY);
          } else {
            ctx.lineTo(x, currentY);
          }
        }
        ctx.stroke();
      }

      // 2. Draw Floating Travel Waypoint Nodes & Flight Lines
      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 1.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 38, 29, ${p.alpha * 0.85})`;
        ctx.fill();

        // Connect nearby points to form subtle flight routes
        for (let j = idx + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(0, 38, 29, ${(1 - dist / 130) * 0.25})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
