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
        background: '#0A0E14',
        borderBottom: '1px solid rgba(199,122,147,0.12)',
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
              padding: '0 28px',
              fontSize: '11px',
              fontFamily: 'var(--brand-font-mono)',
              color: item.highlight ? 'var(--brand-muted-rose)' : 'rgba(246,243,238,0.72)',
              letterSpacing: '0.08em',
              borderRight: '1px solid rgba(246,243,238,0.06)',
              fontWeight: item.highlight ? 600 : 400,
            }}
          >
            {item.text}
          </span>
        ))}
      </div>
    </div>
  );
}
