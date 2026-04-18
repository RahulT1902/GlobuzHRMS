import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  BarChart3, Search, Download, 
  TrendingUp, AlertTriangle, Package, Users,
  Calendar, ChevronLeft, ChevronRight, Loader2,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  // Filter State
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>({ totalPages: 1, total: 0 });

  const fetchSummary = async () => {
    try {
      const { data } = await api.get('/reports/valuation');
      setSummary(data.data);
    } catch (error) {
       console.error("Failed to fetch valuation summary:", error);
    }
  };

  const fetchExplorer = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        categoryId,
        status,
        startDate,
        endDate,
        page: String(page),
        limit: '15'
      });
      const { data } = await api.get(`/reports/explorer?${params.toString()}`);
      setProducts(data.data.products);
      setPagination(data.data.pagination);
    } catch (error) {
      console.error("Failed to fetch explorer data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCategories = (flatCategories: any[]) => {
    const tree: any[] = [];
    const map: { [key: string]: any } = {};

    flatCategories.forEach(cat => {
      map[cat.id] = { ...cat, children: [] };
    });

    flatCategories.forEach(cat => {
      if (cat.parentId && map[cat.parentId]) {
          map[cat.parentId].children.push(map[cat.id]);
      } else {
          tree.push(map[cat.id]);
      }
    });

    const result: any[] = [];
    const traverse = (nodes: any[], depth: number) => {
      // Sort siblings alphabetically
      nodes.sort((a, b) => a.name.localeCompare(b.name)).forEach(node => {
        result.push({
          ...node,
          displayName: `${"\u00A0".repeat(depth * 3)}${depth > 0 ? '↳ ' : ''}${node.name}`
        });
        if (node.children.length > 0) {
          traverse(node.children, depth + 1);
        }
      });
    };

    traverse(tree, 0);
    return result;
  };

  const fetchMetadata = async () => {
    try {
      const [catRes] = await Promise.all([
        api.get('/config/categories?type=INVENTORY')
      ]);
      const formatted = formatCategories(catRes.data.data || []);
      setCategories(formatted);
    } catch (error) {
      console.error("Failed to fetch metadata:", error);
    }
  };

  useEffect(() => {
    fetchMetadata();
    fetchSummary();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchExplorer(), 400);
    return () => clearTimeout(timer);
  }, [search, categoryId, status, startDate, endDate, page]);

  const handleExport = () => {
    // Basic CSV Export Logic
    const headers = ['SKU', 'Name', 'Category', 'Stock', 'Unit Price', 'Valuation', 'Purchase Date'];
    const rows = products.map(p => [
      p.sku,
      p.name,
      p.category?.name || 'General',
      p.closingStock,
      p.purchasePrice,
      (p.purchasePrice * p.closingStock).toFixed(2),
      new Date(p.purchaseDate).toLocaleDateString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(r => r.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Reports</h2>
          <p className="text-muted-foreground mt-1">Advanced inventory analytics and financial valuation.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
             onClick={handleExport}
             className="bg-secondary hover:bg-muted text-foreground px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center transition-all border border-border/50 shadow-sm"
          >
            <Download size={18} className="mr-2" />
            Export Data
          </button>
        </div>
      </div>

      {/* Summary Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard 
          title="Total Valuation" 
          value={`₹${(summary?.totalValuation || 0).toLocaleString('en-IN')}`} 
          icon={TrendingUp} 
          color="blue"
          trend="+12% vs last month"
          trendUp={true}
        />
        <SummaryCard 
          title="Active SKUs" 
          value={summary?.itemCount || 0} 
          icon={Package} 
          color="emerald" 
        />
        <SummaryCard 
          title="Inventory Alerts" 
          value={(summary?.lowStockCount || 0) + (summary?.outOfStockCount || 0)} 
          icon={AlertTriangle} 
          color="rose"
          subtitle={`${summary?.outOfStockCount || 0} out of stock`}
        />
        <SummaryCard 
          title="Global Vendors" 
          value={summary?.vendorCount || 0} 
          icon={Users} 
          color="amber" 
        />
      </div>

      {/* Intelligence Explorer Controls */}
      <div className="bg-card/50 border border-border p-6 rounded-3xl shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row gap-6">
           {/* Global Search */}
           <div className="relative flex-1">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
             <input
               type="text"
               placeholder="Search by Asset Name, SKU, or Identifier..."
               className="w-full bg-background border border-border rounded-2xl py-3.5 pl-12 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-inner"
               value={search}
               onChange={(e) => { setSearch(e.target.value); setPage(1); }}
             />
           </div>

           {/* Quick Filters */}
           <div className="flex flex-wrap items-center gap-3">
             <select 
               className="bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
               value={categoryId}
               onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
             >
               <option value="">All Categories</option>
               {categories.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}
             </select>

             <select 
               className="bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
               value={status}
               onChange={(e) => { setStatus(e.target.value); setPage(1); }}
             >
               <option value="">All Stock Levels</option>
               <option value="IN_STOCK">Normal Stock</option>
               <option value="LOW_STOCK">Low Stock</option>
               <option value="OUT_OF_STOCK">Out of Stock</option>
             </select>

             <div className="flex items-center bg-background border border-border rounded-xl px-2">
                <Calendar size={16} className="ml-2 text-muted-foreground" />
                <input 
                  type="date" 
                  className="bg-transparent border-none py-3 px-2 text-xs focus:outline-none" 
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                />
                <span className="text-muted-foreground px-1">-</span>
                <input 
                  type="date" 
                  className="bg-transparent border-none py-3 px-2 text-xs focus:outline-none" 
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                />
             </div>
           </div>
        </div>

        {/* Results Table */}
        <div className="border border-border/50 rounded-2xl overflow-hidden bg-background/30">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Asset & Identifier</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">In-Hand</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Purchase Price</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Total Value</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Purchase Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        <p className="text-muted-foreground text-sm font-medium">Analyzing stock levels...</p>
                      </div>
                    </td>
                  </motion.tr>
                ) : products.length === 0 ? (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <BarChart3 className="w-12 h-12 text-muted-foreground/30" />
                        <p className="text-muted-foreground font-bold">No items found for the selected criteria.</p>
                      </div>
                    </td>
                  </motion.tr>
                ) : products.map((item, i) => (
                  <motion.tr 
                    key={item.id} 
                    initial={{ opacity: 0, y: 5 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-muted/20 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-foreground uppercase tracking-tight">{item.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase">{item.sku}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        item.closingStock <= 0 
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' 
                          : item.closingStock <= (item.minThreshold || 5)
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      }`}>
                        {item.closingStock <= 0 ? 'Out of Stock' : item.closingStock <= (item.minThreshold || 5) ? 'Low Stock' : 'Optimized'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-sm font-bold text-foreground">
                      {item.closingStock} <span className="text-[10px] text-muted-foreground uppercase">{item.unit?.name || 'Units'}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-bold text-foreground">
                      ₹{item.purchasePrice.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-sm font-bold text-primary">
                      ₹{(item.purchasePrice * item.closingStock).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-xs font-semibold text-muted-foreground">
                       {new Date(item.purchaseDate).toLocaleDateString('en-GB')}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground/60 border-t border-border/50 pt-4">
           <div>{pagination.total} Records Matched</div>
           <div className="flex items-center space-x-6 text-foreground">
              <span className="text-muted-foreground/40 font-bold uppercase">Page {page} of {pagination.totalPages}</span>
              <div className="flex space-x-2">
                 <button 
                   disabled={page === 1}
                   onClick={() => setPage(p => p - 1)}
                   className="p-2 bg-muted hover:bg-border rounded-lg transition-colors disabled:opacity-20"
                 >
                    <ChevronLeft size={16} />
                 </button>
                 <button 
                   disabled={page === pagination.totalPages}
                   onClick={() => setPage(p => p + 1)}
                   className="p-2 bg-muted hover:bg-border rounded-lg transition-colors disabled:opacity-20"
                 >
                    <ChevronRight size={16} />
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: any;
  color: 'blue' | 'emerald' | 'rose' | 'amber';
  trend?: string;
  trendUp?: boolean;
  subtitle?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon: Icon, color, trend, trendUp, subtitle }) => {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    rose: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
  };

  return (
    <div className="bg-card/30 border border-border p-5 rounded-3xl group hover:border-primary/30 transition-all shadow-lg hover:shadow-primary/5">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${colors[color]} group-hover:scale-110 transition-transform`}>
          <Icon size={24} />
        </div>
        {trend && (
           <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${trendUp ? 'text-emerald-500' : 'text-rose-500'}`}>
              {trendUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {trend}
           </div>
        )}
      </div>
      <div>
        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{title}</h4>
        <div className="text-2xl font-black text-foreground">{value}</div>
        {subtitle && <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase">{subtitle}</p>}
      </div>
    </div>
  );
};

export default Reports;
