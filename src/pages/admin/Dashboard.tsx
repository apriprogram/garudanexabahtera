import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  Users, 
  ShoppingBag, 
  Eye, 
  TrendingUp, 
  MoreVertical,
  Plus,
  ExternalLink,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  Briefcase,
  Upload,
  Camera,
  X,
  AlertTriangle,
  Mail,
  Phone,
  FileText,
  Download,
  Trash,
  Paperclip,
  CheckCircle,
  FileBox,
  ChevronDown,
  RotateCcw,
  Clock,
  Printer,
  ZoomIn,
  ZoomOut,
  Hand,
  GripVertical
} from 'lucide-react';

interface Project {
  id: number;
  name: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  service_type: 'website' | 'mobile_app' | 'ui_ux' | 'other';
  status: 'active' | 'pending' | 'completed' | 'canceled';
  price: number;
  start_date: string;
  end_date: string;
  image: string;
  project_files: string; // JSON string of [{name, type, size, data}]
  description: string;
  assigned_user: string;
}

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost/api.php' : '/api.php';

const Dashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [usersList, setUsersList] = useState<{id: number, name: string, avatar?: string}[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [visitorCount, setVisitorCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [isGrabMode, setIsGrabMode] = useState(false);

  const handleViewProject = (project: Project) => {
    setViewingProject(project);
    setIsViewOpen(true);
  };

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    service_type: 'website' as 'website' | 'mobile_app' | 'ui_ux' | 'other',
    status: 'active' as 'active' | 'pending' | 'completed' | 'canceled',
    price: 0,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    image: '',
    project_files: '[]',
    description: '',
    assigned_user: ''
  });

  const currentProjectFiles = useMemo(() => {
    try {
      const files = JSON.parse(formData.project_files || '[]');
      return files.map((file: any, i: number) => ({
        ...file,
        id: file.id || `legacy-${file.name}-${file.size || i}`
      }));
    } catch {
      return [];
    }
  }, [formData.project_files]);

  const fetchDashboardData = async () => {
    try {
      // Fetch Projects
      const projRes = await fetch(`${API_URL}?action=get_projects`);
      const projData = await projRes.json();
      if (Array.isArray(projData)) setProjects(projData);

      // Fetch Visitor Stats
      const visitRes = await fetch(`${API_URL}?action=get_visitor_stats`);
      const visitData = await visitRes.json();
      if (visitData.total_visits !== undefined) setVisitorCount(visitData.total_visits);

      // Fetch Users
      const userRes = await fetch(`${API_URL}?action=get_users`);
      const userData = await userRes.json();
      if (Array.isArray(userData)) {
        setUserCount(userData.length);
        setUsersList(userData);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (!isViewOpen) {
      setPreviewFile(null);
    }
  }, [isViewOpen]);

  const handleOpenModal = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        name: project.name,
        client_name: project.client_name,
        client_email: project.client_email || '',
        client_phone: project.client_phone || '',
        service_type: project.service_type,
        status: project.status,
        price: project.price,
        start_date: project.start_date,
        end_date: project.end_date || '',
        image: project.image || '',
        project_files: project.project_files || '[]',
        description: project.description || '',
        assigned_user: project.assigned_user || ''
      });
    } else {
      setEditingProject(null);
      setFormData({
        name: '',
        client_name: '',
        client_email: '',
        client_phone: '',
        service_type: 'website',
        status: 'active',
        price: 0,
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        image: '',
        project_files: '[]',
        description: '',
        assigned_user: ''
      });
    }
    setIsModalOpen(true);
  };

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'delete'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'delete', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError('');
    const action = editingProject ? 'update_project' : 'add_project';
    const payload = editingProject ? { ...formData, id: editingProject.id, action } : { ...formData, action };

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const text = await response.text();
      console.log('API Raw Response:', text);
      let data: any = {};
      try { data = JSON.parse(text); } catch { 
        setSaveError('API returned invalid response. Check XAMPP is running.');
        return;
      }
      console.log('API Parsed:', data);
      if (data.success) {
        const isEdit = !!editingProject;
        fetchDashboardData();
        setIsModalOpen(false);
        showToast('success', isEdit ? 'Proyek berhasil diperbarui!' : 'Proyek baru berhasil ditambahkan!');
      } else {
        setSaveError(data.error || 'Unknown error from server');
        showToast('error', data.error || 'Gagal menyimpan data.');
      }
    } catch (error: any) {
      console.error('Fetch error:', error);
      setSaveError('Cannot connect to API. Make sure XAMPP/Apache is running.');
      showToast('error', 'Tidak dapat terhubung ke server.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;
    const deletedName = projectToDelete.name;
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_project', id: projectToDelete.id })
      });
      const data = await response.json();
      if (data.success) {
        fetchDashboardData();
        setIsDeleteModalOpen(false);
        setProjectToDelete(null);
        showToast('delete', `"${deletedName}" telah dihapus.`);
      } else {
        showToast('error', 'Gagal menghapus proyek.');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      showToast('error', 'Tidak dapat terhubung ke server.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData({ ...formData, image: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const newFile = {
            id: Math.random().toString(36).substring(2, 11) + Date.now(),
            name: file.name,
            type: file.type,
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
            data: event.target?.result as string
          };
          setFormData(prev => {
            const currentFiles = JSON.parse(prev.project_files || '[]');
            return {
              ...prev,
              project_files: JSON.stringify([...currentFiles, newFile])
            };
          });
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeFile = (index: number) => {
    const currentFiles = JSON.parse(formData.project_files || '[]');
    const newFiles = currentFiles.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, project_files: JSON.stringify(newFiles) });
  };

  const downloadFile = (file: any) => {
    const link = document.createElement('a');
    link.href = file.path || file.data; // Support both for immediate UI feedback and saved data
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalRevenue = projects.reduce((sum, p) => sum + Number(p.price || 0), 0);

  const handleResetVisitors = async () => {
    try {
      const resetUrl = `${API_URL}?action=reset_visitor_stats`;
      console.log('Calling reset URL:', resetUrl);
      
      const response = await fetch(resetUrl);
      const text = await response.text();
      console.log('Raw response:', text);
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Invalid JSON response from server');
      }

      if (data.success) {
        setVisitorCount(0);
        setIsResetModalOpen(false);
        showToast('delete', 'Visitor statistics has been reset.');
      } else {
        alert('Failed to reset: ' + (data.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('Error resetting visitors:', error);
      alert('Error: ' + error.message);
    }
  };

  const stats = [
    { label: 'Total Visitors', value: visitorCount.toLocaleString(), change: '+12.5%', icon: Eye, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Project Orders', value: projects.length.toLocaleString(), change: '+18.2%', icon: ShoppingBag, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Total Users', value: userCount.toLocaleString(), change: '+5.4%', icon: Users, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Total Revenue', value: 'IDR ' + totalRevenue.toLocaleString('id-ID'), change: '+2.1%', icon: DollarSign, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  ];

  return (
    <div className="space-y-5 md:space-y-8 pb-10 admin-dashboard-container">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-white tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-500 text-[11px] md:text-sm mt-0.5 md:mt-1">Welcome back, Admin. Manage your projects and clients here.</p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 md:px-5 md:py-2.5 bg-white/5 border border-white/10 rounded-lg md:rounded-xl text-[11px] md:text-sm font-medium hover:bg-white/10 transition-all">
            <ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4" />
            View Site
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 md:px-5 md:py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg md:rounded-xl text-[11px] md:text-sm font-medium transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Add Project
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {stats.map((stat, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={stat.label}
            className="p-4 md:p-6 bg-[#0D0D0D] border border-white/5 rounded-xl md:rounded-2xl hover:border-blue-500/30 transition-all group"
          >
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className={`p-2 md:p-3 rounded-lg md:rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <span className="text-[9px] md:text-xs font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">{stat.change}</span>
            </div>
            <div>
              <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
              <div className="flex items-end justify-between mt-0.5 md:mt-1">
                <p className="text-base md:text-2xl font-bold text-white">{stat.value}</p>
                {stat.label === 'Total Visitors' && (
                  <button 
                    onClick={() => setIsResetModalOpen(true)}
                    className="p-1.5 bg-white/5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Reset Visitors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Projects List */}
      <div className="bg-[#0D0D0D] border border-white/5 rounded-xl md:rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-4 py-3 md:px-8 md:py-4 flex items-center justify-between border-b border-blue-500/20 bg-blue-600/10">
          <h2 className="text-sm md:text-xl font-bold text-blue-50">Project Clients</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-4 py-1.5 md:px-8 md:py-2 text-[10px] md:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Project</th>
                <th className="hidden sm:table-cell px-8 py-2 text-[10px] md:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Service</th>
                <th className="px-4 py-1.5 md:px-8 md:py-2 text-[10px] md:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="hidden lg:table-cell px-8 py-2 text-[10px] md:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Timeline</th>
                <th className="hidden lg:table-cell px-8 py-2 text-[10px] md:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Owner</th>
                <th className="hidden md:table-cell px-8 py-2 text-[10px] md:text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Budget</th>
                <th className="px-4 py-1.5 md:px-8 md:py-2 text-[10px] md:text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={7} className="px-8 py-10 text-center text-slate-500 text-xs md:text-sm animate-pulse">Loading Projects...</td></tr>
              ) : projects.length === 0 ? (
                <tr><td colSpan={7} className="px-8 py-10 text-center text-slate-500 text-xs md:text-sm">No projects found. Add your first project!</td></tr>
              ) : projects.map((project) => (
                <tr key={project.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-4 py-3 md:px-8 md:py-6">
                    <div className="flex items-center gap-2.5 md:gap-5">
                      <div className="w-8 h-8 md:w-14 md:h-14 rounded-xl overflow-hidden border border-white/10 group-hover:border-blue-500/50 transition-all bg-white/5 flex items-center justify-center">
                        {project.image ? (
                          <img src={project.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Briefcase className="w-4 h-4 md:w-7 md:h-7 text-slate-600" />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] md:text-base font-semibold text-white leading-tight">{project.name}</span>
                        <span className="text-[9px] md:text-sm text-slate-500 mt-1">{project.client_name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-8 py-3.5">
                    <span className="text-xs md:text-base text-slate-400 capitalize font-semibold">{project.service_type.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-2 md:px-8 md:py-3.5">
                    <span className={`
                      inline-flex items-center px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-[11px] font-semibold uppercase tracking-widest
                      ${project.status?.toLowerCase() === 'active' ? 'bg-blue-500/10 text-blue-400' : 
                        project.status?.toLowerCase() === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 
                        (project.status?.toLowerCase() === 'canceled' || project.status?.toLowerCase() === 'cancel') ? 'bg-red-500/10 text-red-400' :
                        'bg-amber-500/10 text-amber-400'}
                    `}>
                      {(project.status?.toLowerCase() === 'canceled' || project.status?.toLowerCase() === 'cancel') ? 'Cancel' : project.status || 'Pending'}
                    </span>
                  </td>
                  <td className="hidden lg:table-cell px-8 py-6">
                    {(() => {
                      const s = new Date(project.start_date);
                      const e = project.end_date ? new Date(project.end_date) : null;
                      const duration = e ? Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) : null;
                      
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      const deadlineDate = project.end_date ? new Date(project.end_date) : null;
                      if (deadlineDate) deadlineDate.setHours(0,0,0,0);
                      const deadline = deadlineDate ? Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

                      return (
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span className="text-xs md:text-sm text-white font-semibold">{duration !== null ? `${duration} Days` : '-'}</span>
                          </div>
                          <div className={`
                            inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold mt-1.5 w-fit
                            ${deadline !== null && deadline < 0 
                              ? 'bg-red-500/10 text-red-400 border border-red-500/10' 
                              : deadline === 0 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10'
                              : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/10'}
                          `}>
                            <div className={`w-1 h-1 rounded-full ${deadline !== null && deadline < 0 ? 'bg-red-400' : deadline === 0 ? 'bg-amber-400' : 'bg-cyan-400'}`} />
                            {deadline === null ? 'No Deadline' : 
                             deadline < 0 ? `${Math.abs(deadline)} Days Overdue` : 
                             deadline === 0 ? 'Due Today' : 
                             `${deadline} Days Left`}
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="hidden lg:table-cell px-8 py-3.5">
                    <div className="flex items-center">
                      {project.assigned_user ? (
                        <div className="flex -space-x-2">
                          {project.assigned_user.split(', ').map((userName, i) => {
                            const user = usersList.find(u => u.name === userName);
                            return (
                              <div key={i} className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-[#0A0A0A] border-2 border-[#0D0D0D] flex items-center justify-center group/avatar relative" title={userName}>
                                {user?.avatar ? (
                                  <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-[9px]">
                                    {userName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {project.assigned_user.split(', ').length > 0 && (
                            <div className="ml-3 self-center">
                              <p className="text-xs md:text-sm text-slate-400 font-semibold leading-none">{project.assigned_user.split(', ')[0]}</p>
                              {project.assigned_user.split(', ').length > 1 && (
                                <p className="text-[10px] md:text-xs text-slate-500 mt-1">+{project.assigned_user.split(', ').length - 1} more</p>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 text-sm">-</span>
                      )}
                    </div>
                  </td>
                  <td className="hidden md:table-cell px-8 py-3.5 text-right text-xs md:text-base text-slate-300 font-semibold">
                    IDR {Number(project.price).toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-2 md:px-8 md:py-3.5 text-right">
                    <div className="flex justify-end gap-1 md:gap-3">
                        <button
                          onClick={() => handleViewProject(project)}
                          className="p-1.5 md:p-2 text-slate-500 hover:text-cyan-400 hover:bg-cyan-400/5 rounded-lg transition-all"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5 md:w-5 md:h-5" />
                        </button>
                        <button 
                          onClick={() => handleOpenModal(project)}
                          className="p-1.5 md:p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5 md:w-5 md:h-5" />
                        </button>
                        <button 
                          onClick={() => { setProjectToDelete(project); setIsDeleteModalOpen(true); }}
                          className="p-1.5 md:p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5 md:w-5 md:h-5" />
                        </button>
                      </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Project Side Panel */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[80] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsModalOpen(false)} 
              className="absolute inset-0 bg-black/40" 
            />
            
            <motion.div 
              initial={{ x: "100%" }} 
              animate={{ x: 0 }} 
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xl md:max-w-2xl bg-[#0D0D0D] border-l border-white/10 shadow-2xl h-full flex flex-col z-10"
            >
              {/* Panel Header */}
              <div className="p-5 md:p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                    {editingProject ? 'Project Details' : 'Create New Project'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Manage project information and client specifics.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Panel Content */}
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-5 md:p-8 space-y-8">
                  {/* Media Section */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" /> Media & Preview
                    </h3>
                    <div className="relative group">
                      <div className="aspect-video w-full max-w-sm rounded-2xl bg-white/5 border-2 border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-blue-500/50 mx-auto">
                        {formData.image ? (
                          <img src={formData.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-3 text-slate-500">
                            <Upload className="w-8 h-8" />
                            <div className="text-center">
                              <p className="text-[11px] font-bold text-white">Drop your project image here</p>
                              <p className="text-[10px]">1600 x 900 recommended</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                        <span className="bg-white text-black px-4 py-2 rounded-lg text-xs font-bold">Change Image</span>
                        <input type="file" className="hidden" onChange={handleImageUpload} />
                      </label>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Client Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-[11px] font-medium text-slate-400 ml-1">Client Name <span className="text-red-500">*</span></label>
                        <input 
                          type="text" required 
                          value={formData.client_name} 
                          onChange={e => setFormData({...formData, client_name: e.target.value})} 
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50 transition-all"
                          placeholder="Client or Company"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-medium text-slate-400 ml-1">WhatsApp / Phone</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input 
                            type="text"
                            value={formData.client_phone} 
                            onChange={e => setFormData({...formData, client_phone: e.target.value})} 
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-blue-500/50 transition-all"
                            placeholder="+62..."
                          />
                        </div>
                      </div>
                      <div className="col-span-full space-y-2">
                        <label className="text-[11px] font-medium text-slate-400 ml-1">Client Email</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input 
                            type="email"
                            value={formData.client_email} 
                            onChange={e => setFormData({...formData, client_email: e.target.value})} 
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white outline-none focus:border-blue-500/50 transition-all"
                            placeholder="client@example.com"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* General Info */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5" /> Project Specification
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-[11px] font-medium text-slate-400 ml-1">Project Name <span className="text-red-500">*</span></label>
                        <input 
                          type="text" required 
                          value={formData.name} 
                          onChange={e => setFormData({...formData, name: e.target.value})} 
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all"
                          placeholder="e.g. E-commerce App"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-medium text-slate-400 ml-1">Service Category</label>
                        <div className="relative">
                          <select 
                            value={formData.service_type} 
                            onChange={e => setFormData({...formData, service_type: e.target.value as any})} 
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-10 text-sm text-white outline-none focus:border-blue-500/50 focus:bg-white/[0.08] appearance-none cursor-pointer transition-all"
                          >
                            <option value="website" className="bg-[#121212]">Website Development</option>
                            <option value="mobile_app" className="bg-[#121212]">Mobile Application</option>
                            <option value="ui_ux" className="bg-[#121212]">UI/UX Design</option>
                            <option value="other" className="bg-[#121212]">Other Services</option>
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        </div>
                      </div>
                      <div className="space-y-2 relative">
                        <label className="text-[11px] font-bold text-orange-400 ml-1">Project Status</label>
                        <div 
                          onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm flex justify-between items-center cursor-pointer hover:bg-white/[0.08] transition-all min-h-[46px]"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              formData.status === 'active' ? 'bg-blue-400' : 
                              formData.status === 'completed' ? 'bg-emerald-400' : 
                              formData.status === 'canceled' ? 'bg-red-400' : 
                              'bg-amber-400'
                            }`} />
                            <span className="text-white capitalize">
                              {formData.status === 'active' ? 'Active / In Progress' : 
                               formData.status === 'pending' ? 'Pending Review' : 
                               formData.status === 'completed' ? 'Completed' : 
                               'Cancel'}
                            </span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>

                        <AnimatePresence>
                          {isStatusDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setIsStatusDropdownOpen(false)} />
                              <motion.div 
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-[110%] left-0 right-0 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden p-1 flex flex-col gap-0.5"
                              >
                                {[
                                  { id: 'active', label: 'Active / In Progress', color: 'bg-blue-400' },
                                  { id: 'pending', label: 'Pending Review', color: 'bg-amber-400' },
                                  { id: 'completed', label: 'Completed', color: 'bg-emerald-400' },
                                  { id: 'canceled', label: 'Cancel', color: 'bg-red-400' }
                                ].map((opt) => (
                                  <div 
                                    key={opt.id}
                                    onClick={() => { 
                                      setFormData({...formData, status: opt.id as any}); 
                                      setIsStatusDropdownOpen(false); 
                                    }}
                                    className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/5 rounded-lg transition-all ${formData.status === opt.id ? 'bg-white/5' : ''}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-2 h-2 rounded-full ${opt.color}`} />
                                      <span className={`text-sm font-medium ${formData.status === opt.id ? 'text-white' : 'text-slate-400'}`}>{opt.label}</span>
                                    </div>
                                    {formData.status === opt.id && <CheckCircle className="w-3.5 h-3.5 text-blue-400" />}
                                  </div>
                                ))}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="space-y-2 relative">
                        <label className="text-[11px] font-medium text-slate-400 ml-1">Owner (PM)</label>
                        <div 
                          onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm flex justify-between items-center cursor-pointer hover:bg-white/[0.08] transition-all min-h-[46px]"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            {formData.assigned_user ? (
                              formData.assigned_user.split(', ').map((userName, i) => {
                                const user = usersList.find(u => u.name === userName);
                                return (
                                  <div key={i} className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full pl-1 pr-1.5 py-0.5 group/pill hover:border-blue-500/40 transition-all">
                                    <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 bg-white/10 flex items-center justify-center">
                                      {user?.avatar ? (
                                        <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="text-[9px] font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
                                      )}
                                    </div>
                                    <span className="text-[10px] font-bold text-blue-400 whitespace-nowrap">{userName}</span>
                                    <button 
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const current = formData.assigned_user ? formData.assigned_user.split(', ').filter(x => x) : [];
                                        const next = current.filter(u => u !== userName);
                                        setFormData({...formData, assigned_user: next.join(', ')});
                                      }}
                                      className="p-0.5 hover:bg-blue-500/20 rounded-full text-blue-400/40 hover:text-red-400 transition-all"
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                );
                              })
                            ) : (
                              <span className="text-slate-500">-- Pilih User --</span>
                            )}
                          </div>
                          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform flex-shrink-0 ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>

                        <AnimatePresence>
                          {isUserDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setIsUserDropdownOpen(false)} />
                              <motion.div 
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-[110%] left-0 right-0 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar flex flex-col p-1"
                              >
                                <div 
                                  onClick={() => { setFormData({...formData, assigned_user: ''}); setIsUserDropdownOpen(false); }}
                                  className="px-4 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white rounded-lg cursor-pointer transition-all mx-1 mb-1"
                                >
                                  -- Kosongkan --
                                </div>
                                {usersList.map(u => {
                                  const isSelected = formData.assigned_user?.split(', ').includes(u.name);
                                  return (
                                    <div 
                                      key={u.id}
                                      onClick={() => { 
                                        const current = formData.assigned_user ? formData.assigned_user.split(', ').filter(x => x) : [];
                                        const next = isSelected ? current.filter(x => x !== u.name) : [...current, u.name];
                                        setFormData({...formData, assigned_user: next.join(', ')});
                                      }}
                                      className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/5 rounded-lg transition-all mx-1 ${isSelected ? 'bg-blue-500/10 border-blue-500/20' : ''}`}
                                    >
                                      <div className="flex items-center gap-3">
                                        {u.avatar ? (
                                          <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10" />
                                        ) : (
                                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                                            {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                                          </div>
                                        )}
                                        <div>
                                          <p className={`text-sm font-bold ${isSelected ? 'text-blue-400' : 'text-white'}`}>{u.name}</p>
                                        </div>
                                      </div>
                                      {isSelected && <CheckCircle className="w-4 h-4 text-blue-400" />}
                                    </div>
                                  );
                                })}
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Financials & Timeline */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5" /> Financials & Timeline
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="col-span-full space-y-2">
                        <label className="text-[11px] font-medium text-slate-400 ml-1">Budget (IDR)</label>
                        <div className="relative">
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input 
                            type="text" required 
                            value={formData.price.toLocaleString('id-ID')} 
                            onChange={e => {
                              const val = e.target.value.replace(/\./g, '');
                              if (!isNaN(Number(val))) {
                                setFormData({...formData, price: Number(val)});
                              }
                            }} 
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-blue-500/50 transition-all font-mono"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-medium text-slate-400 ml-1">Start Date</label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input 
                            type="date" required 
                            value={formData.start_date} 
                            onChange={e => setFormData({...formData, start_date: e.target.value})} 
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-blue-500/50 transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-medium text-slate-400 ml-1">Estimated End Date</label>
                        <div className="relative">
                          <CheckCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input 
                            type="date"
                            value={formData.end_date} 
                            onChange={e => setFormData({...formData, end_date: e.target.value})} 
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none focus:border-blue-500/50 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Project Materials */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5" /> Project Materials
                    </h3>
                    
                    <Reorder.Group 
                      axis="y" 
                      values={currentProjectFiles} 
                      onReorder={(newFiles) => setFormData({ ...formData, project_files: JSON.stringify(newFiles) })}
                      className="space-y-3"
                    >
                      {currentProjectFiles.map((file: any, index: number) => (
                        <Reorder.Item 
                          key={file.id} 
                          value={file}
                          whileDrag={{ 
                            scale: 1.02, 
                            backgroundColor: "rgba(255, 255, 255, 0.08)",
                            boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.5)",
                          }}
                          className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl group hover:border-blue-500/30 cursor-grab active:cursor-grabbing relative z-0"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="text-slate-600 group-hover:text-slate-400 transition-colors">
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-[11px] font-bold text-white truncate max-w-[80px] md:max-w-[120px]">{file.name}</p>
                              <p className="text-[9px] text-slate-500 uppercase">{file.size}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={() => downloadFile(file)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg">
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => removeFile(index)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/5 rounded-lg">
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </Reorder.Item>
                      ))}

                      <label className="flex items-center justify-center gap-3 p-4 border-2 border-dashed border-white/10 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] hover:border-blue-500/30 cursor-pointer transition-all group">
                        <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.rar,.zip" className="hidden" onChange={handleFileUpload} />
                        <FileBox className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                        <div className="text-left">
                          <p className="text-[11px] font-bold text-white">Upload Materials</p>
                          <p className="text-[9px] text-slate-500">PDF, Image, or Archive up to 10MB each</p>
                        </div>
                      </label>
                    </Reorder.Group>
                  </div>

                  {/* Description */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      Description & Notes
                    </h3>
                      <textarea 
                        rows={8} 
                        value={formData.description} 
                        onChange={e => setFormData({...formData, description: e.target.value})} 
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50 resize-none min-h-[250px] custom-scrollbar" 
                        placeholder="Enter project scope, technical requirements, or additional client notes..." 
                      />
                  </div>
                </div>
                </div>

                {/* Panel Footer - outside scroll area */}
                <div className="flex-shrink-0">
                  {saveError && (
                    <div className="mx-5 mb-0 mt-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-medium">
                      ⚠️ {saveError}
                    </div>
                  )}
                  <div className="p-5 md:p-6 border-t border-white/5 bg-[#0D0D0D] flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)} 
                      className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Saving...</>
                      ) : (
                        editingProject ? 'Save Changes' : 'Create Project'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDeleteModalOpen(false)} className="absolute inset-0 bg-black/80" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#121212] border border-white/10 w-full max-w-sm rounded-3xl p-6 md:p-8 text-center relative z-10"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Delete Project?</h3>
              <p className="text-xs text-slate-400 mb-6">Are you sure you want to remove <span className="text-white font-semibold">"{projectToDelete?.name}"</span>? This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all">Cancel</button>
                <button onClick={handleDelete} className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-600/20">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Project Detail View Panel */}
      <AnimatePresence>
        {isViewOpen && viewingProject && (
          <div className="fixed inset-0 z-[80] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !previewFile && setIsViewOpen(false)} className="absolute inset-0 bg-black/40 z-[10]" />
            
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xl md:max-w-2xl bg-[#0D0D0D] border-l border-white/10 shadow-2xl h-full flex flex-col z-[30]"
            >
              {/* Header */}
              <div className="p-5 md:p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/10 rounded-xl">
                    <Eye className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Project Details</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Read-only client information</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setIsViewOpen(false); handleOpenModal(viewingProject); }}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-all"
                  >
                    Edit
                  </button>
                  <button onClick={() => setIsViewOpen(false)} className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-5 md:p-8 space-y-8">

                  {/* Project Thumbnail */}
                  {viewingProject.image && (
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5" /> Media & Preview
                      </h3>
                      <div className="aspect-video w-full max-w-sm rounded-2xl overflow-hidden bg-white/5 border border-white/10 mx-auto">
                        <img src={viewingProject.image} alt={viewingProject.name} className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest
                      ${viewingProject.status === 'active' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                        viewingProject.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                        viewingProject.status === 'canceled' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                      {viewingProject.status === 'canceled' ? 'Cancel' : viewingProject.status}
                    </span>
                    <span className="text-xs text-slate-500 capitalize">{viewingProject.service_type.replace('_', ' ')}</span>
                  </div>

                  {viewingProject.assigned_user && (
                    <div className="space-y-3 mt-3">
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> Owner (PM)
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {viewingProject.assigned_user.split(', ').map((userName, i) => {
                          const user = usersList.find(u => u.name === userName);
                          return (
                            <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 p-2 rounded-xl">
                              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-white/10 flex items-center justify-center">
                                {user?.avatar ? (
                                  <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-xs font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
                                )}
                              </div>
                              <p className="text-sm font-bold text-white pr-2">{userName}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Project Name */}
                  <div>
                    <h3 className="text-2xl font-bold text-white">{viewingProject.name}</h3>
                    {viewingProject.description && (
                      <p className="text-sm text-slate-400 mt-2 leading-relaxed">{viewingProject.description}</p>
                    )}
                  </div>

                  {/* Client Info */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Client Information
                    </h4>
                    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                          {viewingProject.client_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{viewingProject.client_name}</p>
                          <p className="text-[10px] text-slate-500">Project Client</p>
                        </div>
                      </div>
                      {viewingProject.client_email && (
                        <div className="flex items-center gap-3 text-sm">
                          <div className="p-2 bg-white/5 rounded-lg"><Mail className="w-4 h-4 text-slate-400" /></div>
                          <span className="text-slate-300">{viewingProject.client_email}</span>
                        </div>
                      )}
                      {viewingProject.client_phone && (
                        <div className="flex items-center gap-3 text-sm">
                          <div className="p-2 bg-white/5 rounded-lg"><Phone className="w-4 h-4 text-slate-400" /></div>
                          <span className="text-slate-300">{viewingProject.client_phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financials & Timeline */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5" /> Financials & Timeline
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 bg-white/[0.03] border border-white/5 rounded-xl p-4">
                        <p className="text-[10px] text-slate-500 mb-1">Budget</p>
                        <p className="text-base font-bold text-white">IDR {Number(viewingProject.price).toLocaleString('id-ID')}</p>
                      </div>
                      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                        <p className="text-[10px] text-slate-500 mb-1">Start Date</p>
                        <p className="text-sm font-bold text-white">{viewingProject.start_date || '—'}</p>
                      </div>
                      {viewingProject.end_date && (
                        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                          <p className="text-[10px] text-slate-500 mb-1">Estimated End Date</p>
                          <p className="text-sm font-bold text-emerald-400">{viewingProject.end_date}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Project Files */}
                  {(() => {
                    try {
                      const files = JSON.parse(viewingProject.project_files || '[]');
                      if (files.length === 0) return null;
                      return (
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Paperclip className="w-3.5 h-3.5" /> Project Materials
                          </h4>
                          <div className="space-y-2">
                            {files.map((file: any, i: number) => (
                              <div key={i} className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/5 rounded-xl hover:border-blue-500/20 transition-all group">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <FileText className="w-4 h-4 text-blue-400" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-white truncate max-w-[100px] md:max-w-[140px]">{file.name}</p>
                                    <p className="text-[9px] text-slate-500">{file.size}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {(file.name.toLowerCase().endsWith('.pdf') || 
                                    ['.jpg', '.jpeg', '.png', '.webp', '.gif'].some(ext => file.name.toLowerCase().endsWith(ext))) && (
                                    <button
                                      onClick={() => setPreviewFile(file)}
                                      className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-white/5 rounded-lg transition-all"
                                      title="Preview Document"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <a
                                    href={file.path || file.data}
                                    download={file.name}
                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    } catch { return null; }
                  })()}

                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-white/5 bg-[#0D0D0D] flex gap-3 flex-shrink-0">
                <button onClick={() => setIsViewOpen(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-all">
                  Close
                </button>
                <button
                  onClick={() => { setIsViewOpen(false); handleOpenModal(viewingProject); }}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20"
                >
                  Edit Project
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* PDF Preview Side Panel */}
      <AnimatePresence>
        {previewFile && isViewOpen && (
          <div className="fixed inset-0 z-[82] flex justify-end">
            {/* Transparent backdrop to catch clicks outside the preview panel, but doesn't block the detail panel */}
            <div className="absolute inset-0" onClick={() => setPreviewFile(null)} />
            
            <motion.div
              initial={{ x: '100%', opacity: 0 }} 
              animate={{ x: '-672px', opacity: 1 }} 
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="absolute top-0 bottom-0 w-full max-w-2xl bg-[#0D0D0D] border-l border-white/10 shadow-2xl flex flex-col z-[20]"
              style={{ right: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header - Matched with Detail Panel */}
              <div className="p-5 md:p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-xl">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight truncate max-w-[120px] md:max-w-[240px]">{previewFile.name}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Read-only document preview</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex items-center bg-white/5 rounded-xl px-1 mr-2 border border-white/5">
                    <button 
                      onClick={() => setIsGrabMode(!isGrabMode)}
                      className={`p-1.5 rounded-lg transition-all ${isGrabMode ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-white'}`}
                      title="Grab Tool (Drag to scroll)"
                    >
                      <Hand className="w-4 h-4" />
                    </button>
                    <div className="w-[1px] h-4 bg-white/10 mx-1" />
                    <button 
                      onClick={() => setPdfZoom(prev => Math.max(50, prev - 25))}
                      className="p-1.5 text-slate-400 hover:text-white transition-all"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-bold text-slate-500 w-10 text-center">{pdfZoom}%</span>
                    <button 
                      onClick={() => setPdfZoom(prev => Math.min(300, prev + 25))}
                      className="p-1.5 text-slate-400 hover:text-white transition-all"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </div>
                  <a 
                    href={previewFile.path || previewFile.data} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-cyan-400 transition-all"
                    title="Open in New Tab for full tools"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                  <button 
                    onClick={() => window.print()} 
                    className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all"
                    title="Print Document"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => downloadFile(previewFile)} 
                    className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all"
                    title="Download File"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setPreviewFile(null)} 
                    className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all"
                    title="Close Preview"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* PDF Content Area */}
              <div 
                id="pdf-container"
                className={`flex-1 bg-[#0A0A0A] overflow-auto custom-scrollbar relative ${isGrabMode ? 'cursor-grab active:cursor-grabbing select-none' : ''}`}
                onMouseDown={(e) => {
                  if (!isGrabMode) return;
                  const container = e.currentTarget;
                  const startX = e.pageX - container.offsetLeft;
                  const startY = e.pageY - container.offsetTop;
                  const scrollLeft = container.scrollLeft;
                  const scrollTop = container.scrollTop;

                  const onMouseMove = (e: MouseEvent) => {
                    const x = e.pageX - container.offsetLeft;
                    const y = e.pageY - container.offsetTop;
                    const walkX = (x - startX) * 2.2;
                    const walkY = (y - startY) * 2.2;
                    container.scrollLeft = scrollLeft - walkX;
                    container.scrollTop = scrollTop - walkY;
                  };

                  const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                  };

                  document.addEventListener('mousemove', onMouseMove);
                  document.addEventListener('mouseup', onMouseUp);
                }}
              >
                {isGrabMode && <div className="absolute inset-0 z-10" />}
                <div 
                  className="transition-all duration-200 ease-out"
                  style={{ 
                    width: pdfZoom === 100 ? '100%' : `${pdfZoom}%`, 
                    height: pdfZoom === 100 ? '100%' : `${pdfZoom * 1.5}vh`,
                    minHeight: '100%'
                  }}
                >
                  {['.jpg', '.jpeg', '.png', '.webp', '.gif'].some(ext => previewFile.name.toLowerCase().endsWith(ext)) ? (
                    <img 
                      src={previewFile.path || previewFile.data} 
                      alt={previewFile.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <iframe 
                      src={previewFile.path || previewFile.data} 
                      className="w-full h-full border-none"
                      title="Document Preview"
                    />
                  )}
                </div>
              </div>
              
              {/* Footer to match the look */}
              <div className="p-5 border-t border-white/5 bg-[#0D0D0D] flex justify-center">
                <p className="text-[10px] text-slate-600 font-medium uppercase tracking-widest">End of Document</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className={`fixed top-8 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl ${
              toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
              toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
              'bg-blue-500/10 border-blue-500/20 text-blue-400'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : 
             toast.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : 
             <Trash2 className="w-5 h-5" />}
            <span className="text-sm font-bold">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 p-1 hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {isResetModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#0D0D0D] border border-white/10 rounded-2xl p-6 shadow-2xl relative z-[1000]"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-white">Reset Visitors?</h3>
              </div>
              <p className="text-sm text-slate-400 mb-6">This will reset the total visitor count back to 0. This action cannot be undone.</p>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleResetVisitors}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-red-600/20"
                >
                  Confirm Reset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
