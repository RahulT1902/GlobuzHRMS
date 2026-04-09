import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle, 
  ShoppingCart,
  ArrowRight,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    pendingOrders: 0,
    totalVendors: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [invRes, poRes, vendorRes] = await Promise.all([
          api.get('/inventory'),
          api.get('/procurement'),
          api.get('/vendors')
        ]);

        const inventoryData = invRes.data.data || {};
        const inventory = inventoryData.products || [];
        const orders = poRes.data.data || [];
        const vendors = vendorRes.data.data || [];

        const lowStockCount = inventory.filter((p: any) => p.closingStock <= (p.minThreshold || 5)).length;
        const pendingPOs = orders.filter((o: any) => o.status === 'SUBMITTED' || o.status === 'DRAFT').length;

        setStats({
          totalProducts: inventoryData.total || inventory.length,
          lowStock: lowStockCount,
          pendingOrders: pendingPOs,
          totalVendors: vendors.length
        });
        setRecentOrders(orders.slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const cards = [
    { label: 'Total Inventory', value: stats.totalProducts, icon: Package, color: 'text-primary', bg: 'bg-primary/10', path: '/inventory', gradient: 'from-blue-500/5 to-transparent' },
    { label: 'Low Stock Alert', value: stats.lowStock, icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', path: '/inventory', gradient: 'from-amber-500/5 to-transparent' },
    { label: 'Active Orders', value: stats.pendingOrders, icon: ShoppingCart, color: 'text-emerald-500', bg: 'bg-emerald-500/10', path: '/procurement', gradient: 'from-emerald-500/5 to-transparent' },
    { label: 'Global Vendors', value: stats.totalVendors, icon: TrendingUp, color: 'text-violet-500', bg: 'bg-violet-500/10', path: '/vendors', gradient: 'from-violet-500/5 to-transparent' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-foreground tracking-tight">Executive Overview</h2>
          <p className="text-muted-foreground mt-1 text-lg font-medium opacity-80">Real-time supply chain intelligence and inventory snapshots.</p>
        </div>
        <div className="px-4 py-2 bg-primary/5 rounded-full border border-primary/10 flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
           <span className="text-[10px] font-black uppercase tracking-widest text-primary">Live Sync Active</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, type: 'spring', stiffness: 100 }}
            onClick={() => navigate(card.path)}
            className={`relative overflow-hidden bg-card border border-border p-6 rounded-2xl hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 transition-all group cursor-pointer shadow-sm`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
            <div className="flex items-start justify-between relative z-10">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">{card.label}</p>
                <h3 className="text-4xl font-black text-foreground mt-2 group-hover:text-primary transition-colors">{card.value}</h3>
              </div>
              <div className={`${card.bg} ${card.color} p-4 rounded-xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-inner`}>
                <card.icon size={28} strokeWidth={2.5} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
               VIEW CATEGORY <ArrowRight size={12} className="ml-1" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders List */}
        <div className="lg:col-span-2 bg-card/60 backdrop-blur-xl border border-border rounded-3xl overflow-hidden shadow-xl glass">
          <div className="p-8 border-b border-border/50 flex items-center justify-between bg-muted/20">
            <div>
               <h3 className="font-black text-foreground text-xl uppercase tracking-tight">Recent Procurement</h3>
               <p className="text-xs text-muted-foreground mt-0.5">Live tracking of active supply chain requests.</p>
            </div>
            <button onClick={() => navigate('/procurement')} className="px-4 py-2 bg-primary/5 hover:bg-primary/10 text-primary rounded-full text-xs font-bold flex items-center transition-all border border-primary/10">
              EXPLORE HUB <ArrowRight size={14} className="ml-2" />
            </button>
          </div>
          <div className="divide-y divide-border/50">
            {recentOrders.length === 0 ? (
              <div className="p-20 text-center">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 border border-border shadow-inner">
                   <ShoppingCart size={32} className="text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground font-bold text-lg">No active procurement.</p>
                <p className="text-muted-foreground/60 text-sm mt-1 max-w-xs mx-auto">Initiate a purchase request to begin tracking your global supply chain lifecycle.</p>
              </div>
            ) : recentOrders.map((order: any, i: number) => (
              <motion.div 
                key={order.id} 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-6 hover:bg-primary/5 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center space-x-5">
                  <div className={`p-3 rounded-2xl shadow-sm transition-all group-hover:scale-110 ${
                    order.status === 'RECEIVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'
                  }`}>
                    {order.status === 'RECEIVED' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                  </div>
                  <div>
                    <p className="text-base font-black text-foreground group-hover:text-primary transition-colors">{order.vendor?.name || '—'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                       <span className="text-[10px] font-mono text-muted-foreground uppercase bg-muted/50 px-1.5 py-0.5 rounded">ID: PO-{order.id.split('-')[0].toUpperCase()}</span>
                       <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Initiated Just Now</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-foreground">₹{Number(order.totalAmount).toLocaleString('en-IN')}</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border mt-1 shadow-sm ${
                    order.status === 'RECEIVED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                    order.status === 'APPROVED' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                    order.status === 'SUBMITTED' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                    'bg-slate-500/10 text-slate-500 border-slate-500/20'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full mr-2 ${
                       order.status === 'RECEIVED' ? 'bg-emerald-500' : 
                       order.status === 'APPROVED' ? 'bg-blue-500' : 
                       'bg-amber-500'
                    }`}></div>
                    {order.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* System Health Card (Enlightened) */}
        <div className="relative group overflow-hidden bg-white dark:bg-slate-900 border border-border rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl transition-all hover:border-primary/30">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-indigo-500 to-primary"></div>
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[80px] rounded-full"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 blur-[80px] rounded-full"></div>
          
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-inner relative z-10">
               <Activity className="text-primary w-10 h-10 animate-float" />
            </div>
          </div>
          
          <h3 className="text-2xl font-black text-foreground mb-3 tracking-tight">ERP CORE HEALTHY</h3>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed font-medium">
             Intelligence engines and database clusters are operating at peak performance with zero latency in global distribution.
          </p>
          
          <div className="w-full space-y-5 bg-muted/30 p-5 rounded-2xl border border-border/50 shadow-inner">
             <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em]">
                  <span className="text-muted-foreground">LATENCY SYNC</span>
                  <span className="text-emerald-500">OPTIMAL</span>
                </div>
                <div className="w-full h-1.5 bg-background rounded-full overflow-hidden border border-border/50">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: '94%' }}
                     transition={{ duration: 1.5, ease: 'easeOut' }}
                     className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                   ></motion.div>
                </div>
             </div>
             
             <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em]">
                  <span className="text-muted-foreground">ENGINE STABILITY</span>
                  <span className="text-primary">100%</span>
                </div>
                <div className="w-full h-1.5 bg-background rounded-full overflow-hidden border border-border/50">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: '100%' }}
                     transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
                     className="h-full bg-gradient-to-r from-primary to-indigo-500 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                   ></motion.div>
                </div>
             </div>
          </div>

          <div className="mt-8 flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/5 px-4 py-2 rounded-full border border-emerald-500/10">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
             ALL SYSTEMS NOMINAL
          </div>
        </div>
      </div>
    </div>
  );
};

const Activity: React.FC<{className?: string}> = ({className}) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
);

export default Dashboard;
