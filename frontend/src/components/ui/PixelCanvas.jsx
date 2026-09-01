import { useEffect, useRef } from 'react';

/**
 * PixelCanvas: Interactive grid of subtle pixels that illuminate and create trailing glow
 * effects under the cursor in Friday's signature Green theme (#00261D, #BBEAD5, #10B981).
 */
export default function PixelCanvas({
  colors = ['#BBEAD5', '#10B981', '#00261D', '#34D399'],
  gap = 14,
  speed = 0.04,
  variant = 'glow', // 'glow', 'trail', 'subtle'
  className = '',
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 400);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
      initGrid();
    };

    window.addEventListener('resize', handleResize);

    let mouse = { x: -1000, y: -1000, radius: 120 };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    canvas.parentElement?.addEventListener('mousemove', handleMouseMove);
    canvas.parentElement?.addEventListener('mouseleave', handleMouseLeave);

    // Pixel cells
    let pixels = [];
    const pixelSize = gap > 8 ? 3 : 2;

    const initGrid = () => {
      pixels = [];
      const cols = Math.floor(width / gap);
      const rows = Math.floor(height / gap);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          pixels.push({
            x: c * gap + gap / 2,
            y: r * gap + gap / 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: 0.04,
            targetAlpha: 0.04,
          });
        }
      }
    };

    initGrid();

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      pixels.forEach((p) => {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.hypot(dx, dy);

        if (dist < mouse.radius) {
          const intensity = 1 - dist / mouse.radius;
          p.targetAlpha = Math.min(0.85, 0.04 + intensity * 0.85);
        } else {
          p.targetAlpha = 0.04;
        }

        p.alpha += (p.targetAlpha - p.alpha) * speed;

        if (p.alpha > 0.05) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, pixelSize * (1 + (p.alpha - 0.04) * 1.5), 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.fill();

          // Glow halo on high illumination
          if (p.alpha > 0.4 && variant === 'glow') {
            ctx.beginPath();
            ctx.arc(p.x, p.y, pixelSize * 4, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = (p.alpha - 0.4) * 0.3;
            ctx.fill();
          }
        }
      });

      ctx.globalAlpha = 1.0;
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.parentElement?.removeEventListener('mousemove', handleMouseMove);
      canvas.parentElement?.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationId);
    };
  }, [colors, gap, speed, variant]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  );
}
