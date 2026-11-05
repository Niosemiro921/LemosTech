import { useId } from 'react';

export interface ChartDatum {
  label: string;
  value: number;
  color?: string;
}

export interface BarSeries {
  name: string;
  color: string;
}

export interface BarDatum {
  label: string;
  values: number[];
}

export const chartPalette = ['#e4572e', '#f0a040', '#2f9e63', '#4a90d9', '#8065bd', '#b93434', '#5d6ad0', '#18895f', '#8a918b'];

const numberAO = new Intl.NumberFormat('pt-AO');

function defaultFormat(value: number) {
  return numberAO.format(value);
}

function useSafeId(prefix: string) {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

function EmptyChart({ message }: { message: string }) {
  return <div className="chart-empty">{message}</div>;
}

interface LineChartProps {
  data: ChartDatum[];
  color?: string;
  height?: number;
  formatValue?: (value: number) => string;
  ariaLabel?: string;
}

export function LineChart({ data, color = '#e4572e', height = 220, formatValue = defaultFormat, ariaLabel = 'Gráfico de linha' }: LineChartProps) {
  const gradientId = useSafeId('line');
  if (!data.length) return <EmptyChart message="Sem dados para o período." />;

  const w = 720;
  const h = height;
  const padX = 18;
  const padTop = 18;
  const padBottom = 32;
  const plotW = w - padX * 2;
  const plotH = h - padTop - padBottom;
  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const xAt = (index: number) => padX + (index / (data.length - 1 || 1)) * plotW;
  const yAt = (value: number) => padTop + plotH - ((value - min) / span) * plotH;
  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i)},${yAt(d.value)}`).join(' ');
  const areaPath = `${linePath} L ${xAt(data.length - 1)},${padTop + plotH} L ${xAt(0)},${padTop + plotH} Z`;
  const labelStep = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg" role="img" aria-label={ariaLabel}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line key={ratio} x1={padX} x2={w - padX} y1={padTop + plotH * ratio} y2={padTop + plotH * ratio} stroke="#ecefec" strokeWidth="1" />
        ))}
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <g key={`${d.label}-${i}`}>
            <circle cx={xAt(i)} cy={yAt(d.value)} r="4" fill="#fff" stroke={color} strokeWidth="2.5">
              <title>{`${d.label}: ${formatValue(d.value)}`}</title>
            </circle>
            {i % labelStep === 0 && (
              <text x={xAt(i)} y={h - 10} fontSize="10" fill="#68706b" textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}>
                {d.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

interface BarChartProps {
  data: BarDatum[];
  series: BarSeries[];
  height?: number;
  formatValue?: (value: number) => string;
  ariaLabel?: string;
}

export function BarChart({ data, series, height = 220, formatValue = defaultFormat, ariaLabel = 'Gráfico de barras' }: BarChartProps) {
  if (!data.length || !series.length) return <EmptyChart message="Sem dados para o período." />;

  const w = 720;
  const h = height;
  const padX = 18;
  const padTop = 18;
  const padBottom = 32;
  const plotW = w - padX * 2;
  const plotH = h - padTop - padBottom;
  const max = Math.max(...data.flatMap((d) => d.values), 1);
  const groupW = plotW / data.length;
  const gap = Math.min(10, groupW * 0.24);
  const barW = Math.max(4, (groupW - gap) / series.length);
  const labelStep = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} className="chart-svg" role="img" aria-label={ariaLabel}>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line key={ratio} x1={padX} x2={w - padX} y1={padTop + plotH * ratio} y2={padTop + plotH * ratio} stroke="#ecefec" strokeWidth="1" />
        ))}
        {data.map((datum, i) => (
          <g key={`${datum.label}-${i}`}>
            {series.map((s, sIndex) => {
              const value = Number(datum.values[sIndex] ?? 0);
              const barH = (value / max) * plotH;
              const x = padX + i * groupW + gap / 2 + sIndex * barW;
              return (
                <rect key={s.name} x={x} y={padTop + plotH - barH} width={Math.max(3, barW - 2)} height={barH} rx="4" fill={s.color}>
                  <title>{`${s.name} · ${datum.label}: ${formatValue(value)}`}</title>
                </rect>
              );
            })}
            {i % labelStep === 0 && (
              <text x={padX + i * groupW + groupW / 2} y={h - 10} fontSize="10" fill="#68706b" textAnchor="middle">{datum.label}</text>
            )}
          </g>
        ))}
      </svg>
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>
        ))}
      </div>
    </div>
  );
}

interface HorizontalBarsProps {
  data: ChartDatum[];
  formatValue?: (value: number) => string;
  maxItems?: number;
}

export function HorizontalBars({ data, formatValue = defaultFormat, maxItems }: HorizontalBarsProps) {
  if (!data.length) return <EmptyChart message="Sem dados disponíveis." />;
  const visible = typeof maxItems === 'number' ? data.slice(0, maxItems) : data;
  const max = Math.max(...visible.map((d) => d.value), 1);

  return (
    <div className="hbars">
      {visible.map((datum, index) => {
        const color = datum.color ?? chartPalette[index % chartPalette.length];
        const width = Math.max(2, (Math.max(0, datum.value) / max) * 100);
        return (
          <div className="hbar-row" key={`${datum.label}-${index}`}>
            <span className="hbar-label" title={datum.label}>{datum.label}</span>
            <div className="hbar-track">
              <span className="hbar-fill" style={{ width: `${width}%`, background: color }} />
            </div>
            <strong className="hbar-value">{formatValue(datum.value)}</strong>
          </div>
        );
      })}
    </div>
  );
}

interface DonutChartProps {
  data: ChartDatum[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
  formatValue?: (value: number) => string;
  ariaLabel?: string;
}

export function DonutChart({ data, height = 200, centerLabel, centerValue, formatValue = defaultFormat, ariaLabel = 'Gráfico circular' }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0);
  if (!data.length || total <= 0) return <EmptyChart message="Sem dados para distribuir." />;

  const size = 200;
  const radius = 72;
  const stroke = 26;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;
  let offset = 0;

  return (
    <div className="donut-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} className="donut-svg" style={{ maxHeight: height }} role="img" aria-label={ariaLabel}>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#eef1ee" strokeWidth={stroke} />
        {data.map((datum, index) => {
          const value = Math.max(0, datum.value);
          const fraction = value / total;
          const dash = fraction * circumference;
          const color = datum.color ?? chartPalette[index % chartPalette.length];
          const el = (
            <circle
              key={`${datum.label}-${index}`}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="butt"
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            >
              <title>{`${datum.label}: ${formatValue(value)}`}</title>
            </circle>
          );
          offset += dash;
          return el;
        })}
        {centerValue && (
          <text x={cx} y={cy - (centerLabel ? 2 : -5)} textAnchor="middle" fontSize="24" fontWeight="800" fill="#161817">{centerValue}</text>
        )}
        {centerLabel && (
          <text x={cx} y={cy + 18} textAnchor="middle" fontSize="9" fill="#68706b">{centerLabel}</text>
        )}
      </svg>
      <ul className="chart-legend chart-legend-vertical">
        {data.map((datum, index) => (
          <li key={`${datum.label}-${index}`}>
            <i style={{ background: datum.color ?? chartPalette[index % chartPalette.length] }} />
            <span>{datum.label}</span>
            <strong>{formatValue(datum.value)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
