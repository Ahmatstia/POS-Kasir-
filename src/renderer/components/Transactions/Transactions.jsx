import React, { useState, useEffect } from 'react';
import { getTransactions, getTransactionDetail } from '../../services/transactions';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Receipt, Search, Eye, Printer } from 'lucide-react';
import { printReceipt, printThermalReceipt } from '../../utils/PrintUtility';

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    setLoading(true);
    const data = await getTransactions(100);
    setTransactions(data);
    setLoading(false);
  };

  const viewDetail = async (id) => {
    setDetailLoading(true);
    const detail = await getTransactionDetail(id);
    setSelectedTransaction(detail);
    setDetailLoading(false);
  };

  const formatPrice = (price) => {
    return `Rp ${price.toLocaleString()}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return format(date, 'dd MMM yyyy HH:mm', { locale: id });
  };

  const getMethodIcon = (method) => {
    switch(method) {
      case 'cash': return '💵';
      case 'debit': return '💳';
      case 'qris': return '📱';
      default: return '💵';
    }
  };

 const handlePrint = (type = 'normal') => {
  if (!selectedTransaction) return;
  
  if (type === 'thermal') {
    printThermalReceipt(selectedTransaction.transaction, selectedTransaction.items);
  } else {
    printReceipt(selectedTransaction.transaction, selectedTransaction.items);
  }
};

  const filteredTransactions = transactions.filter(t => 
    t.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.customer_name && t.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-120px)]">
      {/* Left Panel - List Transaksi */}
      <div className="w-1/2 bg-white rounded-lg shadow p-4 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Receipt size={20} /> Riwayat Transaksi
          </h2>
          <button
            onClick={loadTransactions}
            className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari invoice atau customer..."
            className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Tidak ada transaksi
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.map((t) => (
                <div
                  key={t.id}
                  onClick={() => viewDetail(t.id)}
                  className={`p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition ${
                    selectedTransaction?.transaction?.id === t.id ? 'bg-blue-50 border-blue-300' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{t.invoice_no}</div>
                      <div className="text-sm text-gray-500">
                        {formatDate(t.created_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">
                        {formatPrice(t.total_amount)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getMethodIcon(t.payment_method)} {t.payment_method}
                      </div>
                    </div>
                  </div>
                  {t.customer_name && (
                    <div className="text-xs text-gray-400 mt-1">
                      Customer: {t.customer_name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Detail Transaksi */}
      <div className="w-1/2 bg-white rounded-lg shadow p-4 flex flex-col">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Eye size={20} /> Detail Transaksi
        </h2>

        {detailLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : selectedTransaction ? (
          <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-sm text-gray-500">Invoice</div>
                  <div className="font-bold text-lg">{selectedTransaction.transaction.invoice_no}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Tanggal</div>
                  <div>{formatDate(selectedTransaction.transaction.created_at)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <div className="text-sm text-gray-500">Metode Bayar</div>
                  <div>{getMethodIcon(selectedTransaction.transaction.payment_method)} {selectedTransaction.transaction.payment_method}</div>
                </div>
                {selectedTransaction.transaction.customer_name && (
                  <div>
                    <div className="text-sm text-gray-500">Customer</div>
                    <div>{selectedTransaction.transaction.customer_name}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="mb-4">
              <h3 className="font-medium mb-2">Item Belanja</h3>
              <div className="space-y-2">
                {selectedTransaction.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="font-medium">{item.product_name}</div>
                      <div className="text-sm text-gray-500">
                        {item.quantity} {item.unit} x {formatPrice(item.price_per_unit)}
                      </div>
                    </div>
                    <div className="font-bold">
                      {formatPrice(item.subtotal)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex justify-between mb-2">
                <span>Subtotal</span>
                <span>{formatPrice(selectedTransaction.transaction.subtotal)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Diskon</span>
                <span>{formatPrice(selectedTransaction.transaction.discount)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-blue-600">{formatPrice(selectedTransaction.transaction.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>Bayar</span>
                <span>{formatPrice(selectedTransaction.transaction.payment_amount)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Kembali</span>
                <span className="text-green-600">{formatPrice(selectedTransaction.transaction.change_amount)}</span>
              </div>
            </div>

            {/* Actions */}
                <div className="flex gap-2 mt-6">
                <button
                    onClick={() => handlePrint('normal')}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
                >
                    <Printer size={18} /> Cetak Struk
                </button>
                <button
                    onClick={() => handlePrint('thermal')}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg flex items-center justify-center gap-2 text-sm"
                >
                    <Printer size={18} /> Thermal 58mm
                </button>
                </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Receipt size={48} className="mx-auto mb-2 opacity-50" />
              <p>Pilih transaksi untuk melihat detail</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Transactions;