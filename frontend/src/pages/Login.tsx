import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login({ identifier, password });
      navigate('/inventory');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Identity verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-mesh relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-violet-500/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-700"></div>

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-[480px] z-10"
      >
        {/* Logo/Brand Header */}
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 backdrop-blur-2xl rounded-[2.5rem] border border-primary/20 shadow-2xl shadow-primary/20 mb-6"
          >
            <ShieldCheck size={40} className="text-primary" strokeWidth={2.5} />
          </motion.div>
          <h1 className="text-5xl font-black text-foreground tracking-tighter mb-2">Globuz<span className="text-primary">HRMS</span></h1>
          <p className="text-muted-foreground font-bold uppercase tracking-[0.3em] text-[10px] opacity-60">System Intelligence Engine v2.0</p>
        </div>

        {/* Login Card */}
        <div className="bg-card/60 backdrop-blur-3xl border border-border/50 rounded-[3rem] p-10 shadow-[0_32px_128px_-32px_rgba(0,0,0,0.3)] glass relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent rounded-[3rem] pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-black text-foreground mb-1">Verify Identity</h2>
              <p className="text-sm text-muted-foreground font-medium opacity-80">Access your organization's tactical dashboard</p>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-8 p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-xs font-black uppercase tracking-wider"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Identity Credential</label>
                <div className="relative group/input">
                  <input
                    type="text"
                    required
                    autoFocus
                    className="w-full pl-14 pr-6 py-4 bg-background/40 border-2 border-border/50 rounded-2xl focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-foreground font-black placeholder:text-muted-foreground/30 placeholder:uppercase"
                    placeholder="Email or Phone"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                  />
                  <Mail className="absolute left-5 top-4.5 h-6 w-6 text-muted-foreground/30 group-focus-within/input:text-primary transition-colors" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Access Key</label>
                  <button type="button" className="text-[10px] text-primary font-black uppercase tracking-widest hover:underline opacity-60 hover:opacity-100 transition-opacity">
                    Reset Protocol
                  </button>
                </div>
                <div className="relative group/input">
                  <input
                    type="password"
                    required
                    className="w-full pl-14 pr-6 py-4 bg-background/40 border-2 border-border/50 rounded-2xl focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-foreground font-black placeholder:text-muted-foreground/30"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Lock className="absolute left-5 top-4.5 h-6 w-6 text-muted-foreground/30 group-focus-within/input:text-primary transition-colors" />
                </div>
              </div>

              <button
                disabled={loading}
                type="submit"
                className="w-full py-5 px-6 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                    Execute Authentication
                  </>
                )}
              </button>
            </form>

            <div className="mt-12 text-center">
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em] opacity-30">
                Secure Node Link: Established 256-bit AES
              </p>
            </div>
          </div>
        </div>

        {/* External Help */}
        <div className="mt-10 flex justify-center gap-8">
           <button className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors">
             Security Policy <ArrowRight size={12} />
           </button>
           <button className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors">
             Platform Support <ArrowRight size={12} />
           </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
