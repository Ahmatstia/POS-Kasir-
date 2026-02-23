import React, { useState, useEffect } from "react";

function PaymentModal({ total, onClose, onConfirm }) {
  const [payment, setPayment] = useState("");
  const [change, setChange] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");

  useEffect(() => {
    const paymentNum = parseInt(payment) || 0;
    setChange(paymentNum - total);
  }, [payment, total]);

  const handleConfirm = () => {
    const paymentNum = parseInt(payment) || 0;
    if (paymentNum < total) {
      alert("Uang pembayaran kurang!");
      return;
    }

    onConfirm({
      payment: paymentNum,
      change: paymentNum - total,
      method: paymentMethod,
    });
  };

  const formatPrice = (price) => {
    return `Rp ${price.toLocaleString()}`;
  };

  // Quick amount buttons
  const quickAmounts = [
    { label: "Rp 50k", value: 50000 },
    { label: "Rp 100k", value: 100000 },
    { label: "Uang Pas", value: total },
    { label: "Rp 200k", value: 200000 },
    { label: "Rp 500k", value: 500000 },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Pembayaran</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Total */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-600 mb-1">Total Belanja</div>
          <div className="text-3xl font-bold text-blue-700">
            {formatPrice(total)}
          </div>
        </div>

        {/* Payment Method */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Metode Pembayaran
          </label>
          <div className="grid grid-cols-3 gap-2">
            {["cash", "debit", "qris"].map((method) => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`py-2 px-3 rounded-lg border transition ${
                  paymentMethod === method
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {method === "cash" && "💵 Tunai"}
                {method === "debit" && "💳 Debit"}
                {method === "qris" && "📱 QRIS"}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Amounts */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Jumlah Cepat
          </label>
          <div className="grid grid-cols-3 gap-2">
            {quickAmounts.map((amount) => (
              <button
                key={amount.value}
                onClick={() => setPayment(amount.value.toString())}
                className="py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition"
              >
                {amount.label}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Jumlah Dibayar
          </label>
          <input
            type="number"
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
            placeholder="Masukkan jumlah uang"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        {/* Change */}
        <div className="mb-6 p-4 bg-green-50 rounded-lg">
          <div className="text-sm text-green-600 mb-1">Kembalian</div>
          <div className="text-2xl font-bold text-green-700">
            {change >= 0 ? formatPrice(change) : "(Kurang)"}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={parseInt(payment) < total}
            className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition disabled:bg-green-300"
          >
            Bayar
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;
