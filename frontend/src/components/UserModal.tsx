import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Shield, 
  ShieldCheck,
  ShieldPlus,
  AlertCircle,
  Loader2,
  Check,
  Info,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: any | null; // If editing
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSuccess, user }) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    roleNames: [] as string[],
    status: 'ACTIVE',
    userPermissions: [] as string[]
  });

  const [activeTab, setActiveTab] = useState<'identity' | 'access'>('identity');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, user]); // Added user to dependency to re-sync when editing different users

  const loadData = async () => {
    setFetching(true);
    try {
      const [rRes, pRes] = await Promise.all([
        api.get('/roles'),
        api.get('/roles/permissions')
      ]);
      setAvailableRoles(rRes.data.data);
      setAvailablePermissions(pRes.data.data);

      if (user) {
        setFormData({
          name: user.name || '',
          email: user.email || '',
          phone: user.phone || '',
          password: '',
          roleNames: user.roles?.map((r: any) => r.name) || [],
          status: user.status || 'ACTIVE',
          userPermissions: user.userPermissions || []
        });
      } else {
        setFormData({
          name: '',
          email: '',
          phone: '',
          password: '',
          roleNames: [],
          status: 'ACTIVE',
          userPermissions: []
        });
      }
    } catch (err) {
      setError('Failed to initialize security registry');
    } finally {
      setFetching(false);
    }
  };

  // CALCULATE EFFECTIVE PERMISSIONS (PBAC RESOLVER)
  const effectivePermissions = useMemo(() => {
    const fromRoles = availableRoles
      .filter(r => formData.roleNames.includes(r.name))
      .flatMap(r => r.permissions.map((p: any) => p.key));
    
    return Array.from(new Set([...fromRoles, ...formData.userPermissions]));
  }, [formData.roleNames, formData.userPermissions, availableRoles]);

  const toggleRole = (name: string) => {
    setFormData(prev => ({
      ...prev,
      roleNames: prev.roleNames.includes(name)
        ? prev.roleNames.filter(n => n !== name)
        : [...prev.roleNames, name]
    }));
  };

  const toggleOverride = (key: string) => {
    setFormData(prev => ({
      ...prev,
      userPermissions: prev.userPermissions.includes(key)
        ? prev.userPermissions.filter(k => k !== key)
        : [...prev.userPermissions, key]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (user) {
        await api.put(`/users/${user.id}`, formData);
      } else {
        await api.post('/users', formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Identity update failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={onClose} 
        className="absolute inset-0 bg-background/80 backdrop-blur-xl" 
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 20 }} 
        className="relative bg-card border border-border w-full max-w-5xl max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-10 py-8 border-b border-border flex items-center justify-between bg-muted/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary/10 to-transparent"></div>
          <div className="flex items-center gap-6">
            <div className="p-4 bg-primary/15 rounded-[1.5rem] border border-primary/30 shadow-2xl shadow-primary/10">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-foreground tracking-tight">
                {user ? 'Security Profile: ' + formData.name : 'Recruit New Partner'}
              </h2>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-muted-foreground text-[10px] uppercase tracking-[0.3em] font-black opacity-60 italic">Identity & Governance Plan</span>
                <div className="h-1.5 w-1.5 bg-primary/40 rounded-full" />
                <span className="text-primary text-[10px] font-black uppercase tracking-widest">{effectivePermissions.length} Active Rights</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-muted/50 rounded-2xl transition-all text-muted-foreground hover:text-foreground border border-transparent hover:border-border">
            <X size={28} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex px-10 border-b border-border/40 bg-muted/20 backdrop-blur-3xl">
          <button 
            type="button"
            onClick={() => setActiveTab('identity')}
            className={`px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'identity' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            01. Personal Identity
            {activeTab === 'identity' && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-4px_12px_rgba(var(--color-primary-rgb),0.5)]" />
            )}
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('access')}
            className={`px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${activeTab === 'access' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            02. Access Architecture
            {activeTab === 'access' && (
              <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-4px_12px_rgba(var(--color-primary-rgb),0.5)]" />
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-muted/5 flex flex-col">
          {error && (
            <div className="m-8 mb-0 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-sm shrink-0">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}
          <form id="user-onboard-form" onSubmit={handleSubmit} className="p-8 flex-1">

          {fetching ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-muted-foreground text-sm italic">Synchronizing with Governance Registry...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {activeTab === 'identity' ? (
                <div className="grid md:grid-cols-2 gap-16">
                  <div className="space-y-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] pl-2">Legal Designation</label>
                       <div className="relative group">
                          <input
                            required
                            placeholder="Full Name"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full bg-background border-2 border-border/50 rounded-2xl px-14 py-4 text-foreground outline-none focus:border-primary/50 transition-all font-black text-sm"
                          />
                          <User className="absolute left-5 top-4 h-6 w-6 text-muted-foreground/20 group-focus-within:text-primary transition-colors" />
                       </div>
                    </div>

                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] pl-2">Primary Authentication (Mobile)</label>
                       <div className="relative group">
                          <input
                            required
                            placeholder="Phone Number"
                            value={formData.phone}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                            className="w-full bg-background border-2 border-border/50 rounded-2xl px-14 py-4 text-foreground outline-none focus:border-primary/50 transition-all font-black text-sm"
                          />
                          <Phone className="absolute left-5 top-4 h-6 w-6 text-muted-foreground/20 group-focus-within:text-primary transition-colors" />
                       </div>
                    </div>

                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] pl-2">Secondary Identification (Email)</label>
                       <div className="relative group">
                          <input
                            type="email"
                            placeholder="Email Address"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                            className="w-full bg-background border-2 border-border/50 rounded-2xl px-14 py-4 text-foreground outline-none focus:border-primary/50 transition-all font-black text-sm"
                          />
                          <Mail className="absolute left-5 top-4 h-6 w-6 text-muted-foreground/20 group-focus-within:text-primary transition-colors" />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] pl-2">Access Protocol (Password)</label>
                       <div className="relative group">
                          <input
                            type="password"
                            required={!user}
                            placeholder={user ? "Keep existing password" : "Define Access Key"}
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            className="w-full bg-background border-2 border-border/50 rounded-2xl px-14 py-4 text-foreground outline-none focus:border-primary/50 transition-all font-black text-sm placeholder:opacity-30"
                          />
                          <Lock className="absolute left-5 top-4 h-6 w-6 text-muted-foreground/20 group-focus-within:text-primary transition-colors" />
                       </div>
                    </div>

                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.3em] pl-2">Registry Status</label>
                       <div className="grid grid-cols-2 gap-4">
                          {['ACTIVE', 'INACTIVE'].map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setFormData({...formData, status: s})}
                              className={`flex items-center justify-center gap-3 py-4 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${
                                formData.status === s 
                                  ? s === 'ACTIVE' 
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 shadow-xl shadow-emerald-500/10' 
                                    : 'bg-rose-500/10 border-rose-500/30 text-rose-500 shadow-xl shadow-rose-500/10'
                                  : 'bg-background border-border/50 text-muted-foreground/40 hover:border-border'
                              }`}
                            >
                              <div className={`w-2.5 h-2.5 rounded-full ${formData.status === s ? (s === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500') : 'bg-muted'}`} />
                              {s}
                            </button>
                          ))}
                       </div>
                    </div>

                    <div className="p-6 bg-primary/5 rounded-[2rem] border border-primary/10 flex gap-4 glass">
                        <Info className="w-5 h-5 text-primary shrink-0" />
                        <div className="text-[11px] text-muted-foreground leading-relaxed italic font-medium">
                          Authentication utilizes multi-factor normalization. Password changes will force session revocation across all devices (tokenVersion increment).
                        </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-16">
                  {/* Dynamic Roles */}
                  <div className="space-y-6">
                    <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.4em] flex items-center gap-4">
                       <Shield size={16} className="text-primary" /> Organizational Membership (Roles)
                       <div className="h-px flex-1 bg-border/40" />
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {availableRoles.map(role => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => toggleRole(role.name)}
                          className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all relative h-32 group ${
                            formData.roleNames.includes(role.name)
                              ? 'bg-primary border-primary text-white shadow-2xl shadow-primary/30 scale-105 z-10'
                              : 'bg-background border-border/50 text-muted-foreground hover:border-primary/30 hover:bg-primary/5'
                          }`}
                        >
                          {formData.roleNames.includes(role.name) && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -right-2 p-1.5 bg-white rounded-full text-primary shadow-lg border-2 border-primary">
                              <Check size={12} strokeWidth={4} />
                            </motion.div>
                          )}
                          <Shield className={`w-8 h-8 mb-3 transition-transform group-hover:scale-110 ${formData.roleNames.includes(role.name) ? 'text-white' : 'text-primary'}`} />
                          <span className="text-[10px] font-black uppercase text-center leading-tight tracking-widest">{role.name}</span>
                          <span className={`text-[8px] mt-2 opacity-60 font-black tracking-tighter ${formData.roleNames.includes(role.name) ? 'text-white/80' : 'text-muted-foreground'}`}>
                            {role.permissions?.length || 0} RIGHTS
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-16">
                    {/* Manual Overrides */}
                    <div className="space-y-6">
                      <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.4em] flex items-center gap-4">
                         <ShieldPlus size={16} className="text-amber-500" /> Individual Overrides (PBAC)
                         <div className="h-px flex-1 bg-border/40" />
                      </label>
                      <div className="bg-background rounded-[2.5rem] border-2 border-border/50 h-[380px] overflow-y-auto custom-scrollbar p-2 glass relative">
                        <div className="space-y-2 p-2">
                          {availablePermissions.map(p => {
                            const isInherited = availableRoles
                                .filter(r => formData.roleNames.includes(r.name))
                                .some(r => r.permissions.some((rp: any) => rp.key === p.key));
                            
                            const isManual = formData.userPermissions.includes(p.key);

                            return (
                              <button
                                key={p.key}
                                type="button"
                                onClick={() => toggleOverride(p.key)}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group border-2 ${
                                  isManual 
                                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-lg shadow-amber-500/5' 
                                    : 'bg-transparent text-muted-foreground/60 hover:bg-muted border-transparent'
                                } ${isInherited && 'opacity-50'}`}
                              >
                                <div className="flex flex-col items-start px-2">
                                  <span className="text-xs font-black uppercase tracking-widest">{p.label}</span>
                                  <span className="text-[8px] font-black opacity-30 mt-0.5 tracking-[0.2em]">{p.key}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  {isInherited && (
                                    <div className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-black rounded uppercase tracking-tighter border border-primary/20 shadow-sm">
                                      Inherited
                                    </div>
                                  )}
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                                    isManual ? 'bg-amber-500 border-amber-500 shadow-lg shadow-amber-500/30' : 'border-border'
                                  }`}>
                                    {isManual && <Check size={12} className="text-white" strokeWidth={4} />}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Effective Preview */}
                    <div className="space-y-6">
                      <label className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.4em] flex items-center gap-4">
                         <ShieldCheck size={16} className="text-primary" /> Calculated Effective Rights
                         <div className="h-px flex-1 bg-border/40" />
                      </label>
                      <div className="bg-muted/30 rounded-[2.5rem] border-2 border-border/50 h-[380px] overflow-y-auto custom-scrollbar p-10 glass relative">
                        {effectivePermissions.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center gap-6 opacity-20">
                             <Shield size={64} strokeWidth={1} />
                             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-center italic">No rights assigned to this identity</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-loose opacity-40 mb-8 italic">The following matrix represents the final set of permissions resulting from roles and manual overrides.</p>
                            <div className="grid grid-cols-1 gap-4">
                               {effectivePermissions.sort().map(p => (
                                 <div key={p} className="flex items-center gap-4 text-muted-foreground group cursor-default">
                                    <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_12px_rgba(var(--color-primary-rgb),0.8)]" />
                                    <span className="text-xs font-black uppercase tracking-widest group-hover:text-foreground transition-colors">{p}</span>
                                    <div className="h-0.5 flex-1 border-b border-border/40 transition-colors" />
                                    <Check size={12} className="text-primary opacity-30 group-hover:opacity-100 transition-opacity" />
                                 </div>
                               ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-10 py-10 border-t border-border bg-card/80 backdrop-blur-3xl flex items-center justify-between">
           <div className="hidden sm:block">
              {activeTab === 'identity' ? (
                <div className="flex items-center gap-4 text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">
                  Next Step <ChevronRight size={16} className="text-primary animate-pulse" /> Access Architecture
                </div>
              ) : (
                <button 
                  type="button" 
                  onClick={() => setActiveTab('identity')}
                  className="text-primary text-[10px] font-black uppercase tracking-[0.2em] hover:underline flex items-center gap-2 group"
                >
                  <span className="group-hover:-translate-x-1 transition-transform">←</span> Return to Identity Phase
                </button>
              )}
           </div>

           <div className="flex gap-4">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-10 py-4 bg-secondary hover:bg-muted text-secondary-foreground rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all border border-border/50"
              >
                Cancel Entry
              </button>
              <button 
                type="submit" 
                form="user-onboard-form"
                disabled={loading || (activeTab === 'identity' && (!formData.name || !formData.phone || (!user && !formData.password)))}
                onClick={(e) => {
                  if (activeTab === 'identity' && !user) {
                    e.preventDefault();
                    setActiveTab('access');
                  } else if (activeTab === 'access' || user) {
                    // Submit
                  } else {
                    e.preventDefault();
                    setActiveTab('access');
                  }
                }}
                className="px-12 py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Synchronizing...
                  </>
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    {activeTab === 'identity' ? 'Review Access Plan' : (user ? 'Synchronize Identity' : 'Onboard Partner')}
                  </>
                )}
              </button>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UserModal;
