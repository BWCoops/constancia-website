import React from 'react';

const ITEMS = [
  { text: 'OneStream',                           highlight: true  },
  { text: 'Enterprise EPM implementation',        highlight: false },
  { text: 'Abacum',                              highlight: true  },
  { text: 'Mid-market FP&A deployment',           highlight: false },
  { text: 'Fixed price. Always.',                 highlight: true  },
  { text: 'Senior practitioners. Not juniors.',   highlight: false },
  { text: 'AI embedded from day one',             highlight: true  },
  { text: 'FinanceCompass: free assessment',      highlight: false },
  { text: 'No time-and-materials. Ever.',         highlight: true  },
  { text: 'EPM comparison tool: free',            highlight: false },
];

export function HomeTicker() {
  const doubled = [...ITEMS, ...ITEMS];

  return (
    <div
      className="h-[34px] overflow-hidden flex items-center"
      style={{
        background: 'var(--brand-bg-primary)',
        borderBottom: '1px solid rgba(18,235,252,0.12)',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          whiteSpace: 'nowrap',
          animation: 'hp-marquee 44s linear infinite',
        }}
      >
        {doubled.map((item, idx) => (
          <span
            key={idx}
            style={{
              padding: '0 26px',
              fontSize: '10px',
              fontFamily: 'var(--hp-font-mono)',
              color: item.highlight ? '#12EBFC' : 'rgba(255,255,255,0.65)',
              letterSpacing: '0.06em',
              borderRight: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {item.text}
          </span>
        ))}
      </div>
    </div>
  );
}
