import React, { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const mockData = {
  totalProducts: 248,
  totalCategories: 12,
  todaySales: 4850000,
  todayTransactions: 34,
  monthSales: 128750000,
  dailySales: [
    { date: '2024-01-20', total: 3200000 },
    { date: '2024-01-21', total: 5100000 },
    { date: '2024-01-22', total: 2800000 },
    { date: '2024-01-23', total: 6700000 },
    { date: '2024-01-24', total: 4300000 },
    { date: '2024-01-25', total: 7200000 },
    { date: '2024-01-26', total: 4850000 },
  ],
  topProducts: [
    { product_name: 'Kopi Arabica Premium', total_terjual: 142, total_omzet: 8520000 },
    { product_name: 'Teh Hijau Organik', total_terjual: 118, total_omzet: 5900000 },
    { product_name: 'Susu Almond', total_terjual: 95, total_omzet: 7125000 },
    { product_name: 'Granola Sehat', total_terjual: 87, total_omzet: 4350000 },
    { product_name: 'Madu Hutan', total_terjual: 73, total_omzet: 6570000 },
  ],
  lowStock: [
    { id: 1, name: 'Kopi Arabica Premium', stock: 3, min_stock: 10 },
    { id: 2, name: 'Madu Hutan', stock: 0, min_stock: 5 },
    { id: 3, name: 'Teh Hijau Organik', stock: 7, min_stock: 15 },
  ],
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;
const fmtShort = (n) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : `${(n/1000).toFixed(0)}K`;
const fmtDate = (s) => new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

// ─── STYLE TOKENS ─────────────────────────────────────────────────────────────
const T = {
  bg:      '#0E0F11',
  surface: '#161719',
  border:  '#1F2023',
  border2: '#2A2B2F',
  text:    '#F0EDE6',
  muted:   '#5C5C66',
  sub:     '#9998A3',
  accent:  '#F5A623',
  accentD: '#C07D0F',
  green:   '#34C98B',
  red:     '#E85858',
  blue:    '#5B8AF5',
  purple:  '#A78BFA',
};

const PALETTE = [T.accent, T.green, T.blue, T.purple, T.red];

// ─── SUBCOMPONENTS ────────────────────────────────────────────────────────────

function AnimatedNumber({ value, duration = 1200, prefix = '', suffix = '' }) {
  const [display, setDisplay] = useState(0);
  const start = useRef(null);
  const raf = useRef(null);

  useEffect(() => {
    start.current = null;
    const target = Number(value);
    const step = (ts) => {
      if (!start.current) start.current = ts;
      const prog = Math.min((ts - start.current) / duration, 1);
      const ease = 1 - Math.pow(1 - prog, 3);
      setDisplay(Math.round(ease * target));
      if (prog < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return <>{prefix}{Number(display).toLocaleString('id-ID')}{suffix}</>;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border2}`,
      borderRadius: 10,
      padding: '10px 14px',
      fontFamily: 'inherit',
    }}>
      <div style={{ fontSize: 11, color: T.sub, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.accent }}>
        Rp {Number(payload[0].value).toLocaleString('id-ID')}
      </div>
    </div>
  );
};

function Chip({ children, color = T.accent }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 100,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      background: color + '18',
      color,
      border: `1px solid ${color}30`,
    }}>
      {children}
    </span>
  );
}

function StatCard({ label, value, sub, accent = T.accent, index = 0, large = false }) {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 16,
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      animation: `fadeUp 0.5s ease both`,
      animationDelay: `${index * 80}ms`,
    }}>
      {/* Decorative circle */}
      <div style={{
        position: 'absolute', right: -20, top: -20,
        width: 80, height: 80, borderRadius: '50%',
        background: accent + '10',
        border: `1px solid ${accent}20`,
      }} />
      <div style={{
        position: 'absolute', right: 10, top: 10,
        width: 40, height: 40, borderRadius: '50%',
        background: accent + '12',
      }} />

      <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.muted, marginBottom: 12 }}>
        {label}
      </p>
      <p style={{ fontSize: large ? 28 : 24, fontWeight: 800, color: T.text, lineHeight: 1.1, marginBottom: 10, fontVariantNumeric: 'tabular-nums' }}>
        <AnimatedNumber value={value} />
      </p>
      <div style={{ fontSize: 12, color: T.sub }}>{sub}</div>

      {/* Bottom accent line */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${accent}, transparent)` }} />
    </div>
  );
}

function SectionTitle({ children, icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.sub }}>
        {children}
      </span>
      <div style={{ flex: 1, height: 1, background: T.border }} />
    </div>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [data] = useState(mockData);
  const [tab, setTab] = useState('week');

  const totalSold = data.topProducts.reduce((s, p) => s + p.total_terjual, 0);
  const avgTx = data.todayTransactions > 0 ? data.todaySales / data.todayTransactions : 0;

  const pieData = data.topProducts.map((p) => ({
    name: p.product_name.length > 12 ? p.product_name.slice(0, 12) + '…' : p.product_name,
    value: p.total_terjual,
  }));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: ${T.bg}; color: ${T.text}; font-family: 'Syne', sans-serif; min-height: 100vh; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border2}; border-radius: 4px; }

        .tab-btn {
          padding: 6px 14px;
          border-radius: 8px;
          border: 1px solid ${T.border2};
          background: transparent;
          color: ${T.sub};
          font-family: 'Syne', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab-btn:hover { border-color: ${T.accent}40; color: ${T.accent}; }
        .tab-btn.active { background: ${T.accent}15; border-color: ${T.accent}50; color: ${T.accent}; }

        .bar-fill {
          background: ${T.border2};
          border-radius: 100px;
          height: 6px;
          overflow: hidden;
        }
        .bar-fill-inner {
          height: 100%;
          border-radius: 100px;
          transition: width 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px', minHeight: '100vh' }}>

        {/* ── TOP NAV ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, animation: 'fadeUp 0.4s ease both' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="1" width="5" height="5" rx="1.5" fill="#0E0F11"/>
                  <rect x="8" y="1" width="5" height="5" rx="1.5" fill="#0E0F11"/>
                  <rect x="1" y="8" width="5" height="5" rx="1.5" fill="#0E0F11"/>
                  <rect x="8" y="8" width="5" height="5" rx="1.5" fill="#0E0F11"/>
                </svg>
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, color: T.text, letterSpacing: '-0.01em' }}>
                Analitik
              </span>
            </div>
            <span style={{ fontSize: 12, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Live indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 100, background: T.green + '15', border: `1px solid ${T.green}30` }}>
              <div style={{ position: 'relative', width: 7, height: 7 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: T.green }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: T.green, animation: 'pulse-ring 1.5s ease-out infinite' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: T.green, letterSpacing: '0.06em' }}>LIVE</span>
            </div>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
          <StatCard
            index={0} label="Total Produk" accent={T.blue}
            value={data.totalProducts}
            sub={<Chip color={T.blue}>{data.totalCategories} Kategori</Chip>}
          />
          <StatCard
            index={1} label="Penjualan Hari Ini" accent={T.accent}
            value={data.todaySales}
            sub={<Chip color={T.accent}>{data.todayTransactions} Transaksi</Chip>}
          />
          <StatCard
            index={2} label="Penjualan Bulan Ini" accent={T.green}
            value={data.monthSales}
            sub={<span style={{ fontSize: 12, color: T.sub }}>Target: {fmtShort(data.monthSales * 1.2)}</span>}
          />
          <StatCard
            index={3} label="Rata-rata Transaksi" accent={T.purple}
            value={Math.round(avgTx)}
            sub={<span style={{ fontSize: 12, color: T.sub }}>{totalSold} item terjual bulan ini</span>}
          />
        </div>

        {/* ── CHARTS ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginBottom: 24 }}>

          {/* Area Chart */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: '24px', animation: 'fadeUp 0.5s ease 0.3s both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <SectionTitle icon="〰">Tren Penjualan</SectionTitle>
                <p style={{ fontSize: 28, fontWeight: 800, color: T.text, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                  Rp {fmtShort(data.dailySales.reduce((s, d) => s + d.total, 0))}
                </p>
                <p style={{ fontSize: 12, color: T.sub, marginTop: 4 }}>Total 7 hari terakhir</p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['week', 'month', 'year'].map((r) => (
                  <button key={r} className={`tab-btn ${tab === r ? 'active' : ''}`} onClick={() => setTab(r)}>
                    {r === 'week' ? 'Minggu' : r === 'month' ? 'Bulan' : 'Tahun'}
                  </button>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.dailySales} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.accent} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={T.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 6" stroke={T.border} vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fill: T.muted, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} tick={{ fill: T.muted, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: T.accent, strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="total" stroke={T.accent} strokeWidth={2.5} fill="url(#gSales)" dot={false} activeDot={{ r: 5, fill: T.accent, stroke: T.bg, strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Donut Chart */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: '24px', animation: 'fadeUp 0.5s ease 0.4s both' }}>
            <SectionTitle icon="◎">Distribusi</SectionTitle>

            <ResponsiveContainer width="100%" height={160}>
              <RePieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, n) => [`${v} item`, n]}
                  contentStyle={{ background: T.surface, border: `1px solid ${T.border2}`, borderRadius: 10, fontFamily: 'inherit', fontSize: 12 }}
                  labelStyle={{ color: T.sub }}
                  itemStyle={{ color: T.text }}
                />
              </RePieChart>
            </ResponsiveContainer>

            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pieData.slice(0, 4).map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: T.sub, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.text, fontFamily: 'JetBrains Mono, monospace' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── BOTTOM ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>

          {/* Top Products horizontal bars */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: '24px', animation: 'fadeUp 0.5s ease 0.5s both' }}>
            <SectionTitle icon="▲">5 Produk Terlaris</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {data.topProducts.map((p, i) => {
                const pct = Math.round((p.total_terjual / data.topProducts[0].total_terjual) * 100);
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: 6, background: PALETTE[i % PALETTE.length] + '20',
                          border: `1px solid ${PALETTE[i % PALETTE.length]}40`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 800, color: PALETTE[i % PALETTE.length], fontFamily: 'JetBrains Mono, monospace',
                          flexShrink: 0,
                        }}>{i + 1}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{p.product_name}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: T.text, fontFamily: 'JetBrains Mono, monospace' }}>{p.total_terjual}</span>
                        <span style={{ fontSize: 10, color: T.muted, marginLeft: 4 }}>item</span>
                      </div>
                    </div>
                    <div className="bar-fill">
                      <div
                        className="bar-fill-inner"
                        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${PALETTE[i % PALETTE.length]}, ${PALETTE[i % PALETTE.length]}80)` }}
                      />
                    </div>
                    <div style={{ fontSize: 10, color: T.muted, marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                      {fmt(p.total_omzet)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Low Stock */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: '24px', animation: 'fadeUp 0.5s ease 0.6s both' }}>
              <SectionTitle icon="⚠">Stok Menipis</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.lowStock.map((p) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: T.bg, border: `1px solid ${T.border}` }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 2 }}>{p.name}</p>
                      <p style={{ fontSize: 11, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>min {p.min_stock} unit</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        display: 'block',
                        fontSize: 20, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace',
                        color: p.stock === 0 ? T.red : T.accent,
                        lineHeight: 1,
                      }}>{p.stock}</span>
                      <Chip color={p.stock === 0 ? T.red : T.accent}>
                        {p.stock === 0 ? 'Habis' : 'Menipis'}
                      </Chip>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Summary */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: '24px', animation: 'fadeUp 0.5s ease 0.7s both' }}>
              <SectionTitle icon="◆">Ringkasan</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Omzet Bulan Ini', val: `Rp ${fmtShort(data.monthSales)}`, color: T.accent },
                  { label: 'Item Terjual', val: totalSold, color: T.green },
                  { label: 'Rata-rata/Item', val: `Rp ${fmtShort(data.monthSales / (totalSold || 1))}`, color: T.purple },
                  { label: 'Tx per Hari', val: Math.round(data.todayTransactions / (new Date().getDate() || 1)), color: T.blue },
                ].map((s, i) => (
                  <div key={i} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px' }}>
                    <p style={{ fontSize: 10, color: T.muted, marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.label}</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.val}</p>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: '+ Tambah Stok', color: T.green },
                  { label: '↗ Laporan', color: T.accent },
                ].map((btn, i) => (
                  <button key={i} style={{
                    padding: '9px 0', borderRadius: 10,
                    background: btn.color + '12', border: `1px solid ${btn.color}30`,
                    color: btn.color, fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700,
                    letterSpacing: '0.04em', cursor: 'pointer', transition: 'all 0.2s',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = btn.color + '22'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = btn.color + '12'; }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}