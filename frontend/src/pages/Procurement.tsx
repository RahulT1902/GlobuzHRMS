import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  Plus, Trash2, ChevronRight, ChevronLeft,
  CheckCircle2, AlertCircle, Package, User, Calculator, Search,
  FileText, X, Send, ThumbsUp, PackageCheck, Clock, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ShipmentReceiptModal from '../components/ShipmentReceiptModal';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { PERMISSIONS } from '../constants/permissions';

interface ProcurementItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  DRAFT:     { label: 'Drafting',     color: 'text-muted-foreground',   bg: 'bg-muted/30',   border: 'border-border/50', icon: Clock },
  SUBMITTED: { label: 'Pending Approval', color: 'text-amber-500',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30', icon: Send },
  APPROVED:  { label: 'Approved & Verified',  color: 'text-primary',    bg: 'bg-primary/10',    border: 'border-primary/20',  icon: ThumbsUp },
  ORDERED:   { label: 'In Transit',   color: 'text-violet-500',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20', icon: Package },
  PARTIALLY_RECEIVED: { label: 'Partial Inflow', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: Package },
  COMPLETED: { label: 'Logistics Fulfilled', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: PackageCheck },
  CANCELLED: { label: 'Terminated', color: 'text-rose-500',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20',   icon: XCircle },
  REJECTED:  { label: 'Declined',   color: 'text-rose-600',    bg: 'bg-rose-600/10',    border: 'border-rose-600/30',   icon: XCircle },
};

const Procurement: React.FC = () => {
  const { hasPermission } = useAuth();
  const { refresh: refreshNotifications } = useNotifications();
  const [orders, setOrders] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showApproveInput, setShowApproveInput] = useState(false);
  const [approveReason, setApproveReason] = useState('');

  const navigate = useNavigate();

  // Wizard State
  const [step, setStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    vendorId: '', items: [] as ProcurementItem[], totalAmount: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);

  // Click outside listener for search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [poRes, vRes, pRes] = await Promise.all([
        api.get('/procurement'),
        api.get('/vendors'),
        api.get('/inventory')
      ]);
      setOrders(poRes.data.data || []);
      setVendors(vRes.data.data || []);
      setProducts(pRes.data.data?.products || []);
    } catch (error) {
      console.error('Failed to fetch procurement data', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (items: ProcurementItem[]) =>
    items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const getActionRequired = (order: any) => {
    if (!order) return null;
    const s = order.status;
    
    // Admin Actions (Approvals)
    if (s === 'SUBMITTED' && hasPermission(PERMISSIONS.PROCUREMENT_APPROVE)) {
      return { level: 'high', label: 'Needs Approval' };
    }
    
    // Procurement Actions
    if (s === 'DRAFT' && hasPermission(PERMISSIONS.PROCUREMENT_CREATE)) {
      return { level: 'medium', label: 'Needs Submission' };
    }
    if (s === 'APPROVED' && hasPermission(PERMISSIONS.PROCUREMENT_CREATE)) {
      return { level: 'medium', label: 'Needs Ordering' };
    }
    
    // Inventory Actions
    if ((s === 'ORDERED' || s === 'PARTIALLY_RECEIVED') && hasPermission(PERMISSIONS.PROCUREMENT_RECEIVE)) {
      return { level: 'medium', label: 'Pending Receipt' };
    }
    
    return null;
  };

  const addItemToOrder = (productId: string) => {
    if (!productId) return;
    // Prevent duplicates
    if (wizardData.items.find(i => i.productId === productId)) return;
    const product = products.find((p: any) => p.id === productId);
    if (!product) return;
    const newItems = [...wizardData.items, { productId: product.id, name: product.name, quantity: 1, unitPrice: product.purchasePrice || 0 }];
    setWizardData({ ...wizardData, items: newItems, totalAmount: calculateTotal(newItems) });
  };

  const updateItem = (index: number, updates: Partial<ProcurementItem>) => {
    const newItems = [...wizardData.items];
    newItems[index] = { ...newItems[index], ...updates };
    setWizardData({ ...wizardData, items: newItems, totalAmount: calculateTotal(newItems) });
  };

  const removeItem = (index: number) => {
    const newItems = wizardData.items.filter((_, i) => i !== index);
    setWizardData({ ...wizardData, items: newItems, totalAmount: calculateTotal(newItems) });
  };

  const handleCreateOrder = async () => {
    try {
      const res = await api.post('/procurement', wizardData);
      setOrders(prev => [res.data.data, ...prev]);
      setShowWizard(false);
      setStep(1);
      setWizardData({ vendorId: '', items: [], totalAmount: 0 });
      refreshNotifications();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create order.');
    }
  };

  const handleAdvanceStatus = async (orderId: string, action: 'submit' | 'approve' | 'order' | 'reject', notes?: string) => {
    setActionLoading(true);
    setActionMsg('');
    try {
      const res = await api.put(`/procurement/${orderId}/${action}`, { notes });
      const updated = res.data.data;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updated } : o));
      setSelectedOrder((prev: any) => prev ? { ...prev, ...updated } : null);
      const successMsgs: Record<string, string> = {
        submit: 'Order submitted for approval.',
        approve: 'Order approved successfully.',
        order: '✅ Order marked as ORDERED. Vendor dispatched.',
      };
      setActionMsg(successMsgs[action]);
      refreshNotifications();
    } catch (err: any) {
      setActionMsg('Error: ' + (err.response?.data?.message || 'Action failed. You may not have the required role.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('⚠️ HEAVY OVERRIDE: Are you absolutely sure you want to PERMANENTLY DELETE this procurement request? This cannot be undone and will be logged in the audit trail.')) return;
    
    setActionLoading(true);
    setActionMsg('');
    try {
      await api.delete(`/procurement/${orderId}`);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      setSelectedOrder(null);
      refreshNotifications();
    } catch (err: any) {
      setActionMsg('Error: ' + (err.response?.data?.message || 'Delete failed. You may not have the required administrative role.'));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !showWizard) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-4 transition-all group"
          >
            <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            Control Center
          </button>
          <h2 className="text-4xl font-black text-foreground tracking-tight">Procurement Hub</h2>
          <p className="text-muted-foreground mt-1 text-lg font-medium opacity-80">Orchestrate acquisition lifecycles and global reconciliation.</p>
        </div>
        {hasPermission(PERMISSIONS.PROCUREMENT_CREATE) && (
          <button 
            onClick={() => { setShowWizard(true); setStep(1); setWizardData({ vendorId: '', items: [], totalAmount: 0 }); }}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-2xl font-black flex items-center transition-all shadow-xl shadow-primary/20 active:scale-95 text-xs uppercase tracking-widest"
          >
            <Plus size={20} className="mr-2" strokeWidth={3} />
            Initialize Request
          </button>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden shadow-2xl glass">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/20 border-b border-border/50">
              <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Reference</th>
              <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Strategic Partner</th>
              <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Commit Value</th>
              <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Status</th>
              <th className="px-8 py-5 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Comments</th>
              <th className="px-8 py-5 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-24 text-center">
                  <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
                     <FileText size={32} className="text-muted-foreground/30" />
                  </div>
                  <p className="text-foreground font-black text-xl">No active procurement detected.</p>
                  <p className="text-muted-foreground text-sm mt-1 max-w-xs mx-auto">Initiate a purchase request to begin orchestrating your supply chain lifecycle.</p>
                </td>
              </tr>
            ) : orders.map((order: any) => {
              const sc = statusConfig[order.status] || statusConfig.DRAFT;
              const actionReq = getActionRequired(order);
              return (
                <tr key={order.id} className="hover:bg-primary/5 transition-all group cursor-pointer" onClick={() => { setSelectedOrder(order); setActionMsg(''); }}>
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="p-2.5 bg-muted/50 rounded-xl group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                           <FileText size={18} />
                        </div>
                        {actionReq && (
                          <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-background animate-pulse shadow-lg ${
                            actionReq.level === 'high' ? 'bg-rose-500' : 'bg-amber-500'
                          }`}>
                             <div className={`absolute inset-0 rounded-full animate-ping opacity-75 ${
                               actionReq.level === 'high' ? 'bg-rose-500' : 'bg-amber-500'
                             }`}></div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-tight">ID: PO-{order.id.split('-')[0].toUpperCase()}</span>
                        {actionReq && (
                          <span className={`${actionReq.level === 'high' ? 'text-rose-500' : 'text-amber-500'} text-[8px] font-black uppercase tracking-[0.2em] mt-0.5`}>
                            {actionReq.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-sm font-black text-foreground group-hover:text-primary transition-colors">{order.vendor?.name || '—'}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">Global Partner</p>
                  </td>
                  <td className="px-8 py-5">
                    <p className="text-base font-black text-foreground">₹{Number(order.totalAmount).toLocaleString('en-IN')}</p>
                  </td>
                  <td className="px-8 py-5">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border shadow-sm ${sc.bg} ${sc.color} ${sc.border}`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></div>
                      {sc.label}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <p className={`text-[10px] font-bold tracking-tight italic line-clamp-2 max-w-[200px] ${order.status === 'REJECTED' ? 'text-rose-600' : 'text-muted-foreground opacity-70'}`}>
                      {order.approvalNotes || order.rejectionNotes || '—'}
                    </p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {hasPermission(PERMISSIONS.ADMIN_CONFIG) && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteOrder(order.id); }}
                          className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                        >
                          <Trash2 size={18} strokeWidth={3} />
                        </button>
                      )}
                      <button className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100">
                        <ChevronRight size={20} strokeWidth={3} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── ORDER DETAIL PANEL ─── */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/60 backdrop-blur-xl" onClick={() => setSelectedOrder(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              onClick={e => e.stopPropagation()}
              className="bg-card/80 border border-border/50 w-full max-w-5xl rounded-[2.5rem] overflow-hidden shadow-[0_32px_128px_-32px_rgba(0,0,0,0.5)] flex flex-col glass"
            >
              {/* Header */}
              <div className="px-10 py-8 border-b border-border/50 flex items-center justify-between bg-muted/10 backdrop-blur-md">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20">
                     <FileText size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground font-black">PROCUREMENT INTELLIGENCE</p>
                    <h3 className="text-3xl font-black text-foreground font-mono tracking-tighter mt-1 leading-none">PO-{selectedOrder.id.split('-')[0].toUpperCase()}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden md:flex flex-col items-right text-right mr-4 border-r border-border/50 pr-6">
                     <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Created At</p>
                     <p className="text-[10px] font-bold text-foreground opacity-60 leading-none">{new Date(selectedOrder.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                  {hasPermission(PERMISSIONS.ADMIN_CONFIG) && (
                    <button 
                      onClick={() => handleDeleteOrder(selectedOrder.id)} 
                      className="w-12 h-12 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500 hover:text-white rounded-2xl text-rose-500 transition-all shadow-sm"
                      title="Delete Record"
                    >
                      <Trash2 size={24} strokeWidth={3} />
                    </button>
                  )}
                  <button onClick={() => setSelectedOrder(null)} className="w-12 h-12 flex items-center justify-center bg-muted/50 hover:bg-rose-500/10 hover:text-rose-500 rounded-2xl text-muted-foreground transition-all">
                    <X size={24} strokeWidth={3} />
                  </button>
                </div>
              </div>

              <div className="p-10 grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-10 max-h-[80vh] overflow-y-auto custom-scrollbar bg-card/20">
                {/* ─── LEFT COLUMN: CONTEXT & METADATA ─── */}
                <div className="space-y-8 h-full">
                  {/* Supplier Card */}
                  <div className="bg-background/40 border border-border/50 rounded-[2rem] p-8 relative overflow-hidden group/supplier shadow-sm">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover/supplier:bg-primary/10 transition-all duration-700"></div>
                    <div className="relative z-10 flex flex-col h-full">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center border border-primary/20">
                           <User size={20} strokeWidth={3} />
                        </div>
                        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-black leading-none">STRATEGIC PARTNER</p>
                      </div>
                      <p className="font-black text-foreground text-2xl leading-tight tracking-tight mb-2">{selectedOrder.vendor?.name}</p>
                      <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-[0.2em] mb-8 italic">Verified Enterprise Gateway</p>
                      
                      <div className="mt-auto pt-8 border-t border-border/30 flex items-center justify-between">
                         <div className="flex flex-col">
                            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Assigned Vendor ID</span>
                            <span className="text-[10px] font-mono font-bold text-primary">#{selectedOrder.vendorId.split('-')[0].toUpperCase()}</span>
                         </div>
                         <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                            <CheckCircle2 size={16} strokeWidth={3} />
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Commit Value Card */}
                  <div className="bg-primary/5 border border-primary/20 rounded-[2rem] p-8 shadow-inner relative overflow-hidden group/value">
                    <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover/value:bg-primary/20 transition-all duration-700"></div>
                    <div className="relative z-10">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-black mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                        FISCAL COMMITMENT
                      </p>
                      <p className="font-black text-primary text-4xl tracking-tighter mb-1">
                        ₹{Number(selectedOrder.totalAmount).toLocaleString('en-IN')}
                      </p>
                      <p className="text-[10px] font-bold text-primary/40 uppercase tracking-widest italic">Inclusive of applicable taxes</p>
                    </div>
                  </div>
                </div>

                {/* ─── RIGHT COLUMN: OPERATIONS & LIFECYCLE ─── */}
                <div className="space-y-10">
                  {/* Status Journey - High Fidelity Path Tracker */}
                  <div className="bg-background/40 border border-border/50 rounded-[2.5rem] p-10 relative overflow-hidden group/journey shadow-sm">
                     {/* Background Glow */}
                    <div className="absolute -top-32 -left-32 w-64 h-64 bg-primary/5 rounded-full blur-[100px] group-hover/journey:bg-primary/10 transition-all duration-1000"></div>
                    
                    <div className="flex items-center justify-between mb-10">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground font-black">LIFECYCLE TRAJECTORY</p>
                        <h4 className="text-xs font-black text-foreground mt-1 uppercase tracking-[0.2em] opacity-60">Linear Asset Transition Path</h4>
                      </div>
                      <div className="px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-[9px] font-black text-primary uppercase tracking-widest animate-pulse shadow-sm shadow-primary/10">
                        Blockchain Sync Active
                      </div>
                    </div>

                    <div className="relative pt-6 pb-12">
                      {/* Connecting Line Track */}
                      <div className="absolute top-[1.35rem] left-5 right-5 h-[2px] bg-border/20 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ 
                            width: `${((['DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED', 'COMPLETED'].indexOf(selectedOrder.status === 'REJECTED' ? 'SUBMITTED' : (selectedOrder.status === 'PARTIALLY_RECEIVED' ? 'ORDERED' : selectedOrder.status)) / 4) * 100)}%`
                          }}
                          className={`h-full transition-all duration-1000 ${selectedOrder.status === 'REJECTED' ? 'bg-rose-500' : 'bg-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)]'}`}
                        />
                      </div>

                      <div className="relative flex justify-between items-start">
                        {['DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED', 'COMPLETED'].map((s) => {
                          const baseStatus = selectedOrder.status === 'REJECTED' ? 'SUBMITTED' : (selectedOrder.status === 'PARTIALLY_RECEIVED' ? 'ORDERED' : selectedOrder.status);
                          const statusOrder = ['DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED', 'COMPLETED'];
                          const currentIndex = statusOrder.indexOf(baseStatus);
                          
                          const isActive = selectedOrder.status === s || (s === 'ORDERED' && selectedOrder.status === 'PARTIALLY_RECEIVED');
                          const isDone = statusOrder.indexOf(s) < currentIndex;
                          const isRejected = selectedOrder.status === 'REJECTED' && s === 'SUBMITTED';
                          
                          const sc = isRejected ? statusConfig.REJECTED : (statusConfig[s] || statusConfig.COMPLETED);

                          return (
                            <div key={s} className="flex flex-col items-center group/node relative z-10" style={{ width: '20%' }}>
                              {/* Node Dot */}
                              <motion.div 
                                initial={false}
                                animate={{ 
                                  scale: isActive ? 1.25 : 1,
                                  boxShadow: isActive ? `0 0 30px ${isRejected ? 'rgba(244,63,94,0.4)' : 'rgba(var(--primary-rgb),0.4)'}` : 'none'
                                }}
                                className={`w-12 h-12 rounded-[1.4rem] flex items-center justify-center transition-all duration-700 border-2 ${
                                  isRejected ? 'bg-rose-500 border-rose-400 text-white animate-bounce-subtle' :
                                  isActive ? `bg-primary border-primary/50 text-white` :
                                  isDone ? 'bg-emerald-500 border-emerald-400 text-white' :
                                  'bg-card border-border/50 text-muted-foreground/30 shadow-inner'
                                }`}
                              >
                                {isRejected ? <X size={24} strokeWidth={3.5} /> :
                                 isDone ? <CheckCircle2 size={24} strokeWidth={3.5} /> : 
                                 <sc.icon size={22} strokeWidth={isActive ? 3.5 : 2} className={isActive ? 'animate-pulse' : ''} />
                                }
                              </motion.div>

                              {/* Label */}
                              <div className="mt-5 text-center px-1">
                                <p className={`text-[9px] font-black uppercase tracking-[0.2em] transition-colors duration-500 leading-none ${isRejected ? 'text-rose-600' : isActive ? 'text-foreground' : isDone ? 'text-emerald-600' : 'text-muted-foreground/20'}`}>
                                  {isRejected ? 'REJECTED' : (s === 'COMPLETED' ? 'DONE' : s)}
                                </p>
                                {isActive && !isRejected && (
                                  <motion.div 
                                    layoutId="active-indicator"
                                    className="h-1 w-5 bg-primary mx-auto mt-2 rounded-full"
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Feedback Hub: Rejection / Approval Notes */}
                  <div className="space-y-6">
                    {selectedOrder.status === 'REJECTED' && selectedOrder.rejectionNotes && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-rose-500/5 border-2 border-dashed border-rose-500/20 rounded-[2.5rem] p-10 relative group/reject shadow-lg"
                      >
                        <div className="absolute top-6 right-8 opacity-10 group-hover/reject:opacity-[0.15] transition-opacity">
                          <XCircle size={72} />
                        </div>
                        <div className="flex items-center gap-5 text-rose-600 mb-6">
                          <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-rose-500/20">
                            <AlertCircle size={24} strokeWidth={3} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] leading-none mb-1">Governance Rejection</p>
                            <p className="text-[8px] font-bold opacity-60 uppercase tracking-widest leading-none">Formal Administrative Override</p>
                          </div>
                        </div>
                        <blockquote className="text-lg font-black text-foreground leading-relaxed pl-8 border-l-4 border-rose-500/30 py-2 italic font-serif">
                          "{selectedOrder.rejectionNotes}"
                        </blockquote>
                      </motion.div>
                    )}

                    {selectedOrder.status === 'APPROVED' && selectedOrder.approvalNotes && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-primary/5 border-2 border-dashed border-primary/20 rounded-[2.5rem] p-10 relative group/approve shadow-lg"
                      >
                        <div className="absolute top-6 right-8 opacity-10 group-hover/approve:opacity-[0.15] transition-opacity">
                          <CheckCircle2 size={72} />
                        </div>
                        <div className="flex items-center gap-5 text-primary mb-6">
                          <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20">
                            <ThumbsUp size={24} strokeWidth={3} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] leading-none mb-1">Lifecycle Authorization</p>
                            <p className="text-[8px] font-bold opacity-60 uppercase tracking-widest leading-none">Formal Approval Commentary</p>
                          </div>
                        </div>
                        <blockquote className="text-lg font-black text-foreground leading-relaxed pl-8 border-l-4 border-primary/30 py-2 italic font-serif">
                          "{selectedOrder.approvalNotes}"
                        </blockquote>
                      </motion.div>
                    )}

                    {/* Action Message Display */}
                    {actionMsg && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-6 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] text-center border shadow-xl ${
                          actionMsg.startsWith('Error') 
                          ? 'bg-rose-500/5 text-rose-500 border-rose-500/20' 
                          : 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20'
                        }`}
                      >
                        {actionMsg}
                      </motion.div>
                    )}

                    {/* Operational Action Control Center */}
                    <div className="pt-2">
                      {selectedOrder.status === 'DRAFT' && (
                        <button
                          disabled={actionLoading || !hasPermission(PERMISSIONS.PROCUREMENT_CREATE)}
                          onClick={() => handleAdvanceStatus(selectedOrder.id, 'submit')}
                          className="w-full h-16 flex items-center justify-center gap-4 bg-amber-500 hover:bg-amber-400 text-white font-black uppercase tracking-[0.3em] text-xs rounded-3xl transition-all shadow-xl shadow-amber-500/20 active:scale-95 disabled:opacity-30"
                        >
                          <Send size={20} strokeWidth={3} /> {actionLoading ? 'ORCHESTRATING...' : 'INITIATE PROCUREMENT'}
                        </button>
                      )}
                      
                      {selectedOrder.status === 'SUBMITTED' && (
                        <div className="space-y-4">
                          {(!showRejectInput && !showApproveInput) ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <button
                                disabled={actionLoading || !hasPermission(PERMISSIONS.PROCUREMENT_APPROVE)}
                                onClick={() => setShowApproveInput(true)}
                                className="h-16 flex items-center justify-center gap-4 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.3em] text-xs rounded-3xl transition-all shadow-xl shadow-primary/20 active:scale-95 disabled:opacity-30"
                              >
                                <ThumbsUp size={20} strokeWidth={3} /> AUTHORIZE
                              </button>
                              <button
                                disabled={actionLoading || !hasPermission(PERMISSIONS.PROCUREMENT_APPROVE)}
                                onClick={() => setShowRejectInput(true)}
                                className="h-16 flex items-center justify-center gap-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 font-black uppercase tracking-[0.3em] text-xs rounded-3xl transition-all border border-rose-500/20 active:scale-95"
                              >
                                <XCircle size={20} strokeWidth={3} /> DECLINE
                              </button>
                            </div>
                          ) : showApproveInput ? (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="bg-background/80 border-2 border-primary/30 rounded-[2rem] p-6 space-y-6 shadow-2xl backdrop-blur-xl"
                            >
                              <div>
                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4 px-1">Authorization Comments (Optional)</p>
                                <textarea 
                                  placeholder="Document the justification for this approval..."
                                  className="w-full bg-muted/40 border-2 border-border/50 rounded-2xl p-5 text-sm font-medium focus:outline-none focus:border-primary/50 transition-all resize-none h-28 shadow-inner"
                                  value={approveReason}
                                  onChange={(e) => setApproveReason(e.target.value)}
                                />
                              </div>
                              <div className="flex gap-4">
                                <button
                                  onClick={() => { setShowApproveInput(false); setApproveReason(''); }}
                                  className="flex-1 h-12 bg-muted/50 text-muted-foreground font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-muted transition-all border border-border/50"
                                >
                                  Back
                                </button>
                                <button
                                  disabled={actionLoading}
                                  onClick={() => {
                                    handleAdvanceStatus(selectedOrder.id, 'approve', approveReason);
                                    setShowApproveInput(false);
                                    setApproveReason('');
                                  }}
                                  className="flex-[2.5] h-12 bg-primary text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-30"
                                >
                                  {actionLoading ? 'SYNCHRONIZING...' : 'FINAL AUTHORIZATION'}
                                </button>
                              </div>
                            </motion.div>
                          ) : (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="bg-background/80 border-2 border-rose-500/30 rounded-[2rem] p-6 space-y-6 shadow-2xl backdrop-blur-xl"
                            >
                              <div>
                                <p className="text-[10px] font-black text-rose-600 uppercase tracking-[0.3em] mb-4 px-1">Reason for Rejection (Mandatory)</p>
                                <textarea 
                                  placeholder="Specify the reason for declining this request..."
                                  className="w-full bg-muted/40 border-2 border-border/50 rounded-2xl p-5 text-sm font-medium focus:outline-none focus:border-rose-500/50 transition-all resize-none h-28 shadow-inner"
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                />
                              </div>
                              <div className="flex gap-4">
                                <button
                                  onClick={() => { setShowRejectInput(false); setRejectionReason(''); }}
                                  className="flex-1 h-12 bg-muted/50 text-muted-foreground font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-muted transition-all border border-border/50"
                                >
                                  Abort
                                </button>
                                <button
                                  disabled={actionLoading || !rejectionReason.trim()}
                                  onClick={() => {
                                    handleAdvanceStatus(selectedOrder.id, 'reject', rejectionReason);
                                    setShowRejectInput(false);
                                    setRejectionReason('');
                                  }}
                                  className="flex-[2.5] h-12 bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-rose-500 transition-all shadow-lg shadow-rose-600/20 disabled:opacity-30"
                                >
                                  {actionLoading ? 'TERMINATING...' : 'CONFIRM OVERRIDE'}
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      )}

                      {selectedOrder.status === 'APPROVED' && (
                        <button
                          disabled={actionLoading || !hasPermission(PERMISSIONS.PROCUREMENT_CREATE)}
                          onClick={() => handleAdvanceStatus(selectedOrder.id, 'order')}
                          className="w-full h-16 flex items-center justify-center gap-4 bg-violet-600 hover:bg-violet-500 text-white font-black uppercase tracking-[0.3em] text-xs rounded-3xl transition-all shadow-xl shadow-violet-500/20 active:scale-95 disabled:opacity-30"
                        >
                          <Package size={20} strokeWidth={3} /> {actionLoading ? 'SYNCHRONIZING...' : 'MARK AS DISPATCHED'}
                        </button>
                      )}

                      {(selectedOrder.status === 'ORDERED' || selectedOrder.status === 'PARTIALLY_RECEIVED') && (
                        <button
                          disabled={!hasPermission(PERMISSIONS.PROCUREMENT_RECEIVE)}
                          onClick={() => setShowReceiptModal(true)}
                          className="w-full h-16 flex items-center justify-center gap-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-[0.3em] text-xs rounded-3xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95 disabled:opacity-30"
                        >
                          <PackageCheck size={20} strokeWidth={3} /> LOG INBOUND SHIPMENT
                        </button>
                      )}

                      {selectedOrder.status === 'COMPLETED' && (
                        <div className="text-center py-6 text-emerald-500 font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-4 border-2 border-dashed border-emerald-500/20 bg-emerald-500/5 rounded-[1.5rem] shadow-sm">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                          LOGISTICS LIFECYCLE FINALIZED
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── PURCHASE REQUEST WIZARD ─── */}
      <AnimatePresence>
        {showWizard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-card/90 border border-border/50 w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-[0_32px_128px_-32px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] glass"
            >
              {/* Stepper Header */}
              <div className="px-10 py-8 bg-muted/20 border-b border-border/40 flex items-center justify-between">
                <div className="flex items-center space-x-12">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black transition-all duration-500 ${
                        step === s ? 'bg-primary text-white shadow-2xl shadow-primary/40 scale-110 rotate-3' :
                        step > s ? 'bg-emerald-500 text-white' : 'bg-muted/50 text-muted-foreground/40 border border-border/50'
                      }`}>
                        {step > s ? <CheckCircle2 size={20} strokeWidth={3} /> : s}
                      </div>
                      <div className="flex flex-col">
                         <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${step === s ? 'text-primary' : 'text-muted-foreground/40'}`}>
                           Phase 0{s}
                         </span>
                         <span className={`text-xs font-bold ${step === s ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                           {s === 1 ? 'Strategic Partner' : s === 2 ? 'Inventory Selection' : 'Final Validation'}
                         </span>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowWizard(false)} className="w-10 h-10 flex items-center justify-center bg-muted/40 hover:bg-rose-500/10 hover:text-rose-500 rounded-full text-muted-foreground transition-all">
                   <X size={20} strokeWidth={3} />
                </button>
              </div>

              {/* Wizard Content */}
              <div className="flex-1 overflow-y-auto p-10 bg-card/40 custom-scrollbar">
                {step === 1 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center space-y-2 mb-10">
                      <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-6 border border-primary/20 shadow-inner">
                        <User size={40} strokeWidth={2.5} />
                      </div>
                      <h3 className="text-3xl font-black text-foreground tracking-tight">Identify Strategic Partner</h3>
                      <p className="text-muted-foreground font-medium">Select the global supplier responsible for this procurement node.</p>
                    </div>
                    {vendors.length === 0 ? (
                      <div className="text-center py-20 bg-background/40 border-2 border-dashed border-border rounded-[2rem]">
                        <User size={48} className="mx-auto mb-4 text-muted-foreground/20" />
                        <p className="text-foreground font-black text-xl">No Supply Partners</p>
                        <p className="text-muted-foreground text-sm mt-1">Please onboard your global network partners to begin acquisition.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {vendors.map((v: any) => (
                          <div 
                            key={v.id}
                            onClick={() => { setWizardData({ ...wizardData, vendorId: v.id }); setStep(2); }}
                            className={`p-6 rounded-[2rem] border-2 transition-all cursor-pointer group relative overflow-hidden ${
                              wizardData.vendorId === v.id 
                              ? 'bg-primary/5 border-primary shadow-2xl shadow-primary/5 ring-1 ring-primary/20' 
                              : 'bg-background/50 border-border/50 hover:border-primary/30 hover:bg-primary/[0.02]'
                            }`}
                          >
                            <div className="flex items-center justify-between relative z-10">
                              <div className="flex items-center space-x-4">
                                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-all ${
                                   wizardData.vendorId === v.id ? 'bg-primary text-white' : 'bg-muted/50 text-muted-foreground'
                                 }`}>
                                   {v.name.charAt(0)}
                                 </div>
                                 <div>
                                   <h4 className="font-black text-foreground group-hover:text-primary transition-colors">{v.name}</h4>
                                   <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">{v.category?.name || 'General Logistics'}</p>
                                 </div>
                              </div>
                              {wizardData.vendorId === v.id && (
                                <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center">
                                   <CheckCircle2 size={14} strokeWidth={4} />
                                </div>
                              )}
                            </div>
                            <div className="mt-4 pt-4 border-t border-border/30 flex items-center text-[10px] font-black tracking-widest text-muted-foreground group-hover:text-primary transition-colors">
                               SECURE GATEWAY DETECTED
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="flex items-center justify-between mb-8 bg-background/40 p-6 rounded-3xl border border-border/50 shadow-sm">
                      <div>
                        <h3 className="text-2xl font-black text-foreground tracking-tight">Inventory Payload</h3>
                        <p className="text-xs text-muted-foreground font-bold mt-0.5 uppercase tracking-widest">Constructing Shipment Requirements</p>
                      </div>
                      <div className="relative w-80 group" ref={searchRef}>
                        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${showSearchDropdown ? 'text-primary' : 'text-muted-foreground'}`} size={18} />
                        <input 
                          type="text"
                          placeholder="Search Global Repository..."
                          className="w-full bg-card border-2 border-border/50 rounded-2xl py-3 pl-12 pr-4 text-xs font-black uppercase tracking-widest text-foreground focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                          value={searchQuery}
                          onFocus={() => setShowSearchDropdown(true)}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowSearchDropdown(true);
                          }}
                        />
                        
                        <AnimatePresence>
                          {showSearchDropdown && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute top-full left-0 right-0 mt-2 bg-card border border-border/50 rounded-2xl shadow-2xl z-[60] overflow-hidden glass max-h-64 overflow-y-auto custom-scrollbar"
                            >
                              {(() => {
                                const filtered = products.filter(p => 
                                  p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  p.sku.toLowerCase().includes(searchQuery.toLowerCase())
                                );

                                if (filtered.length === 0) {
                                  return (
                                    <div className="px-4 py-8 text-center bg-muted/5">
                                      <Package className="mx-auto text-muted-foreground/20 mb-3" size={32} />
                                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No matches found</p>
                                    </div>
                                  );
                                }

                                return filtered.map((p: any) => (
                                  <button
                                    key={p.id}
                                    onClick={() => {
                                      addItemToOrder(p.id);
                                      setSearchQuery('');
                                      setShowSearchDropdown(false);
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-primary/10 transition-colors border-b border-border/30 last:border-0 group/item flex flex-col gap-1"
                                  >
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] font-black text-foreground uppercase tracking-tight group-hover/item:text-primary transition-colors">{p.name}</span>
                                      <span className="text-[8px] font-mono font-bold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md border border-border/50 uppercase">{p.sku}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-widest">
                                        {p.category?.name || 'GEN. ASSET'}
                                      </span>
                                      <div className="w-1 h-1 rounded-full bg-muted-foreground/30"></div>
                                      <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">₹{Number(p.purchasePrice).toLocaleString()}</span>
                                    </div>
                                  </button>
                                ));
                              })()}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {wizardData.items.length === 0 ? (
                        <div className="border-4 border-dashed border-border/50 rounded-[2.5rem] p-24 text-center bg-muted/5 transition-all hover:bg-muted/10">
                          <Package className="mx-auto text-muted-foreground/20 mb-6" size={64} />
                          <p className="text-muted-foreground font-black text-xl">Repository Empty</p>
                          <p className="text-muted-foreground/60 text-sm mt-2 max-w-xs mx-auto">Selected items from your global repository will appear here for batch configuration.</p>
                        </div>
                      ) : (
                        wizardData.items.map((item, idx) => (
                          <motion.div 
                            key={item.productId} 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-background/60 border-2 border-border/50 rounded-[2rem] p-6 grid grid-cols-12 gap-6 items-center shadow-sm hover:border-primary/30 transition-all"
                          >
                            <div className="col-span-12 md:col-span-5">
                              <p className="text-sm font-black text-foreground uppercase tracking-tight">{item.name}</p>
                              <div className="flex items-center gap-2 mt-1.5 ">
                                 <span className="text-[10px] font-mono text-muted-foreground/60 bg-muted px-2 py-0.5 rounded-lg border border-border/50">BASE VALUE: ₹{item.unitPrice}</span>
                                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/40"></span>
                                 <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">In Stock</span>
                              </div>
                            </div>
                            <div className="col-span-5 md:col-span-3">
                              <label className="text-[9px] uppercase font-black text-muted-foreground tracking-[0.2em] mb-2 block">Payload Qty</label>
                              <div className="relative">
                                <input 
                                  type="number" min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value) || 1 })}
                                  className="w-full bg-muted/30 border-2 border-border/40 rounded-xl py-2 px-4 text-sm font-black text-foreground focus:outline-none focus:border-primary/50 transition-all"
                                />
                              </div>
                            </div>
                            <div className="col-span-5 md:col-span-3">
                              <label className="text-[9px] uppercase font-black text-muted-foreground tracking-[0.2em] mb-2 block">Neg. Price (₹)</label>
                              <input 
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-muted/30 border-2 border-border/40 rounded-xl py-2 px-4 text-sm font-black text-foreground focus:outline-none focus:border-primary/50 transition-all"
                              />
                            </div>
                            <div className="col-span-2 md:col-span-1 text-right">
                              <button onClick={() => removeItem(idx)} className="w-10 h-10 flex items-center justify-center bg-rose-500/5 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all">
                                <Trash2 size={18} strokeWidth={3} />
                              </button>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                    {wizardData.items.length > 0 && (
                      <div className="flex justify-end pt-4">
                        <div className="bg-primary/5 border border-primary/20 rounded-2xl px-6 py-4 flex flex-col items-end shadow-inner">
                           <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">Payload Valuation</span>
                           <span className="text-3xl font-black text-foreground tracking-tighter">₹{wizardData.totalAmount.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="text-center space-y-2 mb-10">
                      <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-inner">
                        <CheckCircle2 size={40} strokeWidth={2.5} />
                      </div>
                      <h3 className="text-3xl font-black text-foreground tracking-tight">Validation Checkpoint</h3>
                      <p className="text-muted-foreground font-medium">Verify the procurement parameters before initiation.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-background/40 border border-border/50 rounded-[2rem] p-8 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/40"></div>
                        <h4 className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.3em] mb-4">Strategic Supplier</h4>
                        <p className="text-2xl font-black text-foreground tracking-tight">{vendors.find((v: any) => v.id === wizardData.vendorId)?.name}</p>
                        <p className="text-sm text-muted-foreground font-medium mt-1 uppercase tracking-wider">{vendors.find((v: any) => v.id === wizardData.vendorId)?.email}</p>
                      </div>
                      <div className="bg-primary/5 border border-primary/20 rounded-[2rem] p-8 flex items-center justify-between shadow-inner group">
                        <div>
                          <h4 className="text-[10px] uppercase font-black text-primary tracking-[0.3em] mb-2">Total Financial Commitment</h4>
                          <p className="text-4xl font-black text-foreground font-mono tracking-tighter">₹{wizardData.totalAmount.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                           <Calculator size={32} strokeWidth={2.5} />
                        </div>
                      </div>
                    </div>

                    <div className="bg-background/40 border border-border/50 rounded-[2rem] p-8 transition-all hover:bg-background/60">
                      <div className="flex items-center justify-between mb-6 border-b border-border/40 pb-4">
                         <h4 className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.3em]">Payload Manifest</h4>
                         <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest">{wizardData.items.length} Units</span>
                      </div>
                      <div className="max-h-52 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                        {wizardData.items.map((item) => (
                          <div key={item.productId} className="flex justify-between items-center group">
                            <div className="flex flex-col">
                               <span className="text-sm font-black text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">{item.name}</span>
                               <span className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest">UNIT Qty: {item.quantity}</span>
                            </div>
                            <div className="text-right">
                               <span className="text-base font-black text-foreground font-mono tracking-tighter">₹{(item.quantity * item.unitPrice).toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-[1.5rem] p-6 flex items-start space-x-4">
                      <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} strokeWidth={3} />
                      <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed font-bold uppercase tracking-wide">
                        Procurement Warning: This request will initiate in <strong className="underline">DRAFT</strong> mode. Final stock synchronization occurs post-receipt verification in the logistics layer.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Wizard Footer */}
              <div className="px-10 py-7 bg-muted/20 border-t border-border/40 flex justify-between items-center">
                <button 
                  disabled={step === 1}
                  onClick={() => setStep(step - 1)}
                  className="px-8 h-12 rounded-2xl bg-muted/50 text-muted-foreground font-black uppercase tracking-widest text-[10px] hover:bg-muted hover:text-foreground transition-all disabled:opacity-20 flex items-center border border-border/50"
                >
                  <ChevronLeft size={16} className="mr-2" strokeWidth={3} /> Previous Phase
                </button>
                {step < 3 ? (
                  <button 
                    disabled={(step === 1 && !wizardData.vendorId) || (step === 2 && wizardData.items.length === 0)}
                    onClick={() => setStep(step + 1)}
                    className="px-10 h-12 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-[10px] hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-30 flex items-center"
                  >
                    Proceed to Step 0{step + 1} <ChevronRight size={16} className="ml-2" strokeWidth={3} />
                  </button>
                ) : (
                    <button 
                      onClick={handleCreateOrder}
                      className="px-12 h-14 rounded-2xl bg-emerald-600 text-white font-black uppercase tracking-[0.2em] text-xs hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-500/30 flex items-center active:scale-95"
                    >
                      <Send size={18} className="mr-3" strokeWidth={3} /> Initiate Procurement
                    </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Shipment Modal */}
      <ShipmentReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        order={selectedOrder}
        onSuccess={(updatedOrder) => {
          setShowReceiptModal(false);
          setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
          setSelectedOrder(updatedOrder);
          setActionMsg('✅ Shipment logged. Inventory has been credited.');
          refreshNotifications();
        }}
      />
    </div>
  );
};

export default Procurement;
