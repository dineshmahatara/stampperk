'use client';

import { useRef, useState } from 'react';

export type LogoTransform = {
  scale: number;
  offsetX: number;
  offsetY: number;
  posX: number;
  posY: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function LogoAdjustPanel({
  logoUrl,
  stampColor = '#16352A',
  value,
  onChange,
}: {
  logoUrl: string;
  stampColor?: string;
  value: LogoTransform;
  onChange: (next: LogoTransform) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: 'pos' | 'crop'; x: number; y: number; vx: number; vy: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  function moveOnCard(clientX: number, clientY: number) {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    onChange({
      ...value,
      posX: clamp(x, 10, 90),
      posY: clamp(y, 10, 68),
    });
  }

  function onCardPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { mode: 'pos', x: e.clientX, y: e.clientY, vx: value.posX, vy: value.posY };
    setDragging(true);
    moveOnCard(e.clientX, e.clientY);
  }

  function onCardPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.mode !== 'pos') return;
    moveOnCard(e.clientX, e.clientY);
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    drag.current = null;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onCropPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { mode: 'crop', x: e.clientX, y: e.clientY, vx: value.offsetX, vy: value.offsetY };
    setDragging(true);
  }

  function onCropPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.mode !== 'crop') return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    onChange({
      ...value,
      offsetX: clamp(drag.current.vx + dx * 0.35, -45, 45),
      offsetY: clamp(drag.current.vy + dy * 0.35, -45, 45),
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-black/8 bg-white p-4">
      <div className="text-sm font-extrabold">Place logo on card</div>
      <p className="text-xs text-[#8E8E93]">
        Drag on the card to choose where the logo sits. Use size slider to resize. Drag inside the small circle to crop.
      </p>

      <div
        ref={cardRef}
        className={`relative mx-auto h-44 w-full max-w-[280px] touch-none overflow-hidden rounded-2xl border border-black/10 ${
          dragging ? 'cursor-grabbing' : 'cursor-crosshair'
        }`}
        style={{ background: stampColor }}
        onPointerDown={onCardPointerDown}
        onPointerMove={onCardPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="pointer-events-none absolute inset-x-0 bottom-3 px-3 text-center"
        >
          <div className="truncate text-[11px] font-black tracking-wide text-white">YOUR BUSINESS</div>
          <div className="mt-0.5 text-[8px] font-semibold uppercase tracking-widest text-[#C9B08A]">
            Loyalty
          </div>
        </div>
        <div
          className="absolute overflow-hidden rounded-full border-2 border-[#C9B08A] bg-white/10"
          style={{
            width: 52,
            height: 52,
            left: `${value.posX}%`,
            top: `${value.posY}%`,
            transform: `translate(-50%, -50%) scale(${value.scale})`,
            pointerEvents: 'auto',
            cursor: 'grab',
          }}
          onPointerDown={onCropPointerDown}
          onPointerMove={onCropPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt=""
            draggable={false}
            className="pointer-events-none h-full w-full select-none object-cover"
            style={{
              transform: `translate(${value.offsetX}%, ${value.offsetY}%)`,
              transformOrigin: 'center center',
            }}
          />
        </div>
        <div className="pointer-events-none absolute bottom-0 inset-x-0 bg-[#C9B08A] py-1 text-center text-[8px] font-extrabold uppercase tracking-wider text-[#16352A]">
          Drag to place
        </div>
      </div>

      <label className="block">
        <div className="mb-1 flex justify-between text-xs font-bold uppercase text-[#8E8E93]">
          <span>Logo size</span>
          <span>{value.scale.toFixed(2)}×</span>
        </div>
        <input
          type="range"
          min={0.7}
          max={2.2}
          step={0.05}
          value={value.scale}
          onChange={(e) => onChange({ ...value, scale: Number(e.target.value) })}
          className="w-full accent-[#FF5A5F]"
        />
      </label>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Top', posX: 50, posY: 18 },
          { label: 'Center', posX: 50, posY: 38 },
          { label: 'Left', posX: 22, posY: 28 },
          { label: 'Right', posX: 78, posY: 28 },
          { label: 'Top-left', posX: 20, posY: 16 },
          { label: 'Top-right', posX: 80, posY: 16 },
        ].map((p) => (
          <button
            key={p.label}
            type="button"
            className="rounded-full bg-[#F4F5F7] px-2 py-1.5 text-[11px] font-bold"
            onClick={() => onChange({ ...value, posX: p.posX, posY: p.posY })}
          >
            {p.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="w-full rounded-full bg-[#F4F5F7] py-2 text-xs font-bold"
        onClick={() => onChange({ scale: 1, offsetX: 0, offsetY: 0, posX: 50, posY: 32 })}
      >
        Reset placement
      </button>
    </div>
  );
}
