import React, { useState } from 'react';
import { ToastProvider } from './components/Toast';
import { T } from './theme';

// Layout Components
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';

// Feature Components
import ProductList from './components/Products/ProductList';
import Cashier from './components/Cashier/Cashier';
import Transactions from './components/Transactions/Transactions';
import Dashboard from './components/Dashboard/Dashboard';
import Reports from './components/Reports/Reports';
import CategoryList from './components/Categories/CategoryList';
import InventoryList from './components/Inventory/InventoryList';
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
          currentPage={currentPage} 
          setCurrentPage={setCurrentPage} 
          sidebarOpen={sidebarOpen} 
          setSidebarOpen={setSidebarOpen} 
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          <Header 
            currentPageLabel={NAV.find(n => n.id === currentPage)?.label} 
            sidebarOpen={sidebarOpen} 
            setSidebarOpen={setSidebarOpen} 
          />

          <main style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            background: T.bg,
          }}>
            <div key={currentPage} className="page-content" style={{ maxWidth: 1400, margin: '0 auto' }}>
              {currentPage === 'dashboard'    && <Dashboard setCurrentPage={setCurrentPage} />}
              {currentPage === 'cashier'      && <Cashier />}
              {currentPage === 'products'     && <ProductList />}
              {currentPage === 'transactions' && <Transactions />}
              {currentPage === 'reports'      && <Reports />}
              {currentPage === 'inventory'    && <InventoryList />}
              {currentPage === 'categories'   && <CategoryList />}
              {currentPage === 'settings'     && <Settings />}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

export default App;
