import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Key, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import BrandLogo from '../components/BrandLogo';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 items-center justify-center p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8">
           <BrandLogo size="sm" />
        </div>
        <div className="relative z-10 max-w-md text-center">
          <Key className="w-20 h-20 mx-auto mb-8 opacity-20" />
          <h1 className="text-4xl font-bold mb-6">Security First.</h1>
          <p className="text-blue-100 text-lg leading-relaxed">
            Standard operating procedure for credential recovery follows strict enterprise security protocols.
          </p>
        </div>
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse"></div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          {submitted ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Request Sent</h2>
              <p className="text-slate-500 mb-8 leading-relaxed">
                If an account exists for <span className="font-semibold text-slate-800">{email}</span>, you will receive a temporary password shortly.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-blue-600 font-bold hover:text-blue-700 transition-all underline underline-offset-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <Link to="/login" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors mb-6 font-medium">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </Link>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Reset Password</h2>
                <p className="text-slate-500">Enter your email for a temporary access key</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Work Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      autoFocus
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
                      placeholder="admin@globuzinc.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                  </div>
                </div>

                <button
                  disabled={loading}
                  type="submit"
                  className="w-full py-3.5 px-4 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? 'Processing...' : 'Send Recovery Key'}
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;
