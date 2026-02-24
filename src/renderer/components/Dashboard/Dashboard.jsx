import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  AlertTriangle,
  Calendar,
  DollarSign,
  BarChart3,
  Layers,
  PieChart,
  TrendingDown,
  Clock,
  Award,
  Target
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ComposedChart
} from 'recharts';
import { getDashboardData } from '../../services/dashboard';

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    const dashboardData = await getDashboardData();
    setData(dashboardData);
    setLoading(false);
  };

  const formatPrice = (price) => {
    return `Rp ${price.toLocaleString('id-ID')}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const getStockStatus = (stock, minStock) => {
    if (stock === 0) return 'bg-red-100 text-red-800';
    if (stock <= minStock) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  // Warna untuk chart
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  // Custom tooltip untuk chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className="text-lg font-bold text-blue-600">
            {formatPrice(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Siapkan data untuk pie chart (distribusi penjualan per kategori)
  const pieData = data.topProducts.map((item, index) => ({
    name: item.product_name.length > 15 ? item.product_name.substring(0, 15) + '...' : item.product_name,
    value: item.total_terjual,
    omzet: item.total_omzet
  }));

  return (
    <div className="space-y-6">
      {/* Header dengan Statistik Utama */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Produk */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Produk</p>
              <p className="text-3xl font-bold mt-1">{data.totalProducts}</p>
            </div>
            <div className="bg-white bg-opacity-30 p-3 rounded-lg">
              <Package size={28} />
            </div>
          </div>
          <div className="mt-4 text-blue-100 text-sm">
            <TrendingUp size={16} className="inline mr-1" />
            {data.totalCategories} Kategori
          </div>
        </div>

        {/* Penjualan Hari Ini */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Penjualan Hari Ini</p>
              <p className="text-3xl font-bold mt-1">{formatPrice(data.todaySales)}</p>
            </div>
            <div className="bg-white bg-opacity-30 p-3 rounded-lg">
              <DollarSign size={28} />
            </div>
          </div>
          <div className="mt-4 text-green-100 text-sm">
            <ShoppingCart size={16} className="inline mr-1" />
            {data.todayTransactions} Transaksi
          </div>
        </div>

        {/* Penjualan Bulan Ini */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Penjualan Bulan Ini</p>
              <p className="text-3xl font-bold mt-1">{formatPrice(data.monthSales)}</p>
            </div>
            <div className="bg-white bg-opacity-30 p-3 rounded-lg">
              <Calendar size={28} />
            </div>
          </div>
          <div className="mt-4 text-purple-100 text-sm">
            <Target size={16} className="inline mr-1" />
            Target: {formatPrice(data.monthSales * 1.2)}
          </div>
        </div>

        {/* Rata-rata Transaksi */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Rata-rata Transaksi</p>
              <p className="text-3xl font-bold mt-1">
                {formatPrice(data.todayTransactions > 0 
                  ? data.todaySales / data.todayTransactions 
                  : 0)}
              </p>
            </div>
            <div className="bg-white bg-opacity-30 p-3 rounded-lg">
              <Award size={28} />
            </div>
          </div>
          <div className="mt-4 text-orange-100 text-sm">
            <Clock size={16} className="inline mr-1" />
            Bulan ini: {data.topProducts.reduce((sum, p) => sum + p.total_terjual, 0)} item
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area Chart - Tren Penjualan */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-800">Tren Penjualan 7 Hari</h2>
            <div className="flex gap-2">
              {['week', 'month', 'year'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                    timeRange === range
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {range === 'week' ? 'Minggu' : range === 'month' ? 'Bulan' : 'Tahun'}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data.dailySales} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                stroke="#9CA3AF"
              />
              <YAxis 
                tickFormatter={(value) => `Rp ${(value/1000).toFixed(0)}k`}
                stroke="#9CA3AF"
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="#3B82F6" 
                fillOpacity={1} 
                fill="url(#colorSales)" 
                strokeWidth={3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Distribusi Produk Terlaris */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">Distribusi Penjualan</h2>
          
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <RePieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [
                      `${value} item (${formatPrice(props.payload.omzet)})`,
                      props.payload.name
                    ]}
                  />
                </RePieChart>
              </ResponsiveContainer>

              <div className="mt-4 space-y-2">
                {pieData.slice(0, 3).map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></span>
                      <span className="text-gray-600">{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value} item</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <PieChart size={48} className="mx-auto mb-2 opacity-50" />
                <p>Belum ada data</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bar Chart - Top Products */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
          <TrendingUp className="text-green-500" size={20} />
          5 Produk Terlaris
        </h2>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.topProducts} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis type="number" tickFormatter={(value) => `${value} item`} />
            <YAxis 
              type="category" 
              dataKey="product_name" 
              width={150}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value, name, props) => [
                `${value} item (${formatPrice(props.payload.total_omzet)})`,
                'Terjual'
              ]}
            />
            <Bar dataKey="total_terjual" fill="#3B82F6" radius={[0, 4, 4, 0]}>
              {data.topProducts.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Grid Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stok Menipis */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="text-yellow-500" size={20} />
            Stok Menipis
          </h2>
          
          {data.lowStock.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Package size={48} className="mx-auto mb-2 opacity-50" />
              <p>Semua stok aman</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.lowStock.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{product.name}</div>
                    <div className="text-sm text-gray-500">
                      Stok: <span className="font-bold text-red-500">{product.stock}</span> / Minimal: {product.min_stock}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStockStatus(product.stock, product.min_stock)}`}>
                    {product.stock === 0 ? 'Habis' : 'Menipis'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Tambahan */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Target size={20} className="text-purple-500" />
            Ringkasan Cepat
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 mb-1">Total Omzet</div>
              <div className="text-xl font-bold text-blue-700">{formatPrice(data.monthSales)}</div>
              <div className="text-xs text-blue-500 mt-1">Bulan ini</div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 mb-1">Total Item Terjual</div>
              <div className="text-xl font-bold text-green-700">
                {data.topProducts.reduce((sum, p) => sum + p.total_terjual, 0)}
              </div>
              <div className="text-xs text-green-500 mt-1">Bulan ini</div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600 mb-1">Rata-rata per Item</div>
              <div className="text-xl font-bold text-purple-700">
                {formatPrice(data.monthSales / (data.topProducts.reduce((sum, p) => sum + p.total_terjual, 0) || 1))}
              </div>
              <div className="text-xs text-purple-500 mt-1">Estimasi</div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-sm text-yellow-600 mb-1">Transaksi per Hari</div>
              <div className="text-xl font-bold text-yellow-700">
                {Math.round(data.todayTransactions / (new Date().getDate() || 1))}
              </div>
              <div className="text-xs text-yellow-500 mt-1">Rata-rata</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-3">Aksi Cepat</h3>
            <div className="grid grid-cols-2 gap-2">
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm transition">
                + Tambah Stok
              </button>
              <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm transition">
                📊 Laporan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;