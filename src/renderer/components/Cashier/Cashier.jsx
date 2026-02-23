import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, ShoppingCart, X } from "lucide-react";
import { getProducts } from "../../services/database";
import { createTransaction } from "../../services/transactions";
import CartItem from "./CartItem";
import PaymentModal from "./PaymentModal";

function Cashier() {
  const [allProducts, setAllProducts] = useState([]); // Semua produk
  const [displayedProducts, setDisplayedProducts] = useState([]); // Produk yang ditampilkan (untuk infinite scroll)
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 30; // Jumlah produk per load

  const observer = useRef();
  const lastProductRef = useCallback(
    (node) => {
      if (loadingMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMoreProducts();
        }
      });

      if (node) observer.current.observe(node);
    },
    [loadingMore, hasMore],
  );

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    // Reset infinite scroll saat search berubah
    if (searchTerm.trim() === "") {
      // Jika search kosong, tampilkan semua produk dengan infinite scroll
      const filtered = allProducts;
      setDisplayedProducts(filtered.slice(0, ITEMS_PER_PAGE));
      setHasMore(filtered.length > ITEMS_PER_PAGE);
      setPage(1);
    } else {
      // Jika ada search, filter dan tampilkan semua hasil (tanpa infinite scroll)
      const filtered = allProducts.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setDisplayedProducts(filtered);
      setHasMore(false); // Nonaktifkan infinite scroll saat search
    }
  }, [searchTerm, allProducts]);

  const loadProducts = async () => {
    setLoading(true);
    console.log("Loading all products...");
    const data = await getProducts();
    console.log("Products loaded:", data.length);
    setAllProducts(data);
    setDisplayedProducts(data.slice(0, ITEMS_PER_PAGE));
    setHasMore(data.length > ITEMS_PER_PAGE);
    setLoading(false);
  };

  const loadMoreProducts = () => {
    if (loadingMore || !hasMore || searchTerm !== "") return;

    setLoadingMore(true);

    // Simulasi load more (sebenarnya data sudah ada, kita hanya perlu menampilkan lebih banyak)
    setTimeout(() => {
      const nextPage = page + 1;
      const start = page * ITEMS_PER_PAGE;
      const end = nextPage * ITEMS_PER_PAGE;

      const newProducts = allProducts.slice(0, end);

      setDisplayedProducts(newProducts);
      setPage(nextPage);
      setHasMore(allProducts.length > end);
      setLoadingMore(false);
    }, 300); // Sedikit delay biar keliatan smooth
  };

  const addToCart = (product, unit) => {
    console.log("addToCart dipanggil dengan:", { product, unit });
    console.log("Harga tersedia:", {
      pcs: product.price_pcs,
      pack: product.price_pack,
      kg: product.price_kg,
    });

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

    console.log("Harga yang dipilih:", price);

    if (price <= 0) {
      alert(`Produk ini tidak memiliki harga untuk satuan ${unit}`);
      return;
    }

    // Cek apakah produk sudah ada di cart dengan unit yang sama
    const existingItem = cart.find(
      (item) => item.product_id === product.id && item.unit === unit,
    );
    console.log("Existing item:", existingItem);

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
      console.log("Cart setelah update:", cart);
    } else {
      // Tambah item baru
      const newItem = {
        id: Date.now() + Math.random(),
        product_id: product.id,
        name: product.name,
        unit: unit,
        price: price,
        quantity: 1,
        subtotal: price,
      };
      console.log("Item baru:", newItem);
      setCart([...cart, newItem]);
      console.log("Cart setelah tambah:", [...cart, newItem]);
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
    if (!price) return "Rp 0";
    return `Rp ${price.toLocaleString()}`;
  };

  const clearSearch = () => {
    setSearchTerm("");
  };

  if (loading && allProducts.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Left Panel - Product List with Infinite Scroll */}
      <div className="w-1/2 bg-white rounded-lg shadow p-4 flex flex-col">
        <h2 className="text-xl font-semibold mb-4">🛒 Daftar Produk</h2>

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
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Info jumlah produk */}
        <div className="mb-2 text-sm text-gray-500">
          Menampilkan {displayedProducts.length} dari {allProducts.length}{" "}
          produk
          {searchTerm && ` (hasil pencarian: "${searchTerm}")`}
        </div>

        {/* Product List with Infinite Scroll */}
        <div className="flex-1 overflow-y-auto border rounded-lg">
          {displayedProducts.length > 0 ? (
            <div className="divide-y">
              {displayedProducts.map((product, index) => {
                // Tambahkan ref ke produk terakhir untuk infinite scroll
                if (displayedProducts.length === index + 1 && !searchTerm) {
                  return (
                    <div
                      ref={lastProductRef}
                      key={product.id}
                      className="p-3 hover:bg-gray-50"
                    >
                      <ProductItem
                        product={product}
                        addToCart={addToCart}
                        formatPrice={formatPrice}
                      />
                    </div>
                  );
                } else {
                  return (
                    <div key={product.id} className="p-3 hover:bg-gray-50">
                      <ProductItem
                        product={product}
                        addToCart={addToCart}
                        formatPrice={formatPrice}
                      />
                    </div>
                  );
                }
              })}

              {/* Loading indicator untuk infinite scroll */}
              {loadingMore && !searchTerm && (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm mt-2">Memuat lebih banyak...</p>
                </div>
              )}

              {/* End of list */}
              {!hasMore && !searchTerm && displayedProducts.length > 0 && (
                <div className="p-4 text-center text-gray-500 text-sm">
                  ── Akhir dari daftar produk ──
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {searchTerm
                ? `Tidak ada produk dengan nama "${searchTerm}"`
                : "Tidak ada produk"}
            </div>
          )}
        </div>
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

// Komponen terpisah untuk Product Item - VERSI FIX DENGAN TOMBOL SELALU MUNCUL
function ProductItem({ product, addToCart, formatPrice }) {
  // Debug: lihat data produk di console
  console.log(
    "Product:",
    product.name,
    "sell_per_unit:",
    product.sell_per_unit,
    "harga:",
    {
      pcs: product.price_pcs,
      pack: product.price_pack,
      kg: product.price_kg,
    },
  );

  return (
    <div className="border-b border-gray-100 last:border-0 pb-2">
      <div className="font-medium text-gray-900">{product.name}</div>
      <div className="text-sm text-gray-500 mb-2 flex items-center gap-2">
        <span>Stok: {product.stock || 0}</span>
        <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">
          {product.sell_per_unit || "all"}
        </span>
      </div>

      {/* Container tombol dengan flex wrap */}
      <div className="flex gap-2 flex-wrap">
        {/* Tombol Pcs - TAMPIL SELALU jika sell_per_unit mengizinkan */}
        {(product.sell_per_unit === "all" ||
          product.sell_per_unit === "pcs") && (
          <button
            onClick={() => addToCart(product, "pcs")}
            disabled={!product.price_pcs || product.price_pcs <= 0}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
              product.price_pcs > 0
                ? "bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
            title={
              product.price_pcs > 0
                ? `Harga: ${formatPrice(product.price_pcs)}`
                : "Harga belum tersedia"
            }
          >
            Pcs{" "}
            {product.price_pcs > 0 ? formatPrice(product.price_pcs) : "(Rp 0)"}
          </button>
        )}

        {/* Tombol Pack - TAMPIL SELALU jika sell_per_unit mengizinkan */}
        {(product.sell_per_unit === "all" ||
          product.sell_per_unit === "pack") && (
          <button
            onClick={() => addToCart(product, "pack")}
            disabled={!product.price_pack || product.price_pack <= 0}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
              product.price_pack > 0
                ? "bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
            title={
              product.price_pack > 0
                ? `Harga: ${formatPrice(product.price_pack)}`
                : "Harga belum tersedia"
            }
          >
            Pack{" "}
            {product.price_pack > 0
              ? formatPrice(product.price_pack)
              : "(Rp 0)"}
          </button>
        )}

        {/* Tombol Kg - TAMPIL SELALU jika sell_per_unit mengizinkan */}
        {(product.sell_per_unit === "all" ||
          product.sell_per_unit === "kg") && (
          <button
            onClick={() => addToCart(product, "kg")}
            disabled={!product.price_kg || product.price_kg <= 0}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
              product.price_kg > 0
                ? "bg-purple-100 text-purple-700 hover:bg-purple-200 cursor-pointer"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
            title={
              product.price_kg > 0
                ? `Harga: ${formatPrice(product.price_kg)}`
                : "Harga belum tersedia"
            }
          >
            Kg {product.price_kg > 0 ? formatPrice(product.price_kg) : "(Rp 0)"}
          </button>
        )}

        {/* Jika tidak ada tombol yang muncul, tampilkan pesan */}
        {product.sell_per_unit !== "all" &&
          product.sell_per_unit !== "pcs" &&
          product.sell_per_unit !== "pack" &&
          product.sell_per_unit !== "kg" && (
            <span className="text-xs text-red-500">Satuan tidak valid</span>
          )}
      </div>
    </div>
  );
}

export default Cashier;
