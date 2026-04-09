import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

interface NotificationCounts {
  approvals: number;
  fulfillment: number;
  total: number;
  breakdown: {
    submitted: number;
    approved: number;
    ordered: number;
    partial: number;
  };
}

interface NotificationContextType {
  counts: NotificationCounts;
  loading: boolean;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [counts, setCounts] = useState<NotificationCounts>({
    approvals: 0,
    fulfillment: 0,
    total: 0,
    breakdown: {
      submitted: 0,
      approved: 0,
      ordered: 0,
      partial: 0
    }
  });
  const [loading, setLoading] = useState(false);

  const fetchCounts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get('/procurement/notifications/count');
      setCounts(res.data.data);
    } catch (err) {
      console.error('Failed to fetch notification counts:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Public refresh method
  const refresh = async () => {
    await fetchCounts();
  };

  return (
    <NotificationContext.Provider value={{ counts, loading, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
