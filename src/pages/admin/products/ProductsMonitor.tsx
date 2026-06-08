import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../../store/useStore';
import { ExternalLink, Activity, Globe, Server, ArrowUpRight, GraduationCap, BookOpen, Mail, Building, Camera } from 'lucide-react';

interface Product {
  id: string;
  db_id?: number;
  name: string;
  url: string;
  description: string;
  logo: string;
  status: 'online' | 'offline' | 'checking';
  icon: React.ReactNode;
}

const products: Product[] = [
  {
    id: 'ischool',
    db_id: 2,
    name: 'i-School',
    url: 'https://ischool.my.id',
    description: 'Sistem manajemen sekolah - absensi, raport, jadwal, pembayaran SPP',
    logo: '/assets/logo/ischool.png',
    status: 'checking',
    icon: <GraduationCap className="w-7 h-7" />,
  },
  {
    id: 'isantri',
    db_id: 4,
    name: 'i-Santri',
    url: 'https://isantri.azzr.biz.id',
    description: 'Sistem manajemen pondok pesantren - santri, hafalan, kegiatan',
    logo: '/assets/logo/isantri.png',
    status: 'checking',
    icon: <BookOpen className="w-7 h-7" />,
  },
  {
    id: 'digital-invitation',
    db_id: 6,
    name: 'Digital Invitation',
    url: 'https://digitalinvitation.azzr.biz.id',
    description: 'Undangan pernikahan & acara digital dengan Qris amplop',
    logo: '/assets/logo/digital-invitation.png',
    status: 'checking',
    icon: <Mail className="w-7 h-7" />,
  },
  {
    id: 'website-desa',
    db_id: 7,
    name: 'Website Desa',
    url: 'https://websitedesa.azzr.biz.id',
    description: 'Portal informasi desa - profil, berita, layanan masyarakat',
    logo: '/assets/logo/website-desa.png',
    status: 'checking',
    icon: <Building className="w-7 h-7" />,
  },
  {
    id: 'garuda-nexa',
    db_id: 5,
    name: 'Garuda Nexa',
    url: '/',
    description: 'Website utama Garuda Nexa - company profile & portofolio',
    logo: '/assets/logo/logognbputih.png',
    status: 'online',
    icon: <Globe className="w-7 h-7" />,
  },
];

