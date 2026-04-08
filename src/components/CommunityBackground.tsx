import { useEffect, useRef } from 'react';

type SolidColor = { type: 'solid'; value: string };
type GradientColor = { type: 'gradient'; stops: [string, string] };
type ColorDef = SolidColor | GradientColor;

type ShapeType = 'circle' | 'pill' | 'star';

type Shape = {
  x: number;
  y: number;
  type: ShapeType;
  color: ColorDef;
  angle: number;
  size: number;
  scale: number;
  maxScale: number;
  hovered: boolean;
  points?: number;
  innerRatio?: number;
};

type Grid = {
  shapes: Shape[];
  width: number;
  height: number;
};

type Wave = {
  x: number;
  y: number;
  startTime: number;
};

const gap = 40;
const radiusVmin = 30;
const speedIn = 0.5;
const speedOut = 0.6;
const restScale = 0.09;
const minHoverScale = 1;
const maxHoverScale = 3;
const waveSpeed = 1200;
const waveWidth = 180;

const PALETTE: ColorDef[] = [
  { type: 'solid', value: '#22c55e' },
  { type: 'solid', value: '#06b6d4' },
  { type: 'solid', value: '#f97316' },
  { type: 'solid', value: '#ef4444' },
  { type: 'solid', value: '#facc15' },
  { type: 'solid', value: '#ec4899' },
  { type: 'solid', value: '#9ca3af' },
  { type: 'solid', value: '#a78bfa' },
  { type: 'solid', value: '#60a5fa' },
  { type: 'solid', value: '#34d399' },
  { type: 'gradient', stops: ['#6366f1', '#3b82f6'] },
  { type: 'gradient', stops: ['#06b6d4', '#6366f1'] },
  { type: 'gradient', stops: ['#22c55e', '#06b6d4'] },
  { type: 'gradient', stops: ['#f97316', '#ef4444'] },
  { type: 'gradient', stops: ['#8b5cf6', '#06b6d4'] },
  { type: 'gradient', stops: ['#3b82f6', '#8b5cf6'] },
  { type: 'gradient', stops: ['#34d399', '#3b82f6'] },
];

const SHAPE_TYPES: ShapeType[] = ['circle', 'pill', 'star', 'star'];

