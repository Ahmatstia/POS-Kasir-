import React, { useState } from 'react';
import { ToastProvider } from './components/Toast';
import { T } from './theme';

// Layout Components
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';

// Feature Components
import GoodsHub from './components/Products/GoodsHub';
import Cashier from './components/Cashier/Cashier';
import Transactions from './components/Transactions/Transactions';
import CustomerDebts from './components/Debts/CustomerDebts';
import CustomerManagement from './components/Customers/CustomerManagement';
import PromotionManagement from './components/Promotions/PromotionManagement';
import ShiftsManagement from './components/Shifts/ShiftsManagement';
import Dashboard from './components/Dashboard/Dashboard';
import Reports from './components/Reports/Reports';
import Settings from './components/Settings/Settings';

// Constants
import { NAV } from './constants/navigation';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <ToastProvider>
      <div style={{ display: 'flex', height: '100vh', background: T.bg }}>
        
        <Sidebar 
          currentPage={currentPage === 'inventory' || currentPage === 'categories' ? 'products' : currentPage} 
          setCurrentPage={setCurrentPage} 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          <Header 
            currentPageLabel={NAV.find(n => n.id === (currentPage === 'inventory' || currentPage === 'categories' ? 'products' : currentPage))?.label || 'Produk'} 
            sidebarOpen={sidebarOpen} 
            setSidebarOpen={setSidebarOpen} 
          />

          <main style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 18px',
            background: T.bg,
          }}>
            <div key={currentPage} className="page-content" style={{
              maxWidth: 1600,
              width: '100%',
              margin: '0 auto',
            }}>
              {currentPage === 'dashboard'    && <Dashboard setCurrentPage={setCurrentPage} />}
              {currentPage === 'cashier'      && <Cashier setCurrentPage={setCurrentPage} />}
              {currentPage === 'customers'    && <CustomerManagement />}
              {currentPage === 'promos'       && <PromotionManagement />}
              {currentPage === 'shifts'       && <ShiftsManagement />}
              {currentPage === 'products'     && <GoodsHub defaultTab="products" />}
              {currentPage === 'inventory'    && <GoodsHub defaultTab="inventory" />}
              {currentPage === 'categories'   && <GoodsHub defaultTab="categories" />}
              {currentPage === 'transactions' && <Transactions />}
              {currentPage === 'debts'        && <CustomerDebts />}
              {currentPage === 'reports'      && <Reports />}
              {currentPage === 'settings'     && <Settings />}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

export default App;
