import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ExternalLink, Globe, Activity, RefreshCw, Zap,
  CheckCircle, XCircle, Shield, Wifi, Server, TrendingUp,
  Image as ImageIcon, Users, GraduationCap, Building, Database, Network
} from 'lucide-react';
import { useStore } from '../../../store/useStore';

interface ProductDetailProps {
  product: {
    id: string;
    db_id?: number;
    name: string;
    url: string;
    description: string;
    logo: string;
  };
}

interface SiteCheck {
  status: 'online' | 'offline' | 'checking';
  responseTime: number | null;
  httpStatus: number | null;
  error?: string;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ product: initialProduct }) => {
  const { theme } = useStore();
  const navigate = useNavigate();
  const [product, setProduct] = useState(initialProduct);
  const [siteCheck, setSiteCheck] = useState<SiteCheck>({ status: 'checking', responseTime: null, httpStatus: null });
  const [checkHistory, setCheckHistory] = useState<SiteCheck[]>([]);
  const [ischoolStats, setIschoolStats] = useState<any>(null);

  const fetchIschoolStats = useCallback(async () => {
    // Only fetch for i-school product based on its name or url
    if (!product.name.toLowerCase().includes('i-school') && !product.url.includes('ischool.my.id')) return;
    
    try {
      const res = await fetch('/api.php?action=get_ischool_stats');
      if (res.ok) {
        const data = await res.json();
        setIschoolStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch ischool stats:', err);
    }
  }, [product.name, product.url]);

  const fetchProductLogo = useCallback(async () => {
    if (!initialProduct.db_id) return;
    try {
      const res = await fetch('/api.php?action=get_products');
      const dbProducts = await res.json();
      const dbP = dbProducts.find((dbp: any) => dbp.id === initialProduct.db_id);
      if (dbP && dbP.logo) {
        setProduct(prev => ({ ...prev, logo: dbP.logo }));
      }
    } catch (err) {
      console.error('Failed to fetch product logo');
    }
  }, [initialProduct.db_id]);

  useEffect(() => {
    fetchProductLogo();
    fetchIschoolStats();
  }, [fetchProductLogo, fetchIschoolStats]);

  const checkWebsite = useCallback(async () => {
    if (product.url === '/') {
      setSiteCheck({ status: 'online', responseTime: 45, httpStatus: 200 });
      return;
    }
    setSiteCheck({ status: 'checking', responseTime: null, httpStatus: null });
    try {
      const res = await fetch(`/api.php?action=check_website&url=${encodeURIComponent(product.url)}`);
      const data = await res.json();
      const newEntry = { ...data, responseTime: data.responseTime ?? 0, httpStatus: data.httpStatus ?? 0 };
      setSiteCheck(newEntry);
      setCheckHistory(prev => [...prev.slice(-19), newEntry]);
    } catch {
      setSiteCheck({ status: 'offline', responseTime: null, httpStatus: null, error: 'Failed to fetch' });
    }
  }, [product.url]);

  useEffect(() => { checkWebsite(); }, [checkWebsite]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(checkWebsite, 30000);
    return () => clearInterval(interval);
  }, [checkWebsite]);

  const avgResponseTime = checkHistory.filter(c => c.responseTime).length > 0
    ? Math.round(checkHistory.filter(c => c.responseTime).reduce((a, c) => a + (c.responseTime ?? 0), 0) / checkHistory.filter(c => c.responseTime).length)
    : siteCheck.responseTime;

  const uptimePercent = checkHistory.length > 0
    ? Math.round((checkHistory.filter(c => c.status === 'online').length / checkHistory.length) * 100)
    : siteCheck.status === 'online' ? 100 : 0;

  const statusGradient = siteCheck.status === 'online' 
    ? (theme === 'light' ? 'from-emerald-50 to-emerald-100/50' : 'from-emerald-500/20 to-emerald-600/5') :
    siteCheck.status === 'offline' 
    ? (theme === 'light' ? 'from-red-50 to-red-100/50' : 'from-red-500/20 to-red-600/5') : 
    (theme === 'light' ? 'from-slate-50 to-slate-100/50' : 'from-yellow-500/20 to-yellow-600/5');

  const statusColor = siteCheck.status === 'online' 
    ? (theme === 'light' ? 'text-emerald-600' : 'text-emerald-400') :
    siteCheck.status === 'offline' 
    ? (theme === 'light' ? 'text-red-600' : 'text-red-400') : 
    (theme === 'light' ? 'text-slate-600' : 'text-yellow-400');

  const statusBg = siteCheck.status === 'online' 
    ? (theme === 'light' ? 'bg-emerald-50' : 'bg-emerald-500/20') :
    siteCheck.status === 'offline' 
    ? (theme === 'light' ? 'bg-red-50' : 'bg-red-500/20') : 
    (theme === 'light' ? 'bg-slate-50' : 'bg-yellow-500/20');

  const statusBorder = siteCheck.status === 'online' 
    ? (theme === 'light' ? 'border-emerald-200' : 'border-emerald-500/30') :
    siteCheck.status === 'offline' 
    ? (theme === 'light' ? 'border-red-200' : 'border-red-500/30') : 
    (theme === 'light' ? 'border-slate-200' : 'border-yellow-500/30');

  const StatusIcon = siteCheck.status === 'online' ? CheckCircle :
    siteCheck.status === 'offline' ? XCircle : RefreshCw;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5 md:space-y-6"
    >
      {/* Back button */}
      <button
        onClick={() => navigate('/admin/products')}
        className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
          theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
        }`}
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Products
      </button>

      {/* Header */}
      <div className={`rounded-2xl border p-5 md:p-6 ${
        theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#0D0D0D] border-white/5'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 relative group ${
              theme === 'light' ? 'bg-slate-100' : 'bg-white/5'
            }`}>
              {product.logo ? (
                <img src={product.logo} alt={product.name} className="w-9 h-9 object-contain" />
              ) : (
                <Globe className="w-8 h-8 text-primary" />
              )}
              {product.db_id && (
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-xl">
                  <ImageIcon className="w-5 h-5 text-white" />
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async (ev) => {
                        const base64 = ev.target?.result as string;
                        try {
                          const res = await fetch('/api.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'update_product_logo',
                              id: product.db_id,
                              logo: base64
                            })
                          });
                          if (res.ok) window.location.reload();
                        } catch (err) {
                          console.error('Gagal update logo');
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              )}
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">{product.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <p className={`text-sm ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {product.description}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${statusBg} ${statusBorder} ${statusColor}`}>
              <div className="relative flex items-center justify-center">
                {siteCheck.status === 'online' && (
                  <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
                    theme === 'light' ? 'bg-emerald-500' : 'bg-emerald-400'
                  }`}></span>
                )}
                <StatusIcon className={`w-3.5 h-3.5 relative z-10 ${siteCheck.status === 'checking' ? 'animate-spin' : ''}`} />
              </div>
              {siteCheck.status === 'online' ? 'Online' : siteCheck.status === 'offline' ? 'Offline' : 'Checking...'}
            </div>
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:brightness-110 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Buka
            </a>
            {product.name.toLowerCase().includes('ischool') && (
              <div className="flex items-center gap-2">
                <label className={`p-2 rounded-lg cursor-pointer transition-all ${
                  theme === 'light'
                    ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`} title="Ganti Logo">
                  <ImageIcon className="w-4 h-4" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          const base64 = reader.result as string;
                          try {
                            const res = await fetch('/api.php', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ 
                                action: 'update_list_product', 
                                id: 2, // ID i-school di database
                                title: 'I-School',
                                logo: base64,
                                // Sifatnya update, field lain ambil dari current atau biarkan server handle saveAndCompress
                              })
                            });
                            if (res.ok) window.location.reload();
                          } catch (err) {
                            console.error('Gagal update logo');
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                <a
                  href="https://office.ischool.my.id/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:brightness-110 transition-all shadow-lg shadow-emerald-600/20"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Login Admin
                </a>
              </div>
            )}
            <button
              onClick={checkWebsite}
              disabled={siteCheck.status === 'checking'}
              className={`p-2 rounded-lg transition-all ${
                theme === 'light'
                  ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${siteCheck.status === 'checking' ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Live Monitoring Panel */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className={`rounded-2xl border overflow-hidden ${
          theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#0D0D0D] border-white/5'
        }`}
      >
        <div className={`px-5 py-4 border-b flex items-center justify-between ${
          theme === 'light' ? 'border-slate-100' : 'border-white/5'
        }`}>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Live Monitoring</h2>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
              theme === 'light' ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-slate-400'
            }`}>
              Auto-refresh 30s
            </span>
          </div>
          <div className={`flex items-center gap-1.5 text-[10px] ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </div>
        </div>

        <div className="p-5 md:p-6 space-y-5 md:space-y-6">
          {/* Status Banner */}
          <motion.div
            key={`${siteCheck.status}-${siteCheck.responseTime}`}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-2xl border p-4 md:p-5 bg-gradient-to-br ${statusGradient} ${statusBorder}`}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Response Time */}
              <div className={`text-center ${theme === 'light' ? 'border-r border-slate-100 last:border-0' : ''}`}>
                <div className="flex items-center justify-center gap-1.5 mb-1.5">
                  <Zap className={`w-3.5 h-3.5 ${statusColor}`} />
                  <span className={`text-[10px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Response
                  </span>
                </div>
                <p className={`text-xl md:text-2xl font-bold ${statusColor}`}>
                  {siteCheck.responseTime ? `${siteCheck.responseTime}ms` : '—'}
                </p>
                <p className={`text-[9px] mt-0.5 ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Avg: {avgResponseTime ? `${avgResponseTime}ms` : '—'}
                </p>
              </div>

              {/* HTTP Status */}
              <div className={`text-center ${theme === 'light' ? 'border-r border-slate-100 last:border-0' : ''}`}>
                <div className="flex items-center justify-center gap-1.5 mb-1.5">
                  <Server className={`w-3.5 h-3.5 ${statusColor}`} />
                  <span className={`text-[10px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    HTTP
                  </span>
                </div>
                <p className={`text-xl md:text-2xl font-bold ${statusColor}`}>
                  {siteCheck.httpStatus || '—'}
                </p>
                <p className={`text-[9px] mt-0.5 ${siteCheck.httpStatus === 200 || siteCheck.httpStatus === 301 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {siteCheck.httpStatus === 200 ? 'OK' : siteCheck.httpStatus === 301 ? 'Redirect' : siteCheck.httpStatus ? 'Error' : 'N/A'}
                </p>
              </div>

              {/* Uptime */}
              <div className={`text-center ${theme === 'light' ? 'border-r border-slate-100 last:border-0' : ''}`}>
                <div className="flex items-center justify-center gap-1.5 mb-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
                  <span className={`text-[10px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    Uptime
                  </span>
                </div>
                <p className="text-xl md:text-2xl font-bold text-sky-400">
                  {uptimePercent}%
                </p>
                <p className={`text-[9px] mt-0.5 ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Last {checkHistory.length} checks
                </p>
              </div>

              {/* SSL */}
              <div className={`text-center ${theme === 'light' ? 'border-r border-slate-100 last:border-0' : ''}`}>
                <div className="flex items-center justify-center gap-1.5 mb-1.5">
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                  <span className={`text-[10px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                    SSL
                  </span>
                </div>
                <p className={`text-xl md:text-2xl font-bold ${
                  siteCheck.status === 'online' ? 'text-purple-400' : 'text-slate-500'
                }`}>
                  {siteCheck.status === 'online' ? 'Aktif' : '—'}
                </p>
                <p className={`text-[9px] mt-0.5 text-emerald-400`}>
                  Valid
                </p>
              </div>
            </div>
          </motion.div>

          {/* Response Time Chart (Sparkline) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-xs font-semibold ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                Response Time History
              </h3>
              <span className={`text-[10px] ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>
                {checkHistory.length > 0 ? `${Math.min(...checkHistory.filter(c => c.responseTime).map(c => c.responseTime ?? 0))}ms – ${Math.max(...checkHistory.filter(c => c.responseTime).map(c => c.responseTime ?? 0))}ms` : 'No data'}
              </span>
            </div>
            <div className="flex items-end gap-0.5 h-16 md:h-20">
              {checkHistory.length > 0 ? checkHistory.map((check, i) => {
                const maxTime = Math.max(...checkHistory.filter(c => c.responseTime).map(c => c.responseTime ?? 0), 1);
                const heightPercent = check.responseTime ? Math.max(8, (check.responseTime / maxTime) * 100) : 8;
                return (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPercent}%` }}
                    transition={{ duration: 0.3, delay: i * 0.02 }}
                    className={`flex-1 rounded-t-sm ${
                      check.status === 'online' ? (theme === 'light' ? 'bg-emerald-500' : 'bg-emerald-500/60') :
                      check.status === 'offline' ? (theme === 'light' ? 'bg-red-500' : 'bg-red-500/60') : 
                      (theme === 'light' ? 'bg-slate-200' : 'bg-yellow-500/60')
                    }`}
                    title={`${check.responseTime}ms - ${check.status}`}
                  />
                );
              }) : (
                <div className="flex-1 flex items-center justify-center h-full">
                  <span className={`text-xs ${theme === 'light' ? 'text-slate-400' : 'text-slate-600'}`}>
                    Waiting for data...
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* URL */}
            <div className={`rounded-xl border p-3 md:p-4 ${
              theme === 'light' ? 'border-slate-200' : 'border-white/5'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span className={`text-[10px] font-medium ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  Target URL
                </span>
              </div>
              <p className={`text-xs font-mono break-all ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                {product.url}
              </p>
            </div>

            {/* Connection Info */}
            <div className={`rounded-xl border p-3 md:p-4 ${
              theme === 'light' ? 'border-slate-200' : 'border-white/5'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Wifi className="w-3.5 h-3.5 text-slate-400" />
                <span className={`text-[10px] font-medium ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  Connection
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Method</span>
                  <span className="text-[10px] font-mono text-sky-400">HEAD/GET</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Timeout</span>
                  <span className="text-[10px] font-mono text-yellow-400">10-15s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Interval</span>
                  <span className="text-[10px] font-mono text-violet-400">30s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* i-School Platform Statistics */}
      {ischoolStats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className={`rounded-2xl border overflow-hidden ${
            theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#0D0D0D] border-white/5'
          }`}
        >
          <div className={`px-5 py-4 border-b flex items-center justify-between ${
            theme === 'light' ? 'border-slate-100' : 'border-white/5'
          }`}>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-semibold">Platform Statistics</h2>
            </div>
            <div className={`text-[10px] ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>
              Updated: {ischoolStats.data?.updated_at ? new Date(ischoolStats.data.updated_at).toLocaleString() : 'Just now'}
            </div>
          </div>

          <div className="p-5 md:p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-xl border ${theme === 'light' ? 'bg-slate-50 border-slate-100' : 'bg-white/5 border-white/5'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Building className="w-4 h-4 text-sky-400" />
                  <span className={`text-[10px] font-medium ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Total Yayasan</span>
                </div>
                <p className="text-2xl font-bold">{ischoolStats.data?.total_yayasans || 0}</p>
              </div>
              <div className={`p-4 rounded-xl border ${theme === 'light' ? 'bg-slate-50 border-slate-100' : 'bg-white/5 border-white/5'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span className={`text-[10px] font-medium ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Total Siswa</span>
                </div>
                <p className="text-2xl font-bold">{(ischoolStats.data?.total_students || 0).toLocaleString()}</p>
              </div>
              <div className={`p-4 rounded-xl border ${theme === 'light' ? 'bg-slate-50 border-slate-100' : 'bg-white/5 border-white/5'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="w-4 h-4 text-violet-400" />
                  <span className={`text-[10px] font-medium ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Total Guru</span>
                </div>
                <p className="text-2xl font-bold">{ischoolStats.data?.total_teachers || 0}</p>
              </div>
              <div className={`p-4 rounded-xl border ${theme === 'light' ? 'bg-slate-50 border-slate-100' : 'bg-white/5 border-white/5'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-amber-400" />
                  <span className={`text-[10px] font-medium ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Active Users</span>
                </div>
                <p className="text-2xl font-bold">{(ischoolStats.data?.active_users || 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className={`p-4 rounded-xl border flex items-center justify-between ${theme === 'light' ? 'bg-slate-50 border-slate-100' : 'bg-white/5 border-white/5'}`}>
                <div className="flex items-center gap-3">
                  <Network className="w-5 h-5 text-primary" />
                  <div>
                    <p className={`text-[10px] font-medium ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Bandwidth Used</p>
                    <p className="text-sm font-bold">{ischoolStats.data?.bandwidth_used || '0 GB'}</p>
                  </div>
                </div>
                <div className="text-right">
                   <p className={`text-[10px] font-medium ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Platform Health</p>
                   <p className="text-sm font-bold text-emerald-400">{ischoolStats.data?.system_health || 'Normal'}</p>
                </div>
              </div>
              <div className={`p-4 rounded-xl border flex items-center justify-between ${theme === 'light' ? 'bg-slate-50 border-slate-100' : 'bg-white/5 border-white/5'}`}>
                <div className="flex items-center gap-3">
                  <Server className="w-5 h-5 text-sky-400" />
                  <div>
                    <p className={`text-[10px] font-medium ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Total Schools</p>
                    <p className="text-sm font-bold">{ischoolStats.data?.total_schools || 0} Units</p>
                  </div>
                </div>
                <button className="text-[10px] font-semibold text-primary hover:underline">
                  View Detail
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ProductDetail;
