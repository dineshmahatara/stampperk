'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type FaqItem = { q: string; a: string };

export function FaqList() {
  const { t, i18n } = useTranslation('common');
  const faqs = t('faqs', { returnObjects: true }) as FaqItem[];
  const [open, setOpen] = useState(0);

  return (
    <div className="space-y-3" key={i18n.language}>
      {(Array.isArray(faqs) ? faqs : []).map((item, i) => {
        const active = open === i;
        return (
          <button
            key={`${item.q}-${i}`}
            type="button"
            onClick={() => setOpen(active ? -1 : i)}
            className="w-full rounded-2xl border border-[var(--stampperk-line)] bg-[var(--stampperk-surface)] px-5 py-4 text-left text-base transition hover:border-[#e23d4a]/30"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="text-lg font-semibold">{item.q}</span>
              <span className="text-xl text-[#e23d4a]">{active ? '−' : '+'}</span>
            </div>
            {active && (
              <p className="mt-3 text-base leading-relaxed text-[var(--stampperk-muted)]">{item.a}</p>
            )}
          </button>
        );
      })}
    </div>
  );
}
