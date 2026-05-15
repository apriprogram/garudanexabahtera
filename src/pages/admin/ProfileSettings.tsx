import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Camera, Upload, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const ProfileSettings: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: '',
    password: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const u = JSON.parse(storedUser);
      setUser(u);
      setFormData({
        name: u.name || '',
        email: u.email || '',
        phone: u.phone || '',
        avatar: u.avatar || '',
        password: ''
      });
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 400;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
          } else {
            if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatus(null);

    try {
      const response = await fetch('/api.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_user',
          id: user.id,
          ...formData,
          role: user.role, // Keep existing role
          status: user.status // Keep existing status
        })
      });
      const data = await response.json();
      if (data.success) {
        const updatedUser = { ...user, ...formData };
        delete updatedUser.password;
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setStatus({ type: 'success', message: 'Profile updated successfully!' });
        setTimeout(() => setStatus(null), 3000);
      } else {
        setStatus({ type: 'error', message: data.error || 'Failed to update profile' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Connection error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return <div className="p-8 text-slate-500">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 md:space-y-8 pb-10">
      <div>
        <h1 className="text-xl md:text-3xl font-bold text-white mb-1 md:mb-2 tracking-tight">Edit Profile</h1>
        <p className="text-[10px] md:text-sm text-slate-400">Manage your personal information and security.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-[#0D0D0D] border border-white/5 rounded-2xl md:rounded-3xl p-6 md:p-8 flex flex-col items-center text-center h-full">
            <div className="relative group mb-4 md:mb-6">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-blue-500/50">
                {formData.avatar ? (
                  <img src={formData.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 md:w-10 md:h-10 text-slate-500" />
                )}
              </div>
              <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <Camera className="w-6 h-6 md:w-8 md:h-8 text-white" />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>
            <h3 className="text-base md:text-lg font-bold text-white mb-1">{formData.name}</h3>
            <p className="text-[9px] md:text-xs text-slate-500 uppercase tracking-widest font-black mb-4 md:mb-6">{user.role}</p>
            
            <div className="w-full space-y-2 md:space-y-3">
              <div className="flex items-center gap-2 md:gap-3 px-3 py-2.5 md:px-4 md:py-3 bg-white/[0.02] border border-white/5 rounded-xl text-left">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] md:text-xs text-slate-400 truncate">{formData.email}</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3 px-3 py-2.5 md:px-4 md:py-3 bg-white/[0.02] border border-white/5 rounded-xl text-left">
                <Phone className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-[10px] md:text-xs text-slate-400">{formData.phone}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-3">
          <form onSubmit={handleSubmit} className="bg-[#0D0D0D] border border-white/5 rounded-2xl md:rounded-3xl p-6 md:p-10 space-y-6 md:space-y-8 h-full flex flex-col justify-between">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 md:gap-x-8 gap-y-5 md:gap-y-8">
              <div className="space-y-2 md:space-y-3">
                <label className="text-[11px] md:text-sm font-normal text-slate-400 ml-1">Full Name</label>
                <input 
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl px-4 py-3 md:px-6 md:py-4 text-white outline-none focus:border-blue-500/50 transition-all text-xs md:text-base"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2 md:space-y-3">
                <label className="text-[11px] md:text-sm font-normal text-slate-400 ml-1">Email Address</label>
                <input 
                  type="email" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl px-4 py-3 md:px-6 md:py-4 text-white outline-none focus:border-blue-500/50 transition-all text-xs md:text-base"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2 md:space-y-3">
                <label className="text-[11px] md:text-sm font-normal text-slate-400 ml-1">Phone Number</label>
                <input 
                  type="tel" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl px-4 py-3 md:px-6 md:py-4 text-white outline-none focus:border-blue-500/50 transition-all text-xs md:text-base"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2 md:space-y-3">
                <label className="text-[11px] md:text-sm font-normal text-slate-400 ml-1">New Password (leave blank to keep current)</label>
                <input 
                  type="password" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl md:rounded-2xl px-4 py-3 md:px-6 md:py-4 text-white outline-none focus:border-blue-500/50 transition-all text-xs md:text-base"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 md:pt-10 border-t border-white/5">
              {status && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center gap-2 text-[10px] md:text-sm ${status.type === 'success' ? 'text-green-400' : 'text-red-400'}`}
                >
                  {status.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                  {status.message}
                </motion.div>
              )}
              <div />
              <button 
                type="submit" 
                disabled={isSaving}
                className="flex items-center gap-2 md:gap-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-3 md:px-10 md:py-4 rounded-xl md:rounded-2xl font-bold transition-all shadow-xl shadow-blue-600/20 active:scale-95 text-xs md:text-base"
              >
                {isSaving ? 'Saving...' : <><Save className="w-4 h-4 md:w-5 md:h-5" /> Save Changes</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
