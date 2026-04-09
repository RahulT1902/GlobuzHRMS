import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Clipboard, Loader2, AlertCircle, Package } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedProduct: any) => void;
  product: any;
  defaultType?: 'IN' | 'OUT';
}

const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({ isOpen, onClose, onSuccess, product, defaultType = 'IN' }) => {
  const [isOut, setIsOut] = useState(defaultType === 'OUT');
  const [formData, setFormData] = useState({
    quantity: 1,
    usageType: defaultType === 'OUT' ? 'SALES_OUT' : 'MANUAL_IN',
    referenceType: defaultType === 'OUT' ? 'CLIENT' : 'MANUAL',
    referenceName: '',
    unitCost: '',
    notes: ''
  });

  useEffect(() => {
    const out = defaultType === 'OUT';
    setIsOut(out);
    setFormData(prev => ({
      ...prev,
      usageType: out ? 'SALES_OUT' : 'MANUAL_IN',
      referenceType: out ? 'CLIENT' : 'MANUAL'
    }));
  }, [defaultType, isOpen]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        type: formData.usageType,
        quantity: formData.quantity,
        referenceType: formData.referenceType,
        referenceName: formData.referenceName,
        unitCost: formData.unitCost ? Number(formData.unitCost) : null,
        totalCost: formData.unitCost ? Number(formData.unitCost) * formData.quantity : null,
        notes: formData.notes
      };
      const response = await api.post(`/inventory/${product.id}/adjust-stock`, payload);
      onSuccess(response.data.data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to adjust stock. Check if sufficient qty exists.');
    } finally {
      setLoading(false);
    }
  };

  if (!product) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-white">Stock Adjustment</h3>
                  <p className="text-slate-500 text-xs truncate max-w-[200px]">{product.name} ({product.sku})</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-xs">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Current Stock Snapshot */}
              <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-2xl flex justify-between items-center mb-2">
                 <span className="text-slate-400 text-sm">Current Level</span>
                 <span className="text-xl font-black text-white">{product.closingStock} <span className="text-xs text-slate-500 font-normal uppercase">{product.unit?.name || 'Units'}</span></span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsOut(false);
                    setFormData({ ...formData, usageType: 'MANUAL_IN', referenceType: 'MANUAL' });
                  }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                    !isOut 
                    ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400' 
                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <TrendingUp size={18} />
                  <span className="font-bold text-sm">Stock In</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOut(true);
                    setFormData({ ...formData, usageType: 'SALES_OUT', referenceType: 'CLIENT' });
                  }}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                    isOut 
                    ? 'bg-rose-600/10 border-rose-500 text-rose-400' 
                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <TrendingDown size={18} />
                  <span className="font-bold text-sm">Stock Out</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Usage Type</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none"
                    value={`${formData.usageType}:${formData.referenceType}`}
                    onChange={e => {
                      const [uType, rType] = e.target.value.split(':');
                      setFormData({...formData, usageType: uType, referenceType: rType});
                    }}
                  >
                    {!isOut ? (
                      <>
                        <option value="MANUAL_IN:MANUAL">Manual Add / Restock</option>
                        <option value="MANUAL_IN:RETURN">Customer Return</option>
                        <option value="INITIAL_STOCK:INITIAL">Initial Stock</option>
                      </>
                    ) : (
                      <>
                        <option value="SALES_OUT:CLIENT">Client Order / Usage</option>
                        <option value="MANUAL_OUT:INTERNAL">Internal Use</option>
                        <option value="MANUAL_OUT:DAMAGED">Damaged / Expired</option>
                        <option value="MANUAL_OUT:SAMPLE">Sample Given</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Quantity</label>
                  <input
                    required
                    type="number"
                    min="1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    value={formData.quantity}
                    onChange={e => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">
                  {formData.referenceType === 'CLIENT' ? 'Client / Project Name' : 'Reference Name (Optional)'}
                </label>
                <input
                  required={formData.referenceType === 'CLIENT'}
                  type="text"
                  placeholder={formData.referenceType === 'CLIENT' ? 'e.g., Alpha Project' : 'e.g., Jane Doe'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  value={formData.referenceName}
                  onChange={e => setFormData({...formData, referenceName: e.target.value})}
                />
              </div>

              {!isOut && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Unit Cost (₹) (Optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    value={formData.unitCost}
                    onChange={e => setFormData({...formData, unitCost: e.target.value})}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                   <Clipboard size={12} /> Notes / Remarks
                </label>
                <textarea
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all h-20 resize-none"
                  placeholder="Additional context..."
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                />
              </div>

              <button
                disabled={loading}
                type="submit"
                className={`w-full py-4 px-4 ${!isOut ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'} disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 scale-100 active:scale-95`}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `Record ${!isOut ? 'Inflow' : 'Outflow'} →`}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default StockAdjustmentModal;
