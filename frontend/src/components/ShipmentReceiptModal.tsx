import React, { useState, useEffect } from 'react';
import { X, PackageCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

interface ShipmentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  onSuccess: (updatedOrder: any) => void;
}

const ShipmentReceiptModal: React.FC<ShipmentReceiptModalProps> = ({ isOpen, onClose, order, onSuccess }) => {
  const [challanNumber, setChallanNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [globalReceivedAt, setGlobalReceivedAt] = useState(new Date().toISOString().split('T')[0]);
  const [rowDates, setRowDates] = useState<Record<string, string>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [fullOrder, setFullOrder] = useState<any>(order);
  const [loadingOrder, setLoadingOrder] = useState(false);

  useEffect(() => {
    if (isOpen && order) {
      if (!order.items) {
        setLoadingOrder(true);
        api.get(`/procurement/${order.id}`)
          .then(res => {
            const data = res.data.data;
            setFullOrder(data);
            const initialDates: Record<string, string> = {};
            (data.items || []).forEach((item: any) => {
              initialDates[item.id] = new Date().toISOString().split('T')[0];
            });
            setRowDates(initialDates);
          })
          .catch(() => setErrorMsg('Failed to load order items.'))
          .finally(() => setLoadingOrder(false));
      } else {
        setFullOrder(order);
        const initialDates: Record<string, string> = {};
        (order.items || []).forEach((item: any) => {
          initialDates[item.id] = new Date().toISOString().split('T')[0];
        });
        setRowDates(initialDates);
      }
    }
    // Reset state on open
    setChallanNumber('');
    setInvoiceNumber('');
    const today = new Date().toISOString().split('T')[0];
    setGlobalReceivedAt(today);
    setQuantities({});
    setErrorMsg('');
  }, [isOpen, order]);

  // Sync Global Date to all Rows
  const handleGlobalDateChange = (date: string) => {
    setGlobalReceivedAt(date);
    const updatedDates: Record<string, string> = {};
    Object.keys(rowDates).forEach(id => {
      updatedDates[id] = date;
    });
    setRowDates(updatedDates);
  };

  if (!isOpen || !order) return null;

  const handleQtyChange = (itemId: string, val: string) => {
    let num = parseInt(val, 10);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    
    setQuantities(prev => ({ ...prev, [itemId]: num }));
  };

  const handleReceive = async () => {
    setErrorMsg('');
    
    const receivedItems = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, quantity]) => ({ 
        itemId, 
        quantity,
        receivedAt: rowDates[itemId] // Row-specific date
      }));

    if (receivedItems.length === 0) {
      setErrorMsg('Please specify received quantities for at least one item.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        challanNumber: challanNumber.trim() || undefined,
        invoiceNumber: invoiceNumber.trim() || undefined,
        receivedAt: globalReceivedAt,
        receivedItems
      };
      
      const res = await api.post(`/procurement/${order.id}/receive`, payload);
      onSuccess(res.data.data.updatedOrder);
      setChallanNumber('');
      setInvoiceNumber('');
      setQuantities({});
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to log shipment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}>
        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           exit={{ opacity: 0, scale: 0.95 }}
           onClick={e => e.stopPropagation()}
           className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <PackageCheck className="text-emerald-400" /> Log Shipment Receipt
              </h3>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">PO-{order.id.split('-')[0].toUpperCase()} • {fullOrder?.vendor?.name || order.vendor?.name}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto">
            {loadingOrder ? (
               <div className="flex flex-col items-center justify-center py-12">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-4"></div>
                 <p className="text-slate-400 font-bold text-sm">Loading Order Lines...</p>
               </div>
            ) : (
              <>
                {/* Error Banner */}
                {errorMsg && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium rounded-xl flex items-center gap-2">
                    <AlertCircle size={16} /> {errorMsg}
                  </div>
                )}

                {/* Document References */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Challan Number</label>
                    <input
                      type="text"
                      value={challanNumber}
                      onChange={(e) => setChallanNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors"
                      placeholder="CH-123"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Invoice Number</label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors"
                      placeholder="INV-123"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Set All Receipt Dates</label>
                    <input
                      type="date"
                      value={globalReceivedAt}
                      onChange={(e) => handleGlobalDateChange(e.target.value)}
                      className="w-full bg-slate-950 border border-emerald-500/50 text-white rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors font-bold"
                    />
                  </div>
                </div>

                {/* Receiving Grid */}
                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/50">
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Item</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Ordered</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Pending</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Receipt Date</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-emerald-500 uppercase tracking-widest text-center">Receiving Now</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {(fullOrder?.items || []).map((item: any) => {
                        const pending = item.quantity - (item.receivedQuantity || 0);
                        const isFullyReceived = pending === 0;

                        return (
                          <tr key={item.id} className={`${isFullyReceived ? 'opacity-50' : ''} hover:bg-slate-900/50 transition-colors`}>
                            <td className="px-4 py-4 text-sm font-medium text-white">{item.product?.name}</td>
                            <td className="px-4 py-4 text-sm text-center text-slate-400 font-mono">{item.quantity}</td>
                            <td className="px-4 py-4 text-sm text-center font-bold text-amber-400 font-mono">{pending}</td>
                            <td className="px-4 py-4 text-center">
                              <input 
                                type="date" 
                                value={rowDates[item.id] || globalReceivedAt} 
                                onChange={(e) => setRowDates(prev => ({ ...prev, [item.id]: e.target.value }))}
                                disabled={isFullyReceived}
                                className="bg-slate-900/50 border border-slate-800 text-[10px] text-white uppercase font-bold tracking-widest p-2 rounded-lg focus:border-emerald-500 outline-none"
                              />
                            </td>
                            <td className="px-4 py-4 text-center">
                              <input
                                disabled={loading || isFullyReceived}
                                type="number"
                                min="0"
                                value={quantities[item.id] === undefined ? '' : quantities[item.id]}
                                onChange={(e) => handleQtyChange(item.id, e.target.value)}
                                className="bg-slate-900 border border-slate-700 w-24 text-center text-white rounded-lg px-3 py-2 outline-none focus:border-emerald-500 disabled:opacity-50 font-bold"
                                placeholder="0"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={handleReceive}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <PackageCheck size={18} /> {loading ? 'Logging Shipment...' : 'Confirm Receipt'}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ShipmentReceiptModal;
