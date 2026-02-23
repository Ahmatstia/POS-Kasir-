import React, { useState, useEffect } from "react";
import { Search, ShoppingCart, X } from "lucide-react";
import { getProducts } from "../../services/database";
import { createTransaction } from "../../services/transactions";
import CartItem from "./CartItem";
import PaymentModal from "./PaymentModal";

function Cashier() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredProducts([]);
    } else {
      const filtered = products.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredProducts(filtered.slice(0, 5)); // Max 5 hasil
    }
  }, [searchTerm, products]);

  const loadProducts = async () => {
    const data = await getProducts();
    setProducts(data);
  };

  const addToCart = (product, unit) => {
    // Tentukan harga berdasarkan unit
    let price = 0;
    switch (unit) {
      case "pcs":
        price = product.price_pcs;
        break;
      case "pack":
        price = product.price_pack;
        break;
      case "kg":
        price = product.price_kg;
        break;
      default:
        return;
    }

    if (price <= 0) {
      alert(`Produk ini tidak memiliki harga untuk satuan ${unit}`);
      return;
    }

    // Cek apakah produk sudah ada di cart dengan unit yang sama
    const existingItem = cart.find(
      (item) => item.product_id === product.id && item.unit === unit,
    );

    if (existingItem) {
      // Update quantity
      setCart(
        cart.map((item) =>
          item.product_id === product.id && item.unit === unit
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * price,
              }
            : item,
        ),
      );
    } else {
      // Tambah item baru
      setCart([
        ...cart,
        {
          id: Date.now(), // temporary ID
          product_id: product.id,
          name: product.name,
          unit: unit,
          price: price,
          quantity: 1,
          subtotal: price,
        },
      ]);
    }

    setSearchTerm("");
  };

  const updateQuantity = (itemId, newQuantity, unit) => {
    if (newQuantity < 1) return;

    setCart(
      cart.map((item) => {
        if (item.id === itemId) {
          const subtotal = newQuantity * item.price;
          return { ...item, quantity: newQuantity, subtotal };
        }
        return item;
      }),
    );
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter((item) => item.id !== itemId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handlePayment = async (paymentData) => {
    setLoading(true);

    const total = calculateTotal();

    const transactionData = {
      items: cart,
      subtotal: total,
      discount: 0,
      total: total,
      payment: paymentData.payment,
      change: paymentData.change,
      paymentMethod: paymentData.method,
      customerName: "",
      notes: "",
    };

    const result = await createTransaction(transactionData);

    if (result.success) {
      alert(
        `Transaksi berhasil!\nNo. Invoice: ${result.invoiceNo}\nKembalian: Rp ${paymentData.change.toLocaleString()}`,
      );
      setCart([]);
      setShowPayment(false);
    } else {
      alert("Transaksi gagal: " + result.error);
    }

    setLoading(false);
  };

  const formatPrice = (price) => {
    return `Rp ${price.toLocaleString()}`;
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Left Panel - Product Search */}
      <div className="w-1/2 bg-white rounded-lg shadow p-4 flex flex-col">
        <h2 className="text-xl font-semibold mb-4">🛒 Pilih Produk</h2>

        {/* Search Input */}
        <div className="relative mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama produk..."
            className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
        </div>

        {/* Search Results */}
        {filteredProducts.length > 0 && (
          <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
            {filteredProducts.map((product) => (
              <div key={product.id} className="p-3 hover:bg-gray-50">
                <div className="font-medium">{product.name}</div>
                <div className="text-sm text-gray-500 mb-2">
                  Stok: {product.stock}
                </div>
                <div className="flex gap-2">
                  {product.sell_per_unit === "all" ||
                  product.sell_per_unit === "pcs" ? (
                    <button
                      onClick={() => addToCart(product, "pcs")}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200 transition"
                      disabled={product.price_pcs <= 0}
                    >
                      Pcs {formatPrice(product.price_pcs)}
                    </button>
                  ) : null}

                  {product.sell_per_unit === "all" ||
                  product.sell_per_unit === "pack" ? (
                    <button
                      onClick={() => addToCart(product, "pack")}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition"
                      disabled={product.price_pack <= 0}
                    >
                      Pack {formatPrice(product.price_pack)}
                    </button>
                  ) : null}

                  {product.sell_per_unit === "all" ||
                  product.sell_per_unit === "kg" ? (
                    <button
                      onClick={() => addToCart(product, "kg")}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition"
                      disabled={product.price_kg <= 0}
                    >
                      Kg {formatPrice(product.price_kg)}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Panel - Cart */}
      <div className="w-1/2 bg-white rounded-lg shadow p-4 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">🛍️ Keranjang Belanja</h2>
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
            {cart.length} item
          </span>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-2">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ShoppingCart className="mx-auto mb-2" size={48} />
              <p>Keranjang masih kosong</p>
              <p className="text-sm">Pilih produk dari sebelah kiri</p>
            </div>
          ) : (
            cart.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onUpdateQuantity={updateQuantity}
                onRemove={removeFromCart}
              />
            ))
          )}
        </div>

        {/* Total */}
        {cart.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-medium">Total</span>
              <span className="text-2xl font-bold text-blue-600">
                {formatPrice(calculateTotal())}
              </span>
            </div>

            <button
              onClick={() => setShowPayment(true)}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium transition"
            >
              Proses Pembayaran
            </button>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal
          total={calculateTotal()}
          onClose={() => setShowPayment(false)}
          onConfirm={handlePayment}
        />
      )}
    </div>
  );
}

export default Cashier;
