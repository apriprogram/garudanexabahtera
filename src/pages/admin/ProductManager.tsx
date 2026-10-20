import React from 'react';
import { Plus, Filter, Edit2, Trash2 } from 'lucide-react';
import { Badge, Button, IconButton, PageHeader, Panel, SearchInput, Select } from '../../components/admin/ui';

const ProductManager: React.FC = () => {
  const products = [
    { id: 1, name: 'Premium Website Pack', category: 'Web Dev', price: '$999', stock: 12, status: 'Active', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=200' },
    { id: 2, name: 'Mobile App Basic', category: 'App Dev', price: '$1,499', stock: 5, status: 'Active', image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=200' },
    { id: 3, name: 'Brand Identity Pro', category: 'Desain', price: '$499', stock: 24, status: 'Inactive', image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&q=80&w=200' },
    { id: 4, name: 'SEO Optimization', category: 'Pemasaran', price: '$299', stock: '∞', status: 'Active', image: 'https://images.unsplash.com/photo-1504868584819-f8e90526354c?auto=format&fit=crop&q=80&w=200' },
  ];

  return (
    <div className="pb-10">
      <PageHeader
        title="Kelola produk"
        description="Tambah, edit, atau hapus produk yang tampil di toko website kamu."
        actions={
          <Button icon={<Plus />}>
            Tambah produk
          </Button>
        }
      />

      {/* Filters & Search */}
      <Panel padding="sm" className="mb-4 flex flex-col gap-3 sm:mb-6 md:flex-row md:items-center md:justify-between">
        <SearchInput
          placeholder="Cari produk..."
          controlSize="sm"
          wrapperClassName="w-full md:w-96"
        />
        <div className="flex w-full items-center gap-3 md:w-auto">
          <Button variant="secondary" size="sm" icon={<Filter />} className="flex-1 max-sm:h-9 md:flex-none">
            Filter
          </Button>
          <Select controlSize="sm" wrapperClassName="flex-1 md:w-44 md:flex-none">
            <option>Semua kategori</option>
            <option>Web Dev</option>
            <option>App Dev</option>
            <option>Desain</option>
          </Select>
        </div>
      </Panel>

      {/* Products Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {products.map((product) => (
          <Panel
            key={product.id}
            padding="none"
            className="group flex flex-col overflow-hidden transition-colors duration-150 hover:ring-adm-line-strong"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-adm-ghost sm:aspect-square">
              <img src={product.image} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <div className="absolute right-3 top-3 flex flex-col gap-2 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                <IconButton icon={<Edit2 />} label={`Edit ${product.name}`} variant="secondary" size="sm" />
                <IconButton icon={<Trash2 />} label={`Hapus ${product.name}`} variant="secondary" size="sm" className="hover:bg-adm-danger-soft hover:text-adm-danger-fg" />
              </div>
              <div className="absolute bottom-3 left-3">
                <Badge tone={product.status === 'Active' ? 'mint' : 'danger'} className="bg-adm-surface">
                  {product.status === 'Active' ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </div>
            </div>
            <div className="flex flex-1 flex-col p-4 sm:p-5">
              <p className="mb-1 text-xs font-medium text-adm-cobalt-fg">{product.category}</p>
              <h3 className="mb-2 text-[14px] font-semibold tracking-[-0.01em] text-adm-fg sm:text-[15px]">{product.name}</h3>
              <div className="mt-auto flex items-center justify-between gap-3 border-t border-adm-line pt-4">
                <span className="text-lg font-semibold tabular-nums text-adm-fg">{product.price}</span>
                <span className="text-xs text-adm-muted">Stok: {product.stock}</span>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
};

export default ProductManager;
