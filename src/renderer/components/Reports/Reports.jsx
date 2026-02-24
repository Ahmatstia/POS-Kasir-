import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Calendar, 
  PieChart,
  TrendingUp,
  Package,
  AlertTriangle,
  BarChart3,
  Printer,
  ChevronDown,
  Search,
  DollarSign,
  ShoppingBag,
  Clock
} from 'lucide-react';
import { getSalesReport, getStockReport, exportToCSV } from '../../services/reports';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  BarChart, Bar, LineChart, Line, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

function Reports() {
  const [activeTab, setActiveTab] = useState('sales'); // 'sales' atau 'stock'
  const [loading, setLoading] = useState(false);
  const [salesReport, setSalesReport] = useState(null);
  const [stockReport, setStockReport] = useState(null);
  
  // State untuk filter tanggal
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Warna untuk chart
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  const loadSalesReport = async () => {
    setLoading(true);
    const data = await getSalesReport(dateRange.startDate, dateRange.endDate);
    setSalesReport(data);
    setLoading(false);
  };

  const loadStockReport = async () => {
    setLoading(true);
    const data = await getStockReport();
    setStockReport(data);
    setLoading(false);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'sales' && !salesReport) {
      loadSalesReport();
    } else if (tab === 'stock' && !stockReport) {
      loadStockReport();
    }
  };

  const formatPrice = (price) => {
    return `Rp ${price.toLocaleString('id-ID')}`;
  };

  const formatNumber = (num) => {
    return num.toLocaleString('id-ID');
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return format(date, 'dd MMM yyyy', { locale: id });
  };

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

  // Preset date ranges
  const datePresets = [
    { label: 'Hari Ini', days: 0 },
    { label: 'Kemarin', days: 1 },
    { label: '7 Hari', days: 7 },
    { label: '30 Hari', days: 30 },
    { label: 'Bulan Ini', days: 'month' },
    { label: 'Bulan Lalu', days: 'lastMonth' },
  ];

  const applyDatePreset = (preset) => {
    const today = new Date();
    let startDate, endDate = today;

    if (preset === 'month') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (preset === 'lastMonth') {
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      endDate = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (preset.days === 0) {
      startDate = today;
    } else {
      startDate = new Date(today);
      startDate.setDate(today.getDate() - preset.days);
    }

    setDateRange({
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    });
    setShowDatePicker(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FileText size={24} className="text-blue-500" />
          Laporan & Analisis
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (activeTab === 'sales' && salesReport?.dailySales) {
                exportToCSV(salesReport.dailySales, `laporan_penjualan_${dateRange.startDate}_${dateRange.endDate}`);
              } else if (activeTab === 'stock' && stockReport?.stockByCategory) {
                exportToCSV(stockReport.stockByCategory, 'laporan_stok');
              }
            }}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Download size={18} /> Export CSV
          </button>
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <Printer size={18} /> Cetak
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => handleTabChange('sales')}
          className={`px-6 py-3 font-medium text-sm flex items-center gap-2 ${
            activeTab === 'sales'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <TrendingUp size={18} /> Laporan Penjualan
        </button>
        <button
          onClick={() => handleTabChange('stock')}
          className={`px-6 py-3 font-medium text-sm flex items-center gap-2 ${
            activeTab === 'stock'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Package size={18} /> Laporan Stok
        </button>
      </div>

      {/* Date Range Picker (untuk laporan penjualan) */}
      {activeTab === 'sales' && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg"
              >
                <Calendar size={18} />
                {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
                <ChevronDown size={16} />
              </button>

              {showDatePicker && (
                <div className="absolute top-12 left-0 bg-white shadow-xl rounded-lg p-4 z-10 w-64">
                  <p className="text-sm font-medium text-gray-700 mb-2">Pilih Periode</p>
                  <div className="space-y-2">
                    {datePresets.map((preset, index) => (
                      <button
                        key={index}
                        onClick={() => applyDatePreset(preset)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">Atau pilih manual:</p>
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-1 text-sm mb-2"
                    />
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-1 text-sm mb-2"
                    />
                    <button
                      onClick={() => {
                        loadSalesReport();
                        setShowDatePicker(false);
                      }}
                      className="w-full bg-blue-500 text-white py-2 rounded text-sm hover:bg-blue-600"
                    >
                      Terapkan
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={loadSalesReport}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Search size={18} /> Tampilkan
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Laporan Penjualan */}
      {activeTab === 'sales' && salesReport && !loading && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Penjualan</p>
                  <p className="text-2xl font-bold mt-1">{formatPrice(salesReport.summary.total_sales)}</p>
                </div>
                <div className="bg-white bg-opacity-30 p-3 rounded-lg">
                  <DollarSign size={24} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Jumlah Transaksi</p>
                  <p className="text-2xl font-bold mt-1">{formatNumber(salesReport.summary.total_transactions)}</p>
                </div>
                <div className="bg-white bg-opacity-30 p-3 rounded-lg">
                  <ShoppingBag size={24} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Rata-rata per Transaksi</p>
                  <p className="text-2xl font-bold mt-1">{formatPrice(salesReport.summary.average_sales)}</p>
                </div>
                <div className="bg-white bg-opacity-30 p-3 rounded-lg">
                  <BarChart3 size={24} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm">Hari Aktif</p>
                  <p className="text-2xl font-bold mt-1">{salesReport.summary.active_days} hari</p>
                </div>
                <div className="bg-white bg-opacity-30 p-3 rounded-lg">
                  <Calendar size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Grafik Penjualan Harian */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-6">Tren Penjualan Harian</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={salesReport.dailySales}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis tickFormatter={(value) => formatPrice(value)} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total" stroke="#3B82F6" fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Grid 2 Kolom */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Metode Pembayaran */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Metode Pembayaran</h2>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={salesReport.paymentMethods}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="count"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {salesReport.paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Jam Sibuk */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Clock size={18} /> Jam Sibuk
              </h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={salesReport.peakHours}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tickFormatter={(hour) => `${hour}:00`} />
                  <YAxis yAxisId="left" orientation="left" stroke="#3B82F6" />
                  <YAxis yAxisId="right" orientation="right" stroke="#10B981" />
                  <Tooltip />
                  <Bar yAxisId="left" dataKey="transaction_count" fill="#3B82F6" name="Transaksi" />
                  <Bar yAxisId="right" dataKey="total" fill="#10B981" name="Total" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Produk Terlaris */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">10 Produk Terlaris</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Terjual</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frekuensi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salesReport.topProducts.map((product, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{product.product_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{product.total_quantity} item</td>
                      <td className="px-6 py-4 whitespace-nowrap">{product.times_sold}x</td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-blue-600">
                        {formatPrice(product.total_sales)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Kategori Terlaris */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Penjualan per Kategori</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jumlah Produk</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Terjual</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Penjualan</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salesReport.topCategories.map((category, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{category.category_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{category.product_count} produk</td>
                      <td className="px-6 py-4 whitespace-nowrap">{category.total_quantity} item</td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-blue-600">
                        {formatPrice(category.total_sales)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Laporan Stok */}
      {activeTab === 'stock' && stockReport && !loading && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Total Produk</p>
                  <p className="text-2xl font-bold mt-1">{stockReport.summary.total_products}</p>
                </div>
                <div className="bg-white bg-opacity-30 p-3 rounded-lg">
                  <Package size={24} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Total Stok</p>
                  <p className="text-2xl font-bold mt-1">{formatNumber(stockReport.summary.total_stock)} item</p>
                </div>
                <div className="bg-white bg-opacity-30 p-3 rounded-lg">
                  <BarChart3 size={24} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">Stok Menipis</p>
                  <p className="text-2xl font-bold mt-1">{stockReport.summary.low_stock_count} produk</p>
                </div>
                <div className="bg-white bg-opacity-30 p-3 rounded-lg">
                  <AlertTriangle size={24} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm">Stok Habis</p>
                  <p className="text-2xl font-bold mt-1">{stockReport.summary.out_of_stock_count} produk</p>
                </div>
                <div className="bg-white bg-opacity-30 p-3 rounded-lg">
                  <Package size={24} />
                </div>
              </div>
            </div>
          </div>

          {/* Stok per Kategori */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Stok per Kategori</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jumlah Produk</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Stok</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nilai Stok (Pcs)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nilai Stok (Pack)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nilai Stok (Kg)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stockReport.stockByCategory.map((category, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{category.category_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{category.product_count}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{category.total_stock}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{formatPrice(category.total_value_pcs)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{formatPrice(category.total_value_pack)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{formatPrice(category.total_value_kg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Produk Stok Menipis */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="text-yellow-500" size={20} />
              Produk dengan Stok Menipis
            </h2>
            
            {stockReport.lowStock.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Package size={48} className="mx-auto mb-2 opacity-50" />
                <p>Semua stok aman</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stok</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Stok</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stockReport.lowStock.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap font-medium">{product.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{product.category_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-bold text-red-600">{product.stock}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{product.min_stock}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            product.stock === 0 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {product.stock === 0 ? 'Habis' : 'Menipis'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;