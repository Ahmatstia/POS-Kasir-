import React, { useState, useEffect } from "react";
import { getCategories, addProduct } from "../../services/database";

function ProductForm({ onClose, onSuccess }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category_id: "",
    price_pcs: "",
    price_pack: "",
    price_kg: "",
    stock: "",
    min_stock: "",
    notes: "",
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const data = await getCategories();
    setCategories(data);
    if (data.length > 0) {
      setFormData((prev) => ({ ...prev, category_id: data[0].id }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Konversi string ke number
    const productData = {
      ...formData,
      price_pcs: formData.price_pcs ? parseInt(formData.price_pcs) : 0,
      price_pack: formData.price_pack ? parseInt(formData.price_pack) : 0,
      price_kg: formData.price_kg ? parseInt(formData.price_kg) : 0,
      stock: formData.stock ? parseInt(formData.stock) : 0,
      min_stock: formData.min_stock ? parseInt(formData.min_stock) : 0,
      category_id: parseInt(formData.category_id),
    };

    const result = await addProduct(productData);
    setLoading(false);

    if (result.success) {
      alert("Produk berhasil ditambahkan!");
      onSuccess();
      onClose();
    } else {
      alert("Gagal menambahkan produk: " + result.error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Tambah Produk Baru</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            {/* Nama Produk */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Produk *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Kategori */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kategori *
              </label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Pilih Kategori</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Harga */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harga per Pcs
              </label>
              <input
                type="number"
                name="price_pcs"
                value={formData.price_pcs}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harga per Pack
              </label>
              <input
                type="number"
                name="price_pack"
                value={formData.price_pack}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harga per Kg
              </label>
              <input
                type="number"
                name="price_kg"
                value={formData.price_kg}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Stok */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stok Awal
              </label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimal Stok
              </label>
              <input
                type="number"
                name="min_stock"
                value={formData.min_stock}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Keterangan */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Keterangan
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg disabled:bg-blue-300"
            >
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProductForm;
