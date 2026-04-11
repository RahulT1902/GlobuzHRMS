import React, { useState, useEffect, useRef } from 'react';
import { X, Package, BarChart3, AlertCircle, Loader2, Plus, Trash2, ChevronRight, Tag } from 'lucide-react';
import axios from 'axios';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (product: any) => void;
  product?: any; // For edit mode (simplified for now)
}

interface Variant {
  categoryPath: string[]; // List of IDs
  pathNames: string[];   // List of human names for UI
  sku: string;
  purchasePrice: number;
  initialStock: number;
  purchaseDate: string;
  error?: string; // For highlighting failures
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSuccess, product }) => {
  // Config Data
  const [units, setUnits] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryMap, setCategoryMap] = useState<Map<string, any>>(new Map());

  // Master State
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [unitId, setUnitId] = useState('');
  
  // Builder State
  const [variants, setVariants] = useState<Variant[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [currentSku, setCurrentSku] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [currentStock, setCurrentStock] = useState('0');
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [customValues, setCustomValues] = useState<Record<number, string>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const firstInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // MAX Depth Guard
  const MAX_DEPTH = 6;

  // memoize category children for performance
  const childrenMap = React.useMemo(() => {
    const map = new Map<string, any[]>();
    categories.forEach(c => {
      const pid = c.parentId || 'root';
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid)?.push(c);
    });
    return map;
  }, [categories]);

  const getChildren = (parentId: string | null) => childrenMap.get(parentId || 'root') || [];

  const handleCategoryChange = React.useCallback((index: number, value: string) => {
    setVariants(prev => prev); // trigger re-renders if needed
    setCurrentPath(prev => {
      const next = prev.slice(0, index);
      if (value) next[index] = value;
      return next;
    });

    // Clean up custom values for reset levels
    setCustomValues(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (Number(k) >= index) delete next[Number(k)];
      });
      return next;
    });

    // Smooth scroll reset to start when high-level changes
    if (index === 0 && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }, []);

  const handleChipClick = (index: number) => {
    setCurrentPath(prev => prev.slice(0, index + 1));
    setCustomValues(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (Number(k) > index) delete next[Number(k)];
      });
      return next;
    });
  };

  const normalizeToken = (s: string) => {
    return s
      .toUpperCase()
      .replace(/\bX\b/g, 'X') // Keep dimension X clean
      .replace(/[^A-Z0-9]+/g, '-') // Non-alphanumeric to dash
      .replace(/-+/g, '-') // Collapse dashes
      .replace(/^-|-$/g, ''); // Trim dashes
  };

  // 1. Fetch Configuration & Load Existing (if edit)
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const headers = { Authorization: `Bearer ${token}` };
        const [uRes, cRes] = await Promise.all([
          axios.get(`${API_URL}/config/units`, { headers }),
          axios.get(`${API_URL}/config/categories?type=INVENTORY`, { headers })
        ]);
        
        const catList = cRes.data.data || [];
        setUnits(uRes.data.data || []);
        setCategories(catList);

        const map = new Map();
        catList.forEach((c: any) => map.set(c.id, c));
        setCategoryMap(map);

        if (product) {
          // Edit mode is limited in batch-version for now
          // We treat the existing product as the first variant
          setProductName(product.name.split(' | ')[0]); // Extract base name
          setDescription(product.description || '');
          setUnitId(product.unitId || '');
          // Existing variants logic would go here
        } else {
          setProductName('');
          setDescription('');
          setUnitId((uRes.data.data || [])[0]?.id || '');
          setVariants([]);
        }
      } catch (err) {
        console.error('Failed to fetch config:', err);
      }
    };

    if (isOpen) {
      fetchConfig();
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [isOpen, product]);

  // 2. Auto-SKU Suggestion Logic
  useEffect(() => {
    if (productName && currentPath.length > 0) {
      const prefix = normalizeToken(productName).substring(0, 3);
      const pathCodes = currentPath.map((id, idx) => {
        const cat = categoryMap.get(id);
        if (cat?.name.toUpperCase() === 'CUSTOM' && customValues[idx]) {
          return normalizeToken(customValues[idx]);
        }
        return normalizeToken(cat?.name || '').substring(0, 3);
      });
      const suggested = [prefix, ...pathCodes].join('-');
      setCurrentSku(suggested);
    }
  }, [productName, currentPath, categoryMap, customValues]);

  // 3. Variant Builder Actions
  const addVariant = () => {
    if (!currentSku || currentPath.length === 0) {
      setError('Please select a category path and provide a SKU.');
      return;
    }

    // 1. Leaf Node Enforcement
    const lastId = currentPath[currentPath.length - 1];
    const children = getChildren(lastId);
    if (children.length > 0) {
      setError('Please select the most specific category (leaf level).');
      return;
    }

    // 2. Duplicate Path Guard
    const isDuplicatePath = variants.some(v => JSON.stringify(v.categoryPath) === JSON.stringify(currentPath));
    if (isDuplicatePath) {
      setError('This category combination has already been added.');
      return;
    }

    // 3. Category Integrity Check
    const isInvalidPath = currentPath.some(id => !categoryMap.has(id));
    if (isInvalidPath) {
      setError('One or more selected categories no longer exist. Please reselect.');
      return;
    }

    // 4. Duplicate SKU in Staged Batch
    const isDuplicateSku = variants.some(v => v.sku.toUpperCase() === currentSku.toUpperCase());
    if (isDuplicateSku) {
      setError('SKU already added to the batch list.');
      return;
    }

    const pathNames = currentPath.map((id, idx) => {
      const cat = categoryMap.get(id);
      if (cat?.name.toUpperCase() === 'CUSTOM' && customValues[idx]) {
        return `${cat.name}: ${customValues[idx]}`;
      }
      return cat?.name || 'Unknown';
    });
    
    const newVariant: Variant = {
      categoryPath: [...currentPath],
      pathNames,
      sku: normalizeToken(currentSku),
      purchasePrice: Number(currentPrice) || 0,
      initialStock: Number(currentStock) || 0,
      purchaseDate: currentDate
    };

    setVariants([...variants, newVariant]);
    setError('');
    
    // Reset builder (keep root for convenience or reset path?)
    // reset path to encourage checking correctly
    setCurrentPath([]);
    setCurrentSku('');
    setCurrentPrice('');
    setCurrentStock('0');
    setCurrentDate(new Date().toISOString().split('T')[0]);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  // 4. Batch Submission (Hardened)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (variants.length === 0) {
      setError('Add at least one variant before initializing.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    // Clear previous row errors
    setVariants(prev => prev.map(v => ({ ...v, error: undefined })));

    try {
      const payload = {
        productName: productName.trim(),
        description: description.trim(),
        unitId: unitId || null,
        variants: variants.map(({ error, pathNames, ...v }) => ({
          ...v,
          purchasePrice: Number(v.purchasePrice) || 0,
          initialStock: Number(v.initialStock) || 0
        }))
      };

      const response = await api.post('/inventory/batch', payload);
      setError('');
      onSuccess(response.data.data);
      onClose();
    } catch (err: any) {
      console.error('Batch Onboarding Error:', err);
      const resData = err.response?.data;
      
      if (resData?.type === 'VALIDATION_ERROR' && Array.isArray(resData.errors)) {
        setVariants(prev => {
          const next = [...prev];
          resData.errors.forEach((e: any) => {
            if (next[e.index]) {
              next[e.index] = { ...next[e.index], error: e.message };
            }
          });
          return next;
        });
        setError('Validation failed. Please check the highlighted variants below.');
      } else {
        setError(resData?.message || 'Failed to initialize variant batch.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-card border border-border w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-border flex justify-between items-center bg-card/50 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
                  <Package size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Asset Variant Builder</h3>
                  <p className="text-muted-foreground text-sm">Define a master product and its technical configurations.</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm">
                  <AlertCircle size={18} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* SECTION 1: MASTER PRODUCT INFO */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                  <Tag size={12} /> Master Definition
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground">Base Product Name</label>
                    <input
                      ref={firstInputRef}
                      required
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold"
                      placeholder="e.g. SunPack"
                      value={productName}
                      onChange={e => setProductName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground">Standard Unit</label>
                    <select
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      value={unitId}
                      onChange={e => setUnitId(e.target.value)}
                    >
                      {units.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.code})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">Master Description</label>
                  <textarea
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-20 resize-none text-sm"
                    placeholder="Shared details for all variants..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* SECTION 2: VARIANT BUILDER (STAGING) */}
              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-500">
                  <Plus size={12} /> Variant Configuration
                </div>
                
                <div className="bg-muted/30 border border-dashed border-border p-6 rounded-2xl space-y-6">
                  {/* Dynamic Path Breadcrumbs (Interactive Chips) */}
                  {currentPath.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap mb-2 animate-in fade-in duration-500">
                      <span className="text-[10px] font-black uppercase text-muted-foreground/50 mr-2">Selected Path:</span>
                      {currentPath.map((id, idx) => {
                        const cat = categoryMap.get(id);
                        const isCustom = cat?.name.toUpperCase() === 'CUSTOM';
                        const displayValue = isCustom && customValues[idx] ? `${cat.name}: ${customValues[idx]}` : (cat?.name || '...');
                        
                        return (
                          <React.Fragment key={`chip-${id}-${idx}`}>
                            <button
                              onClick={() => handleChipClick(idx)}
                              className="px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-lg text-[10px] font-bold text-primary hover:bg-primary hover:text-white transition-all group relative"
                              title="Click to backtrack to this level"
                            >
                              {displayValue}
                              <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            {idx < currentPath.length - 1 && <ChevronRight size={10} className="text-muted-foreground/30" />}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}

                  {/* Cascading Path Select (Horizontal Scroll) */}
                  <div className="relative group/scroll">
                    <div 
                      ref={scrollContainerRef}
                      className="flex items-end gap-4 overflow-x-auto pb-4 scrollbar-thin scroll-smooth mask-fade-right"
                    >
                      {/* Existing Levels */}
                      {currentPath.map((selectedId, index) => {
                        const parentId = index === 0 ? 'root' : currentPath[index - 1];
                        const options = getChildren(parentId);
                        const cat = categoryMap.get(selectedId);
                        const isCustom = cat?.name.toUpperCase() === 'CUSTOM';
                        
                        return (
                          <div key={`level-${index}-${selectedId || 'empty'}`} className="space-y-1.5 flex-shrink-0 w-52 animate-in slide-in-from-left-2 duration-300">
                            <span className="text-[9px] uppercase font-bold text-muted-foreground/60 ml-1">
                              {index === 0 ? 'Primary Category' : `Spec Level ${index + 1}`}
                            </span>
                            <div className="space-y-2">
                              <select
                                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary transition-all hover:border-muted-foreground/30"
                                value={selectedId || ''}
                                onChange={e => handleCategoryChange(index, e.target.value)}
                              >
                                <option value="">Select</option>
                                {options.map(o => (
                                  <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                              </select>
                              
                              {isCustom && (
                                <input
                                  className="w-full bg-blue-500/5 border border-blue-500/20 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 animate-in slide-in-from-top-1 duration-200 font-bold placeholder:italic placeholder:font-normal"
                                  placeholder="Enter custom value..."
                                  value={customValues[index] || ''}
                                  onChange={e => setCustomValues(prev => ({ ...prev, [index]: e.target.value }))}
                                  autoFocus
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Next Level (Only if children exist and not at MAX_DEPTH) */}
                      {(() => {
                        const lastId = currentPath[currentPath.length - 1];
                        const nextOptions = getChildren(lastId || 'root');
                        const canShowNext = (currentPath.length === 0 || lastId) && nextOptions.length > 0 && currentPath.length < MAX_DEPTH;
                        
                        if (!canShowNext) return null;

                        return (
                          <div className="space-y-1.5 flex-shrink-0 w-52 animate-in zoom-in-95 duration-300">
                            <span className="text-[9px] uppercase font-black text-blue-500/70 ml-1">Next Specification</span>
                            <select
                              className="w-full bg-background border border-blue-500/30 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500 transition-all font-medium italic"
                              value=""
                              onChange={e => handleCategoryChange(currentPath.length, e.target.value)}
                            >
                              <option value="">Choose Sub...</option>
                              {nextOptions.map(o => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                              ))}
                            </select>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end pt-4 border-t border-border/10">
                    <div className="space-y-1.5 md:col-span-2">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground/60 ml-1">SKU Identifier</span>
                      <input
                        className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary font-mono font-bold"
                        placeholder="AUTO-GENERATED"
                        value={currentSku}
                        onChange={e => setCurrentSku(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground/60 ml-1">Price (₹)</span>
                      <input
                        type="number"
                        className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
                        placeholder="0.00"
                        value={currentPrice}
                        onChange={e => setCurrentPrice(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground/60 ml-1">Quantity</span>
                      <input
                        type="number"
                        className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary"
                        placeholder="0"
                        value={currentStock}
                        onChange={e => setCurrentStock(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground/60 ml-1">Acq. Date</span>
                      <input
                        type="date"
                        className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs outline-none focus:border-primary"
                        value={currentDate}
                        onChange={e => setCurrentDate(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addVariant}
                      className="h-[42px] bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-900/10 sticky right-0 z-10"
                    >
                      <Plus size={16} /> Add Variant
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 3: VARIANT LIST */}
              {variants.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                      <BarChart3 size={12} /> Staged Variants ({variants.length})
                    </div>
                  </div>
                  
                  <div className="border border-border rounded-2xl overflow-hidden bg-muted/10">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/50 border-b border-border">
                        <tr>
                          <th className="px-4 py-3 font-bold text-muted-foreground text-[10px] uppercase">Technical Path</th>
                          <th className="px-4 py-3 font-bold text-muted-foreground text-[10px] uppercase">SKU</th>
                          <th className="px-4 py-3 font-bold text-muted-foreground text-[10px] uppercase">Rate</th>
                          <th className="px-4 py-3 font-bold text-muted-foreground text-[10px] uppercase text-center">Qty</th>
                          <th className="px-4 py-3 font-bold text-muted-foreground text-[10px] uppercase text-right">Total Cost</th>
                          <th className="px-4 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {variants.map((v, i) => (
                          <tr key={i} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${v.error ? 'bg-rose-500/5' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {v.pathNames.map((name, idx) => (
                                    <React.Fragment key={idx}>
                                      <span className="px-2 py-0.5 bg-background border border-border rounded-md text-[10px] font-bold">{name}</span>
                                      {idx < v.pathNames.length - 1 && <ChevronRight size={10} className="text-muted-foreground/40" />}
                                    </React.Fragment>
                                  ))}
                                </div>
                                {v.error && <p className="text-[10px] text-rose-500 font-bold flex items-center gap-1 animate-pulse"><AlertCircle size={10}/> {v.error}</p>}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] font-bold">
                              <span className={v.error?.includes('SKU') ? 'text-rose-500 underline decoration-dotted' : ''}>
                                {v.sku}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold">₹{v.purchasePrice.toLocaleString()}</td>
                            <td className="px-4 py-3 text-center text-muted-foreground font-bold">{v.initialStock}</td>
                            <td className="px-4 py-3 text-right font-black text-primary">₹{(v.purchasePrice * v.initialStock).toLocaleString()}</td>
                            <td className="px-4 py-3">
                              <button onClick={() => removeVariant(i)} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-primary/5">
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">Batch Total Investment</td>
                          <td className="px-4 py-3 text-right font-black text-primary text-lg">
                            ₹{variants.reduce((sum, v) => sum + (v.purchasePrice * v.initialStock), 0).toLocaleString()}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-8 py-6 border-t border-border bg-card/50 flex gap-4 flex-shrink-0">
              <button
                type="button" onClick={onClose}
                className="flex-1 py-3.5 bg-secondary hover:bg-muted text-foreground rounded-xl font-bold text-sm transition-all"
              >
                Cancel
              </button>
              <button
                disabled={loading || variants.length === 0}
                onClick={handleSubmit}
                className="flex-[2] py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Initialize All Variants'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProductModal;
;
