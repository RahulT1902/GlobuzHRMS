import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Package, 
  Truck, 
  ShieldCheck, 
  Edit2,
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2,
  AlertCircle,
  Users,
  Shield,
  Database,
  Cpu,
  ChevronRight,
  ChevronDown,
  GitBranch,
  PlusCircle,
  Hash
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import UserModal from '../components/UserModal';
import RoleModal from '../components/RoleModal';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../constants/permissions';

interface MasterItem {
  id: string;
  name: string;
  code?: string; // For Units
  days?: number; // For Payment Terms
  type?: 'INVENTORY' | 'VENDOR'; // For Categories
  parentId?: string | null; // For Categories
  parent?: { name: string } | null; // Resolved parent name
  isActive: boolean;
  sortOrder: number;
}

interface CategoryNode {
  clientId: string;
  name: string;
  isCustom?: boolean;
  children: CategoryNode[];
  error?: string;
}

const createInitialNode = (name = ''): CategoryNode => ({
  clientId: crypto.randomUUID(),
  name,
  children: []
});

// RECURSIVE TREE BUILDER COMPONENT (Defined Outside to prevent focus loss on rerender)
const TreeNodeBuilder: React.FC<{ 
  node: CategoryNode, 
  onUpdate: (updated: CategoryNode) => void,
  onDelete: () => void,
  depth: number,
  isRoot: boolean
}> = ({ node, onUpdate, onDelete, depth, isRoot }) => {
  
  const [isCollapsed, setIsCollapsed] = useState(false);

  const addChild = () => {
    setIsCollapsed(false); // Ensure expanded when adding
    onUpdate({
      ...node,
      children: [...node.children, createInitialNode()]
    });
  };

  const updateChild = (index: number, updatedChild: CategoryNode) => {
    const newChildren = [...node.children];
    newChildren[index] = updatedChild;
    onUpdate({ ...node, children: newChildren });
  };

  const getFullSubtreeCount = (n: CategoryNode): number => {
    return n.children.length + n.children.reduce((acc, child) => acc + getFullSubtreeCount(child), 0);
  };

  const getFullSubtreeNames = (n: CategoryNode): string[] => {
    return n.children.reduce((acc: string[], child) => [...acc, child.name, ...getFullSubtreeNames(child)], []);
  };

  const deleteChild = (index: number) => {
    const child = node.children[index];
    const impactCount = getFullSubtreeCount(child);
    const impactNames = getFullSubtreeNames(child).slice(0, 3);
    const moreCount = impactCount - impactNames.length;

    let message = `Are you sure you want to remove "${child.name}"?`;
    if (impactCount > 0) {
      message += `\n\nThis will also deactivate ${impactCount} sub-categories:\n- ${impactNames.join('\n- ')}${moreCount > 0 ? `\n...and ${moreCount} others` : ''}`;
    }

    if (window.confirm(message)) {
      const newChildren = node.children.filter((_, i) => i !== index);
      onUpdate({ ...node, children: newChildren });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {/* Visual Connectors */}
        {depth > 0 && (
          <div className="flex items-center h-full ml-2">
            {[...Array(depth)].map((_, i) => (
              <div key={i} className={`w-8 h-8 flex items-center justify-center relative`}>
                  <div className={`absolute left-0 top-[-1.5rem] h-[3rem] border-l-2 border-primary/20 ${i === depth - 1 ? 'h-[1.5rem] bottom-[1.5rem] border-b-2 rounded-bl-xl w-6' : ''}`} />
              </div>
            ))}
          </div>
        )}

        <div className={`flex-1 flex gap-2 items-center bg-card border ${node.error ? 'border-rose-500 shadow-lg shadow-rose-500/10' : 'border-border'} p-2 rounded-2xl shadow-sm hover:border-primary/40 transition-all`}>
          {node.children.length > 0 && (
             <button 
               type="button" 
               onClick={() => setIsCollapsed(!isCollapsed)}
               className="p-1 hover:bg-muted rounded-md text-muted-foreground transition-all ml-1"
             >
               {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
             </button>
          )}
          <input 
            placeholder={isRoot ? "Main Group (e.g. Sunpack)" : "Child Spec (e.g. 5MM)"}
            value={node.name}
            onChange={e => onUpdate({...node, name: e.target.value})}
            className="flex-1 bg-transparent border-none outline-none px-2 text-sm font-bold text-foreground"
          />
          <div className="flex items-center gap-1">
            <button 
              type="button" 
              onClick={() => onUpdate({...node, isCustom: !node.isCustom})} 
              className={`p-1.5 rounded-lg transition-all border flex items-center gap-1.5 ${node.isCustom ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted'}`}
              title="Toggle Custom Attributes (Color, Size, GSM)"
            >
              <Settings size={14} className={node.isCustom ? 'animate-spin-slow' : ''} />
              <span className="text-[9px] font-black uppercase tracking-tighter">Custom</span>
            </button>
            <button type="button" onClick={addChild} className="p-1.5 hover:bg-primary/10 text-primary rounded-lg transition-all" title="Add Child">
              <PlusCircle size={15} />
            </button>
            {!isRoot && (
              <button type="button" onClick={onDelete} className="p-1.5 hover:bg-rose-500/10 text-rose-400 rounded-lg transition-all" title="Remove Node">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {!isCollapsed && node.children.length > 0 && (
        <div className="space-y-3">
          {node.children.map((child, idx) => (
            <TreeNodeBuilder 
              key={child.clientId}
              node={child}
              depth={depth + 1}
              isRoot={false}
              onUpdate={(upd) => updateChild(idx, upd)}
              onDelete={() => deleteChild(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const AdminConfig: React.FC = () => {
  const { hasPermission, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'inventory' | 'vendors' | 'rules' | 'users' | 'roles' | 'persistence'>('inventory');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Master Data States
  const [units, setUnits] = useState<MasterItem[]>([]);
  const [invCategories, setInvCategories] = useState<MasterItem[]>([]);
  const [venCategories, setVenCategories] = useState<MasterItem[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<MasterItem[]>([]);
  const [rules, setRules] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<any[]>([]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ type: string, item?: MasterItem } | null>(null);
  const [userModalItem, setUserModalItem] = useState<any>(null);
  const [roleModalItem, setRoleModalItem] = useState<any>(null);
  const [modalData, setModalData] = useState<any>({});
  
  // Taxonomy Builder State
  const [categoryTree, setCategoryTree] = useState<CategoryNode | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      if (activeTab === 'inventory') {
        const [uRes, cRes] = await Promise.all([
          api.get('/config/units'),
          api.get('/config/categories?type=INVENTORY')
        ]);
        if (uRes.data.success) setUnits(uRes.data.data);
        if (cRes.data.success) setInvCategories(cRes.data.data);
      } else if (activeTab === 'vendors') {
        const [cRes, pRes] = await Promise.all([
          api.get('/config/categories?type=VENDOR'),
          api.get('/config/payment-terms')
        ]);
        if (cRes.data.success) setVenCategories(cRes.data.data);
        if (pRes.data.success) setPaymentTerms(pRes.data.data);
      } else if (activeTab === 'users') {
        const res = await api.get('/users');
        if (res.data.success) setUsers(res.data.data);
      } else if (activeTab === 'roles') {
        const [rRes, pRes] = await Promise.all([
          api.get('/roles'),
          api.get('/roles/permissions')
        ]);
        if (rRes.data.success) setRoles(rRes.data.data);
        if (pRes.data.success) setAvailablePermissions(pRes.data.data);
      } else if (activeTab === 'rules') {
        const rRes = await api.get('/config/rules');
        if (rRes.data.success) setRules(rRes.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching config:', error);
      showMsg('error', 'Failed to load configuration data');
    }
  };

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || isSaving) return;

    try {
      setIsSaving(true);
      let endpoint = '';
      let payload = modalData;
      let method: 'post' | 'put' = editingItem.item?.id ? 'put' : 'post';

      if (editingItem.type === 'unit') endpoint = '/config/units';
      else if (editingItem.type.includes('Category')) {
        // Categories ALWAYS use batch endpoint for recursive branch building/editing
        endpoint = '/config/categories/batch';
        method = 'post'; // Batch logic is a POST endpoint designed for upserts
        payload = {
          requestId: crypto.randomUUID(),
          type: editingItem.type === 'invCategory' ? 'INVENTORY' : 'VENDOR',
          tree: categoryTree,
          parentId: editingItem.item?.parentId || null // REQUISITE for preserving hierarchy level
        };
      } else if (editingItem.type === 'paymentTerm') endpoint = '/config/payment-terms';

      const res = method === 'put' 
        ? await api.put(`${endpoint}/${editingItem.item?.id}`, payload)
        : await api.post(endpoint, payload);

      if (res.data.success) {
        const { warnings } = res.data.data || {};
        
        if (warnings && warnings.length > 0) {
          const warningText = warnings.map((w: any) => `- ${w.categoryName} (${w.reason}${w.sampleProduct ? `: used in ${w.sampleProduct}` : ''})`).join('\n');
          alert(`Taxonomy updated with some restrictions:\n\n${warningText}\n\nThese categories were kept to prevent orphan products.`);
        }

        showMsg('success', editingItem.item ? 'Information updated' : 'Record created');
        setModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      console.error('Save Item Error Payload:', err.response?.data);
      const msg = err.response?.data?.message || 'Failed to save configuration';
      showMsg('error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveRole = async (roleData: any) => {
    try {
      if (roleModalItem) {
        await api.put(`/roles/${roleModalItem.id}`, roleData);
        showMsg('success', 'Role updated successfully');
      } else {
        await api.post('/roles', roleData);
        showMsg('success', 'New role established');
      }
      setRoleModalOpen(false);
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save role';
      showMsg('error', msg);
      throw err;
    }
  };

  const handleDelete = async (type: string, id: string) => {
    if(!window.confirm('Are you sure? This action may have cascading effects if data is linked.')) return;
    try {
       const endpoint = type === 'unit' ? '/config/units' : 
                        type.includes('Category') ? '/config/categories' : 
                        '/config/payment-terms';

       await api.delete(`${endpoint}/${id}`);
       showMsg('success', 'Configuration removed successfully');
       fetchData();
    } catch (err) {
       showMsg('error', 'Failed to remove configuration');
    }
  };

  const openAddModal = (type: string) => {
    setEditingItem({ type });
    if (type.includes('Category')) {
      setCategoryTree(createInitialNode());
    } else {
      setModalData({ name: '', isActive: true, sortOrder: 0, code: '', days: 30 });
    }
    setModalOpen(true);
  };

  const buildTreeFromItems = (items: MasterItem[], rootId: string): CategoryNode => {
    const root = items.find(i => i.id === rootId);
    if (!root) return createInitialNode();
    
    return {
      clientId: root.id, // CRITICAL: Use DB ID as clientId for backend 'Upsert'
      name: root.name,
      isCustom: (root as any).isCustom || false,
      children: items
        .filter(i => i.parentId === rootId)
        .map(child => buildTreeFromItems(items, child.id))
    };
  };

  const openEditModal = (type: string, item: MasterItem) => {
    setEditingItem({ type, item });
    if (type.includes('Category')) {
      // FULL BRANCH EDIT: reconstruct tree from flat list
      const fullList = type === 'invCategory' ? invCategories : venCategories;
      const reconstructedTree = buildTreeFromItems(fullList, item.id);
      setCategoryTree(reconstructedTree);
    } else {
      setModalData({ ...item });
    }
    setModalOpen(true);
  };

  const toggleRule = (group: string, field: string) => {
    setRules((prev: any) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [field]: { ...prev[group][field], required: !prev[group][field].required }
      }
    }));
  };

  const handleUpdateRules = async () => {
    try {
      await api.put('/config/rules', rules);
      showMsg('success', 'Governance rules updated successfully');
    } catch (error) {
      showMsg('error', 'Failed to update rules');
    }
  };

  const tabs = [
    { id: 'inventory' as const, label: 'Inventory Core', icon: <Package size={18}/>, permission: PERMISSIONS.ADMIN_CONFIG },
    { id: 'vendors' as const, label: 'Partner Network', icon: <Truck size={18}/>, permission: PERMISSIONS.VENDOR_MANAGE },
    { id: 'users' as const, label: 'User Management', icon: <Users size={18}/>, permission: PERMISSIONS.USER_MANAGE },
    { id: 'roles' as const, label: 'Role Governance', icon: <Shield size={18}/>, permission: PERMISSIONS.ADMIN_CONFIG },
    { id: 'rules' as const, label: 'Governance Rules', icon: <ShieldCheck size={18}/>, permission: PERMISSIONS.ADMIN_CONFIG },
    { id: 'persistence' as const, label: 'Data Forge', icon: <Database size={18}/>, permission: PERMISSIONS.ADMIN_CONFIG },
  ];

  const authorizedTabs = tabs.filter(t => hasPermission(t.permission));

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 text-primary mb-2">
            <Settings size={20} className="animate-spin-slow" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Internal Operations</span>
          </div>
          <h2 className="text-4xl font-black text-foreground tracking-tight">System Configuration</h2>
          <p className="text-muted-foreground mt-1 text-lg font-medium opacity-80">Orchestrate global platform metadata and enterprise taxonomy.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl w-fit glass">
        {authorizedTabs.map(tab => (
           <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 relative group overflow-hidden ${activeTab === tab.id ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-105 z-10' : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'}`}>
              <div className={activeTab === tab.id ? 'animate-bounce-slow' : 'opacity-60 group-hover:opacity-100 transition-opacity'}>{tab.icon}</div>
              <span className="text-xs font-black uppercase tracking-widest">{tab.label}</span>
              {activeTab === tab.id && <motion.div layoutId="tab-glow" className="absolute inset-0 bg-white/10 opacity-50" />}
            </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
          
          {activeTab === 'persistence' && (
            <DataForgeSection showMsg={showMsg} logout={logout} />
          )}

          {activeTab === 'inventory' && (
            <div className="grid md:grid-cols-2 gap-8">
              <ConfigSection title="Measurement Units" items={units} icon={<Database size={20} />} onAdd={() => openAddModal('unit')} onEdit={(it) => openEditModal('unit', it)} onDelete={(id) => handleDelete('unit', id)} />
              <ConfigSection title="Asset Categories" items={invCategories} icon={<Package size={20} />} onAdd={() => openAddModal('invCategory')} onEdit={(it) => openEditModal('invCategory', it)} onDelete={(id) => handleDelete('invCategory', id)} />
            </div>
          )}

          {activeTab === 'vendors' && (
             <div className="grid md:grid-cols-2 gap-8">
               <ConfigSection title="Vendor Categories" items={venCategories} icon={<Truck size={20} />} onAdd={() => openAddModal('venCategory')} onEdit={(it) => openEditModal('venCategory', it)} onDelete={(id) => handleDelete('venCategory', id)} />
               <ConfigSection title="Payment Terms" items={paymentTerms} icon={<Save size={20} />} onAdd={() => openAddModal('paymentTerm')} onEdit={(it) => openEditModal('paymentTerm', it)} onDelete={(id) => handleDelete('paymentTerm', id)} />
             </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-10 glass">
               <div className="flex items-center justify-between mb-10">
                  <h3 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-3"><Users className="text-primary" size={28} /> Personnel Registry</h3>
                  <button onClick={() => { setUserModalItem(null); setUserModalOpen(true); }} className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold transition-all shadow-xl shadow-primary/20 active:scale-95 text-xs uppercase tracking-widest"><Plus size={18} /> Add User</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {users.map(u => (
                    <div key={u.id} className="p-6 bg-background border border-border/50 rounded-2xl relative group hover:border-primary/40 transition-all">
                       <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Users size={24} /></div>
                          <div>
                             <div className="font-bold text-foreground truncate max-w-[150px]">{u.name}</div>
                             <div className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter">{u.roles?.[0]?.name || 'Staff'}</div>
                          </div>
                          <div className={`ml-auto px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest border ${u.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>{u.status}</div>
                       </div>
                       <div className="flex items-center gap-2 pt-4 border-t border-border/40">
                          <button onClick={() => { setUserModalItem(u); setUserModalOpen(true); }} className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest bg-muted/30 hover:bg-primary/20 hover:text-primary rounded-lg transition-all">Edit</button>
                          <button onClick={async () => { if(window.confirm('Deactivate user?')) { await api.delete(`/users/${u.id}`); fetchData(); } }} className="p-2 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all"><Trash2 size={16} /></button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-10 glass">
               <div className="flex items-center justify-between mb-10">
                  <h3 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-3"><Shield className="text-violet-500" size={28} /> Role Governance</h3>
                  <button onClick={() => { setRoleModalItem(null); setRoleModalOpen(true); }} className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-xl font-bold transition-all shadow-xl shadow-violet-500/20 active:scale-95 text-xs uppercase tracking-widest"><Plus size={18} /> New Role</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {roles.map(r => (
                    <div key={r.id} className="p-6 bg-background border border-border/50 rounded-2xl group hover:border-violet-500/40 transition-all">
                       <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-500"><Shield size={24} /></div>
                          <div className="text-[10px] font-black text-foreground uppercase tracking-widest opacity-60">{r.permissions?.length || 0} Rights</div>
                       </div>
                       <div className="font-black text-lg mb-2">{r.name}</div>
                       <p className="text-[11px] text-muted-foreground mb-6 line-clamp-2 italic">{r.description || 'Global system role definition.'}</p>
                       <div className="flex items-center gap-2 pt-4 border-t border-border/40">
                          <button onClick={() => { setRoleModalItem(r); setRoleModalOpen(true); }} className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest bg-muted/30 hover:bg-violet-500/20 hover:text-violet-500 rounded-lg transition-all">Manage</button>
                          {r.name !== 'ADMIN' && <button onClick={async () => { if(window.confirm('Delete role?')) { await api.delete(`/roles/${r.id}`); fetchData(); } }} className="p-2 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all"><Trash2 size={16} /></button>}
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'rules' && rules && (
            <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-12 glass">
              <div className="flex items-center gap-4 mb-12">
                <div className="p-4 bg-primary/10 text-primary rounded-[1.5rem] border border-primary/20"><ShieldCheck size={32} /></div>
                <h3 className="text-3xl font-black text-foreground tracking-tight">System Laws</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-16">
                <RuleGroup title="Inventory Validation" rules={rules.product} group="product" onToggle={toggleRule} />
                <RuleGroup title="Vendor Verification" rules={rules.vendor} group="vendor" onToggle={toggleRule} />
              </div>
              <div className="mt-16 pt-8 border-t border-border/40 flex justify-end">
                <button onClick={handleUpdateRules} className="flex items-center gap-3 px-10 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-primary/20 active:scale-95"><Save size={20} /> Deploy Protocol</button>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      <UserModal isOpen={userModalOpen} onClose={() => setUserModalOpen(false)} onSuccess={() => fetchData()} user={userModalItem} />
      <RoleModal isOpen={roleModalOpen} onClose={() => setRoleModalOpen(false)} onSave={handleSaveRole} role={roleModalItem} availablePermissions={availablePermissions} />

      <AnimatePresence>
        {modalOpen && editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setModalOpen(false)} className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative bg-card border border-border w-full ${editingItem.type.includes('Category') ? 'max-w-xl' : 'max-w-lg'} rounded-3xl shadow-2xl p-8 flex flex-col max-h-[90vh]`}
            >
              <h2 className="text-2xl font-black mb-1 text-foreground capitalize tracking-tight flex items-center gap-3">
                {editingItem.type.includes('Category') ? <GitBranch className="text-primary"/> : <PlusCircle className="text-primary"/>}
                {editingItem.item ? `Adjust ${editingItem.item.name}` : `Build New ${editingItem.type.replace('Category', ' Category')}`}
              </h2>
              <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-8 opacity-60">System Registry Modification</p>

              <form onSubmit={handleSaveItem} className="space-y-6 overflow-y-auto pr-2 scrollbar-thin">
                {/* Taxonomy Tree Logic (Recursive Edit/Build Mode) */}
                {editingItem.type.includes('Category') && categoryTree && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-primary/60 mb-4 bg-primary/5 p-3 rounded-xl border border-primary/10">
                      <Hash size={12}/> Taxonomy Builder ({editingItem.item ? 'Edit Branch' : 'New Branch'})
                    </div>
                    <TreeNodeBuilder node={categoryTree} depth={0} isRoot={true} onUpdate={setCategoryTree} onDelete={() => {}} />
                  </div>
                )}

                {/* Simple Unit/Term Edit Logic */}
                {editingItem.type === 'unit' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Unit Name</label>
                       <input required value={modalData.name} onChange={e => setModalData({...modalData, name: e.target.value})} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground font-bold outline-none focus:border-primary" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Standard Code</label>
                       <input required value={modalData.code} onChange={e => setModalData({...modalData, code: e.target.value.toUpperCase()})} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground font-mono outline-none focus:border-primary uppercase" />
                    </div>
                  </div>
                )}

                {editingItem.type === 'paymentTerm' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Term Label</label>
                       <input required value={modalData.name} onChange={e => setModalData({...modalData, name: e.target.value})} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground font-bold outline-none focus:border-primary" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Credit Days</label>
                       <input type="number" required value={modalData.days} onChange={e => setModalData({...modalData, days: parseInt(e.target.value)})} className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground outline-none focus:border-primary" />
                    </div>
                  </div>
                )}

                <div className="pt-8 flex gap-4">
                  <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-4 bg-secondary hover:bg-muted text-foreground rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Cancel</button>
                  <button disabled={isSaving} type="submit" className={`flex-[2] py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-primary/20 transition-all ${isSaving ? 'opacity-50 cursor-not-allowed scale-95' : 'active:scale-95'}`}>
                    {isSaving ? (
                      <div className="flex items-center justify-center gap-2">
                        <Cpu size={16} className="animate-spin" />
                        <span>Applying...</span>
                      </div>
                    ) : (
                      editingItem.item ? 'Update Changes' : 'Initialize Record'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {message && (
        <div className={`fixed bottom-8 right-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-2xl border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-rose-500/10 border-rose-500/50 text-rose-400'}`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-[10px] font-black uppercase tracking-widest leading-none">{message.text}</span>
        </div>
      )}
    </div>
  );
};

// HELPER COMPONENTS
const ConfigSection: React.FC<{ title: string, items: MasterItem[], icon: React.ReactNode, onAdd: () => void, onEdit: (item: MasterItem) => void, onDelete: (id: string) => void }> = ({ title, items, icon, onAdd, onEdit, onDelete }) => (
  <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-10 glass h-fit">
    <div className="flex items-center justify-between mb-8">
      <h3 className="text-xl font-black text-foreground tracking-tight flex items-center gap-3">{icon} {title}</h3>
      <button onClick={onAdd} className="w-10 h-10 bg-primary/10 text-primary rounded-xl border border-primary/20 hover:bg-primary hover:text-white transition-all flex items-center justify-center shadow-lg"><Plus size={18} strokeWidth={3} /></button>
    </div>
    <div className="space-y-3">
      {items.filter(it => !it.parentId).map(item => (
        <div key={item.id} className="p-4 rounded-2xl bg-background/40 border-2 border-border/40 transition-all group shadow-sm flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-black text-xs text-foreground tracking-tight">{item.name}</span>
                {item.code && <span className="text-[10px] px-2 py-0.5 rounded-lg bg-muted text-muted-foreground font-mono font-bold uppercase">{item.code}</span>}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => onEdit(item)} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-all"><Edit2 size={14} /></button>
                <button onClick={() => onDelete(item.id)} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"><Trash2 size={14} /></button>
              </div>
            </div>
            {/* Nested Preview */}
            {items.filter(it => it.parentId === item.id).map(child => (
              <div key={child.id} className="ml-4 pl-4 border-l-2 border-primary/10 flex items-center justify-between group/sub">
                 <div className="flex items-center gap-2">
                   <ChevronRight size={10} className="text-primary/40"/>
                   <span className="text-[10px] font-bold text-muted-foreground/80">{child.name}</span>
                 </div>
                 <div className="flex items-center gap-1 opacity-0 group-hover/sub:opacity-100 transition-all">
                    <button onClick={() => onEdit(child)} className="p-1 text-primary hover:text-primary transition-all"><Edit2 size={10} /></button>
                    <button onClick={() => onDelete(child.id)} className="p-1 text-rose-400 hover:text-rose-600 transition-all"><Trash2 size={10} /></button>
                 </div>
              </div>
            ))}
        </div>
      ))}
      {items.length === 0 && (
        <div className="py-12 flex flex-col items-center justify-center text-muted-foreground opacity-30 italic">
          <Cpu size={32} className="mb-3" />
          <p className="text-[10px] font-black uppercase tracking-widest Registry Empty"></p>
        </div>
      )}
    </div>
  </div>
);

const RuleGroup: React.FC<{ title: string, rules: any, group: string, onToggle: any }> = ({ title, rules, group, onToggle }) => (
  <div className="space-y-8">
    <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary pb-2 border-b-2 border-primary/20">{title}</h4>
    {Object.keys(rules).map(field => (
      <div key={field} onClick={() => onToggle(group, field)} className="flex items-center justify-between p-6 rounded-[1.5rem] bg-background/40 border-2 border-border group hover:border-primary/40 transition-all cursor-pointer shadow-sm">
        <span className="capitalize text-foreground font-black text-xs tracking-tight">{field.replace(/([A-Z])/g, ' $1').trim()}</span>
        <div className={`w-14 h-7 rounded-full p-1 transition-all duration-500 ${rules[field].required ? 'bg-primary' : 'bg-muted'}`}>
          <div className={`w-5 h-5 bg-white rounded-full transition-transform duration-500 ${rules[field].required ? 'translate-x-7' : 'translate-x-0'}`} />
        </div>
      </div>
    ))}
  </div>
);

// DATA FORGE COMPONENT
const DataForgeSection: React.FC<{ showMsg: any, logout: () => void }> = ({ showMsg, logout }) => {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [opLoading, setOpLoading] = useState(false);

  const fetchSnapshots = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/system/snapshots');
      setSnapshots(data.data);
    } catch (err) {
      showMsg('error', 'Failed to load snapshots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSnapshots(); }, []);

  const handleSnapshot = async (mode: 'CORE' | 'FULL') => {
    setOpLoading(true);
    try {
      await api.post('/system/snapshot', { mode });
      showMsg('success', `${mode} Snapshot created successfully`);
      fetchSnapshots();
    } catch (err) {
      showMsg('error', 'Failed to create snapshot');
    } finally {
      setOpLoading(false);
    }
  };

  const handleRestore = async (filename: string) => {
    if (!window.confirm(`⚠️ CRITICAL WARNING: This will WIPE your current database and restore state from ${filename}. This action is IRREVERSIBLE. Are you ABSOLUTELY sure?`)) return;
    
    setOpLoading(true);
    try {
      await api.post('/system/restore', { filename });
      showMsg('success', 'System restored successfully! Terminating session for security...');
      
      // Delay slightly for user to read message, then force logout
      setTimeout(() => {
        logout();
      }, 3000);
    } catch (err: any) {
      showMsg('error', err.response?.data?.message || 'Restoration failed due to structural mismatch');
    } finally {
      setOpLoading(false);
    }
  };

  return (
    <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-12 glass overflow-hidden relative">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-16">
        <div>
          <h3 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-4">
             <div className="p-3 bg-primary/10 text-primary rounded-2xl"><Edit2 size={24} /></div>
             Data Forge Console
          </h3>
          <p className="text-muted-foreground mt-2 font-medium opacity-80">Manage database persistence, create structural snapshots, and revert system states.</p>
        </div>
        <div className="flex gap-4">
           <button 
             disabled={opLoading}
             onClick={() => handleSnapshot('CORE')}
             className="px-6 py-4 bg-secondary text-foreground rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-muted transition-all flex items-center gap-3 disabled:opacity-50"
           >
             <CheckCircle2 size={18} /> Quick Snapshot
           </button>
           <button 
             disabled={opLoading}
             onClick={() => handleSnapshot('FULL')}
             className="px-6 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all flex items-center gap-3 disabled:opacity-50"
           >
             <Save size={18} /> Master Snapshot
           </button>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 mb-6">Available Recovery Points</h4>
        
        {loading ? (
           <div className="py-20 flex justify-center"><Cpu className="animate-spin text-primary" size={40} /></div>
        ) : snapshots.length === 0 ? (
           <div className="py-20 border-2 border-dashed border-border/50 rounded-[2rem] flex flex-col items-center justify-center text-muted-foreground opacity-40 italic">
              <Database size={48} className="mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest">No manual snapshots identified</p>
           </div>
        ) : (
          <div className="grid gap-4">
            {snapshots.map(s => (
              <div key={s.filename} className="p-6 bg-background border border-border/50 rounded-3xl flex items-center justify-between group hover:border-primary/40 transition-all">
                <div className="flex items-center gap-6">
                  <div className={`p-4 rounded-2xl ${s.filename.includes('core') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'}`}>
                    <Truck size={24} />
                  </div>
                  <div>
                    <div className="font-mono text-[11px] font-black text-foreground uppercase tracking-tighter">{s.filename}</div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase">{new Date(s.createdAt).toLocaleString()}</span>
                      <span className="w-1 h-1 bg-border rounded-full" />
                      <span className="text-[10px] text-muted-foreground font-mono">{(s.size / 1024).toFixed(1)} KB</span>
                    </div>
                  </div>
                </div>
                <button 
                  disabled={opLoading}
                  onClick={() => handleRestore(s.filename)}
                  className="px-6 py-3 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                >
                  Deploy Restore
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {opLoading && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-md z-50 flex flex-col items-center justify-center">
            <Cpu className="animate-spin text-primary mb-6" size={64} />
            <h4 className="text-xl font-black text-foreground uppercase tracking-widest">Reconstructing Data Layer</h4>
            <p className="text-muted-foreground mt-2 animate-pulse uppercase tracking-[0.3em] text-[10px]">Do not close this window</p>
        </div>
      )}
    </div>
  );
};

export default AdminConfig;
