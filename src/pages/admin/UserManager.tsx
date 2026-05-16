import React, { useState, useEffect } from 'react';
import { 
  UserPlus,
  Search, 
  Edit2, 
  Trash2, 
  Mail, 
  Shield, 
  Eye,
  EyeOff,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Camera,
  Upload,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  password?: string;
  avatar?: string;
}

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost/api.php' : '/api.php';

const UserManager: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}?action=get_users`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      if (Array.isArray(data)) {
        setUsers(data);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Gagal terhubung ke Database. Pastikan XAMPP (Apache & MySQL) sudah ON dan file api.php ada di htdocs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'user' as 'admin' | 'user',
    status: 'active' as 'active' | 'inactive',
    password: '',
    avatar: ''
  });

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        password: '', // Keep blank for edit unless changing
        avatar: user.avatar || ''
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: 'user',
        status: 'active',
        password: '',
        avatar: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const action = editingUser ? 'update_user' : 'add_user';
    const payload = editingUser ? { ...formData, id: editingUser.id, action } : { ...formData, action };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.success) {
        fetchUsers();
        handleCloseModal();
      } else {
        alert('Error: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 400; // Profile photos don't need to be huge
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setFormData({ ...formData, avatar: compressedDataUrl });
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const confirmDelete = (user: User) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const handleExecuteDelete = async () => {
    if (!userToDelete) return;
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_user', id: userToDelete.id })
      });
      const data = await response.json();
      if (data.success) {
        fetchUsers();
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-5 md:space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-white tracking-tight">User Management</h1>
          <p className="text-[10px] md:text-sm text-slate-400 mt-0.5 md:mt-1">Manage administrators and clients.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 md:px-6 md:py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95 text-xs md:text-base"
        >
          <UserPlus className="w-4 h-4 md:w-5 md:h-5" />
          Add New User
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-center justify-between bg-[#0D0D0D] border border-white/5 p-3 md:p-4 rounded-2xl">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 md:py-2.5 text-xs md:text-sm text-white outline-none focus:border-blue-500/50 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 text-[10px] md:text-sm text-slate-500">
          <span>{filteredUsers.length} Users found</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#0D0D0D] border border-white/5 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-5 md:px-8 py-3 md:py-5 text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-5 md:px-8 py-3 md:py-5 text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Role</th>
                <th className="px-5 md:px-8 py-3 md:py-5 text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 md:px-8 py-3 md:py-5 text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Contact</th>
                <th className="px-5 md:px-8 py-3 md:py-5 text-[10px] md:text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-6 h-6 md:w-8 md:h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-xs md:text-sm">Connecting...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-10 text-center text-slate-500 text-xs md:text-sm">
                    No users found.
                  </td>
                </tr>
              ) : filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-5 md:px-8 py-3 md:py-5">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center border border-white/10 text-white text-xs font-bold overflow-hidden">
                        {user.avatar ? (
                          <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          user.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] md:text-sm font-semibold text-white group-hover:text-blue-400 transition-colors leading-tight">{user.name}</p>
                        <p className="text-[9px] md:text-xs text-slate-500 leading-tight">{user.email}</p>
                        <div className="md:hidden mt-1 flex items-center gap-1.5">
                           <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md ${user.role === 'admin' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-400'}`}>
                             {user.role}
                           </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <Shield className={`w-3.5 h-3.5 ${user.role === 'admin' ? 'text-amber-400' : 'text-slate-500'}`} />
                      <span className={`text-xs font-medium capitalize ${user.role === 'admin' ? 'text-amber-400' : 'text-slate-400'}`}>
                        {user.role}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 md:px-8 py-3 md:py-5">
                    <span className={`
                      inline-flex items-center px-1.5 py-0.5 md:px-2.5 md:py-1 rounded-full text-[8px] md:text-[10px] font-bold uppercase tracking-wide
                      ${user.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-500'}
                    `}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 hidden sm:table-cell">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Mail className="w-3 h-3" />
                        {user.email}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Phone className="w-3 h-3" />
                        {user.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 md:px-8 py-3 md:py-5 text-right">
                    <div className="flex justify-end gap-1 md:gap-2">
                      <button 
                        onClick={() => handleOpenModal(user)}
                        className="p-1.5 md:p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                      <button 
                        onClick={() => confirmDelete(user)}
                        className="p-1.5 md:p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Placeholder */}
        <div className="px-5 md:px-8 py-3 md:py-4 bg-white/[0.01] border-t border-white/5 flex items-center justify-between text-[10px] md:text-xs text-slate-500">
          <span>{filteredUsers.length} results</span>
          <div className="flex items-center gap-1.5 md:gap-2">
            <button className="p-1 md:p-1.5 hover:bg-white/5 rounded-md disabled:opacity-30" disabled><ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
            <button className="w-6 h-6 md:w-8 md:h-8 bg-blue-600 text-white rounded-md font-bold text-[10px] md:text-xs">1</button>
            <button className="p-1 md:p-1.5 hover:bg-white/5 rounded-md"><ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
          </div>
        </div>
      </div>

      {/* Modal for Add/Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-black/80"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#121212] border border-white/10 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl m-4 flex flex-col max-h-[90vh] relative z-10"
            >
              {/* Modal Header */}
              <div className="p-4 md:p-6 border-b border-white/5 bg-white/[0.01]">
                <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h2>
                <p className="text-[9px] md:text-xs text-slate-500 mt-0.5">
                  {editingUser ? 'Update user information and permissions.' : 'Create a new administrative account.'}
                </p>
              </div>
 
              <form onSubmit={handleUserSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-4 md:p-6 space-y-4 md:space-y-5">
                  {/* Avatar Upload */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative group">
                      <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-500/50">
                        {formData.avatar ? (
                          <img src={formData.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-5 h-5 md:w-6 md:h-6 text-slate-600" />
                        )}
                      </div>
                      <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                        <Upload className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                      </label>
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Profile Photo</span>
                  </div>
 
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 md:gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] md:text-[11px] font-medium text-slate-500 ml-1">Full Name</label>
                      <input 
                        type="text" 
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-4 md:py-2.5 text-[11px] md:text-xs text-white outline-none focus:border-blue-500/50 transition-all"
                        placeholder="Enter full name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] md:text-[11px] font-medium text-slate-500 ml-1">Email Address</label>
                      <input 
                        type="email" 
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-4 md:py-2.5 text-[11px] md:text-xs text-white outline-none focus:border-blue-500/50 transition-all"
                        placeholder="email@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] md:text-[11px] font-medium text-slate-500 ml-1">Phone Number</label>
                      <input 
                        type="tel" 
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-4 md:py-2.5 text-[11px] md:text-xs text-white outline-none focus:border-blue-500/50 transition-all"
                        placeholder="0812..."
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] md:text-[11px] font-medium text-slate-500 ml-1">User Role</label>
                      <select 
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-4 md:py-2.5 text-[11px] md:text-xs text-white outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value as 'admin' | 'user'})}
                      >
                        <option value="user" className="bg-[#121212]">User / Client</option>
                        <option value="admin" className="bg-[#121212]">Administrator</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] md:text-[11px] font-medium text-slate-500 ml-1">Account Status</label>
                      <select 
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-4 md:py-2.5 text-[11px] md:text-xs text-white outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})}
                      >
                        <option value="active" className="bg-[#121212]">Active</option>
                        <option value="inactive" className="bg-[#121212]">Inactive</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] md:text-[11px] font-medium text-slate-500 ml-1">Password {editingUser && '(optional)'}</label>
                      <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"} 
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 md:px-4 md:py-2.5 text-[11px] md:text-xs text-white outline-none focus:border-blue-500/50 transition-all"
                          placeholder="Enter password"
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
 
                {/* Modal Footer */}
                <div className="p-4 md:p-6 border-t border-white/5 flex gap-3 bg-white/[0.01]">
                  <button 
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 md:py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg font-bold transition-all text-[11px] md:text-xs"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2 md:py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95 text-[11px] md:text-xs"
                  >
                    {editingUser ? 'Save' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-black/80"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#121212] border border-white/10 w-[calc(100%-2rem)] max-w-sm rounded-3xl overflow-hidden shadow-2xl relative z-10 p-5 md:p-8"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 md:w-20 md:h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-4 md:mb-6">
                  <AlertTriangle className="w-6 h-6 md:w-10 md:h-10 text-red-500" />
                </div>
                <h3 className="text-lg md:text-2xl font-bold text-white mb-1.5 md:mb-2">Delete User?</h3>
                <p className="text-[11px] md:text-sm text-slate-400 mb-6 md:mb-8 leading-relaxed">
                  Are you sure you want to delete <span className="text-white font-semibold">"{userToDelete?.name}"</span>? This action is permanent and cannot be undone.
                </p>
                
                <div className="flex gap-2.5 md:gap-3 w-full">
                  <button 
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="flex-1 py-2.5 md:py-3.5 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all text-[11px] md:text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleExecuteDelete}
                    className="flex-1 py-2.5 md:py-3.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-600/20 active:scale-95 text-[11px] md:text-sm"
                  >
                    Delete Now
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserManager;
