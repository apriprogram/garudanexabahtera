import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import ProductsMonitor from './ProductsMonitor';
import ProductDetail from './ProductDetail';

const static_products = [
  {
    id: 'ischool',
    db_id: 2,
    name: 'i-School',
    url: 'https://ischool.my.id',
    description: 'Sistem manajemen sekolah - absensi, raport, jadwal, pembayaran SPP',
    logo: '/assets/logo/ischool.png',
  },
  {
    id: 'isantri',
    db_id: 4,
    name: 'i-Santri',
    url: 'https://isantri.azzr.biz.id',
    description: 'Sistem manajemen pondok pesantren - santri, hafalan, kegiatan',
    logo: '/assets/logo/isantri.png',
  },
  {
    id: 'digital-invitation',
    db_id: 6,
    name: 'Digital Invitation',
    url: 'https://digitalinvitation.azzr.biz.id',
    description: 'Undangan pernikahan & acara digital dengan Qris amplop',
    logo: '/assets/logo/digital-invitation.png',
  },
  {
    id: 'website-desa',
    db_id: 7,
    name: 'Website Desa',
    url: 'https://websitedesa.azzr.biz.id',
    description: 'Portal informasi desa - profil, berita, layanan masyarakat',
    logo: '/assets/logo/website-desa.png',
  },
  {
    id: 'garuda-nexa',
    db_id: 5,
    name: 'Garuda Nexa',
    url: '/',
    description: 'Website utama Garuda Nexa - company profile & portofolio',
    logo: '/assets/logo/logognbputih.png',
  },
];

const ProductsIndex: React.FC = () => {
  const { productId } = useParams<{ productId?: string }>();
  const [products, setProducts] = useState(static_products);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api.php?action=get_products');
      const dbProducts = await res.json();
      const merged = static_products.map(p => {
        const dbP = dbProducts.find((dbp: any) => dbp.id === p.db_id);
        return dbP ? { ...p, logo: dbP.logo || p.logo } : p;
      });
      setProducts(merged);
    } catch (err) {
      console.error('Failed to fetch products');
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const product = productId ? products.find(p => p.id === productId) : undefined;

  if (productId && product) {
    return <ProductDetail product={product} />;
  }

  return <ProductsMonitor />;
};

export default ProductsIndex;
