'use client';

import { passwordStrength } from '@stampz/shared';

const COLORS = {
  empty: '#E5E7EB',
  weak: '#EF4444',
  fair: '#F59E0B',
  good: '#3B82F6',
  strong: '#10B981',
};

export function PasswordStrength({ password }: { password: string }) {
  const s = passwordStrength(password);
  if (s.label === 'empty') return null;
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="h-1.5 flex-1 rounded-full"
            style={{
              backgroundColor: s.score >= n ? COLORS[s.label] : COLORS.empty,
            }}
          />
        ))}
      </div>
      <p className="text-xs font-semibold capitalize" style={{ color: COLORS[s.label] }}>
        Password strength: {s.label}
      </p>
      <ul className="grid gap-0.5 text-[11px] text-[#8E8E93] sm:grid-cols-2">
        {s.checks.map((c) => (
          <li key={c.label} className={c.ok ? 'text-emerald-600' : ''}>
            {c.ok ? '✓' : '○'} {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
