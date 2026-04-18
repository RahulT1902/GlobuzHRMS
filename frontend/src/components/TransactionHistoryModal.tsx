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
          className="bg-card border border-border rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Package className="text-blue-500" />
                Ledger: {product?.name}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                SKU: {product?.sku}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Current Stock</p>
                <p className="text-2xl font-bold text-foreground">{product?.closingStock}</p>
              </div>
              <button 
                onClick={onClose} 
                className="text-muted-foreground hover:text-foreground transition-colors bg-secondary p-2 rounded-full"
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
                <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                  <Package className="text-muted-foreground" size={24} />
                </div>
                <p className="text-card-foreground font-medium">No ledger entries found.</p>
                <p className="text-muted-foreground text-sm mt-1">Stock adjustments will appear here.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground border-b border-border sticky top-0 backdrop-blur-md">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Date & Time</th>
                    <th className="px-6 py-4 font-semibold">Activity</th>
                    <th className="px-6 py-4 font-semibold">Reference</th>
                    <th className="px-6 py-4 font-semibold text-right">Qty Change</th>
                    <th className="px-6 py-4 font-semibold text-right">Running Bal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((tx, idx) => {
                    const isPositive = Number(tx.quantity) > 0 && !["SALES_OUT", "MANUAL_OUT"].includes(tx.type);
                    
                    return (
                      <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-foreground font-medium">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
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
                          <p className="text-sm font-black text-foreground tracking-tight">
                            {tx.type === 'PROCUREMENT_IN' && tx.referenceName && !tx.referenceName.includes(':') 
                              ? `CH: ${tx.referenceName}` 
                              : (tx.referenceName || "—")}
                          </p>
                          <div className="flex flex-col mt-0.5">
                            <p className="text-[10px] text-muted-foreground font-medium italic">{tx.notes}</p>
                            {tx.metadata && (typeof tx.metadata === 'object') && (
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 opacity-80">
                                {tx.metadata.challanNumber && tx.metadata.challanNumber !== tx.referenceName && (
                                  <span className="text-[9px] font-bold uppercase tracking-tighter bg-muted px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <span className="text-primary/50">CH:</span> {tx.metadata.challanNumber}
                                  </span>
                                )}
                                {tx.metadata.invoiceNumber && (
                                  <span className="text-[9px] font-bold uppercase tracking-tighter bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <span className="opacity-50">INV:</span> {tx.metadata.invoiceNumber}
                                  </span>
                                )}
                                {tx.metadata.challanDate && (
                                  <span className="text-[9px] font-bold uppercase tracking-tighter bg-muted px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <span className="text-primary/50">CH Dt:</span> {new Date(tx.metadata.challanDate).toLocaleDateString('en-GB', {day:'2-digit', month:'short'})}
                                  </span>
                                )}
                              </div>
                            )}
                            {!tx.notes && tx.referenceId && !tx.metadata && (
                              <p className="text-[9px] text-muted-foreground opacity-40 uppercase tracking-widest mt-1">Ref: {tx.referenceId.slice(0, 8)}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`text-sm font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'} flex items-center justify-end gap-1`}>
                            {isPositive ? '+' : '-'}{Math.abs(tx.quantity)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`text-sm font-black ${idx === 0 ? 'text-foreground bg-secondary px-3 py-1 rounded-lg' : 'text-muted-foreground'}`}>
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
