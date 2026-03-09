import React, { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { getDashboardData } from '../../services/dashboard';
import { T } from '../../theme';

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (n) => `Rp ${Number(n || 0).toLocaleString('id-ID')}`;
const fmtShort = (n) => {
  const num = Number(n || 0);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return String(num);
};
const fmtDate = (s) => {
  if (!s) return '-';
  // created_at kini disimpan sebagai waktu lokal WIB, parse langsung
  const normalized = typeof s === 'string' ? s.replace(' ', 'T') : s;
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getDashboardData();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 320 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 36, height: 36,
            border: `2px solid ${T.border2}`,
            borderTopColor: T.accent,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px',
          }} />
          <p style={{ fontSize: 11, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Memuat dashboard…
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 320, flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: T.red }}>Gagal memuat data</p>
        <p style={{ fontSize: 12, color: T.muted }}>{error}</p>
        <button onClick={loadDashboard} style={{
          padding: '8px 18px', borderRadius: 10,
          border: `1px solid ${T.accent}40`, background: T.accent + '14',
          color: T.accent, fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}>Coba Lagi</button>
      </div>
    );
  }

  const totalSold = (data.topProducts || []).reduce((s, p) => s + (p.total_terjual || 0), 0);
  const avgTx = data.todayTransactions > 0 ? data.todaySales / data.todayTransactions : 0;

  const pieData = (data.topProducts || []).map((p) => ({
    name: p.product_name.length > 12 ? p.product_name.slice(0, 12) + '…' : p.product_name,
    value: p.total_terjual,
  }));

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: ${T.bg}; color: ${T.text}; font-family: 'Syne', sans-serif; min-height: 100vh; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
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
            {/* Refresh */}
            <button onClick={loadDashboard} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 100,
              background: T.border, border: `1px solid ${T.border2}`,
              color: T.sub, fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M1.5 5.5A4 4 0 115 1.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M1.5 2.5v3h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Refresh
            </button>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
          <StatCard
            index={0} label="Omzet Hari Ini" accent={T.accent}
            value={data.todaySales || 0}
            sub={<Chip color={T.accent}>{data.todayTransactions || 0} Transaksi</Chip>}
          />
          <StatCard
            index={1} label="Omzet Bulan Ini" accent={T.blue}
            value={data.monthSales || 0}
            sub={<span style={{ fontSize: 12, color: T.sub }}>Target: {fmtShort((data.monthSales || 0) * 1.2)}</span>}
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
                  Rp {fmtShort((data.dailySales || []).reduce((s, d) => s + (d.total || 0), 0))}
                </p>
                <p style={{ fontSize: 12, color: T.sub, marginTop: 4 }}>Total 7 hari terakhir</p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{
                  padding: '6px 14px', borderRadius: 8,
                  background: T.accent + '15', border: `1px solid ${T.accent}50`,
                  color: T.accent, fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                }}>
                  7 Hari
                </span>
              </div>
            </div>

            {(data.dailySales || []).length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, color: T.muted, fontSize: 13 }}>
                Belum ada data penjualan
              </div>
            ) : (
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
            )}
          </div>

          {/* Donut Chart */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: '24px', animation: 'fadeUp 0.5s ease 0.4s both' }}>
            <SectionTitle icon="◎">Distribusi</SectionTitle>

            {pieData.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: T.muted, fontSize: 12 }}>
                Belum ada data
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* ── BOTTOM ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>

          {/* Top Products horizontal bars */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: '24px', animation: 'fadeUp 0.5s ease 0.5s both' }}>
            <SectionTitle icon="▲">5 Produk Terlaris</SectionTitle>
            {(data.topProducts || []).length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: T.muted, fontSize: 13 }}>
                Belum ada data penjualan bulan ini
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {data.topProducts.map((p, i) => {
                  const pct = Math.round((p.total_terjual / (data.topProducts[0].total_terjual || 1)) * 100);
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
            )}
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Low Stock */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: '24px', animation: 'fadeUp 0.5s ease 0.6s both' }}>
              <SectionTitle icon="⚠">Stok Menipis</SectionTitle>
              {(data.lowStock || []).length === 0 ? (
                <p style={{ fontSize: 12, color: T.muted, textAlign: 'center', padding: '20px 0' }}>Semua stok aman ✓</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data.lowStock.map((p) => {
                    const isKg = p.sell_per_unit === 'kg';
                    const current = isKg ? p.total_stock_kg : p.total_stock;
                    const min = isKg ? p.min_stock_kg : p.min_stock;
                    const unit = isKg ? 'kg' : 'unit';
                    
                    return (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, background: T.bg, border: `1px solid ${T.border}` }}>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 2 }}>{p.name}</p>
                          <p style={{ fontSize: 11, color: T.muted, fontFamily: 'JetBrains Mono, monospace' }}>min {min} {unit}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{
                            display: 'block',
                            fontSize: 20, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace',
                            color: current <= 0 ? T.red : T.accent,
                            lineHeight: 1,
                          }}>{current}</span>
                          <Chip color={current <= 0 ? T.red : T.accent}>
                            {current <= 0 ? 'Habis' : 'Menipis'}
                          </Chip>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Summary */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: '24px', animation: 'fadeUp 0.5s ease 0.7s both' }}>
              <SectionTitle icon="◆">Ringkasan</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Omzet Bulan Ini', val: `Rp ${fmtShort(data.monthSales || 0)}`, color: T.accent },
                  { label: 'Item Terjual', val: totalSold, color: T.green },
                  { label: 'Rata-rata/Tx', val: `Rp ${fmtShort(avgTx)}`, color: T.purple },
                  { label: 'Tx Hari Ini', val: data.todayTransactions || 0, color: T.blue },
                ].map((s, i) => (
                  <div key={i} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px' }}>
                    <p style={{ fontSize: 10, color: T.muted, marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s.label}</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.val}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}