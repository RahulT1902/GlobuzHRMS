import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { 
  Users, Plus, Search, Mail, Phone, MapPin, 
  MoreVertical, ShieldCheck, Edit3, Trash2, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import VendorModal from '../components/VendorModal';

const Vendors: React.FC = () => {
  const [vendors, setVendors] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const [vRes, cRes] = await Promise.all([
        api.get('/vendors'),
        api.get('/config/categories?type=VENDOR')
      ]);
      setVendors(vRes.data.data || []);
      setCategories(formatCategories(cRes.data.data || []));
    } catch (error) {
      console.error('Failed to fetch vendors', error);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVendors(); }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleAddSuccess = (newVendor: any) => {
    if (editingVendor) {
      setVendors(prev => prev.map((v: any) => v.id === newVendor.id ? newVendor : v));
    } else {
      setVendors(prev => [newVendor, ...prev]);
    }
    setEditingVendor(null);
  };

  const handleDelete = async (vendorId: string) => {
    if (!window.confirm('Are you sure you want to remove this partner?')) return;
    try {
      await api.delete(`/vendors/${vendorId}`);
      setVendors(prev => prev.filter((v: any) => v.id !== vendorId));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Cannot delete this vendor. They may have existing orders.');
    }
    setOpenMenuId(null);
  };

  const filteredVendors = vendors.filter((v: any) => {
    const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.category?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || v.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Vendor Network</h2>
          <p className="text-muted-foreground mt-1">Manage global supply partners and procurement channels.</p>
        </div>
        <button 
          onClick={() => { setEditingVendor(null); setIsModalOpen(true); }}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center transition-all shadow-lg shadow-primary/20 active:scale-95 text-sm uppercase tracking-wider"
        >
          <Plus size={20} className="mr-2" />
          Onboard Partner
        </button>
      </div>

      {/* Control Bar */}
      <div className="bg-card/60 backdrop-blur-xl border border-border/50 p-5 rounded-3xl flex flex-col md:flex-row gap-4 items-center shadow-xl glass">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
          <input
            type="text"
            placeholder="Search global network by name, category or identifier..."
            className="w-full bg-background/50 border border-border rounded-2xl py-3 pl-12 pr-4 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 ring-offset-0 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto bg-background/50 border border-border rounded-2xl p-1.5 pl-4">
          <Filter size={16} className="text-muted-foreground" />
          <select 
            className="bg-transparent border-none py-1.5 px-2 text-xs font-bold uppercase tracking-widest text-foreground focus:outline-none w-full md:w-40"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.displayName}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary/20 border-t-primary"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Syncing Network</p>
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-80 text-center bg-card/40 border-2 border-dashed border-border rounded-3xl p-10">
          <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
             <Users size={32} className="text-muted-foreground/40" />
          </div>
          <p className="text-foreground font-black text-xl">No Partners Identified</p>
          <p className="text-muted-foreground text-sm mt-1 max-w-xs leading-relaxed">Adjust your search parameters or initiate the onboarding process to add new supply partners to your network.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" ref={menuRef}>
          <AnimatePresence mode="popLayout">
            {filteredVendors.map((vendor: any, i: number) => (
              <motion.div
                key={vendor.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-3xl p-7 hover:border-primary/40 hover:shadow-2xl transition-all group relative overflow-visible shadow-sm"
              >
                {/* 3-dots menu */}
                <div className="absolute top-6 right-6">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === vendor.id ? null : vendor.id); }}
                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all group-hover:opacity-100"
                  >
                    <MoreVertical size={20} />
                  </button>
                  <AnimatePresence>
                    {openMenuId === vendor.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                        className="absolute right-0 mt-2 w-52 bg-card border border-border rounded-2xl shadow-2xl z-20 overflow-hidden glass p-1"
                      >
                        <button
                          onClick={() => { setEditingVendor(vendor); setIsModalOpen(true); setOpenMenuId(null); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-foreground hover:bg-primary/5 hover:text-primary rounded-xl transition-all"
                        >
                          <Edit3 size={16} /> Edit Profile
                        </button>
                        <a
                          href={`mailto:${vendor.email}`}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-foreground hover:bg-primary/5 hover:text-primary rounded-xl transition-all"
                        >
                          <Mail size={16} /> Contact Partner
                        </a>
                        <div className="h-px bg-border/50 mx-2 my-1" />
                        <button
                          onClick={() => handleDelete(vendor.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-500/5 rounded-xl transition-all"
                        >
                          <Trash2 size={16} /> Terminate Relation
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center space-x-5 mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-lg border border-primary/20 text-2xl font-black transition-all group-hover:scale-110 group-hover:rotate-3 uppercase">
                    {vendor.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-foreground font-black text-xl leading-tight group-hover:text-primary transition-colors">{vendor.name}</h3>
                    <div className="flex items-center mt-2 px-2 py-0.5 bg-emerald-500/10 rounded-full w-fit">
                      <ShieldCheck size={12} className="mr-1.5 text-emerald-500" />
                      <span className="text-[9px] uppercase tracking-widest font-black text-emerald-600 dark:text-emerald-400">Verified Partner</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors overflow-hidden">
                    <div className="p-2 bg-muted/50 rounded-lg mr-4 shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                       <Mail size={16} />
                    </div>
                    <span className="truncate">{vendor.email}</span>
                  </div>
                  <div className="flex items-center text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    <div className="p-2 bg-muted/50 rounded-lg mr-4 shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                       <Phone size={16} />
                    </div>
                    {vendor.phone || 'N/A'}
                  </div>
                  <div className="flex items-center text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    <div className="p-2 bg-muted/50 rounded-lg mr-4 shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                       <MapPin size={16} />
                    </div>
                    <span className="truncate">{vendor.address || 'Global Offices'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-border/50">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Module Layer</span>
                    <span className="text-xs font-bold text-primary group-hover:underline underline-offset-4 cursor-pointer">
                      {vendor.category?.name || 'Standard Distribution'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1 block">Accountability</span>
                    <span className="text-xs font-bold text-foreground">
                      {vendor.paymentTerm?.name || 'Net 30 Days'}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )
}

      <VendorModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={handleAddSuccess}
        vendor={editingVendor}
      />
    </div>
  );
};

export default Vendors;
