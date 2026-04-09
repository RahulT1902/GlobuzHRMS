import React, { useState, useEffect } from 'react';
import { X, Shield, Check, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Permission {
  id: string;
  key: string;
  label: string | null;
}

interface Role {
  id?: string;
  name: string;
  description: string;
  permissions: Permission[];
}

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (role: any) => Promise<void>;
  role?: Role | null;
  availablePermissions: Permission[];
}

const RoleModal: React.FC<RoleModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  role, 
  availablePermissions 
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (role) {
      setName(role.name);
      setDescription(role.description || '');
      setSelectedPermissions(role.permissions.map(p => p.key));
    } else {
      setName('');
      setDescription('');
      setSelectedPermissions([]);
    }
  }, [role, isOpen]);

  const togglePermission = (key: string) => {
    setSelectedPermissions(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        name: name.toUpperCase(),
        description,
        permissions: selectedPermissions
      });
      onClose();
    } catch (error) {
      console.error('Failed to save role:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const isSystemRole = role?.name === 'ADMIN';

  // Group permissions by module
  const groupedPermissions = availablePermissions.reduce((acc: any, p) => {
    const module = p.key.split('_')[0];
    if (!acc[module]) acc[module] = [];
    acc[module].push(p);
    return acc;
  }, {});

  const getModuleLabel = (module: string) => {
    const labels: Record<string, string> = {
      'INVENTORY': 'Stock & Inventory',
      'PROCUREMENT': 'Purchase Orders',
      'VENDOR': 'Suppliers',
      'ADMIN': 'System Settings',
      'USER': 'Staff Access',
      'AUDIT': 'Activity Logs',
      'SYSTEM': 'Tech Health'
    };
    return labels[module] || `${module} Module`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {role ? 'Edit Role' : 'Create New Role'}
                </h2>
                <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Access Matrix</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {isSystemRole && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3 text-amber-600 text-sm italic">
                <Info className="w-5 h-5 shrink-0" />
                <p>System role 'ADMIN' is immutable to prevent identity lockout. You can only view its consolidated rights.</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground/80">Role Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSystemRole}
                  placeholder="e.g. PROCUREMENT_MANAGER"
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground/80">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSystemRole}
                  placeholder="What can this role do?"
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:ring-2 focus:ring-primary focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground/60 uppercase tracking-widest flex items-center gap-2">
                Operational Rights Matrix
                <div className="h-px flex-1 bg-border" />
              </h3>

              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([module, perms]: [string, any]) => (
                  <div key={module} className="bg-muted/10 rounded-xl p-4 border border-border flex flex-col gap-3">
                    <h4 className="text-xs font-bold text-primary mb-1 tracking-wider uppercase">{getModuleLabel(module)}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {perms.map((p: Permission) => (
                        <button
                          key={p.key}
                          type="button"
                          disabled={isSystemRole}
                          onClick={() => togglePermission(p.key)}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left group shadow-sm ${
                            selectedPermissions.includes(p.key)
                              ? 'bg-primary/10 border-primary/40 text-primary scale-[1.02] shadow-md shadow-primary/10'
                              : 'bg-background border-border text-muted-foreground hover:border-border/60'
                          } ${isSystemRole && 'cursor-default opacity-80'}`}
                        >
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                            selectedPermissions.includes(p.key) ? 'bg-primary text-white scale-110' : 'bg-muted'
                          }`}>
                            {selectedPermissions.includes(p.key) && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold leading-none mb-1">{p.label || p.key}</span>
                            <span className="text-[9px] opacity-40 uppercase tracking-tighter font-mono">{p.key}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="p-6 border-t border-border bg-card/80 flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-muted-foreground hover:bg-muted transition-all border border-border"
            >
              Cancel
            </button>
            {!isSystemRole && (
              <button 
                onClick={handleSubmit}
                disabled={isSaving || !name.trim()}
                className="px-8 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : <Check className="w-5 h-5" />}
                {role ? 'Update Role' : 'Create Role'}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default RoleModal;
