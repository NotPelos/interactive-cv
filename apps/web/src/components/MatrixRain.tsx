/** @jsxImportSource preact */
import { useEffect, useRef } from "preact/hooks";

// Matrix rain overlay — full screen canvas, pointer-events none.
// Characters: katakana block + printable ASCII.
// Colors: Tokyo Night green palette (#9ece6a head, #5f7a3f tail).
// Runs for the duration it's mounted; parent unmounts after 10 s.

const KATAKANA = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
const ASCII = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*";
const CHARS = KATAKANA + ASCII;

function randomChar(): string {
  return CHARS[Math.floor(Math.random() * CHARS.length)] ?? "0";
}

interface Column {
  x: number;
  y: number;
  speed: number;
  length: number;
}

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const FONT_SIZE = 14;

    function resize(): void {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    resize();

    const cols = Math.floor(window.innerWidth / FONT_SIZE);

    const columns: Column[] = Array.from({ length: cols }, (_, i) => ({
      x: i * FONT_SIZE,
      y: Math.random() * -window.innerHeight,
      speed: 1 + Math.random() * 2,
      length: 10 + Math.floor(Math.random() * 20),
    }));

    let rafId: number;

    function draw(): void {
      if (!ctx || !canvas) return;

      // Fade effect — semi-transparent black overlay
      ctx.fillStyle = "rgba(26, 27, 38, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${FONT_SIZE}px monospace`;

      for (const col of columns) {
        // Draw the column trail
        for (let i = 0; i < col.length; i++) {
          const alpha = 1 - i / col.length;
          if (i === 0) {
            ctx.fillStyle = `rgba(158, 206, 106, ${alpha})`; // #9ece6a head
          } else {
            ctx.fillStyle = `rgba(95, 122, 63, ${alpha * 0.8})`; // #5f7a3f tail
          }
          const charY = col.y - i * FONT_SIZE;
          if (charY > 0 && charY < canvas.height) {
            ctx.fillText(randomChar(), col.x, charY);
          }
        }

        col.y += col.speed * FONT_SIZE * 0.5;

        if (col.y - col.length * FONT_SIZE > canvas.height) {
          col.y = -FONT_SIZE;
          col.speed = 1 + Math.random() * 2;
          col.length = 10 + Math.floor(Math.random() * 20);
        }
      }

      rafId = requestAnimationFrame(draw);
    }

    rafId = requestAnimationFrame(draw);

    const handleResize = (): void => resize();
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      class="fixed inset-0 z-50 pointer-events-none"
      aria-hidden="true"
    />
  );
}
