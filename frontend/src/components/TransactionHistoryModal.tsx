import React, { useEffect, useState } from 'react';
import { X, TrendingDown, TrendingUp, Package, Loader2 } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
}

const TransactionHistoryModal: React.FC<TransactionHistoryModalProps> = ({ isOpen, onClose, product }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && product) {
      fetchHistory();
    }
  }, [isOpen, product]);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/inventory/${product.id}/transactions`);
      setTransactions(res.data.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  const getStyleForType = (type: string) => {
    const inTypes = ["INITIAL_STOCK", "PROCUREMENT_IN", "MANUAL_IN", "TRANSFER"];
    const outTypes = ["SALES_OUT", "MANUAL_OUT"];
    
    if (inTypes.includes(type)) return "text-emerald-500 bg-emerald-500/10";
    if (outTypes.includes(type)) return "text-rose-500 bg-rose-500/10";
    return "text-blue-500 bg-blue-500/10";
  };

  const getLabelForType = (type: string) => {
    const labels: Record<string, string> = {
      INITIAL_STOCK: "Initial Stock",
      PROCUREMENT_IN: "Vendor Purchase",
      SALES_OUT: "Client Usage",
      MANUAL_IN: "Manual Add",
      MANUAL_OUT: "Manual Reduce",
      RECONCILIATION: "Stock Audit",
      TRANSFER: "Transfer"
    };
    return labels[type] || type;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Package className="text-blue-500" />
                Ledger: {product?.name}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                SKU: {product?.sku}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Current Stock</p>
                <p className="text-2xl font-bold text-white">{product?.closingStock}</p>
              </div>
              <button 
                onClick={onClose} 
                className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-0 overflow-y-auto flex-1">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="animate-spin text-blue-500" size={32} />
              </div>
            ) : error ? (
              <div className="p-6">
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-3">
                  <Package className="text-slate-500" size={24} />
                </div>
                <p className="text-slate-300 font-medium">No ledger entries found.</p>
                <p className="text-slate-500 text-sm mt-1">Stock adjustments will appear here.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 border-b border-slate-700 sticky top-0 backdrop-blur-md">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Date & Time</th>
                    <th className="px-6 py-4 font-semibold">Activity</th>
                    <th className="px-6 py-4 font-semibold">Reference</th>
                    <th className="px-6 py-4 font-semibold text-right">Qty Change</th>
                    <th className="px-6 py-4 font-semibold text-right">Running Bal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {transactions.map((tx, idx) => {
                    const isPositive = Number(tx.quantity) > 0 && !["SALES_OUT", "MANUAL_OUT"].includes(tx.type);
                    
                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-white font-medium">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(tx.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border border-current/10 ${getStyleForType(tx.type)}`}>
                            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {getLabelForType(tx.type)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-semibold text-white">{tx.referenceName || "—"}</p>
                          <p className="text-xs text-slate-500">{tx.notes ? tx.notes : (tx.referenceId ? `Ref: ${tx.referenceId.slice(0, 8)}` : "")}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'} flex items-center justify-end gap-1`}>
                            {isPositive ? '+' : '-'}{Math.abs(tx.quantity)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`text-sm font-black ${idx === 0 ? 'text-white bg-slate-800 px-3 py-1 rounded-lg' : 'text-slate-300'}`}>
                            {tx.closingStock}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TransactionHistoryModal;
