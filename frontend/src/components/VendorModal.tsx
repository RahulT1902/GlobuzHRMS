import React, { useState, useEffect, useRef } from 'react';
import { X, Building2, User, Mail, Phone, Tag, CreditCard, MapPin, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (vendor: any) => void;
  vendor?: any;
}

const VendorModal: React.FC<VendorModalProps> = ({ isOpen, onClose, onSuccess, vendor }) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    categoryId: '',
    taxId: '',
    paymentTermId: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const headers = { Authorization: `Bearer ${token}` };
        const [cRes, pRes] = await Promise.all([
          axios.get(`${API_URL}/config/categories?type=VENDOR`, { headers }),
          axios.get(`${API_URL}/config/payment-terms`, { headers })
        ]);
        setCategories(cRes.data.data || []);
        setPaymentTerms(pRes.data.data || []);

        if (!vendor) {
           setFormData(prev => ({
             ...prev,
             categoryId: (cRes.data.data || [])[0]?.id || '',
             paymentTermId: (pRes.data.data || [])[0]?.id || ''
           }));
        }
      } catch (err) {
        console.error('Failed to fetch vendor config:', err);
      }
    };

    if (isOpen) {
      fetchConfig();
      if (vendor) {
        setFormData({
          name: vendor.name,
          contactPerson: vendor.contactPerson || '',
          email: vendor.email,
          phone: vendor.phone || '',
          categoryId: vendor.categoryId || '',
          taxId: vendor.taxId || '',
          paymentTermId: vendor.paymentTermId || '',
          address: vendor.address || ''
        });
      } else {
        setFormData({
          name: '',
          contactPerson: '',
          email: '',
          phone: '',
          categoryId: '',
          taxId: '',
          paymentTermId: '',
          address: ''
        });
      }
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [isOpen, vendor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = vendor
        ? await api.put(`/vendors/${vendor.id}`, formData)
        : await api.post('/vendors', formData);

      onSuccess(response.data.data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save vendor. Ensure email is unique.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
            className="relative bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{vendor ? 'Edit Partner Details' : 'Onboard Strategic Partner'}</h3>
                  <p className="text-slate-400 text-sm">Register new suppliers into the Globuzinc network.</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm">
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Company Name */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <Building2 size={14} className="text-slate-500" /> Company Name
                  </label>
                  <input
                    ref={firstInputRef}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    placeholder="e.g. Reliance Industrial Supplies"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                {/* Contact Person */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <User size={14} className="text-slate-500" /> Contact Person
                  </label>
                  <input
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    placeholder="e.g. Rahul Sharma"
                    value={formData.contactPerson}
                    onChange={e => setFormData({...formData, contactPerson: e.target.value})}
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <Mail size={14} className="text-slate-500" /> Official Email
                  </label>
                  <input
                    required
                    type="email"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    placeholder="partner@company.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <Phone size={14} className="text-slate-500" /> Phone Number
                  </label>
                  <input
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <Tag size={14} className="text-slate-500" /> Strategic Category
                  </label>
                  <select
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    value={formData.categoryId}
                    onChange={e => setFormData({...formData, categoryId: e.target.value})}
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Tax ID */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <CreditCard size={14} className="text-slate-500" /> Tax ID / GSTIN
                  </label>
                  <input
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all uppercase"
                    placeholder="27AAAAA0000A1Z5"
                    value={formData.taxId}
                    onChange={e => setFormData({...formData, taxId: e.target.value})}
                  />
                </div>

                {/* Payment Terms */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <CreditCard size={14} className="text-slate-500" /> Payment Terms
                  </label>
                  <select
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    value={formData.paymentTermId}
                    onChange={e => setFormData({...formData, paymentTermId: e.target.value})}
                  >
                    <option value="">Select Terms</option>
                    {paymentTerms.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.days} Days)</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <MapPin size={14} className="text-slate-500" /> Office Address
                </label>
                <textarea
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all h-24 resize-none"
                  placeholder="Street, City, State, ZIP..."
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                />
              </div>

              {/* Actions */}
              <div className="pt-6 flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95"
                >
                  Cancel
                </button>
                <button
                  disabled={loading}
                  type="submit"
                  className="flex-[2] py-3.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 active:scale-95"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {vendor ? 'Update Partner' : 'Confirm Onboarding'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default VendorModal;
