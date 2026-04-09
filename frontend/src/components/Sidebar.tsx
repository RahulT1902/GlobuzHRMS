import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  Settings, 
  LogOut,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { PERMISSIONS } from '../constants/permissions';

const Sidebar: React.FC = () => {
  const { logout, user, hasPermission } = useAuth();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', permission: null }, // Dashboard usually public
    { icon: Package, label: 'Inventory', path: '/inventory', permission: PERMISSIONS.INVENTORY_VIEW },
    { icon: Users, label: 'Vendors', path: '/vendors', permission: PERMISSIONS.VENDOR_VIEW },
    { icon: ShoppingCart, label: 'Procurement', path: '/procurement', permission: PERMISSIONS.PROCUREMENT_VIEW },
  ];

  const adminItems = [
    { icon: Settings, label: 'Admin Config', path: '/admin-config', permission: PERMISSIONS.ADMIN_CONFIG },
    { icon: Activity, label: 'System Health', path: '/debug', permission: PERMISSIONS.SYSTEM_HEALTH },
    { icon: ShieldCheck, label: 'Audit Logs', path: '/audit', permission: PERMISSIONS.AUDIT_VIEW },
  ];

  const { counts } = useNotifications();
  const filteredMenuItems = menuItems.filter(item => !item.permission || hasPermission(item.permission));
  const filteredAdminItems = adminItems.filter(item => !item.permission || hasPermission(item.permission));

  return (
    <aside className="w-64 bg-card text-muted-foreground h-screen sticky top-0 flex flex-col border-r border-border">
      <div className="p-6 border-b border-border">
        <h1 className="text-2xl font-bold text-foreground tracking-tight italic">
          Globuzinc
        </h1>
        <p className="text-muted-foreground/60 mt-1 uppercase tracking-widest font-semibold text-[10px]">ERP Procurement Engine</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 text-muted-foreground">
        <p className="px-2 pb-2 text-xs font-semibold text-muted-foreground/40 uppercase tracking-wider">Main Menu</p>
        {filteredMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive 
                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(37,99,235,0.05)]' 
                    : 'hover:bg-muted hover:text-foreground'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium text-sm flex-1">{item.label}</span>
            {item.label === 'Procurement' && counts.total > 0 && (
              <span className="bg-primary text-[10px] font-black text-white px-2 py-0.5 rounded-full shadow-sm animate-in fade-in zoom-in duration-500">
                {counts.total > 99 ? '99+' : counts.total}
              </span>
            )}
          </NavLink>
        ))}

        {filteredAdminItems.length > 0 && (
          <div className="pt-8 space-y-1">
            <p className="px-2 pb-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">Administration</p>
            {filteredAdminItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                    isActive 
                      ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(147,51,234,0.05)]' 
                      : 'hover:bg-muted hover:text-foreground'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        <div className="flex items-center space-x-3 px-3 py-3 mb-4 bg-muted/30 rounded-xl border border-border">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold shadow-lg uppercase">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
            <p className="text-[10px] text-muted-foreground/60 truncate uppercase mt-0.5">{user?.roles?.join(', ')}</p>
          </div>
        </div>
        
        <button
          onClick={logout}
          className="flex items-center space-x-3 px-3 py-2.5 w-full rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-all duration-200 group"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