function rnd(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function rndInt(min: number, max: number): number {
  return Math.floor(rnd(min, max + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function durationToFactor(seconds: number): number {
  if (seconds <= 0) return 1;
  return 1 - Math.pow(0.05, 1 / (60 * seconds));
}

function drawCircle(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();
}

function drawPill(ctx: CanvasRenderingContext2D, size: number): void {
  const w = size * 0.48;
  const h = size;
  ctx.beginPath();
  ctx.roundRect(-w, -h, w * 2, h * 2, w);
  ctx.fill();
}

function drawStar(ctx: CanvasRenderingContext2D, size: number, points: number, innerRatio: number): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? size : size * innerRatio;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawShape(ctx: CanvasRenderingContext2D, shape: Shape): void {
  switch (shape.type) {
    case 'circle':
      drawCircle(ctx, shape.size / 1.5);
      return;
    case 'pill':
      drawPill(ctx, shape.size / 1.4);
      return;
    case 'star':
      drawStar(ctx, shape.size, shape.points ?? 6, shape.innerRatio ?? 0.4);
      return;
  }
}

function resolveFill(ctx: CanvasRenderingContext2D, colorDef: ColorDef, size: number): string | CanvasGradient {
  if (colorDef.type === 'solid') return colorDef.value;
  const grad = ctx.createRadialGradient(0, -size * 0.3, 0, 0, size * 0.3, size * 1.5);
  grad.addColorStop(0, colorDef.stops[0]);
  grad.addColorStop(1, colorDef.stops[1]);
  return grad;
}

function randomStarProps(): { points: number; innerRatio: number } {
  return {
    points: rndInt(4, 10),
    innerRatio: rnd(0.1, 0.5),
  };
}

export default function CommunityBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let grid: Grid | null = null;
    let rafId: number | null = null;
    let pointer: { x: number; y: number } | null = null;
    let activity = 0;
    let waves: Wave[] = [];
    let maskRects: DOMRect[] = [];
    let frameCount = 0;
    let maskOverride = false;

    function buildGrid(): Grid {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const cols = Math.floor(W / gap);
      const rows = Math.floor(H / gap);
      const offsetX = (W - (cols - 1) * gap) / 2;
      const offsetY = (H - (rows - 1) * gap) / 2;
      const shapes: Shape[] = [];

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const type = pick(SHAPE_TYPES);
          const shape: Shape = {
            x: offsetX + col * gap,
            y: offsetY + row * gap,
            type,
            color: pick(PALETTE),
            angle: rnd(0, Math.PI * 2),
            size: gap * 0.38,
            scale: restScale,
            maxScale: rnd(minHoverScale, maxHoverScale),
            hovered: false,
          };

          if (type === 'star') Object.assign(shape, randomStarProps());
          shapes.push(shape);
        }
      }

      return { shapes, width: W, height: H };
    }

    function init(): void {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      grid = buildGrid();
    }

    function triggerWave(x?: number, y?: number): void {
      const waveX = x ?? window.innerWidth / 2;
      const waveY = y ?? window.innerHeight / 2;

      waves.push({ x: waveX, y: waveY, startTime: performance.now() });
      maskOverride = true;
      const delay = Math.sqrt(window.innerWidth * window.innerWidth + window.innerHeight * window.innerHeight) / waveSpeed;
      setTimeout(() => {
        maskOverride = false;
      }, delay * 1000);
    }

    function tick(): void {
      if (!grid) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const { shapes, width, height } = grid;
      const radius = Math.min(width, height) * (radiusVmin / 100);
      const now = performance.now();

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#080808';
      ctx.fillRect(0, 0, width, height);

      activity *= 0.93;

      frameCount++;
      if (frameCount % 10 === 0) {
        maskRects = Array.from(document.querySelectorAll('[data-shape-mask]')).map((el) => el.getBoundingClientRect());
      }

      const maxDist = Math.sqrt(width * width + height * height);
      waves = waves.filter((w) => ((now - w.startTime) / 1000) * waveSpeed < maxDist + waveWidth);

      for (let i = 0; i < shapes.length; i++) {
        const shape = shapes[i];
        const pad = gap / 2;
        const masked =
          !maskOverride &&
          maskRects.some(
            (r) =>
              shape.x >= r.left - pad &&
              shape.x <= r.right + pad &&
              shape.y >= r.top - pad &&
              shape.y <= r.bottom + pad,
          );

        if (masked) {
          shape.scale += (0 - shape.scale) * durationToFactor(speedOut);
          if (shape.scale < 0.005) shape.scale = 0;
          continue;
        }

        let pointerInfluence = 0;
        if (pointer && activity > 0.001) {
          const dx = shape.x - pointer.x;
          const dy = shape.y - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          pointerInfluence = smoothstep(1 - dist / radius) * activity;

          if (pointerInfluence > 0.05 && !shape.hovered) {
            shape.hovered = true;
            shape.maxScale = rnd(minHoverScale, maxHoverScale);
            shape.angle = rnd(0, Math.PI * 2);
            if (shape.type === 'star') Object.assign(shape, randomStarProps());
          } else if (pointerInfluence <= 0.05) {
            shape.hovered = false;
          }
        } else {
          shape.hovered = false;
        }

        let waveInfluence = 0;
        for (let j = 0; j < waves.length; j++) {
          const wave = waves[j];
          const waveRadius = ((now - wave.startTime) / 1000) * waveSpeed;
          const wdx = shape.x - wave.x;
          const wdy = shape.y - wave.y;
          const wdist = Math.sqrt(wdx * wdx + wdy * wdy);
          const t = 1 - Math.abs(wdist - waveRadius) / waveWidth;
          if (t > 0) waveInfluence = Math.max(waveInfluence, Math.sin(Math.PI * t));
        }

        const pointerTarget = restScale + pointerInfluence * (shape.maxScale - restScale);
        const waveTarget = restScale + waveInfluence * (shape.maxScale - restScale);
        const target = Math.max(pointerTarget, waveTarget);

        const factor = target > shape.scale ? durationToFactor(speedIn) : durationToFactor(speedOut);
        shape.scale += (target - shape.scale) * factor;

        if (shape.scale < restScale * 0.15) continue;

        ctx.save();
        ctx.translate(shape.x, shape.y);
        ctx.rotate(shape.angle);
        ctx.scale(shape.scale, shape.scale);
        ctx.fillStyle = resolveFill(ctx, shape.color, shape.size);
        drawShape(ctx, shape);
        ctx.restore();
      }

      rafId = requestAnimationFrame(tick);
    }

    function onMove(e: PointerEvent): void {
      pointer = { x: e.clientX, y: e.clientY };
      activity = 1;
    }

    function onClick(e: MouseEvent): void {
      triggerWave(e.clientX, e.clientY);
    }

    init();
    rafId = requestAnimationFrame(tick);

    window.addEventListener('resize', init);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('click', onClick);

    triggerWave();

    return () => {
      window.removeEventListener('resize', init);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('click', onClick);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 block h-full w-full bg-black pointer-events-none z-0" />;
}
