"use client";

import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";

export type SignaturePadHandle = {
  clear: () => void;
  isEmpty: () => boolean;
  toDataUrl: () => string;
};

function getPoint(
  canvas: HTMLCanvasElement,
  e: { clientX: number; clientY: number }
) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height,
  };
}

export const SignaturePad = forwardRef<SignaturePadHandle>(function SignaturePad(
  _props,
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasDrawnRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Render crisper on high-DPI screens without changing the CSS size.
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#111827";
    }
  }, []);

  useImperativeHandle(ref, () => ({
    clear() {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      hasDrawnRef.current = false;
      setIsEmpty(true);
    },
    isEmpty() {
      return !hasDrawnRef.current;
    },
    toDataUrl() {
      return canvasRef.current?.toDataURL("image/png") ?? "";
    },
  }));

  function start(point: { clientX: number; clientY: number }) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawingRef.current = true;
    const dpr = window.devicePixelRatio || 1;
    const p = getPoint(canvas, point);
    lastPointRef.current = { x: p.x / dpr, y: p.y / dpr };
  }

  function move(point: { clientX: number; clientY: number }) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!drawingRef.current || !canvas || !ctx || !lastPointRef.current) return;
    const dpr = window.devicePixelRatio || 1;
    const p = getPoint(canvas, point);
    const current = { x: p.x / dpr, y: p.y / dpr };
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(current.x, current.y);
    ctx.stroke();
    lastPointRef.current = current;
    hasDrawnRef.current = true;
    setIsEmpty(false);
  }

  function end() {
    drawingRef.current = false;
    lastPointRef.current = null;
  }

  return (
    <div className="space-y-1">
      <canvas
        ref={canvasRef}
        className="w-full h-32 rounded-lg border border-gray-300 bg-white touch-none"
        onMouseDown={(e) => start(e)}
        onMouseMove={(e) => drawingRef.current && move(e)}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={(e) => {
          e.preventDefault();
          start(e.touches[0]);
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          move(e.touches[0]);
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          end();
        }}
      />
      {isEmpty && (
        <p className="text-xs text-gray-400">Sign above with your finger or mouse</p>
      )}
    </div>
  );
});
