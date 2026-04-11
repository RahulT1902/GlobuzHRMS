import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import InventoryList from './pages/InventoryList';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Vendors from './pages/Vendors';
import Procurement from './pages/Procurement';
import AdminConfig from './pages/AdminConfig';
import Reports from './pages/Reports';
import Debug from './pages/Debug';
import AuditLogs from './pages/AuditLogs';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/Layout';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <Routes>
              {/* ... existing routes ... */}
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              
              <Route 
                path="/inventory" 
                element={
                  <ProtectedRoute>
                    <Layout><InventoryList /></Layout>
                  </ProtectedRoute>
                } 
              />
  
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Layout><Dashboard /></Layout>
                  </ProtectedRoute>
                } 
              />
  
              <Route 
                path="/vendors" 
                element={
                  <ProtectedRoute>
                    <Layout><Vendors /></Layout>
                  </ProtectedRoute>
                } 
              />
  
              <Route 
                path="/procurement" 
                element={
                  <ProtectedRoute>
                    <Layout><Procurement /></Layout>
                  </ProtectedRoute>
                } 
              />
  
              <Route 
                path="/admin-config" 
                element={
                  <ProtectedRoute>
                    <Layout><AdminConfig /></Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/reports" 
                element={
                  <ProtectedRoute>
                    <Layout><Reports /></Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/debug" 
                element={
                  <ProtectedRoute>
                    <Layout><Debug /></Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/audit" 
                element={
                  <ProtectedRoute>
                    <Layout><AuditLogs /></Layout>
                  </ProtectedRoute>
                } 
              />
  
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="*" element={<Navigate to="/dashboard" />} />
            </Routes>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
