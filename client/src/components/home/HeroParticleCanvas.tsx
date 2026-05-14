import { useEffect, useRef } from 'react';

export function HeroParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    let animId: number;
    let running = true;
    let mx = -3000, my = -3000;
    const ripples: { x: number; y: number; r: number; a: number }[] = [];
    let pts: {
      x: number; y: number;
      vx: number; vy: number;
      phase: number;
      angleSpeed: number;
      accelStr: number;
      r: number; cyan: boolean;
    }[] = [];

    function seed(w: number, h: number) {
      pts = Array.from({ length: 78 }, () => ({
        x:          Math.random() * w,
        y:          Math.random() * h,
        vx:         (Math.random() - 0.5) * 0.48,
        vy:         (Math.random() - 0.5) * 0.48,
        phase:      Math.random() * Math.PI * 2,
        angleSpeed: (Math.random() < 0.5 ? 1 : -1) * (0.004 + Math.random() * 0.008),
        accelStr:   0.035 + Math.random() * 0.055,
        r:          Math.random() * 1.5 + 0.5,
        cyan:       Math.random() < 0.24,
      }));
    }

    function applySize() {
      if (!canvas || !parent) return false;
      const w = parent.offsetWidth;
      const h = parent.offsetHeight;
      if (w === 0 || h === 0) return false;
      canvas.width  = w;
      canvas.height = h;
      seed(w, h);
      return true;
    }

    let sizeReady = false;
    const initFrame = requestAnimationFrame(() => {
      sizeReady = applySize();
    });

    const ro = new ResizeObserver(() => {
      sizeReady = applySize();
    });
    ro.observe(parent);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mx = e.clientX - rect.left;
      my = e.clientY - rect.top;
    };
    const onLeave = () => { mx = -3000; my = -3000; };
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      ripples.push({ x: cx, y: cy, r: 0, a: 1 });
      pts.forEach(p => {
        const dx = p.x - cx, dy = p.y - cy;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < 220 && d > 0) {
          const f = (1 - d / 220) * 5.5;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
      });
    };

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    canvas.addEventListener('click', onClick);

    const draw = () => {
      if (!running) return;

      if (!sizeReady) {
        sizeReady = applySize();
        animId = requestAnimationFrame(draw);
        return;
      }

      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(199,122,147,${rp.a})`;
        ctx.lineWidth   = 1.5;
        ctx.stroke();
        rp.r += 6;
        rp.a -= 0.023;
        if (rp.a <= 0) ripples.splice(i, 1);
      }

      // Connection lines
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d  = Math.sqrt(dx * dx + dy * dy);

          if (d < 180) {
            let a = 0.75 * (1 - d / 180);
            const midX = (pts[i].x + pts[j].x) * 0.5;
            const midY = (pts[i].y + pts[j].y) * 0.5;
            const md   = Math.hypot(midX - mx, midY - my);
            if (md < 200) a += 0.4 * (1 - md / 200);

            const isCyan = pts[i].cyan || pts[j].cyan;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = isCyan
              ? `rgba(199,122,147,${Math.min(a * 0.85, 0.95)})`
              : `rgba(127,184,163,${Math.min(a, 0.95)})`;
            ctx.lineWidth = d < 80 ? 1.4 : 0.9;
            ctx.stroke();
          }
        }
      }

      // Particles
      for (let i = 0; i < pts.length; i++) {
        const p  = pts[i];
        const pd = Math.hypot(p.x - mx, p.y - my);
        const pr = p.r + (pd < 100 ? (1 - pd / 100) * 2.2 : 0);

        if (pd < 38) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, pr + 3.5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(199,122,147,${0.32 * (1 - pd / 38)})`;
          ctx.lineWidth   = 0.8;
          ctx.stroke();
        }

        // Cursor attraction
        if (pd < 155) {
          const f = (1 - pd / 155) * 0.027;
          p.vx += (mx - p.x) * f;
          p.vy += (my - p.y) * f;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(pr, 0.4), 0, Math.PI * 2);
        ctx.fillStyle = p.cyan ? 'rgba(199,122,147,0.84)' : 'rgba(127,184,163,0.8)';
        ctx.fill();

        // Slowly rotate each particle's drift direction — prevents wall lock-in
        p.phase += p.angleSpeed;
        const ax = Math.cos(p.phase) * p.accelStr;
        const ay = Math.sin(p.phase) * p.accelStr;

        p.vx = p.vx * 0.97 + ax;
        p.vy = p.vy * 0.97 + ay;

        const spd = Math.hypot(p.vx, p.vy);
        if (spd > 3.6) { p.vx *= 3.6 / spd; p.vy *= 3.6 / spd; }

        p.x += p.vx;
        p.y += p.vy;

        // Soft edge bounce — also flip the phase so the particle curves away
        if (p.x < 0) {
          p.x = 0; p.vx = Math.abs(p.vx) * 0.6;
          p.phase = Math.PI - p.phase;
        } else if (p.x > w) {
          p.x = w; p.vx = -Math.abs(p.vx) * 0.6;
          p.phase = Math.PI - p.phase;
        }
        if (p.y < 0) {
          p.y = 0; p.vy = Math.abs(p.vy) * 0.6;
          p.phase = -p.phase;
        } else if (p.y > h) {
          p.y = h; p.vy = -Math.abs(p.vy) * 0.6;
          p.phase = -p.phase;
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      running = false;
      cancelAnimationFrame(initFrame);
      cancelAnimationFrame(animId);
      ro.disconnect();
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ cursor: 'crosshair', zIndex: 1 }}
    />
  );
}