const ProductsMonitor: React.FC = () => {
  const { theme } = useStore();
  const navigate = useNavigate();
  const [productStatuses, setProductStatuses] = useState<Product[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api.php?action=get_products');
      const dbProducts = await res.json();
      
      const merged = products.map(p => {
        const dbP = dbProducts.find((dbp: any) => dbp.id === p.db_id);
        return dbP ? { ...p, logo: dbP.logo || p.logo } : p;
      });
      
      setProductStatuses(merged);

      // Check status after fetching
      const updated = await Promise.all(
        merged.map(async (p) => {
          if (p.url === '/') return { ...p, status: 'online' as const };
          try {
            const res = await fetch(`/api.php?action=check_website&url=${encodeURIComponent(p.url)}`);
            const data = await res.json();
            return { ...p, status: data.status === 'online' ? 'online' as const : 'offline' as const };
          } catch {
            return { ...p, status: 'offline' as const };
          }
        })
      );
      setProductStatuses(updated);
    } catch (err) {
      setProductStatuses(products);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleUpdateLogo = async (productId: string, dbId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optional: client side validation
    if (file.size > 5 * 1024 * 1024) {
      alert('Gagal: Ukuran file terlalu besar (Maks 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        const res = await fetch('/api.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_product_logo',
            id: dbId,
            logo: base64
          })
        });
        
        const result = await res.json();
        
        if (res.ok && result.success) {
          alert('Berhasil: Logo ' + productId + ' telah diperbarui!');
          window.location.reload();
        } else {
          // Tampilkan pesan error spesifik dari server
          alert('Gagal Update: ' + (result.error || 'Terjadi kesalahan pada server'));
        }
      } catch (err) {
        alert('Gagal Koneksi: Tidak dapat terhubung ke server API');
        console.error('Upload Error:', err);
      }
    };
    reader.onerror = () => {
      alert('Gagal: Tidak dapat membaca file');
    };
    reader.readAsDataURL(file);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const onlineCount = productStatuses.filter(p => p.status === 'online').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Products Monitoring</h1>
          <p className={`text-xs md:text-sm mt-1 ${theme === 'light' ? 'text-slate-700' : 'text-slate-400'}`}>
            Pantau status semua website Anda — {formatTime(currentTime)}
          </p>
        </div>
        <div className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-sm ${
          theme === 'light' ? 'bg-green-50 text-green-700' : 'bg-green-500/10 text-green-400'
        }`}>
          <Activity className="w-4 h-4" />
          <span className="font-medium">{onlineCount}/{productStatuses.length} Online</span>
        </div>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
        {productStatuses.map((product, idx) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06, duration: 0.3 }}
            className={`
              relative rounded-2xl border overflow-hidden cursor-pointer group
              transition-all duration-300 hover:-translate-y-1
              ${theme === 'light'
                ? 'bg-white border-slate-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5'
                : 'bg-[#0D0D0D] border-white/5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5'
              }
            `}
            onClick={() => navigate(product.id)}
          >
            {/* Top accent bar */}
            <div className={`h-1 w-full ${
              product.status === 'online' ? 'bg-green-500' :
              product.status === 'offline' ? 'bg-red-500' :
              'bg-yellow-500 animate-pulse'
            }`} />

            <div className="p-4 md:p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      theme === 'light'
                        ? 'bg-slate-100 text-slate-700 relative group/logo'
                        : 'bg-white/5 text-slate-300 relative group/logo'
                    }`}>
                      {product.logo ? (
                        <img src={product.logo} alt={product.name} className="w-7 h-7 object-contain" />
                      ) : (
                        product.icon
                      )}
                      {product.db_id && (
                        <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/logo:opacity-100 transition-opacity cursor-pointer rounded-xl">
                          <Camera className="w-5 h-5 text-white" />
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleUpdateLogo(product.id, product.db_id!, e)}
                          />
                        </label>
                      )}
                    </div>
                  <div>
                    <h3 className="text-sm md:text-base font-semibold">{product.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="relative flex items-center justify-center">
                        {product.status === 'online' && (
                          <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping"></span>
                        )}
                        <div className={`w-2 h-2 rounded-full relative z-10 ${
                          product.status === 'online' ? 'bg-green-500' :
                          product.status === 'offline' ? 'bg-red-500' :
                          'bg-yellow-500 animate-pulse'
                        }`} />
                      </div>
                      <span className={`text-[10px] md:text-xs font-medium ${
                        product.status === 'online' ? 'text-green-500' :
                        product.status === 'offline' ? 'text-red-500' :
                        'text-yellow-500'
                      }`}>
                        {product.status === 'online' ? 'Online' :
                         product.status === 'offline' ? 'Offline' :
                         'Checking...'}
                      </span>
                    </div>
                  </div>
                </div>
                <ArrowUpRight className={`w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ${
                  theme === 'light' ? 'text-primary' : 'text-primary'
                }`} />
              </div>

              <p className={`text-xs md:text-sm line-clamp-2 ${
                theme === 'light' ? 'text-slate-700' : 'text-slate-400'
              }`}>
                {product.description}
              </p>

              <div className={`flex items-center gap-2 mt-3 pt-3 border-t ${
                theme === 'light' ? 'border-slate-200' : 'border-white/5'
              }`}>
                <Globe className={`w-3 h-3 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`} />
                <span className={`text-[10px] md:text-xs truncate ${theme === 'light' ? 'text-slate-600' : 'text-slate-500'}`}>{product.url}</span>
              </div>
            </div>

            {/* Open button overlay */}
            <div className={`
              absolute inset-x-0 bottom-0 h-12 flex items-center justify-center gap-2
              bg-gradient-to-t from-black/60 to-transparent
              opacity-0 group-hover:opacity-100 transition-opacity duration-200
              ${product.status === 'online' ? '' : 'hidden'}
            `}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(product.url, '_blank');
                }}
                className="text-xs font-semibold text-white bg-primary/80 hover:bg-primary px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors backdrop-blur-sm"
              >
                <ExternalLink className="w-3 h-3" />
                Buka Website
              </button>
            </div>
          </motion.div>
        ))}

        {/* Coming Soon Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36, duration: 0.3 }}
          className={`relative rounded-2xl border border-dashed overflow-hidden flex items-center justify-center p-8 ${
            theme === 'light' ? 'border-slate-300 bg-slate-50' : 'border-white/10 bg-white/[0.02]'
          }`}
        >
          <div className="text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
              theme === 'light' ? 'bg-slate-200 text-slate-400' : 'bg-white/5 text-slate-500'
            }`}>
              <Server className="w-6 h-6" />
            </div>
            <p className={`text-sm font-medium ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
              Tambah Website Baru
            </p>
            <p className={`text-xs mt-1 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
              Hubungi developer untuk menambahkan
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProductsMonitor;
