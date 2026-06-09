import React, { useState, useEffect, useCallback } from 'react';
import {
  Menu as MenuIcon, Plus, GripVertical, Trash2, Edit2, Save, X, 
  ChevronRight, ChevronDown, Globe, Link as LinkIcon, Info, Layout, 
  RefreshCw, Check, AlertCircle, Search, Smartphone, Monitor
} from 'lucide-react';
import { useStore } from '../../../store/useStore';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── Types ──

interface NavbarMenu {
  id: number;
  parent_id: number | null;
  label_id: string;
  label_en: string;
  url: string;
  icon: string;
  description_id: string;
  description_en: string;
  sort_order: number;
  is_active: number;
}

// ── Mini Icons Component ──
const getIcon = (iconName: string, size = 16) => {
  const icons: Record<string, any> = {
    Globe, Layout, Info, Link: LinkIcon, MessageSquare: Edit2, 
    Briefcase: GripVertical, Users2: Check, ShieldCheck: AlertCircle, 
    GraduationCap: Plus, ShoppingCart: Plus, Globe2: Globe, 
    Smartphone, Monitor, Zap: GripVertical
  };
  const IconComp = icons[iconName] || Globe;
  return <IconComp size={size} />;
};

// ── Sortable Item ──

function SortableItem({ menu, onEdit, onDelete, children, light }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: menu.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 1,
  };

  const cardBg = light ? 'bg-white border-slate-200' : 'bg-slate-900/50 border-slate-800';
  const textTitle = light ? 'text-slate-900' : 'text-white';
  const textMuted = light ? 'text-slate-500' : 'text-slate-400';

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <div className={`flex items-center gap-3 p-3 rounded-xl border ${cardBg} group transition-all`}>
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-primary p-1">
          <GripVertical size={18} />
        </div>
        
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${light ? 'bg-slate-100' : 'bg-slate-800'}`}>
          {getIcon(menu.icon)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`text-sm font-semibold truncate ${textTitle}`}>{menu.label_id}</h4>
            <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded border border-slate-700/30 uppercase">{menu.label_en}</span>
          </div>
          <p className={`text-[10px] truncate ${textMuted}`}>{menu.url}</p>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(menu)} className="p-1.5 hover:bg-primary/10 text-primary rounded-lg transition-colors">
            <Edit2 size={14} />
          </button>
          <button onClick={() => onDelete(menu.id)} className="p-1.5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {children && <div className="ml-10 border-l border-slate-800/50 pl-2 mt-1">{children}</div>}
    </div>
  );
}

// ── Main Component ──

const NavbarManager = () => {
  const { theme } = useStore();
  const L = theme === 'light';
  
  const [menus, setMenus] = useState<NavbarMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMenu, setEditingMenu] = useState<NavbarMenu | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const api = async (action: string, body?: any) => {
    const res = await fetch('/api.php', {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify({ action, ...body }) } : { body: JSON.stringify({ action }) }),
    });
    // For GET we need to handle it since current backend uses POST for everything usually
    // but the backend I just patched handles both.
    return res.json();
  };

  const fetchMenus = useCallback(async () => {
    setLoading(true);
    try {
      // Because current backend logic expects action in body even for GET often:
      const res = await fetch('/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_navbar_menus' })
      });
      const data = await res.json();
      setMenus(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMenus(); }, [fetchMenus]);

  const handleDragEnd = async (event: DragEndEvent, parentId: number | null) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const items = menus.filter(m => m.parent_id === parentId);
      const oldIndex = items.findIndex(m => m.id === active.id);
      const newIndex = items.findIndex(m => m.id === over.id);
      
      const newOrder = arrayMove(items, oldIndex, newIndex);
      
      // Update local state first
      const updatedMenus = [...menus];
      newOrder.forEach((item, idx) => {
        const found = updatedMenus.find(m => m.id === item.id);
        if (found) found.sort_order = idx;
      });
      setMenus(updatedMenus.sort((a, b) => a.sort_order - b.sort_order));

      // Save to backend
      try {
        await api('save_navbar_menus_order', { menus: updatedMenus.map(m => ({ id: m.id, sort_order: m.sort_order, parent_id: m.parent_id })) });
      } catch (err) { console.error(err); }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMenu) return;
    setIsSaving(true);
    try {
      const action = editingMenu.id === 0 ? 'add_navbar_menu' : 'edit_navbar_menu';
      await api(action, editingMenu);
      await fetchMenus();
      setIsModalOpen(false);
    } catch (err) { console.error(err); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus menu ini? Submenu juga akan terhapus.')) return;
    try {
      await api('delete_navbar_menu', { id });
      await fetchMenus();
    } catch (err) { console.error(err); }
  };

  const openAdd = (parentId: number | null = null) => {
    setEditingMenu({
      id: 0, parent_id: parentId, label_id: '', label_en: '',
      url: '#', icon: 'Globe', description_id: '', description_en: '',
      sort_order: menus.filter(m => m.parent_id === parentId).length, is_active: 1
    });
    setIsModalOpen(true);
  };

  const openEdit = (menu: NavbarMenu) => {
    setEditingMenu(menu);
    setIsModalOpen(true);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <RefreshCw className="w-8 h-8 text-primary animate-spin" />
    </div>
  );

  const mainMenus = menus.filter(m => m.parent_id === null).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-bold flex items-center gap-3 ${L ? 'text-slate-900' : 'text-white'}`}>
            <MenuIcon className="text-primary" size={24} /> Navbar Manager
          </h2>
          <p className={`text-xs mt-1 ${L ? 'text-slate-500' : 'text-slate-400'}`}>
            Atur urutan menu website dengan drag & drop.
          </p>
        </div>
        <button onClick={() => openAdd(null)} className="btn btn-primary flex items-center gap-2">
          <Plus size={18} /> Menu Baru
        </button>
      </div>

      <div className={`rounded-2xl border p-6 ${L ? 'bg-white border-slate-200' : 'bg-slate-900/30 border-slate-800'}`}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, null)}>
          <SortableContext items={mainMenus.map(m => m.id)} strategy={verticalListSortingStrategy}>
            {mainMenus.map(menu => {
              const children = menus.filter(m => m.parent_id === menu.id).sort((a, b) => a.sort_order - b.sort_order);
              return (
                <SortableItem key={menu.id} menu={menu} light={L} onEdit={openEdit} onDelete={handleDelete}>
                  <div className="space-y-2 mb-4">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, menu.id)}>
                      <SortableContext items={children.map(c => c.id)} strategy={verticalListSortingStrategy}>
                        {children.map(child => (
                          <SortableItem key={child.id} menu={child} light={L} onEdit={openEdit} onDelete={handleDelete} />
                        ))}
                      </SortableContext>
                    </DndContext>
                    <button onClick={() => openAdd(menu.id)} className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-dashed transition-colors ${
                      L ? 'border-slate-200 text-slate-500 hover:bg-slate-50' : 'border-slate-800 text-slate-500 hover:bg-slate-800/50'
                    }`}>
                      <Plus size={12} /> Tambah Submenu
                    </button>
                  </div>
                </SortableItem>
              );
            })}
          </SortableContext>
        </DndContext>
      </div>

      {/* ── Modal Form ── */}
      {isModalOpen && editingMenu && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className={`relative w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden ${L ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
            <div className={`p-6 border-b flex justify-between items-center ${L ? 'border-slate-100' : 'border-slate-800'}`}>
              <h3 className={`text-xl font-bold ${L ? 'text-slate-900' : 'text-white'}`}>
                {editingMenu.id === 0 ? 'Tambah Menu' : 'Edit Menu'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold ${L ? 'text-slate-600' : 'text-slate-400'}`}>Label (ID)</label>
                  <input type="text" required value={editingMenu.label_id} onChange={e => setEditingMenu({...editingMenu, label_id: e.target.value})}
                    className={`w-full px-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-primary/20 transition-all ${L ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/50 border-slate-700 text-white'}`} />
                </div>
                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold ${L ? 'text-slate-600' : 'text-slate-400'}`}>Label (EN)</label>
                  <input type="text" required value={editingMenu.label_en} onChange={e => setEditingMenu({...editingMenu, label_en: e.target.value})}
                    className={`w-full px-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-primary/20 transition-all ${L ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/50 border-slate-700 text-white'}`} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${L ? 'text-slate-600' : 'text-slate-400'}`}>URL / Hash</label>
                <div className="relative">
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                  <input type="text" required value={editingMenu.url} onChange={e => setEditingMenu({...editingMenu, url: e.target.value})}
                    className={`w-full pl-11 pr-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-primary/20 transition-all ${L ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/50 border-slate-700 text-white'}`} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${L ? 'text-slate-600' : 'text-slate-400'}`}>Icon (Lucide Name)</label>
                <input type="text" value={editingMenu.icon} onChange={e => setEditingMenu({...editingMenu, icon: e.target.value})}
                  className={`w-full px-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-primary/20 transition-all ${L ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/50 border-slate-700 text-white'}`} />
                <p className="text-[10px] text-slate-500">Ex: Globe, ShoppingCart, GraduationCap, Users2, ShieldCheck, HeartHandshake</p>
              </div>

              <div className="space-y-1.5">
                <label className={`text-xs font-semibold ${L ? 'text-slate-600' : 'text-slate-400'}`}>Description (Optional)</label>
                <textarea rows={2} value={editingMenu.description_id} onChange={e => setEditingMenu({...editingMenu, description_id: e.target.value})}
                  className={`w-full px-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-primary/20 transition-all ${L ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/50 border-slate-700 text-white'}`} />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className={`flex-1 px-6 py-3 rounded-2xl font-bold transition-all ${L ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}>
                  Batal
                </button>
                <button type="submit" disabled={isSaving} className="flex-[2] btn btn-primary py-3 rounded-2xl font-bold flex items-center justify-center gap-2">
                  {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                  Simpan Menu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NavbarManager;
