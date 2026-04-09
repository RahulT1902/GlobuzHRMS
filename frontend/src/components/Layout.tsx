import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';
import { useNotifications } from '../context/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, LucideCheckCircle2, AlertCircle, ShoppingCart } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { counts } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();

  const handleNotificationClick = (path: string) => {
    navigate(path);
    setShowNotifications(false);
  };

  return (
    <div className="flex min-h-screen bg-mesh text-foreground font-sans selection:bg-primary/30">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b border-border/50 bg-card/60 backdrop-blur-xl sticky top-0 z-10 flex items-center justify-between px-8 shadow-sm">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">System Online</span>
            </div>
            <div className="h-4 w-px bg-border/60"></div>
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Operational Intelligence</span>
          </div>
          <div className="flex items-center space-x-6 relative">
            <ThemeToggle />
            
            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-xl transition-all relative group ${showNotifications ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-primary'}`}
              >
                {counts.total > 0 && (
                  <div className="absolute -top-0 -right-0 min-w-[18px] h-[18px] bg-primary text-[10px] font-black text-white rounded-full border-2 border-card flex items-center justify-center animate-in zoom-in duration-300">
                    {counts.total > 99 ? '99+' : counts.total}
                  </div>
                )}
                <Bell size={20} className={`${showNotifications ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-80 bg-card border border-border rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.4)] z-50 overflow-hidden"
                    >
                      <div className="p-5 border-b border-border/40 bg-muted/20">
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-foreground">Active Missions</h4>
                        <p className="text-[10px] text-muted-foreground font-bold mt-1">Pending synchronization requirements</p>
                      </div>

                      <div className="p-2">
                        {counts.total === 0 ? (
                          <div className="p-10 text-center space-y-3">
                            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
                               <LucideCheckCircle2 size={24} />
                            </div>
                            <p className="text-xs font-black text-foreground uppercase tracking-widest">All Clear</p>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">System state is optimized.</p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {counts.approvals > 0 && (
                              <button 
                                onClick={() => handleNotificationClick('/procurement')}
                                className="w-full p-4 flex items-start gap-4 hover:bg-primary/5 rounded-2xl transition-all group border border-transparent hover:border-primary/20"
                              >
                                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20 group-hover:scale-110 transition-transform">
                                  <AlertCircle size={18} />
                                </div>
                                <div className="text-left">
                                  <p className="text-xs font-black text-foreground uppercase tracking-tight">Pending Approval</p>
                                  <p className="text-[10px] text-muted-foreground font-bold mt-0.5">{counts.approvals} orders waiting for verification</p>
                                </div>
                              </button>
                            )}
                            {counts.fulfillment > 0 && (
                              <button 
                                onClick={() => handleNotificationClick('/procurement')}
                                className="w-full p-4 flex items-start gap-4 hover:bg-primary/5 rounded-2xl transition-all group border border-transparent hover:border-primary/20"
                              >
                                <div className="p-2 bg-primary/10 text-primary rounded-xl border border-primary/20 group-hover:scale-110 transition-transform">
                                  <ShoppingCart size={18} />
                                </div>
                                <div className="text-left">
                                  <p className="text-xs font-black text-foreground uppercase tracking-tight">Logistics Action</p>
                                  <p className="text-[10px] text-muted-foreground font-bold mt-0.5">{counts.fulfillment} shipments ready for receipt</p>
                                </div>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-muted/20 border-t border-border/40 text-center">
                        <button 
                          onClick={() => handleNotificationClick('/procurement')}
                          className="text-[10px] font-black text-primary uppercase tracking-[0.2em] hover:underline"
                        >
                          View All Operations
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-x-hidden overflow-y-auto p-8 custom-scrollbar relative">
          {/* Decorative mesh highlight */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/3 -z-10"></div>
          
          <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
