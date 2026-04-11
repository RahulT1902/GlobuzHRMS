import React, { useState, useEffect, useCallback } from 'react';
import { 
  History, 
  Layout, 
  Zap, 
  ChevronRight, 
  Search, 
  Filter, 
  Box,
  Settings,
  ShieldAlert,
  Download,
  MinusCircle,
  PlusCircle,
  FileEdit,
  Trash2,
  RefreshCw,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  module: string;
  entity: string;
  entityId: string;
  oldValue: any;
  newValue: any;
  preview: string;
  createdAt: string;
  user?: {
    name: string;
    email: string;
  };
}

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/audit/logs', {
        params: {
          page,
          limit: 30,
          module: moduleFilter || undefined,
          action: actionFilter || undefined,
          search: search || undefined
        }
      });
      setLogs(data.data);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, moduleFilter, actionFilter, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionIcon = (action: string | undefined | null) => {
    if (!action) return <Zap className="text-primary" size={16} />;
    switch (action.toUpperCase()) {
      case 'CREATE': return <PlusCircle className="text-emerald-500" size={16} />;
      case 'UPDATE': return <FileEdit className="text-amber-500" size={16} />;
      case 'DELETE': return <Trash2 className="text-rose-500" size={16} />;
      default: return <Zap className="text-primary" size={16} />;
    }
  };

  const getModuleIcon = (module: string | undefined | null) => {
    if (!module) return <Settings className="text-slate-500" size={16} />;
    switch (module.toUpperCase()) {
      case 'INVENTORY': return <Box className="text-blue-500" size={16} />;
      case 'PROCUREMENT': return <Layout className="text-violet-500" size={16} />;
      case 'SYSTEM': return <Settings className="text-slate-500" size={16} />;
      case 'AUTH': return <ShieldAlert className="text-rose-500" size={16} />;
      default: return <History className="text-primary" size={16} />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 text-primary mb-2">
            <ShieldAlert size={20} />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Governance & Compliance</span>
          </div>
          <h2 className="text-4xl font-black text-foreground tracking-tight">Audit Ledger</h2>
          <p className="text-muted-foreground mt-1 text-lg font-medium opacity-80">Traceable historical record of every core system interaction.</p>
        </div>
        <div className="flex gap-4">
           <div className="bg-card border border-border px-4 py-2 rounded-xl flex items-center gap-6">
              <div className="text-center border-r border-border pr-6">
                 <p className="text-[8px] font-black text-muted-foreground uppercase opacity-60">Retention</p>
                 <p className="text-xs font-black text-emerald-500 uppercase tracking-widest">90 Days</p>
              </div>
              <div className="text-center">
                 <p className="text-[8px] font-black text-muted-foreground uppercase opacity-60">Total Logs</p>
                 <p className="text-xs font-black text-foreground uppercase tracking-widest">{total.toLocaleString()}</p>
              </div>
           </div>
           <button className="p-3 bg-card border border-border rounded-xl hover:bg-muted transition-colors text-muted-foreground">
             <Download size={18} />
           </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-card border border-border/50 rounded-2xl p-4 flex flex-wrap items-center gap-4 shadow-sm glass">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground opacity-50" size={18} />
          <input 
            type="text" 
            placeholder="Search log history by user or entity ID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <Filter className="text-muted-foreground" size={18} />
          <select 
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">ALL MODULES</option>
            <option value="INVENTORY">INVENTORY</option>
            <option value="PROCUREMENT">PROCUREMENT</option>
            <option value="SYSTEM">SYSTEM</option>
            <option value="AUTH">AUTH</option>
          </select>

          <select 
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">ALL ACTIONS</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
      </div>

      {/* Main Ledger Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Log List */}
        <div className="xl:col-span-2 space-y-4">
           {loading && logs.length === 0 ? (
             <div className="flex justify-center py-20 opacity-30">
                <RefreshCw className="animate-spin text-primary" size={32} />
             </div>
           ) : logs.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 bg-muted/20 border-2 border-dashed border-border rounded-3xl opacity-50 italic">
                <History size={48} className="mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">No matching logs found</p>
             </div>
           ) : (
             <>
               <div className="grid gap-3">
                 <AnimatePresence mode="popLayout">
                   {logs.map((log) => (
                     <motion.div 
                        key={log.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={() => setSelectedLog(log)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer group flex items-center justify-between gap-6 ${selectedLog?.id === log.id ? 'bg-primary/5 border-primary shadow-lg ring-1 ring-primary/20' : 'bg-card border-border hover:border-primary/40 shadow-sm'}`}
                     >
                       <div className="flex items-center gap-6 flex-1 min-w-0">
                          {/* Time Marker */}
                          <div className="text-center min-w-[60px] opacity-60">
                             <p className="text-[8px] font-black uppercase text-muted-foreground">{format(new Date(log.createdAt), 'MMM dd')}</p>
                             <p className="text-xs font-black text-foreground">{format(new Date(log.createdAt), 'HH:mm')}</p>
                          </div>
                          
                          {/* Module & Action Icon */}
                          <div className="relative">
                             <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center group-hover:scale-110 transition-transform">
                                {getModuleIcon(log.module)}
                             </div>
                             <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-card border border-border rounded-lg flex items-center justify-center shadow-lg">
                                {getActionIcon(log.action)}
                             </div>
                          </div>

                          {/* Event Text */}
                          <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-black text-foreground tracking-tight">{log.user?.name || 'System Agent'}</span>
                                <ChevronRight size={12} className="opacity-30" />
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${log.action === 'DELETE' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                  {log.action}
                                </span>
                             </div>
                             <p className="text-sm font-medium text-muted-foreground truncate opacity-80">
                                {log.module} / <span className="text-foreground/80 font-bold">{log.entity}</span> – <span className="font-mono text-[10px] opacity-60">{log.entityId?.slice(0, 8)}...</span>
                             </p>
                          </div>
                       </div>

                       <div className="hidden md:flex flex-col items-end opacity-40 group-hover:opacity-100 transition-opacity">
                          <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Preview</p>
                          <div className="flex items-center gap-2 text-[10px] font-mono whitespace-nowrap overflow-hidden max-w-[150px] italic">
                             {log.preview}
                          </div>
                       </div>
                     </motion.div>
                   ))}
                 </AnimatePresence>
               </div>

               {/* Pagination Controls */}
               <div className="flex items-center justify-between pt-8">
                 <div className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-60">
                   Page {page} of {totalPages}
                 </div>
                 <div className="flex gap-2">
                   <button 
                     disabled={page === 1}
                     onClick={() => setPage(p => p - 1)}
                     className="px-4 py-2 border border-border rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted transition-colors text-xs font-bold"
                   >
                     Previous
                   </button>
                   <button 
                     disabled={page === totalPages}
                     onClick={() => setPage(p => p + 1)}
                     className="px-4 py-2 bg-primary text-white rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity text-xs font-bold shadow-lg shadow-primary/20"
                   >
                     Next
                   </button>
                 </div>
               </div>
             </>
           )}
        </div>

        {/* Inspection Panel */}
        <div className="relative">
          <div className="sticky top-24 space-y-6">
            <AnimatePresence mode="wait">
              {!selectedLog ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-10 border-2 border-dashed border-border rounded-[2.5rem] flex flex-col items-center justify-center text-center opacity-40 glass"
                >
                   <Box size={48} className="text-muted-foreground mb-4" />
                   <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-6 italic">Select an entry from the ledger to inspect its metadata</p>
                </motion.div>
              ) : (
                <motion.div 
                  key={selectedLog.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-8 glass flex flex-col h-[700px] overflow-hidden shadow-2xl"
                >
                   <div className="flex items-center justify-between mb-8 pb-6 border-b border-border/50">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl">
                           {selectedLog.user?.name?.charAt(0) || 'S'}
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-muted-foreground uppercase opacity-60 italic mb-0.5">Active Trace</p>
                           <h4 className="text-lg font-black text-foreground tracking-tight underline decoration-primary decoration-4 underline-offset-4">{selectedLog.user?.name || 'System'}</h4>
                        </div>
                      </div>
                      <button onClick={() => setSelectedLog(null)} className="text-muted-foreground hover:text-foreground transition-colors p-2 bg-muted/40 rounded-full">
                         <MinusCircle size={20} />
                      </button>
                   </div>

                   <div className="space-y-6 flex-1 overflow-y-auto pr-2 scrollbar-thin">
                      <div className="grid grid-cols-2 gap-4">
                         <InfoItem label="Action" value={selectedLog.action} color={selectedLog.action === 'DELETE' ? 'rose' : 'emerald'} />
                         <InfoItem label="Module" value={selectedLog.module} />
                         <InfoItem label="Entity" value={selectedLog.entity} />
                         <InfoItem label="Entity ID" value={selectedLog.entityId?.slice(0, 12)} />
                      </div>

                      <div className="space-y-3">
                         <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-2">Delta Reconstruction</p>
                         
                         {selectedLog.newValue ? (
                           <div className="space-y-4">
                              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl relative">
                                 <p className="text-[8px] font-black text-emerald-500 uppercase absolute top-2 right-4">Incoming State</p>
                                 <pre className="text-[10px] font-mono text-emerald-200 bg-slate-900 p-4 rounded-xl overflow-x-auto">
                                    {JSON.stringify(selectedLog.newValue, null, 2)}
                                 </pre>
                              </div>
                              {selectedLog.oldValue && (
                                <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl relative">
                                   <p className="text-[8px] font-black text-rose-500 uppercase absolute top-2 right-4">Prior State</p>
                                   <pre className="text-[10px] font-mono text-rose-200 bg-slate-900 p-4 rounded-xl overflow-x-auto">
                                      {JSON.stringify(selectedLog.oldValue, null, 2)}
                                   </pre>
                                </div>
                              )}
                           </div>
                         ) : (
                           <div className="p-6 bg-muted/20 border border-border rounded-2xl text-center italic text-xs text-muted-foreground">
                              No payload data available for this action type.
                           </div>
                         )}
                      </div>
                   </div>

                   <div className="mt-8 pt-6 border-t border-border/50 flex items-center justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-widest opacity-60">
                      <div className="flex items-center gap-2">
                        <Clock size={12} />
                        {format(new Date(selectedLog.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                      </div>
                      <p>Trace ID: {selectedLog.id.slice(0, 8)}</p>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoItem: React.FC<{ label: string, value: string, color?: string }> = ({ label, value, color }) => (
  <div className="p-4 bg-muted/20 border border-border/30 rounded-2xl">
    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter mb-1 opacity-60">{label}</p>
    <p className={`text-xs font-black tracking-widest truncate ${color ? `text-${color}-500` : 'text-foreground'}`}>{value}</p>
  </div>
);

export default AuditLogs;
