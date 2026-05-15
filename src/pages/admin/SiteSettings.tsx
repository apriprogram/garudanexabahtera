import React, { useState, useEffect } from 'react';
import { 
  Layout, 
  Image as ImageIcon, 
  Package, 
  Briefcase, 
  CreditCard, 
  Activity, 
  Settings, 
  HelpCircle, 
  Maximize2,
  Save,
  CheckCircle2,
  AlertCircle,
  X,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HeroSettings from './HeroSettings';

const SiteSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('hero');
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
    description: string;
  } | null>(null);

  const tabs = [
    { id: 'hero', label: 'Hero Section', icon: ImageIcon },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
    { id: 'process', label: 'Process', icon: Activity },
    { id: 'pricing', label: 'Pricelist', icon: CreditCard },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
    { id: 'services', label: 'Services', icon: Settings },
    { id: 'footer', label: 'Footer', icon: Layout },
  ];

  const showNotify = (type: 'success' | 'error' | 'warning', message: string, description: string) => {
    setNotification({ type, message, description });
    setTimeout(() => setNotification(null), 4000);
  };

  const [settings, setSettings] = useState<any>({});

  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [heroLogos, setHeroLogos] = useState<{name: string, src: string}[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost/api.php' : '/api.php';
      const response = await fetch(`${apiUrl}?action=get_settings`);
      const data = await response.json();
      setSettings(data);
      if (data.hero_images) setHeroImages(JSON.parse(data.hero_images));
      if (data.hero_logos) setHeroLogos(JSON.parse(data.hero_logos));
    } catch (error) {
      console.error('Error fetching settings:', error);
      showNotify('error', 'Error!', 'Failed to fetch website settings.');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    // Use IDs to get values from the modular component
    const updatedSettings = {
      ...settings,
      hero_badge: (document.getElementById('hero_badge') as HTMLInputElement)?.value,
      hero_title: (document.getElementById('hero_title') as HTMLTextAreaElement)?.value,
      hero_subtitle: (document.getElementById('hero_subtitle') as HTMLTextAreaElement)?.value,
      hero_primary_btn: (document.getElementById('hero_primary_btn') as HTMLInputElement)?.value,
      hero_secondary_btn: (document.getElementById('hero_secondary_btn') as HTMLInputElement)?.value,
      hero_images: JSON.stringify(heroImages),
      hero_logos: JSON.stringify(heroLogos)
    };

    try {
      const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost/api.php' : '/api.php';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'update_settings',
          settings: updatedSettings
        })
      });
      const data = await response.json();
      if (data.success) {
        showNotify('success', 'Settings Saved!', 'Website content has been updated successfully.');
        setSettings(updatedSettings);
      } else {
        throw new Error(data.error || 'Server error');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showNotify('error', 'Save Failed!', 'Could not connect to the API. Make sure XAMPP is running.');
    } finally {
      setIsSaving(false);
    }
  };

  const getNotifyStyles = () => {
    switch (notification?.type) {
      case 'success': return {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        iconBg: 'bg-emerald-500',
        icon: <CheckCircle2 className="w-4 h-4 text-white" />,
        shadow: 'shadow-emerald-500/20'
      };
      case 'error': return {
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/20',
        iconBg: 'bg-rose-500',
        icon: <AlertCircle className="w-4 h-4 text-white" />,
        shadow: 'shadow-rose-500/20'
      };
      case 'warning': return {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        iconBg: 'bg-amber-500',
        icon: <AlertCircle className="w-4 h-4 text-white" />,
        shadow: 'shadow-amber-500/20'
      };
      default: return null;
    }
  };

  const notifyStyles = getNotifyStyles();

  return (
    <div className="space-y-6 md:space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-white tracking-tight">Site Settings</h1>
          <p className="text-[10px] md:text-sm text-slate-400 mt-1">Manage global configuration and sections.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-4 py-2.5 md:px-6 md:py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg md:rounded-xl font-medium transition-all shadow-lg shadow-blue-600/20 active:scale-95 text-[11px] md:text-sm"
        >
          {isSaving ? (
            <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4 md:w-5 md:h-5" />
          )}
          {isSaving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
      
      {/* Dynamic Notification */}
      <AnimatePresence>
        {notification && notifyStyles && (
          <div className="fixed top-6 left-4 right-4 z-[100] flex justify-center pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className={`
                ${notifyStyles.bg} backdrop-blur-xl border-2 border-white/5
                px-6 py-3.5 md:px-8 md:py-4 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.7)] 
                flex items-center gap-4 md:gap-5 pointer-events-auto w-full max-w-[400px]
              `}
            >
              <div className="flex-shrink-0">
                {notification.type === 'success' && <CheckCircle2 className="w-5 h-5 md:w-7 md:h-7 text-emerald-500" />}
                {notification.type === 'error' && <AlertCircle className="w-5 h-5 md:w-7 md:h-7 text-rose-500" />}
                {notification.type === 'warning' && <AlertCircle className="w-5 h-5 md:w-7 md:h-7 text-amber-500" />}
              </div>
              <div>
                <p className="font-bold text-white text-sm md:text-base tracking-tight leading-none mb-1 md:mb-1.5">{notification.message}</p>
                <p className="text-[10px] md:text-[11px] text-slate-400 font-medium leading-tight">{notification.description}</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tabs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-2 flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2.5 px-3.5 py-2.5 md:px-4 md:py-3 rounded-xl transition-all whitespace-nowrap text-xs md:text-sm font-medium
                ${activeTab === tab.id 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-[inset_0_0_10px_rgba(37,99,235,0.1)]' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}
              `}
            >
              <tab.icon className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-10">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-[#0D0D0D] border border-white/5 rounded-2xl md:rounded-3xl p-5 md:p-10 shadow-2xl min-h-[400px] md:min-h-[600px] relative overflow-hidden"
          >
            {/* Decorative background element */}
            <div className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-blue-600/5 blur-[60px] md:blur-[100px] rounded-full pointer-events-none" />
            
            {/* Tab Title */}
            <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
              <div className="p-2.5 md:p-3 bg-blue-600/10 rounded-xl md:rounded-2xl text-blue-400">
                {React.createElement(tabs.find(t => t.id === activeTab)?.icon || ImageIcon, { className: 'w-5 h-5 md:w-6 md:h-6' })}
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-white capitalize">{activeTab} Settings</h2>
                <p className="text-slate-500 text-[10px] md:text-xs">Update the content and behavior of your {activeTab} section.</p>
              </div>
            </div>

            {/* Dynamic Form Content */}
            <div className="space-y-6 md:space-y-8">
              {activeTab === 'hero' ? (
                <HeroSettings 
                  settings={settings} 
                  heroImages={heroImages} 
                  setHeroImages={setHeroImages} 
                  heroLogos={heroLogos}
                  setHeroLogos={setHeroLogos}
                />
              ) : (
                <GenericSettingsContent tab={activeTab} />
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const GenericSettingsContent = ({ tab }: { tab: string }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 text-slate-500">
      <Settings className="w-8 h-8" />
    </div>
    <h3 className="text-xl font-semibold text-white mb-2 capitalize">{tab} Settings</h3>
    <p className="text-slate-400 max-w-sm">
      Configure your {tab} section settings here. This section is currently under development.
    </p>
  </div>
);

export default SiteSettings;
