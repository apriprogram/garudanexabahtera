import React, { useState, useEffect, useCallback } from 'react';
import {
  Folder, File, Upload, Trash2, Download,
  ChevronRight, FileText,
  FolderPlus, Grid, List as ListIcon, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  FLOAT_PANEL,
  FOCUS_INSET,
  IconBox,
  IconButton,
  Input,
  LoadingState,
  MENU_ITEM,
  MobileCard,
  MobileList,
  Modal,
  PageHeader,
  Panel,
  SearchInput,
  Table,
  TableContainer,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  Tabs,
  buttonClass,
  cn,
  panelClass,
} from '../../components/admin/ui';
import { apiPost } from '../../lib/api';
import { useToast } from './template-orders/shared/hooks';
import { Toast } from './template-orders/shared/OrderUi';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  mime_type?: string;
  path: string;
  parent_id: string | null;
  created_at: string;
}

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/** Baca file jadi data-URI (dikirim base64 lewat add_document). */
const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const Documents: React.FC = () => {
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [items, setItems] = useState<FileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, itemId: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Item yang akan dihapus (dialog konfirmasi terbuka)
  const [toDelete, setToDelete] = useState<FileItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Notifikasi di atas tengah layar (satu sekaligus; yang terbaru menggantikan yang lama)
  const { toast, show, dismiss } = useToast();

  // setState di sini hanya terjadi setelah respons API
  const loadDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_documents' })
      });
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
      } else {
        throw new Error(data.error || 'Gagal memuat dokumen');
      }
    } catch (err) {
      show('error', `Gagal memuat dokumen: ${errorMessage(err)}`);
    } finally {
      setIsLoading(false);
    }
  }, [show]);

  const fetchDocuments = () => {
    setIsLoading(true);
    loadDocuments();
  };

  useEffect(() => {
    // isLoading=true sudah menjadi state awal; loadDocuments baru memanggil setState setelah await,
    // tetapi aturan ini tidak membedakan fungsi async.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDocuments();
  }, [loadDocuments]);

  // Aksi tulis lewat apiPost: respons gagal ({error}, HTTP bukan 2xx, koneksi putus) dilempar sebagai ApiError
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await apiPost('add_document', {
        name: newFolderName.trim(),
        type: 'folder',
        parent_id: currentFolder || null,
        path: ''
      });
      show('success', `Folder "${newFolderName}" berhasil dibuat.`);
      fetchDocuments();
      setNewFolderName('');
      setIsNewFolderModalOpen(false);
    } catch (err) {
      show('error', `Gagal membuat folder: ${errorMessage(err)}`);
    }
  };

  /** Unggah satu file; hasilnya null bila berhasil, atau pesan gagalnya. */
  const uploadFile = async (file: File, parentId: string | null): Promise<string | null> => {
    let path: string;
    try {
      path = await readAsDataUrl(file);
    } catch {
      return `Gagal membaca file ${file.name}.`;
    }
    try {
      await apiPost('add_document', {
        name: file.name,
        type: 'file',
        size: file.size,
        mime_type: file.type,
        path,
        parent_id: parentId
      });
      return null;
    } catch (err) {
      return `Gagal mengunggah ${file.name}: ${errorMessage(err)}`;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // Reset input
    if (files.length === 0) return;

    // Notifikasi hanya satu sekaligus: beberapa file diringkas setelah semuanya selesai, supaya pesan gagal
    // satu file tidak tertimpa pesan file lain
    const single = files.length === 1 ? files[0] : null;
    show('info', single ? `Mengunggah ${single.name}...` : `Mengunggah ${files.length} file...`);
    const results = await Promise.all(files.map(file => uploadFile(file, currentFolder || null)));
    const failures = results.filter((message): message is string => message !== null);
    if (failures.length < files.length) fetchDocuments();
    if (failures.length === 0) {
      show('success', single ? `${single.name} berhasil diunggah.` : `${files.length} file berhasil diunggah.`);
    } else if (single) {
      show('error', failures[0]);
    } else {
      show('error', `${failures.length} dari ${files.length} file gagal diunggah.`, failures.join(' '));
    }
  };

  // Dipanggil tombol "Ya, hapus" di dialog konfirmasi; dialog tetap terbuka bila gagal
  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await apiPost('delete_document', { id: toDelete.id });
      show('success', 'Item berhasil dihapus.');
      setToDelete(null);
      fetchDocuments();
    } catch (err) {
      show('error', `Gagal menghapus: ${errorMessage(err)}`);
    } finally {
      setDeleting(false);
    }
  };

  /** Buka konfirmasi hapus (tombol hapus, menu klik kanan). */
  const requestDelete = (id: string) => {
    const item = items.find(i => String(i.id) === String(id));
    if (item) setToDelete(item);
  };

  const handleContextMenu = (e: React.MouseEvent, itemId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, itemId });
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleDownload = (item: FileItem) => {
    const link = document.createElement('a');
    link.href = item.path;
    link.download = item.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredItems = items.filter(item => {
    const pId = item.parent_id ? String(item.parent_id) : null;
    const curF = currentFolder ? String(currentFolder) : null;
    const parentMatch = pId === curF;
    const searchMatch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return parentMatch && searchMatch;
  });

  const formatSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Ikon/thumbnail kecil per item (tampilan saja)
  const itemThumb = (item: FileItem) =>
    item.type === 'folder' ? (
      <IconBox icon={<Folder />} tone="cobalt" size="sm" />
    ) : item.mime_type?.includes('image') ? (
      <span className="block h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-adm-ghost ring-1 ring-inset ring-adm-line">
        <img src={item.path} alt="" className="h-full w-full object-cover" />
      </span>
    ) : (
      <IconBox icon={<File />} tone="warning" size="sm" />
    );

  return (
    <div className="relative min-h-screen pb-20">
      {/* Notifikasi (gaya bersama panel admin) */}
      <Toast toast={toast} onClose={dismiss} />

      <PageHeader
        title="Dokumen"
        description="Simpan dan rapikan folder serta file kamu di satu tempat."
        actions={
          <>
            <Button variant="secondary" icon={<FolderPlus />} onClick={() => setIsNewFolderModalOpen(true)}>
              Folder baru
            </Button>
            <label className={buttonClass({ className: 'cursor-pointer focus-within:ring-2 focus-within:ring-cobalt focus-within:ring-offset-2 focus-within:ring-offset-adm-surface' })}>
              <Upload className="h-[18px] w-[18px] shrink-0 max-sm:h-4 max-sm:w-4" strokeWidth={1.75} aria-hidden />
              <span className="truncate">Unggah</span>
              <input type="file" className="sr-only" multiple onChange={handleFileUpload} />
            </label>
          </>
        }
      />

      <div className="space-y-4">
        <Panel padding="none" className="p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SearchInput
              placeholder="Cari dokumen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              controlSize="sm"
              wrapperClassName="w-full sm:max-w-md sm:flex-1"
            />

            <Tabs
              items={[
                { value: 'grid' as const, label: <span className="sr-only">Tampilan grid</span>, icon: <Grid /> },
                { value: 'list' as const, label: <span className="sr-only">Tampilan daftar</span>, icon: <ListIcon /> },
              ]}
              value={viewMode}
              onChange={setViewMode}
              size="sm"
              ariaLabel="Tampilan"
              className="self-start sm:self-auto"
            />
          </div>
        </Panel>

        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm text-adm-muted">
          <button
            type="button"
            onClick={() => setCurrentFolder(null)}
            className={cn(
              'relative shrink-0 rounded-md font-medium transition-colors hover:text-adm-fg max-sm:after:absolute max-sm:after:-inset-x-2 max-sm:after:-inset-y-3',
              !currentFolder && 'text-adm-fg',
              FOCUS_INSET,
            )}
          >
            Dokumen saya
          </button>
          {currentFolder && (
            <>
              <ChevronRight className="h-4 w-4 shrink-0 text-adm-subtle" strokeWidth={1.75} aria-hidden />
              <span className="min-w-0 truncate font-medium text-adm-fg">
                {items.find(i => String(i.id) === String(currentFolder))?.name}
              </span>
            </>
          )}
        </nav>

        {isLoading ? (
          <LoadingState label="Memuat file..." />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            variant="dashed"
            icon={<Folder />}
            title="Folder ini kosong"
            description="Unggah file atau buat folder baru untuk mulai merapikan dokumen kamu."
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
            {filteredItems.map(item => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                key={item.id}
                className={cn(
                  panelClass('none'),
                  'group relative cursor-pointer p-3 transition-colors duration-150 hover:bg-adm-hover/60 hover:ring-adm-line-strong sm:p-4',
                )}
                onClick={() => {
                  if (item.type === 'folder') setCurrentFolder(String(item.id));
                  else if (item.mime_type?.includes('image')) setPreviewImage(item.path);
                }}
                onContextMenu={(e) => handleContextMenu(e, String(item.id))}
              >
                <div className="mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-adm-ghost">
                  {item.type === 'folder' ? (
                    <Folder className="h-10 w-10 fill-cobalt/10 text-cobalt sm:h-12 sm:w-12" strokeWidth={1.5} />
                  ) : (
                    item.mime_type?.includes('image') ? (
                      <img src={item.path} alt={item.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <FileText className="h-10 w-10 text-adm-warning-fg sm:h-12 sm:w-12" strokeWidth={1.5} />
                    )
                  )}
                </div>
                <div className="min-w-0 text-center">
                  <p className="truncate px-1 text-[13px] font-semibold text-adm-fg">
                    {item.name}
                  </p>
                  {item.type === 'file' && (
                    <p className="mt-0.5 text-xs tabular-nums text-adm-subtle">{formatSize(item.size)}</p>
                  )}
                </div>

                <div className="absolute right-2 top-2 flex gap-1 transition-opacity sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover:opacity-100">
                  {item.type === 'file' && (
                    <IconButton
                      icon={<Download />}
                      label={`Unduh ${item.name}`}
                      size="sm"
                      variant="secondary"
                      onClick={(e) => { e.stopPropagation(); handleDownload(item); }}
                    />
                  )}
                  <IconButton
                    icon={<Trash2 />}
                    label={`Hapus ${item.name}`}
                    size="sm"
                    variant="secondary"
                    className="text-adm-danger-fg hover:bg-adm-danger-soft hover:text-adm-danger-fg"
                    onClick={(e) => { e.stopPropagation(); requestDelete(String(item.id)); }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <Panel padding="none" className="overflow-hidden">
            {/* HP: kartu bertumpuk */}
            <MobileList className="md:hidden">
              {filteredItems.map(item => (
                <MobileCard
                  key={item.id}
                  leading={itemThumb(item)}
                  title={item.name}
                  onClick={() => {
                    if (item.type === 'folder') setCurrentFolder(String(item.id));
                    else if (item.mime_type?.includes('image')) setPreviewImage(item.path);
                  }}
                  onContextMenu={(e) => handleContextMenu(e, String(item.id))}
                  meta={[
                    { label: 'Tanggal', value: new Date(item.created_at).toLocaleDateString() },
                    { label: 'Ukuran', value: item.type === 'file' ? formatSize(item.size) : '--' },
                  ]}
                  actions={
                    <>
                      {item.type === 'file' && (
                        <IconButton
                          icon={<Download />}
                          label={`Unduh ${item.name}`}
                          size="sm"
                          variant="secondary"
                          onClick={(e) => { e.stopPropagation(); handleDownload(item); }}
                        />
                      )}
                      <IconButton
                        icon={<Trash2 />}
                        label={`Hapus ${item.name}`}
                        size="sm"
                        variant="danger-ghost"
                        onClick={(e) => { e.stopPropagation(); requestDelete(String(item.id)); }}
                      />
                    </>
                  }
                />
              ))}
            </MobileList>

            {/* Desktop: tabel */}
            <TableContainer className="hidden md:block">
              <Table>
                <THead>
                  <tr>
                    <Th>Nama</Th>
                    <Th>Tanggal</Th>
                    <Th>Ukuran</Th>
                    <Th align="right">Aksi</Th>
                  </tr>
                </THead>
                <TBody>
                  {filteredItems.map(item => (
                    <Tr
                      key={item.id}
                      onClick={() => {
                        if (item.type === 'folder') setCurrentFolder(String(item.id));
                        else if (item.mime_type?.includes('image')) setPreviewImage(item.path);
                      }}
                      onContextMenu={(e) => handleContextMenu(e, String(item.id))}
                    >
                      <Td>
                        <div className="flex min-w-0 items-center gap-3">
                          {itemThumb(item)}
                          <span className="max-w-xs truncate font-semibold lg:max-w-md">{item.name}</span>
                        </div>
                      </Td>
                      <Td muted nowrap>{new Date(item.created_at).toLocaleDateString()}</Td>
                      <Td muted nowrap className="tabular-nums">{item.type === 'file' ? formatSize(item.size) : '--'}</Td>
                      <Td align="right">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover/tr:opacity-100">
                          {item.type === 'file' && (
                            <IconButton
                              icon={<Download />}
                              label={`Unduh ${item.name}`}
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleDownload(item); }}
                            />
                          )}
                          <IconButton
                            icon={<Trash2 />}
                            label={`Hapus ${item.name}`}
                            size="sm"
                            variant="danger-ghost"
                            onClick={(e) => { e.stopPropagation(); requestDelete(String(item.id)); }}
                          />
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </TableContainer>
          </Panel>
        )}
      </div>

      {/* Modal buat folder */}
      <Modal
        open={isNewFolderModalOpen}
        onClose={() => setIsNewFolderModalOpen(false)}
        title="Buat folder baru"
        description="Pakai nama yang jelas supaya mudah dicari."
        icon={<FolderPlus />}
        size="sm"
        closeOnOverlay={false}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsNewFolderModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleCreateFolder}>
              Buat folder
            </Button>
          </>
        }
      >
        <Input
          autoFocus
          type="text"
          placeholder="mis. Aset grafis"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
        />
      </Modal>

      {/* Pratinjau gambar */}
      <Modal
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
        size="xl"
        bodyClassName="flex items-center justify-center px-3 pb-3 pt-14 sm:px-4 sm:pb-4"
      >
        {previewImage && (
          <img src={previewImage} alt="Pratinjau" className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain" />
        )}
      </Modal>

      {/* Konfirmasi hapus: folder ikut menghapus semua isinya (delete_document) */}
      <ConfirmDialog
        open={!!toDelete}
        onClose={() => (deleting ? undefined : setToDelete(null))}
        onConfirm={handleDelete}
        loading={deleting}
        tone="danger"
        title={`Hapus ${toDelete?.type === 'folder' ? 'folder' : 'file'} "${toDelete?.name ?? ''}"?`}
        description={
          toDelete?.type === 'folder'
            ? 'Folder ini beserta semua file dan folder di dalamnya akan dihapus permanen.'
            : 'File ini akan dihapus permanen.'
        }
        confirmText="Ya, hapus"
        cancelText="Batal"
      />

      <AnimatePresence>
        {contextMenu && (
          <div
            className="fixed z-[170]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              role="menu"
              className={cn(FLOAT_PANEL, 'w-52')}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const item = items.find(i => String(i.id) === String(contextMenu.itemId));
                  if (item?.type === 'folder') setCurrentFolder(String(item.id));
                  else if (item?.mime_type?.includes('image')) setPreviewImage(item.path);
                  setContextMenu(null);
                }}
                className={MENU_ITEM}
              >
                <Eye className="h-[18px] w-[18px] shrink-0 text-adm-subtle" strokeWidth={1.75} aria-hidden /> Lihat
              </button>
              {items.find(i => String(i.id) === String(contextMenu.itemId))?.type === 'file' && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    const item = items.find(i => String(i.id) === String(contextMenu.itemId));
                    if (item) handleDownload(item);
                    setContextMenu(null);
                  }}
                  className={MENU_ITEM}
                >
                  <Download className="h-[18px] w-[18px] shrink-0 text-adm-subtle" strokeWidth={1.75} aria-hidden /> Unduh
                </button>
              )}
              <div className="my-1 h-px bg-adm-line" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  requestDelete(contextMenu.itemId);
                  setContextMenu(null);
                }}
                className={cn(MENU_ITEM, 'text-adm-danger-fg hover:bg-adm-danger-soft')}
              >
                <Trash2 className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} aria-hidden /> Hapus
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Documents;
