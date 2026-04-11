import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Database, 
  Server, 
  Cpu, 
  Users, 
  Package, 
  Truck, 
  ShoppingCart, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import api from '../services/api';

interface SystemStats {
  users: number;
  vendors: number;
  procurementOrders: number;
  products: number;
  database: "CONNECTED" | "DISCONNECTED";
}

interface DriftReport {
  timestamp: string;
  status: "HEALTHY" | "DRIFT_DETECTED";
  totalProductsChecked: number;
  driftCount: number;
  drifts: any[];
}

const Debug: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [drift, setDrift] = useState<DriftReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingDrift, setCheckingDrift] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const { data } = await api.get('/debug/health');
      setStats(data);
      const end = performance.now();
      setLatency(Math.round(end - start));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkDrift = async () => {
    setCheckingDrift(true);
    try {
      const { data } = await api.post('/debug/drift-check');
      setDrift(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingDrift(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !stats) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4">
        <Cpu className="animate-spin text-primary" size={48} />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Initializing Telemetry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 text-primary mb-2">
            <Activity size={20} className="animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Operations Control</span>
          </div>
          <h2 className="text-4xl font-black text-foreground tracking-tight">System Health</h2>
          <p className="text-muted-foreground mt-1 text-lg font-medium opacity-80">Real-time infrastructure telemetry and data integrity monitoring.</p>
        </div>
        <button 
          onClick={fetchData} 
          className="flex items-center gap-2 px-6 py-3 bg-card border border-border rounded-xl font-bold transition-all hover:bg-muted active:scale-95 text-xs uppercase tracking-widest shadow-sm"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> 
          Refresh Metrics
        </button>
      </div>

      {/* Connectivity & Core Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <StatusCard 
           icon={<Database size={24} />}
           label="Primary Database"
           status={stats?.database === "CONNECTED" ? "ONLINE" : "OFFLINE"}
           subtext={`Latency: ${latency}ms`}
           color={stats?.database === "CONNECTED" ? "primary" : "rose"}
         />
         <StatusCard 
           icon={<Server size={24} />}
           label="API Environment"
           status="DEVELOPMENT"
           subtext="v1.0.4 - Secure"
           color="violet"
         />
         <StatusCard 
           icon={<ShieldCheck size={24} />}
           label="Audit Engine"
           status="ACTIVE"
           subtext="90-Day Retention"
           color="emerald"
         />
      </div>

      {/* Entity Meter */}
      <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-10 glass">
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 mb-8 px-2 flex items-center gap-3">
          <ArrowUpRight size={14} /> Global Entity Registry
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          <DataMeter label="Active Personnel" value={stats?.users || 0} icon={<Users size={18}/>} color="blue" />
          <DataMeter label="Verified Vendors" value={stats?.vendors || 0} icon={<Truck size={18}/>} color="violet" />
          <DataMeter label="Unique Products" value={stats?.products || 0} icon={<Package size={18}/>} color="amber" />
          <DataMeter label="Total Orders" value={stats?.procurementOrders || 0} icon={<ShoppingCart size={18}/>} color="emerald" />
        </div>
      </div>

      {/* Integrity Monitoring */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-card/60 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-10 glass">
          <div className="flex items-center justify-between mb-10">
            <div>
               <h3 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-3">
                 <ShieldCheck className="text-primary" size={28} /> Integrity Sentinel
               </h3>
               <p className="text-xs text-muted-foreground font-medium mt-1">Cross-referencing Snapshots with Transaction Ledgers.</p>
            </div>
            <button 
              disabled={checkingDrift}
              onClick={checkDrift}
              className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 ${checkingDrift ? 'bg-muted opacity-50' : 'bg-primary text-white shadow-primary/20 hover:scale-105'}`}
            >
              {checkingDrift ? <RefreshCw className="animate-spin" size={16}/> : <Activity size={16}/>}
              Run Drift Analysis
            </button>
          </div>

          {!drift ? (
            <div className="py-20 border-2 border-dashed border-border/50 rounded-[2rem] flex flex-col items-center justify-center text-muted-foreground opacity-30 italic">
               <Cpu size={48} className="mb-4" />
               <p className="text-sm font-bold uppercase tracking-widest">Awaiting Manual Verification</p>
            </div>
          ) : (
            <div className="space-y-6">
               <div className={`p-6 rounded-3xl border-2 flex items-center justify-between ${drift.status === 'HEALTHY' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/5 border-rose-500/20 text-rose-500'}`}>
                  <div className="flex items-center gap-4">
                     {drift.status === 'HEALTHY' ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
                     <div>
                        <div className="font-black text-xl uppercase tracking-widest leading-none">{drift.status}</div>
                        <div className="text-[10px] font-bold opacity-60 uppercase mt-1">System Audit finished at {new Date(drift.timestamp).toLocaleTimeString()}</div>
                     </div>
                  </div>
                  <div className="text-right">
                     <div className="text-2xl font-black">{drift.driftCount}</div>
                     <div className="text-[10px] font-black uppercase opacity-60 tracking-tighter">Issues Detected</div>
                  </div>
               </div>

               {drift.drifts.length > 0 && (
                 <div className="grid gap-4 mt-4 overflow-y-auto max-h-[300px] pr-2 scrollbar-thin">
                    {drift.drifts.map((d: any) => (
                      <div key={d.productId} className="p-4 bg-background border border-border/50 rounded-2xl flex items-center justify-between group hover:border-rose-500/40 transition-all">
                        <div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">{d.sku}</p>
                          <p className="font-bold text-foreground text-sm">{d.name}</p>
                        </div>
                        <div className="flex items-center gap-6">
                           <div className="text-center">
                              <p className="text-[8px] font-black text-muted-foreground uppercase">Expected</p>
                              <p className="font-mono font-bold text-xs">{d.ledgerStock}</p>
                           </div>
                           <div className="text-center">
                              <p className="text-[8px] font-black text-muted-foreground uppercase">Actual</p>
                              <p className="font-mono font-bold text-xs text-rose-500">{d.snapshotStock}</p>
                           </div>
                           <div className="px-3 py-1 bg-rose-500/10 text-rose-500 rounded-lg text-[10px] font-black">
                              {d.drift > 0 ? `+${d.drift}` : d.drift}
                           </div>
                        </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          )}
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-[2.5rem] p-10 flex flex-col justify-between">
           <div>
             <h3 className="text-xl font-black text-primary tracking-tight mb-4">Background Dispatcher</h3>
             <p className="text-xs text-primary/60 font-medium leading-relaxed italic mb-8">System tasks and scheduled maintenance jobs monitoring.</p>
             
             <div className="space-y-4">
                <JobRow label="Snapshot Engine" time="Daily" status="IDLE" />
                <JobRow label="Audit Pruning" time="24h Cycle" status="ACTIVE" />
                <JobRow label="Email Queue" time="Real-time" status="HEALTHY" />
             </div>
           </div>

           <div className="pt-10">
              <div className="p-4 bg-white/50 backdrop-blur rounded-2xl border border-primary/10 flex items-center gap-3">
                 <Clock className="text-primary" size={16} />
                 <div>
                    <p className="text-[8px] font-black uppercase text-muted-foreground opacity-60">Uptime</p>
                    <p className="text-xs font-black text-primary">04d : 12h : 35m</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

// HELPER COMPONENTS
const StatusCard: React.FC<{ icon: React.ReactNode, label: string, status: string, subtext: string, color: string }> = ({ icon, label, status, subtext, color }) => (
  <div className={`p-6 bg-card border border-border/50 rounded-3xl group hover:border-${color}-500/40 transition-all glass`}>
    <div className="flex items-center gap-4 mb-4">
      <div className={`p-3 rounded-2xl bg-${color}-500/10 text-${color}-500 group-hover:scale-110 transition-transform`}>{icon}</div>
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">{label}</div>
        <div className={`font-black tracking-widest text-${color}-500 text-sm`}>{status}</div>
      </div>
    </div>
    <div className="text-[10px] font-medium text-muted-foreground opacity-80 pl-2 border-l border-border">{subtext}</div>
  </div>
);

const DataMeter: React.FC<{ label: string, value: number, icon: React.ReactNode, color: string }> = ({ label, value, icon, color }) => (
  <div className="text-center group">
    <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl bg-${color}-500/10 text-${color}-500 flex items-center justify-center group-hover:rotate-12 transition-all shadow-lg shadow-${color}-500/5`}>
      {icon}
    </div>
    <div className="text-2xl font-black text-foreground mb-1 tabular-nums">{value.toLocaleString()}</div>
    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">{label}</div>
  </div>
);

const JobRow: React.FC<{ label: string, time: string, status: string }> = ({ label, time, status }) => (
  <div className="flex items-center justify-between p-3 bg-white/40 rounded-xl border border-primary/10">
    <div>
       <p className="text-[10px] font-black text-primary/80 uppercase tracking-tight">{label}</p>
       <p className="text-[8px] font-medium text-primary/40 uppercase">{time}</p>
    </div>
    <div className="px-2 py-0.5 bg-primary/20 text-primary text-[8px] font-black rounded-lg">
       {status}
    </div>
  </div>
);

export default Debug;
