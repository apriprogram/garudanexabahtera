import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, GripVertical, Trash2, Edit2, Save,
  Globe, Link as LinkIcon, Info, Layout,
  Check, AlertCircle, Smartphone, Monitor,
  type LucideIcon,
} from 'lucide-react';
import {
  Button,
  Field,
  IconBox,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  PageHeader,
  Panel,
  Spinner,
  Textarea,
} from '../../../components/admin/ui';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
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
  const icons: Record<string, LucideIcon> = {
    Globe, Layout, Info, Link: LinkIcon, MessageSquare: Edit2, 
    Briefcase: GripVertical, Users2: Check, ShieldCheck: AlertCircle, 
    GraduationCap: Plus, ShoppingCart: Plus, Globe2: Globe, 
    Smartphone, Monitor, Zap: GripVertical
  };
  const IconComp = icons[iconName] || Globe;
  return <IconComp size={size} />;
};

// ── Sortable Item ──

interface SortableItemProps {
  menu: NavbarMenu;
  onEdit: (menu: NavbarMenu) => void;
  onDelete: (id: number) => void;
  children?: React.ReactNode;
}

function SortableItem({ menu, onEdit, onDelete, children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: menu.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <div className="group flex items-center gap-2 rounded-xl bg-adm-surface p-2.5 ring-1 ring-inset ring-adm-line transition-colors duration-150 hover:ring-adm-line-strong sm:gap-3 sm:p-3">
        <div
          {...attributes}
          {...listeners}
          className="relative shrink-0 cursor-grab touch-none rounded-lg p-1 text-adm-subtle transition-colors hover:text-adm-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt active:cursor-grabbing max-sm:after:absolute max-sm:after:-inset-2"
        >
          <GripVertical className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
        </div>

        <IconBox icon={getIcon(menu.icon)} tone="ghost" size="sm" />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <h4 className="truncate text-sm font-semibold text-adm-fg">{menu.label_id}</h4>
          </div>
          <p className="truncate text-xs text-adm-muted">{menu.url}</p>
        </div>

        <div className="flex shrink-0 items-center gap-1 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
          <IconButton icon={<Edit2 />} label={`Edit ${menu.label_id}`} size="sm" onClick={() => onEdit(menu)} />
          <IconButton icon={<Trash2 />} label={`Hapus ${menu.label_id}`} size="sm" variant="danger-ghost" onClick={() => onDelete(menu.id)} />
        </div>
      </div>
      {children && <div className="ml-4 mt-2 border-l border-adm-line pl-3 sm:ml-10">{children}</div>}
    </div>
  );
}

// ── Main Component ──

