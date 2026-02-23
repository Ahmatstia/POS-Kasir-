import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { getCategories, addProduct } from "../../services/database";

function ImportExcel({ onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState([]);
  const [categories, setCategories] = useState([]);
  const [mapping, setMapping] = useState({
    name: "",
    category: "",
    price_pcs: "",
    price_pack: "",
    price_kg: "",
    stock: "",
    min_stock: "",
  });

  // Load categories saat komponen dimount
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    console.log("Loading categories...");
    const data = await getCategories();
    console.log("Categories loaded:", data);
    setCategories(data);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) {
      alert("Pilih file terlebih dahulu");
      return;
    }

    console.log("File selected:", file);
    setFile(file);

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // Ambil header (baris pertama)
        const headers = data[0] || [];
        // Ambil data (baris sisanya) - preview 10 baris pertama
        const rows = data
          .slice(1, 11)
          .filter(
            (row) => row && row.some((cell) => cell && cell.toString().trim()),
          );

        console.log("Headers:", headers);
        console.log("Preview rows:", rows);

        setPreview({
          headers,
          rows,
        });

        // Auto mapping jika header cocok
        const newMapping = {};
        headers.forEach((header, index) => {
          if (!header) return;
          const headerLower = String(header).toLowerCase();
          if (headerLower.includes("nama")) newMapping.name = index;
          if (headerLower.includes("kategori")) newMapping.category = index;
          if (
            headerLower.includes("harga pcs") ||
            headerLower.includes("harga per pcs")
          )
            newMapping.price_pcs = index;
          if (
            headerLower.includes("harga pack") ||
            headerLower.includes("harga per pack")
          )
            newMapping.price_pack = index;
          if (
            headerLower.includes("harga kg") ||
            headerLower.includes("harga per kg")
          )
            newMapping.price_kg = index;
          if (headerLower.includes("stok") && !headerLower.includes("min"))
            newMapping.stock = index;
          if (
            headerLower.includes("min stok") ||
            headerLower.includes("minimal stok")
          )
            newMapping.min_stock = index;
        });

        console.log("Auto mapping:", newMapping);
        setMapping(newMapping);
      } catch (error) {
        console.error("Error reading file:", error);
        alert("Error membaca file: " + error.message);
      }
    };

    reader.onerror = (error) => {
      console.error("FileReader error:", error);
      alert("Error membaca file");
    };

    reader.readAsBinaryString(file);
  };

  const handleMappingChange = (field, value) => {
    setMapping((prev) => ({ ...prev, [field]: value }));
    console.log("Mapping updated:", field, value);
  };

  const findCategoryId = (categoryName) => {
    if (!categoryName) return null;

    const cleanName = String(categoryName).trim();
    console.log("Looking for category:", cleanName);

    // Cari exact match dulu
    let found = categories.find(
      (c) => c.name.toLowerCase() === cleanName.toLowerCase(),
    );

    // Kalau tidak ada, cari partial match
    if (!found) {
      found = categories.find(
        (c) =>
          c.name.toLowerCase().includes(cleanName.toLowerCase()) ||
          cleanName.toLowerCase().includes(c.name.toLowerCase()),
      );
    }

    console.log("Found category:", found);
    return found ? found.id : null;
  };

  const processImport = async () => {
    if (!file) {
      alert("Pilih file terlebih dahulu");
      return;
    }

    setLoading(true);
    console.log("Starting import...");
    console.log("Available categories:", categories);
    console.log("Current mapping:", mapping);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        console.log("Raw data (first 3 rows):", data.slice(0, 3));

        const headers = data[0];
        const rows = data.slice(1);

        console.log("Headers:", headers);
        console.log("Mapping used:", mapping);

        let successCount = 0;
        let errorCount = 0;
        let errorDetails = [];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row.some((cell) => cell && cell.toString().trim()))
            continue;

          // Ambil nilai dari sel berdasarkan mapping
          const nameIndex = mapping.name;
          const categoryIndex = mapping.category;

          if (nameIndex === undefined || categoryIndex === undefined) {
            console.error("Mapping incomplete:", mapping);
            alert("Mapping belum lengkap. Pilih kolom Nama dan Kategori.");
            setLoading(false);
            return;
          }

          const name = row[nameIndex]?.toString().trim() || "";
          const categoryName = row[categoryIndex]?.toString().trim() || "";

          // Fungsi untuk membersihkan harga (hapus Rp, titik, dll)
          const cleanPrice = (val) => {
            if (val === undefined || val === null) return 0;
            if (typeof val === "number") return val;

            const cleaned = String(val)
              .replace(/Rp|\.|,| |/g, "")
              .replace(/\s/g, "");
            const num = parseInt(cleaned);
            return isNaN(num) ? 0 : num;
          };

          const product = {
            name: name,
            category_id: findCategoryId(categoryName),
            price_pcs:
              mapping.price_pcs !== "" ? cleanPrice(row[mapping.price_pcs]) : 0,
            price_pack:
              mapping.price_pack !== ""
                ? cleanPrice(row[mapping.price_pack])
                : 0,
            price_kg:
              mapping.price_kg !== "" ? cleanPrice(row[mapping.price_kg]) : 0,
            stock: mapping.stock !== "" ? cleanPrice(row[mapping.stock]) : 0,
            min_stock:
              mapping.min_stock !== "" ? cleanPrice(row[mapping.min_stock]) : 0,
            notes: "Import dari Excel",
          };

          console.log(`Row ${i + 1}:`, product);

          if (!product.name) {
            console.log(`Row ${i + 1}: Skipped - no name`);
            errorCount++;
            errorDetails.push(`Baris ${i + 2}: Nama produk kosong`);
            continue;
          }

          if (!product.category_id) {
            console.log(
              `Row ${i + 1}: Skipped - no category found for "${categoryName}"`,
            );
            errorCount++;
            errorDetails.push(
              `Baris ${i + 2}: Kategori "${categoryName}" tidak ditemukan`,
            );
            continue;
          }

          const result = await addProduct(product);
          console.log(`Row ${i + 1}: Add result:`, result);

          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            errorDetails.push(
              `Baris ${i + 2}: ${result.error || "Gagal menambahkan"}`,
            );
          }
        }

        // Tampilkan hasil dengan detail error
        let message = `Import selesai!\nBerhasil: ${successCount} produk\nGagal: ${errorCount} produk`;
        if (errorDetails.length > 0) {
          message +=
            "\n\nDetail Error:\n" + errorDetails.slice(0, 5).join("\n");
          if (errorDetails.length > 5) {
            message += `\n... dan ${errorDetails.length - 5} error lainnya`;
          }
        }

        alert(message);

        if (successCount > 0) {
          onSuccess();
          onClose();
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Import error:", error);
        alert("Error: " + error.message);
        setLoading(false);
      }
    };

    reader.onerror = (error) => {
      console.error("FileReader error:", error);
      alert("Error membaca file");
      setLoading(false);
    };

    reader.readAsBinaryString(file);
  };

  // Cek apakah tombol harus disabled
  const isImportDisabled = loading || !mapping.name || !mapping.category;
  console.log("Button state:", {
    loading,
    nameSelected: mapping.name,
    categorySelected: mapping.category,
    disabled: isImportDisabled,
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Import Produk dari Excel</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Upload File */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pilih File Excel
          </label>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
          {file && (
            <p className="text-sm text-green-600 mt-2">
              ✓ File terpilih: {file.name}
            </p>
          )}
        </div>

        {preview.headers && (
          <>
            {/* Mapping Kolom */}
            <div className="mb-6">
              <h4 className="font-medium mb-3 text-gray-700">
                Mapping Kolom Excel ke Database
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Nama Produk *
                  </label>
                  <select
                    value={mapping.name}
                    onChange={(e) =>
                      handleMappingChange(
                        "name",
                        e.target.value ? parseInt(e.target.value) : "",
                      )
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Pilih Kolom</option>
                    {preview.headers.map((header, i) => (
                      <option key={i} value={i}>
                        {header || `Kolom ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Kategori *
                  </label>
                  <select
                    value={mapping.category}
                    onChange={(e) =>
                      handleMappingChange(
                        "category",
                        e.target.value ? parseInt(e.target.value) : "",
                      )
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Pilih Kolom</option>
                    {preview.headers.map((header, i) => (
                      <option key={i} value={i}>
                        {header || `Kolom ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Harga per Pcs
                  </label>
                  <select
                    value={mapping.price_pcs}
                    onChange={(e) =>
                      handleMappingChange(
                        "price_pcs",
                        e.target.value ? parseInt(e.target.value) : "",
                      )
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Pilih Kolom</option>
                    {preview.headers.map((header, i) => (
                      <option key={i} value={i}>
                        {header || `Kolom ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Harga per Pack
                  </label>
                  <select
                    value={mapping.price_pack}
                    onChange={(e) =>
                      handleMappingChange(
                        "price_pack",
                        e.target.value ? parseInt(e.target.value) : "",
                      )
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Pilih Kolom</option>
                    {preview.headers.map((header, i) => (
                      <option key={i} value={i}>
                        {header || `Kolom ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Harga per Kg
                  </label>
                  <select
                    value={mapping.price_kg}
                    onChange={(e) =>
                      handleMappingChange(
                        "price_kg",
                        e.target.value ? parseInt(e.target.value) : "",
                      )
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Pilih Kolom</option>
                    {preview.headers.map((header, i) => (
                      <option key={i} value={i}>
                        {header || `Kolom ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Stok
                  </label>
                  <select
                    value={mapping.stock}
                    onChange={(e) =>
                      handleMappingChange(
                        "stock",
                        e.target.value ? parseInt(e.target.value) : "",
                      )
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Pilih Kolom</option>
                    {preview.headers.map((header, i) => (
                      <option key={i} value={i}>
                        {header || `Kolom ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    Minimal Stok
                  </label>
                  <select
                    value={mapping.min_stock}
                    onChange={(e) =>
                      handleMappingChange(
                        "min_stock",
                        e.target.value ? parseInt(e.target.value) : "",
                      )
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Pilih Kolom</option>
                    {preview.headers.map((header, i) => (
                      <option key={i} value={i}>
                        {header || `Kolom ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">* Kolom wajib diisi</p>
            </div>

            {/* Preview Data */}
            <div className="mb-6">
              <h4 className="font-medium mb-3 text-gray-700">
                Preview Data (10 baris pertama)
              </h4>
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {preview.headers.map((header, i) => (
                        <th
                          key={i}
                          className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header || `Kolom ${i + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td
                            key={j}
                            className="px-4 py-2 text-sm text-gray-900"
                          >
                            {cell || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Debug Info - Bisa dihapus setelah berhasil */}
            <div className="mb-4 p-3 bg-gray-100 rounded text-xs">
              <p>
                <strong>Debug Info:</strong>
              </p>
              <p>
                Nama kolom terpilih:{" "}
                {mapping.name !== ""
                  ? `Kolom ${mapping.name}`
                  : "Belum dipilih"}
              </p>
              <p>
                Kategori kolom terpilih:{" "}
                {mapping.category !== ""
                  ? `Kolom ${mapping.category}`
                  : "Belum dipilih"}
              </p>
              <p>Loading: {loading ? "Ya" : "Tidak"}</p>
              <p>Tombol import: {isImportDisabled ? "Disabled" : "Enabled"}</p>
            </div>

            {/* Tombol Import */}
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                onClick={processImport}
                // HAPUS kondisi disabled, paksa selalu aktif untuk test
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Memproses...</span>
                  </>
                ) : (
                  "Import Data"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ImportExcel;
