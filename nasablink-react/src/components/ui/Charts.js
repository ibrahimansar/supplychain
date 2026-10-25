import React, { useId, useMemo, useState } from 'react';

const PALETTE = ['#0d9488', '#6366f1', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

const formatDefault = (v) => v;

/** Soft CRM-style vertical bars — rounded, gradient fill, hover tooltip, quiet grid. */
export const BarChart = ({
  data = [],
  width = 600,
  height = 240,
  color = '#0d9488',
  labelColor = '#94a3b8',
  valueFormatter = formatDefault,
}) => {
  const gradId = useId().replace(/:/g, '');
  const padding = { top: 28, right: 12, bottom: 36, left: 40 };
  const innerW = Math.max(1, width - padding.left - padding.right);
  const innerH = Math.max(1, height - padding.top - padding.bottom);
  const max = Math.max(1, ...data.map((d) => Number(d.value) || 0));
  const gap = Math.min(12, Math.max(6, innerW / Math.max(1, data.length) * 0.22));
  const barW = innerW / Math.max(1, data.length);
  const [hover, setHover] = useState(null);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none" role="img">
      <defs>
        <linearGradient id={`bar-grad-${gradId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <g transform={`translate(${padding.left},${padding.top})`}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line
              x1={0}
              y1={innerH * (1 - t)}
              x2={innerW}
              y2={innerH * (1 - t)}
              stroke="#f1f5f9"
              strokeWidth="1"
            />
            <text
              x={-10}
              y={innerH * (1 - t)}
              dy="3.5"
              fontSize="10"
              fill={labelColor}
              textAnchor="end"
              fontFamily="inherit"
            >
              {valueFormatter(Math.round(max * t * 100) / 100)}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const val = Number(d.value) || 0;
          const h = (val / max) * innerH;
          const x = i * barW + gap / 2;
          const y = innerH - h;
          const w = Math.max(4, barW - gap);
          const isHover = hover === i;
          const fill = d.color || `url(#bar-grad-${gradId})`;
          return (
            <g
              key={d.key || i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'default' }}
            >
              {/* Track */}
              <rect x={x} y={0} width={w} height={innerH} fill="#f8fafc" rx="8" />
              <rect
                x={x}
                y={y}
                width={w}
                height={Math.max(4, h)}
                fill={fill}
                rx="8"
                style={{
                  transition: 'opacity 160ms ease, filter 160ms ease',
                  opacity: hover == null || isHover ? 1 : 0.45,
                  filter: isHover ? 'brightness(1.05)' : 'none',
                }}
              />
              <text
                x={x + w / 2}
                y={innerH + 18}
                fontSize="10"
                fill="#64748b"
                textAnchor="middle"
                fontFamily="inherit"
              >
                {d.label}
              </text>
              {isHover && (
                <g transform={`translate(${Math.min(innerW - 88, Math.max(0, x + w / 2 - 44))},${Math.max(0, y - 36)})`}>
                  <rect width="88" height="28" rx="8" fill="#0f172a" />
                  <text x="44" y="12" fontSize="9" fill="#94a3b8" textAnchor="middle" fontFamily="inherit">
                    {d.label}
                  </text>
                  <text x="44" y="23" fontSize="11" fill="#fff" textAnchor="middle" fontWeight="600" fontFamily="inherit">
                    {valueFormatter(d.value)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
};

/** Horizontal ranking bars — common in modern CRMs for “top N” lists. */
export const HorizontalBarChart = ({
  data = [],
  height,
  color = '#6366f1',
  valueFormatter = formatDefault,
}) => {
  const max = Math.max(1, ...data.map((d) => Number(d.value) || 0));
  const [hover, setHover] = useState(null);
  const rowH = 36;
  const chartH = height || Math.max(120, data.length * rowH + 8);

  return (
    <div className="w-full space-y-1.5" style={{ minHeight: chartH }}>
      {data.map((d, i) => {
        const val = Number(d.value) || 0;
        const pct = Math.max(2, (val / max) * 100);
        const isHover = hover === i;
        const barColor = d.color || color;
        return (
          <div
            key={d.key || i}
            className="group flex items-center gap-3"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div
              className="w-28 sm:w-36 shrink-0 text-xs text-slate-600 truncate text-end"
              title={d.label}
            >
              {d.label}
            </div>
            <div className="relative flex-1 h-8 rounded-lg bg-slate-50 overflow-hidden">
              <div
                className="absolute inset-y-0 start-0 rounded-lg transition-all duration-300 ease-out"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${barColor}cc, ${barColor}88)`,
                  opacity: hover == null || isHover ? 1 : 0.5,
                  boxShadow: isHover ? `0 0 0 1px ${barColor}33` : 'none',
                }}
              />
              <span className="absolute inset-y-0 end-2 flex items-center text-[11px] font-semibold tabular-nums text-slate-700">
                {valueFormatter(d.value)}
              </span>
            </div>
          </div>
        );
      })}
      {data.length === 0 && (
        <div className="text-sm text-slate-400 py-8 text-center">No data</div>
      )}
    </div>
  );
};

/** CRM-style donut: thick ring, segment gaps, center metric, side legend. */
export const DonutChart = ({
  data = [],
  size = 160,
  thickness = 22,
  label = '',
  valueFormatter = formatDefault,
}) => {
  const total = Math.max(0, data.reduce((s, d) => s + (Number(d.value) || 0), 0));
  const [hover, setHover] = useState(null);
  const r = size / 2;
  const radius = r - thickness / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const gapPx = data.length > 1 ? 3.5 : 0;

  const segments = useMemo(() => {
    let offset = 0;
    return data.map((d, idx) => {
      const val = Number(d.value) || 0;
      const frac = total === 0 ? 0 : val / total;
      const length = Math.max(0, frac * circumference - gapPx);
      const seg = {
        ...d,
        value: val,
        color: d.color || PALETTE[idx % PALETTE.length],
        dasharray: `${length} ${circumference - length}`,
        dashoffset: -offset,
        pct: total === 0 ? 0 : Math.round(frac * 100),
      };
      offset += frac * circumference;
      return seg;
    });
  }, [data, total, circumference, gapPx]);

  const active = hover != null ? segments[hover] : null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 py-1">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="block -rotate-90">
          <circle
            cx={r}
            cy={r}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={thickness}
          />
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={r}
              cy={r}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={hover == null || hover === i ? thickness : thickness - 4}
              strokeDasharray={seg.dasharray}
              strokeDashoffset={seg.dashoffset}
              strokeLinecap="butt"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{
                transition: 'stroke-width 160ms ease, opacity 160ms ease',
                opacity: hover == null || hover === i ? 1 : 0.35,
                cursor: 'default',
              }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[11px] uppercase tracking-wide text-slate-400 font-medium">
            {active ? active.label : label}
          </span>
          <span className="text-2xl font-semibold tabular-nums text-slate-900 tracking-tight">
            {valueFormatter(active ? active.value : total)}
          </span>
          {active && (
            <span className="text-[11px] text-slate-500 tabular-nums">{active.pct}%</span>
          )}
        </div>
      </div>

      <ul className="flex-1 w-full space-y-2 min-w-[140px]">
        {segments.map((seg, i) => (
          <li
            key={i}
            className={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-2 transition-colors ${
              hover === i ? 'bg-slate-50' : 'hover:bg-slate-50/80'
            }`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-white shadow-sm"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-sm text-slate-600 truncate">{seg.label}</span>
            </div>
            <div className="flex items-baseline gap-1.5 shrink-0">
              <span className="text-sm font-semibold tabular-nums text-slate-900">
                {valueFormatter(seg.value)}
              </span>
              <span className="text-[11px] tabular-nums text-slate-400">{seg.pct}%</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

const Charts = { BarChart, DonutChart, HorizontalBarChart };
export default Charts;