const NavbarManager = () => {
  const [menus, setMenus] = useState<NavbarMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMenu, setEditingMenu] = useState<NavbarMenu | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const api = async (action: string, body?: object) => {
    // GET tidak boleh membawa body (fetch akan throw), jadi action dikirim lewat query string
    const res = body
      ? await fetch('/api.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ...body }),
        })
      : await fetch(`/api.php?action=${encodeURIComponent(action)}`);
    // For GET we need to handle it since current backend uses POST for everything usually
    // but the backend I just patched handles both.
    return res.json();
  };

  // setState di sini hanya terjadi setelah respons API
  const loadMenus = useCallback(async () => {
    try {
      // Because current backend logic expects action in body even for GET often:
      const res = await fetch('/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // include_inactive: menu nonaktif tetap tampil di sini agar bisa diaktifkan lagi (default API hanya menu aktif)
        body: JSON.stringify({ action: 'get_navbar_menus', include_inactive: true })
      });
      const data = await res.json();
      setMenus(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const fetchMenus = () => {
    setLoading(true);
    return loadMenus();
  };

  useEffect(() => {
    // loading=true sudah menjadi state awal; loadMenus baru memanggil setState setelah await,
    // tetapi aturan ini tidak membedakan fungsi async.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMenus();
  }, [loadMenus]);

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
      // Kolom label_en tetap ada di database (dipakai migrasi sebagai kunci): menu lama menyimpan nilainya,
      // menu baru memakai label Indonesia.
      await api(action, { ...editingMenu, label_en: editingMenu.label_en || editingMenu.label_id });
      await fetchMenus();
      setIsModalOpen(false);
    } catch (err) { console.error(err); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus menu ini? Submenu di dalamnya ikut terhapus.')) return;
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
    <div className="flex min-h-[400px] items-center justify-center" role="status">
      <Spinner size="lg" className="text-cobalt" />
    </div>
  );

  const mainMenus = menus.filter(m => m.parent_id === null).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="pb-10">
      <PageHeader
        title="Kelola navbar"
        description="Atur menu website kamu. Seret untuk mengubah urutan."
        actions={
          <Button icon={<Plus />} onClick={() => openAdd(null)}>
            Tambah menu
          </Button>
        }
      />

      <Panel padding="md">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, null)}>
          <SortableContext items={mainMenus.map(m => m.id)} strategy={verticalListSortingStrategy}>
            {mainMenus.map(menu => {
              const children = menus.filter(m => m.parent_id === menu.id).sort((a, b) => a.sort_order - b.sort_order);
              return (
                <SortableItem key={menu.id} menu={menu} onEdit={openEdit} onDelete={handleDelete}>
                  <div className="mb-3">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, menu.id)}>
                      <SortableContext items={children.map(c => c.id)} strategy={verticalListSortingStrategy}>
                        {children.map(child => (
                          <SortableItem key={child.id} menu={child} onEdit={openEdit} onDelete={handleDelete} />
                        ))}
                      </SortableContext>
                    </DndContext>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Plus />}
                      onClick={() => openAdd(menu.id)}
                      className="border border-dashed border-adm-line-strong hover:border-cobalt"
                    >
                      Tambah submenu
                    </Button>
                  </div>
                </SortableItem>
              );
            })}
          </SortableContext>
        </DndContext>
      </Panel>

      {/* ── Modal Form ── */}
      <Modal
        open={isModalOpen && !!editingMenu}
        onClose={() => setIsModalOpen(false)}
        title={editingMenu?.id === 0 ? 'Tambah menu' : 'Edit menu'}
        icon={<LinkIcon />}
        size="md"
        customBody
      >
        {editingMenu && (
          <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col">
            <ModalBody className="space-y-4">
              {/* Website publik hanya berbahasa Indonesia (design.md), jadi label EN tidak lagi diisi di sini */}
              <Field label="Label" htmlFor="navbar_label_id">
                <Input id="navbar_label_id" type="text" required value={editingMenu.label_id} onChange={e => setEditingMenu({...editingMenu, label_id: e.target.value})} />
              </Field>

              <Field label="URL / hash" htmlFor="navbar_url">
                <Input
                  id="navbar_url"
                  type="text"
                  required
                  leftIcon={<LinkIcon />}
                  autoCapitalize="none"
                  value={editingMenu.url}
                  onChange={e => setEditingMenu({...editingMenu, url: e.target.value})}
                />
              </Field>

              <Field
                label="Ikon (nama Lucide)"
                htmlFor="navbar_icon"
                hint="mis. Globe, ShoppingCart, GraduationCap, Users2, ShieldCheck, HeartHandshake"
              >
                <Input id="navbar_icon" type="text" value={editingMenu.icon} onChange={e => setEditingMenu({...editingMenu, icon: e.target.value})} />
              </Field>

              <Field label="Deskripsi" optional htmlFor="navbar_description">
                <Textarea
                  id="navbar_description"
                  rows={2}
                  className="min-h-[72px]"
                  value={editingMenu.description_id}
                  onChange={e => setEditingMenu({...editingMenu, description_id: e.target.value})}
                />
              </Field>
            </ModalBody>

            <ModalFooter>
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" loading={isSaving} icon={<Save />}>
                Simpan menu
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default NavbarManager;
