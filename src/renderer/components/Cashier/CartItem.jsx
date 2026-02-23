import React from "react";
import { Minus, Plus, Trash2 } from "lucide-react";

function CartItem({ item, onUpdateQuantity, onRemove }) {
  const formatPrice = (price) => {
    return `Rp ${price.toLocaleString()}`;
  };

  const getUnitLabel = (unit) => {
    switch (unit) {
      case "pcs":
        return "Pcs";
      case "pack":
        return "Pack";
      case "kg":
        return "Kg";
      default:
        return unit;
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
      <div className="flex-1">
        <div className="font-medium text-gray-900">{item.name}</div>
        <div className="text-sm text-gray-500">
          {formatPrice(item.price)} / {getUnitLabel(item.unit)}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Quantity Controls */}
        <div className="flex items-center border rounded-lg bg-white">
          <button
            onClick={() =>
              onUpdateQuantity(item.id, item.quantity - 1, item.unit)
            }
            className="p-1 hover:bg-gray-100 rounded-l-lg"
            disabled={item.quantity <= 1}
          >
            <Minus
              size={16}
              className={item.quantity <= 1 ? "text-gray-300" : "text-gray-600"}
            />
          </button>
          <span className="w-12 text-center text-sm font-medium">
            {item.quantity}
          </span>
          <button
            onClick={() =>
              onUpdateQuantity(item.id, item.quantity + 1, item.unit)
            }
            className="p-1 hover:bg-gray-100 rounded-r-lg"
          >
            <Plus size={16} className="text-gray-600" />
          </button>
        </div>

        {/* Subtotal */}
        <div className="w-24 text-right font-medium">
          {formatPrice(item.subtotal)}
        </div>

        {/* Remove button */}
        <button
          onClick={() => onRemove(item.id)}
          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}

export default CartItem;
