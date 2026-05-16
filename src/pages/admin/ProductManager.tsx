import React from 'react';
import { Plus, Search, Filter, Edit2, Trash2 } from 'lucide-react';

const ProductManager: React.FC = () => {
  const products = [
    { id: 1, name: 'Premium Website Pack', category: 'Web Dev', price: '$999', stock: 12, status: 'Active', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=200' },
    { id: 2, name: 'Mobile App Basic', category: 'App Dev', price: '$1,499', stock: 5, status: 'Active', image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=200' },
    { id: 3, name: 'Brand Identity Pro', category: 'Design', price: '$499', stock: 24, status: 'Inactive', image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&q=80&w=200' },
    { id: 4, name: 'SEO Optimization', category: 'Marketing', price: '$299', stock: '∞', status: 'Active', image: 'https://images.unsplash.com/photo-1504868584819-f8e90526354c?auto=format&fit=crop&q=80&w=200' },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Product Manager</h1>
          <p className="text-slate-400 text-sm mt-1">Add, edit, or remove products from your front-end store.</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-600/20">
          <Plus className="w-5 h-5" />
          Add New Product
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#0D0D0D] border border-white/5 p-4 rounded-2xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search products..." 
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-2.5 text-sm text-white outline-none focus:border-blue-500/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-slate-400 hover:text-white transition-all">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <select className="flex-1 md:flex-none bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-400 outline-none hover:text-white transition-all appearance-none cursor-pointer">
            <option>All Categories</option>
            <option>Web Dev</option>
            <option>App Dev</option>
            <option>Design</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <div key={product.id} className="bg-[#0D0D0D] border border-white/5 rounded-3xl overflow-hidden group hover:border-blue-500/30 transition-all flex flex-col">
            <div className="aspect-square relative overflow-hidden">
              <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 bg-black/60 backdrop-blur-md rounded-lg text-white hover:bg-blue-600 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button className="p-2 bg-black/60 backdrop-blur-md rounded-lg text-white hover:bg-red-600 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute bottom-4 left-4">
                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${product.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {product.status}
                </span>
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">{product.category}</p>
              <h3 className="text-white font-semibold mb-2 group-hover:text-blue-400 transition-colors">{product.name}</h3>
              <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/5">
                <span className="text-lg font-bold text-white">{product.price}</span>
                <span className="text-xs text-slate-500">Stock: {product.stock}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductManager;
