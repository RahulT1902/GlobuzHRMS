import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Package, Search, Plus, 
  MoreVertical, AlertTriangle,
  Edit2, Trash2, Loader2,
  ChevronRight, ChevronLeft,
  Filter, TrendingUp, TrendingDown, PackageCheck, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProductModal from '../components/ProductModal';
import StockAdjustmentModal from '../components/StockAdjustmentModal';
import TransactionHistoryModal from '../components/TransactionHistoryModal';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../constants/permissions';

const InventoryList: React.FC = () => {
  const { hasPermission } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedHistoryProduct, setSelectedHistoryProduct] = useState<any>(null);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSingleDelete = async (id: string, isBulk = false) => {
    if (!hasPermission(PERMISSIONS.INVENTORY_DELETE)) return;
    if (!isBulk && !window.confirm('Are you sure you want to permanently delete this asset?')) return;
    try {
      await api.delete(`/inventory/${id}`);
      if (!isBulk) fetchProducts();
    } catch {
      alert('Failed to delete asset');
    }
  };

  const handleBulkDelete = async () => {
    if (!hasPermission(PERMISSIONS.INVENTORY_DELETE)) return;
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} assets?`)) return;
    try {
      await api.delete('/inventory/bulk', { data: { ids: Array.from(selectedIds) } });
      setSelectedIds(new Set());
      fetchProducts();
    } catch {
      alert('Failed to delete selected assets');
    }
  };

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasPermission(PERMISSIONS.INVENTORY_DELETE)) return;
    if (e.target.checked) {
      setSelectedIds(new Set(products.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (id: string) => {
    if (!hasPermission(PERMISSIONS.INVENTORY_DELETE)) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<any>(null);
  const [adjustmentType, setAdjustmentType] = useState<'IN' | 'OUT'>('IN');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/inventory?search=${search}&page=${page}`);
      const d = data.data || {};
      setProducts(d.products || []);
      setTotalPages(d.totalPages || 1);
      setTotal(d.total || 0);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuccess = (data: any) => {
    if (editingProduct) {
      // Logic for editing a single product
      setProducts(prev => prev.map(p => p.id === data.id ? data : p));
    } else if (Array.isArray(data)) {
      // Logic for batch variant initialization
      setProducts(prev => [...data, ...prev.slice(0, Math.max(0, 10 - data.length))]);
      setTotal(prev => prev + data.length);
    } else {
      // Logic for single product addition
      setProducts(prev => [data, ...prev.slice(0, 9)]);
      setTotal(prev => prev + 1);
    }
    setEditingProduct(null);
    setIsModalOpen(false); // Explicitly close to ensure UI sync
  };

  const handleAdjustSuccess = (updatedProduct: any) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    setAdjustingProduct(null);
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(), 500);
    return () => clearTimeout(timer);
  }, [search, page]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Inventory Assets</h2>
          <p className="text-muted-foreground mt-1">Real-time valuation and stock tracking across global warehouses.</p>
        </div>
        {hasPermission(PERMISSIONS.INVENTORY_ADD) && (
          <button 
            onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
            className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center transition-all shadow-lg shadow-primary/20 active:scale-95"
          >
            <Plus size={20} className="mr-2" />
            Add To Catalog
          </button>
        )}
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card/50 border border-border p-5 rounded-2xl flex items-center gap-4 group hover:border-border/80 transition-all">
          <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform"><Package size={24} /></div>
          <div>
            <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Total SKUs</div>
            <div className="text-2xl font-bold text-foreground">{total}</div>
          </div>
        </div>
        <div className="bg-card/50 border border-border p-5 rounded-2xl flex items-center gap-4 group hover:border-border/80 transition-all">
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 group-hover:scale-110 transition-transform"><AlertTriangle size={24} /></div>
          <div>
            <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Low Stock</div>
            <div className="text-2xl font-bold text-foreground">{products.filter(p => p.closingStock <= (p.minThreshold || 10)).length}</div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-card/50 border border-border p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center shadow-xl">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Filter by Name or SKU..."
            className="w-full bg-background border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:border-primary/50 transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="p-2.5 px-4 bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl flex items-center text-sm font-medium transition-colors border border-border/50">
          <Filter size={16} className="mr-2" /> 
          Filters
        </button>
      </div>

      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            className="bg-rose-500/10 border border-rose-500/20 px-6 py-3 rounded-xl flex items-center justify-between"
          >
            <span className="text-rose-400 font-bold text-sm">{selectedIds.size} Assets Selected</span>
            <button 
              onClick={handleBulkDelete}
              className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-lg shadow-rose-600/20 flex items-center gap-2"
            >
              <Trash2 size={16} /> Delete Selected
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table Container */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="px-6 py-4 w-12 text-center text-muted-foreground">
                <input 
                  type="checkbox" 
                  onChange={toggleSelectAll} 
                  checked={products.length > 0 && selectedIds.size === products.length}
                  className="w-4 h-4 rounded border-border bg-background accent-primary cursor-pointer"
                />
              </th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest min-w-[450px]">Asset & Identifier</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest text-center w-36">Current Stock</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest text-center whitespace-nowrap">Purchase Date</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest text-center whitespace-nowrap">Purchase Price</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Category</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest text-right w-48">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                      <p className="text-muted-foreground text-sm font-medium">Synchronizing Ledger...</p>
                    </div>
                  </td>
                </motion.tr>
              ) : products.length === 0 ? (
                <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Search className="w-12 h-12 text-muted-foreground/40" />
                      <p className="text-muted-foreground font-bold">No assets identified.</p>
                      <p className="text-muted-foreground/60 text-xs">Adjust your search parameters to find matching records.</p>
                    </div>
                  </td>
                </motion.tr>
              ) : products.map((item, i) => (
                <motion.tr 
                  key={item.id} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-muted/30 transition-colors group"
                >
                  <td className="px-6 py-4 text-center">
                    {hasPermission(PERMISSIONS.INVENTORY_DELETE) && (
                      <input 
                        type="checkbox" 
                        onChange={() => toggleSelect(item.id)} 
                        checked={selectedIds.has(item.id)}
                        className="w-4 h-4 rounded border-border bg-background accent-primary cursor-pointer"
                      />
                    )}
                  </td>
                  <td className="px-6 py-4 min-w-[450px]">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${item.closingStock <= (item.minThreshold || 5) ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                           {item.closingStock <= (item.minThreshold || 5) ? <PackageCheck size={18} /> : <div className="w-4 h-4 rounded-full bg-emerald-500 animate-pulse" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors uppercase tracking-tight">{item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] font-mono text-muted-foreground uppercase">{item.sku}</p>
                            {item.attributes && Object.keys(item.attributes).length > 0 && (
                              <div className="flex items-center gap-1.5 ml-1 border-l border-border/50 pl-2">
                                {item.attributes.color && <span className="text-[8px] font-black uppercase text-blue-500">{item.attributes.color}</span>}
                                {item.attributes.size && <span className="text-[8px] font-black uppercase text-slate-400">/ {item.attributes.size}</span>}
                                {item.attributes.gsm && <span className="text-[8px] font-black uppercase text-emerald-500">/ {item.attributes.gsm} GSM</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center w-36 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors whitespace-nowrap ${
                      item.closingStock > (item.minThreshold || 10)
                      ? 'bg-primary/10 text-primary border-primary/20' 
                      : 'bg-red-500/10 text-red-500 border-red-500/20'
                    }`}>
                      {item.closingStock} {item.unit?.name || 'Units'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-mono text-sm font-bold text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-6 py-4 text-center font-mono text-sm font-bold text-emerald-400">
                    ₹{item.purchasePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-secondary px-2 py-1 rounded">
                      {item.category?.name || 'General'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right w-48">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity min-h-[36px]">
                      {hasPermission(PERMISSIONS.INVENTORY_VIEW) && (
                        <button 
                          onClick={() => { setSelectedHistoryProduct(item); setIsHistoryModalOpen(true); }}
                          className="px-2 py-1.5 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-xl transition-colors duration-200 flex items-center group/btn overflow-hidden border border-transparent hover:border-primary/20"
                          title="View Ledger / History"
                        >
                          <Clock size={16} className="shrink-0" />
                          <span className="max-w-0 overflow-hidden group-hover/btn:max-w-[75px] transition-all duration-500 ease-in-out text-[10px] font-black uppercase opacity-0 group-hover/btn:opacity-100 group-hover/btn:ml-2">History</span>
                        </button>
                      )}
                      {hasPermission(PERMISSIONS.INVENTORY_ADJUST) && (
                        <>
                          <button 
                            onClick={() => { setAdjustingProduct(item); setAdjustmentType('IN'); setIsAdjustModalOpen(true); }}
                            className="px-2 py-1.5 hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500 rounded-xl transition-colors duration-200 flex items-center group/btn overflow-hidden border border-transparent hover:border-emerald-500/20"
                            title="Add Stock (Restock)"
                          >
                            <TrendingUp size={16} className="shrink-0" />
                            <span className="max-w-0 overflow-hidden group-hover/btn:max-w-[75px] transition-all duration-500 ease-in-out text-[10px] font-black uppercase opacity-0 group-hover/btn:opacity-100 group-hover/btn:ml-2">Restock</span>
                          </button>
                          <button 
                            onClick={() => { setAdjustingProduct(item); setAdjustmentType('OUT'); setIsAdjustModalOpen(true); }}
                            className="px-2 py-1.5 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 rounded-xl transition-colors duration-200 flex items-center group/btn overflow-hidden border border-transparent hover:border-rose-500/20"
                            title="Utilize Stock (Subtract)"
                          >
                            <TrendingDown size={16} className="shrink-0" />
                            <span className="max-w-0 overflow-hidden group-hover/btn:max-w-[75px] transition-all duration-500 ease-in-out text-[10px] font-black uppercase opacity-0 group-hover/btn:opacity-100 group-hover/btn:ml-2">Utilize</span>
                          </button>
                        </>
                      )}
                      {hasPermission(PERMISSIONS.INVENTORY_EDIT) && (
                        <button 
                          onClick={() => { setEditingProduct(item); setIsModalOpen(true); }}
                          className="p-2 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-lg transition-colors"
                          title="Edit Details"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      {hasPermission(PERMISSIONS.INVENTORY_DELETE) && (
                        <button 
                          onClick={() => handleSingleDelete(item.id)}
                          className="p-2 text-muted-foreground hover:text-rose-500 transition-colors group/btn" 
                          title="Delete"
                        >
                         <Trash2 size={16}/>
                        </button>
                      )}
                      <button className="p-2 text-muted-foreground hover:text-foreground transition-colors"><MoreVertical size={16}/></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        {/* Pagination Panel */}
        <div className="px-8 py-4 bg-muted/30 border-t border-border flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
           <div>{total} Records Tracked</div>
           <div className="flex items-center space-x-6">
              <span className="text-muted-foreground/60">Page {page} / {totalPages}</span>
              <div className="flex space-x-2">
                 <button 
                   disabled={page === 1}
                   onClick={() => setPage(p => p - 1)}
                   className="p-2 bg-secondary hover:bg-muted rounded-lg text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                 >
                    <ChevronLeft size={16} />
                 </button>
                 <button 
                   disabled={page === totalPages}
                   onClick={() => setPage(p => p + 1)}
                   className="p-2 bg-secondary hover:bg-muted rounded-lg text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                 >
                    <ChevronRight size={16} />
                 </button>
              </div>
           </div>
        </div>
      </div>

      <ProductModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={handleAddSuccess}
        product={editingProduct}
      />

      <StockAdjustmentModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        onSuccess={handleAdjustSuccess}
        product={adjustingProduct}
        defaultType={adjustmentType}
      />

      <TransactionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        product={selectedHistoryProduct}
      />
    </div>
  );
};

export default InventoryList;
