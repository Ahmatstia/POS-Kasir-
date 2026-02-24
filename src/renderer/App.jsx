import React, { useState } from 'react';
import ProductList from './components/Products/ProductList';
import Cashier from './components/Cashier/Cashier';
import Transactions from './components/Transactions/Transactions';
import Dashboard from './components/Dashboard/Dashboard';
import Reports from './components/Reports/Reports'; // <-- TAMBAHKAN

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center">
            <span className="mr-2">🧂</span> 
            POS Toko Bumbu
          </h1>
          <nav className="flex gap-4">
            <button 
              onClick={() => setCurrentPage('dashboard')}
              className={`px-3 py-2 rounded ${currentPage === 'dashboard' ? 'bg-blue-700' : 'hover:bg-blue-500'}`}
            >
              📊 Dashboard
            </button>
            <button 
              onClick={() => setCurrentPage('cashier')}
              className={`px-3 py-2 rounded ${currentPage === 'cashier' ? 'bg-blue-700' : 'hover:bg-blue-500'}`}
            >
              🛒 Kasir
            </button>
            <button 
              onClick={() => setCurrentPage('products')}
              className={`px-3 py-2 rounded ${currentPage === 'products' ? 'bg-blue-700' : 'hover:bg-blue-500'}`}
            >
              📦 Produk
            </button>
            <button 
              onClick={() => setCurrentPage('transactions')}
              className={`px-3 py-2 rounded ${currentPage === 'transactions' ? 'bg-blue-700' : 'hover:bg-blue-500'}`}
            >
              📋 Transaksi
            </button>
            <button 
              onClick={() => setCurrentPage('reports')}
              className={`px-3 py-2 rounded ${currentPage === 'reports' ? 'bg-blue-700' : 'hover:bg-blue-500'}`}
            >
              📈 Laporan
            </button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto p-4">
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'cashier' && <Cashier />}
        {currentPage === 'products' && <ProductList />}
        {currentPage === 'transactions' && <Transactions />}
        {currentPage === 'reports' && <Reports />}
      </main>
    </div>
  );
}

export default App;