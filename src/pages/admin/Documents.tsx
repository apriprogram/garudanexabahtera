import React, { useState, useEffect } from 'react';
import { 
  Folder, File, Upload, Trash2, Download, 
  ChevronRight, Search, FileText,
  FolderPlus, Grid, List as ListIcon, X, Eye, AlertCircle, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';

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

interface Notification {
  type: 'success' | 'error' | 'info';
  message: string;
  id: number;
}

const Documents: React.FC = () => {
  const { theme } = useStore();
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [items, setItems] = useState<FileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, itemId: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { type, message, id }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
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
    } catch (err: any) {
      addNotification('error', `Gagal memuat: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch('/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_document',
          name: newFolderName.trim(),
          type: 'folder',
          parent_id: currentFolder || null,
          path: ''
        })
      });
      const result = await res.json();
      if (result.success) {
        addNotification('success', `Folder "${newFolderName}" berhasil dibuat`);
        fetchDocuments();
        setNewFolderName('');
        setIsNewFolderModalOpen(false);
      } else {
        addNotification('error', `Gagal: ${result.error}`);
      }
    } catch (err: any) {
      addNotification('error', `Error Sistem: ${err.message}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      addNotification('info', `Mengupload ${file.name}...`);
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const res = await fetch('/api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'add_document',
              name: file.name,
              type: 'file',
              size: file.size,
              mime_type: file.type,
              path: event.target?.result as string,
              parent_id: currentFolder || null
            })
          });
          const result = await res.json();
          if (result.success) {
            addNotification('success', `${file.name} berhasil diupload`);
            fetchDocuments();
          } else {
            addNotification('error', `Gagal upload ${file.name}: ${result.error}`);
          }
        } catch (err: any) {
          addNotification('error', `Error Upload: ${err.message}`);
        }
      };
      reader.onerror = () => addNotification('error', `Gagal membaca file ${file.name}`);
      reader.readAsDataURL(file);
    }
    e.target.value = ''; // Reset input
  };

  const handleDelete = async (id: string) => {
    const item = items.find(i => String(i.id) === String(id));
    if (!confirm(`Hapus ${item?.name}?`)) return;
    
    try {
      const res = await fetch('/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_document', id })
      });
      const result = await res.json();
      if (result.success) {
        addNotification('success', 'Item berhasil dihapus');
        fetchDocuments();
      } else {
        addNotification('error', `Gagal hapus: ${result.error}`);
      }
    } catch (err: any) {
      addNotification('error', `Error Hapus: ${err.message}`);
    }
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

  return (
    <div className="space-y-6 relative min-h-screen pb-20">
      {/* Toast Notifications */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-3 pointer-events-none w-full max-w-md px-4">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border pointer-events-auto w-full ${
                n.type === 'success' ? 'bg-emerald-500 border-emerald-400 text-white' :
                n.type === 'error' ? 'bg-rose-500 border-rose-400 text-white' :
                'bg-blue-600 border-blue-500 text-white'
              }`}
            >
              {n.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : 
               n.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : 
               <div className="w-5 h-5 border-2 border-white/30 border-t-white animate-spin rounded-full shrink-0" />}
              <span className="text-sm font-medium">{n.message}</span>
              <button onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))} className="ml-auto opacity-70 hover:opacity-100">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
            Dokumen
          </h1>
          <p className="text-slate-500 text-sm">Kelola folder dan file Anda secara permanen</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNewFolderModalOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm font-medium border ${
              theme === 'light' 
                ? 'bg-white border-slate-200 text-slate-900 hover:bg-slate-50' 
                : 'bg-slate-800 border-white/10 text-white hover:bg-slate-700'
            }`}
          >
            <FolderPlus className="w-4 h-4" />
            New Folder
          </button>
          <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-all text-sm font-medium cursor-pointer shadow-lg shadow-blue-500/20">
            <Upload className="w-4 h-4" />
            Upload
            <input type="file" className="hidden" multiple onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      <div className={`p-4 rounded-2xl border transition-all ${
        theme === 'light' ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Cari dokumen..."
              className={`w-full pl-10 pr-4 py-2 rounded-xl border outline-none transition-all text-sm ${
                theme === 'light' 
                  ? 'bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white' 
                  : 'bg-white/5 border-white/10 focus:border-blue-500 focus:bg-white/10 text-white'
              }`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 p-1 rounded-lg bg-slate-100 dark:bg-white/5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-white/10 shadow-sm text-blue-600' : 'text-slate-500'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-white/10 shadow-sm text-blue-600' : 'text-slate-500'}`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-500">
        <button 
          onClick={() => setCurrentFolder(null)}
          className="hover:text-blue-500 transition-colors"
        >
          My Drive
        </button>
        {currentFolder && (
          <>
            <ChevronRight className="w-4 h-4" />
            <span className="text-blue-500 font-medium">
              {items.find(i => String(i.id) === String(currentFolder))?.name}
            </span>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500/20 border-t-blue-500"></div>
          <p className="text-slate-500 text-sm font-medium">Memuat berkas...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-6">
            <Folder className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className={`text-lg font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Folder ini kosong</h3>
          <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto">Upload file atau buat folder baru untuk mulai merapikan dokumen Anda.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredItems.map(item => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              key={item.id}
              className={`group p-4 rounded-2xl border transition-all cursor-pointer relative ${
                theme === 'light' 
                  ? 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10' 
                  : 'bg-white/5 border-white/10 hover:border-blue-500 hover:bg-white/10'
              }`}
              onClick={() => {
                if (item.type === 'folder') setCurrentFolder(String(item.id));
                else if (item.mime_type?.includes('image')) setPreviewImage(item.path);
              }}
              onContextMenu={(e) => handleContextMenu(e, String(item.id))}
            >
              <div className="aspect-square flex items-center justify-center mb-3 overflow-hidden rounded-xl bg-slate-50 dark:bg-white/5">
                {item.type === 'folder' ? (
                  <Folder className="w-12 h-12 text-blue-500 fill-blue-500/10" />
                ) : (
                  item.mime_type?.includes('image') ? (
                    <img src={item.path} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  ) : (
                    <FileText className="w-12 h-12 text-amber-500" />
                  )
                )}
              </div>
              <div className="text-center">
                <p className={`text-xs font-bold truncate px-2 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                  {item.name}
                </p>
                {item.type === 'file' && (
                  <p className="text-[10px] text-slate-500 mt-0.5">{formatSize(item.size)}</p>
                )}
              </div>

              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                {item.type === 'file' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDownload(item); }}
                    className="p-1.5 rounded-lg bg-blue-500 text-white shadow-lg shadow-blue-500/30 transition-all active:scale-90"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(String(item.id)); }}
                  className="p-1.5 rounded-lg bg-red-500 text-white shadow-lg shadow-red-500/30 transition-all active:scale-90"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className={`rounded-2xl border overflow-hidden ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/5 border-white/10'
        }`}>
          <table className="w-full text-left text-sm">
            <thead className={theme === 'light' ? 'bg-slate-50' : 'bg-white/5'}>
              <tr className="text-slate-500">
                <th className="px-6 py-4 font-bold">Nama</th>
                <th className="px-6 py-4 font-bold">Tanggal</th>
                <th className="px-6 py-4 font-bold">Ukuran</th>
                <th className="px-6 py-4 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredItems.map(item => (
                <tr 
                  key={item.id} 
                  className={`group hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors ${
                    theme === 'light' ? 'text-slate-900' : 'text-white'
                  }`}
                  onClick={() => {
                    if (item.type === 'folder') setCurrentFolder(String(item.id));
                    else if (item.mime_type?.includes('image')) setPreviewImage(item.path);
                  }}
                  onContextMenu={(e) => handleContextMenu(e, String(item.id))}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {item.type === 'folder' ? (
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Folder className="w-4 h-4 text-blue-500" />
                        </div>
                      ) : (
                        item.mime_type?.includes('image') ? (
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100">
                            <img src={item.path} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <File className="w-4 h-4 text-amber-500" />
                          </div>
                        )
                      )}
                      <span className="font-bold">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{new Date(item.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-slate-500 font-medium">{item.type === 'file' ? formatSize(item.size) : '--'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.type === 'file' && (
                        <button onClick={(e) => { e.stopPropagation(); handleDownload(item); }} className="p-2 text-slate-400 hover:text-blue-500 transition-colors"><Download className="w-4 h-4" /></button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(String(item.id)); }} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {isNewFolderModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`w-full max-w-md p-6 rounded-3xl shadow-2xl border ${
                theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#121212] border-white/10'
              }`}
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-500">
                  <FolderPlus className="w-7 h-7" />
                </div>
                <div>
                  <h3 className={`text-xl font-bold ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Buat Folder Baru</h3>
                  <p className="text-slate-500 text-sm">Gunakan nama yang deskriptif</p>
                </div>
              </div>
              <input
                autoFocus
                type="text"
                className={`w-full px-5 py-4 rounded-2xl border outline-none mb-8 transition-all text-lg font-medium ${
                  theme === 'light' 
                    ? 'bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white' 
                    : 'bg-white/5 border-white/10 focus:border-blue-500 focus:bg-white/10 text-white'
                }`}
                placeholder="Misal: Aset Grafis"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
              <div className="flex gap-4">
                <button
                  onClick={() => setIsNewFolderModalOpen(false)}
                  className={`flex-1 px-4 py-3 rounded-2xl font-bold transition-all ${
                    theme === 'light' ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  Batal
                </button>
                <button
                  onClick={handleCreateFolder}
                  className="flex-1 px-4 py-3 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                >
                  Buat Folder
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {previewImage && (
          <div 
            className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-6xl w-full h-full flex items-center justify-center p-10"
            >
              <img src={previewImage} alt="Preview" className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl" />
              <button 
                onClick={() => setPreviewImage(null)}
                className="absolute top-6 right-6 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all backdrop-blur-md"
              >
                <X className="w-8 h-8" />
              </button>
            </motion.div>
          </div>
        )}

        {contextMenu && (
          <div 
            className="fixed z-[170]" 
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className={`w-52 py-2 rounded-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.3)] ${
                theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#1a1a1a] border-white/10'
              }`}
            >
              <button 
                onClick={() => {
                  const item = items.find(i => String(i.id) === String(contextMenu.itemId));
                  if (item?.type === 'folder') setCurrentFolder(String(item.id));
                  else if (item?.mime_type?.includes('image')) setPreviewImage(item.path);
                  setContextMenu(null);
                }}
                className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-bold transition-all ${
                  theme === 'light' ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <Eye className="w-4 h-4 text-blue-500" /> Lihat
              </button>
              {items.find(i => String(i.id) === String(contextMenu.itemId))?.type === 'file' && (
                <button 
                  onClick={() => {
                    const item = items.find(i => String(i.id) === String(contextMenu.itemId));
                    if (item) handleDownload(item);
                    setContextMenu(null);
                  }}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-bold transition-all ${
                    theme === 'light' ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <Download className="w-4 h-4 text-emerald-500" /> Unduh
                </button>
              )}
              <div className={`my-1 border-t ${theme === 'light' ? 'border-slate-100' : 'border-white/5'}`} />
              <button 
                onClick={() => {
                  handleDelete(contextMenu.itemId);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-3 px-5 py-3 text-sm font-bold text-red-500 hover:bg-red-500/10 transition-all"
              >
                <Trash2 className="w-4 h-4" /> Hapus
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Documents;
