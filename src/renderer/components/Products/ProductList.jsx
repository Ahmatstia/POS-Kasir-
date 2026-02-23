import React, { useState, useEffect } from "react";
import {
  getProducts,
  getCategories,
  deleteProduct,
} from "../../services/database";
import ProductForm from "./ProductForm";
import EditProductForm from "./EditProductForm";
import ImportExcel from "./ImportExcel";

function ProductList() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // State untuk search
  const [searchTerm, setSearchTerm] = useState("");
  const [searchCategory, setSearchCategory] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  // Effect untuk filter produk saat searchTerm atau searchCategory berubah
  useEffect(() => {
    filterProducts();
  }, [searchTerm, searchCategory, products]);

  const loadData = async () => {
    setLoading(true);
    const productsData = await getProducts();
    const categoriesData = await getCategories();

    // Buat map kategori untuk lookup
    const categoryMap = {};
    categoriesData.forEach((cat) => {
      categoryMap[cat.id] = cat.name;
    });

    // Gabungkan data produk dengan nama kategori
    const productsWithCategory = productsData.map((product) => ({
      ...product,
      category_name: categoryMap[product.category_id] || "-",
    }));

    setProducts(productsWithCategory);
    setFilteredProducts(productsWithCategory);
    setCategories(categoriesData);
    setLoading(false);
  };

  // Fungsi filter produk
  const filterProducts = () => {
    let filtered = [...products];

    // Filter berdasarkan nama
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Filter berdasarkan kategori
    if (searchCategory !== "") {
      filtered = filtered.filter(
        (product) => product.category_id === parseInt(searchCategory),
      );
    }

    setFilteredProducts(filtered);
  };

  // Reset filter
  const resetFilters = () => {
    setSearchTerm("");
    setSearchCategory("");
  };

  const handleAddSuccess = () => {
    loadData(); // reload data setelah tambah produk
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus produk ini?")) return;

    setDeletingId(id);
    const result = await deleteProduct(id);
    setDeletingId(null);

    if (result.success) {
      alert("Produk berhasil dihapus!");
      loadData();
    } else {
      alert("Gagal menghapus produk");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading produk...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Daftar Produk</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <span>📊</span> Import Excel
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <span>+</span> Tambah Produk
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search by Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cari Nama Produk
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ketik nama produk..."
                className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>
          </div>

          {/* Filter by Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter Kategori
            </label>
            <select
              value={searchCategory}
              onChange={(e) => setSearchCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Button */}
          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <span>↺</span> Reset Filter
            </button>
          </div>
        </div>

        {/* Info Hasil Pencarian */}
        <div className="mt-2 text-sm text-gray-600">
          Menampilkan {filteredProducts.length} dari {products.length} produk
          {searchTerm && ` dengan nama mengandung "${searchTerm}"`}
          {searchCategory &&
            ` dalam kategori ${categories.find((c) => c.id === parseInt(searchCategory))?.name || ""}`}
        </div>
      </div>

      {/* Form Tambah Modal */}
      {showForm && (
        <ProductForm
          onClose={() => setShowForm(false)}
          onSuccess={handleAddSuccess}
        />
      )}

      {/* Form Import Modal */}
      {showImport && (
        <ImportExcel
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            loadData();
            setShowImport(false);
          }}
        />
      )}

      {/* Form Edit Modal */}
      {editingProduct && (
        <EditProductForm
          productId={editingProduct.id}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => {
            loadData();
            setEditingProduct(null);
          }}
        />
      )}

      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">
            {products.length === 0
              ? "Belum ada produk."
              : "Tidak ada produk yang sesuai dengan filter."}
          </p>
          {products.length > 0 && (
            <button
              onClick={resetFilters}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Reset Filter
            </button>
          )}
          {products.length === 0 && (
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowImport(true)}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg"
              >
                Import dari Excel
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                Tambah Manual
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Satuan Jual
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Harga (Pcs)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Harga (Pack)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Harga (Kg)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stok
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Min Stok
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                        {product.category_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium
                        ${
                          product.sell_per_unit === "all"
                            ? "bg-blue-100 text-blue-800"
                            : product.sell_per_unit === "pcs"
                              ? "bg-green-100 text-green-800"
                              : product.sell_per_unit === "pack"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {product.sell_per_unit === "all"
                          ? "Pcs/Pack/Kg"
                          : product.sell_per_unit === "pcs"
                            ? "Per Pcs"
                            : product.sell_per_unit === "pack"
                              ? "Per Pack"
                              : "Per Kg"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.price_pcs
                        ? `Rp ${product.price_pcs.toLocaleString()}`
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.price_pack
                        ? `Rp ${product.price_pack.toLocaleString()}`
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.price_kg
                        ? `Rp ${product.price_kg.toLocaleString()}`
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          product.stock <= product.min_stock
                            ? "bg-red-100 text-red-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.min_stock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-blue-600 hover:text-blue-900 mr-3 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        disabled={deletingId === product.id}
                        className="text-red-600 hover:text-red-900 disabled:text-red-300 font-medium"
                      >
                        {deletingId === product.id ? "..." : "Hapus"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer dengan total produk */}
          <div className="mt-4 text-sm text-gray-500 border-t pt-4 flex justify-between items-center">
            <span>
              Total: {filteredProducts.length} produk (dari {products.length}{" "}
              produk)
            </span>
            <span className="text-xs text-gray-400">
              Gunakan filter untuk mencari produk
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default ProductList;
