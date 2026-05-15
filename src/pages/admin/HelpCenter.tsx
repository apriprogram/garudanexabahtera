import React from 'react';
import { HelpCircle, MessageCircle, Mail, ExternalLink, ShieldCheck, Zap, Package, CreditCard } from 'lucide-react';

const HelpCenter: React.FC = () => {
  const faqs = [
    {
      question: 'Bagaimana cara menambahkan produk baru?',
      answer: 'Anda bisa masuk ke menu "Products" di sidebar, lalu klik tombol "Add New Product" di pojok kanan atas.',
      icon: Package
    },
    {
      question: 'Bagaimana cara mengubah harga layanan?',
      answer: 'Buka menu "Website Settings", pilih tab "Pricelist", dan Anda bisa langsung mengedit harga pada kartu yang tersedia.',
      icon: CreditCard
    },
    {
      question: 'Apakah sistem ini mendukung backup data?',
      answer: 'Ya, database Garuda Nexa secara otomatis mencadangkan data setiap kali ada perubahan signifikan pada pengaturan situs.',
      icon: ShieldCheck
    },
    {
      question: 'Bagaimana cara mengganti gambar Hero?',
      answer: 'Buka "Website Settings" > "Hero Section". Anda bisa melakukan drag & drop pada area upload untuk menambah atau mengatur ulang urutan gambar.',
      icon: Zap
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-10 pb-10 md:pb-20">
      <div className="text-center space-y-2.5 md:space-y-4">
        <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600/10 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto border border-blue-600/20 mb-1 md:mb-2">
          <HelpCircle className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
        </div>
        <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight">Pusat Bantuan</h1>
        <p className="text-[10px] md:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">Kami di sini untuk membantu Anda mengelola Garuda Nexa dengan lancar. Temukan jawaban untuk pertanyaan umum atau hubungi tim teknis kami.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {faqs.map((faq, index) => (
          <div key={index} className="bg-[#0D0D0D] border border-white/5 rounded-2xl md:rounded-3xl p-6 md:p-8 hover:border-blue-500/30 transition-all group">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-white/5 rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-4 group-hover:bg-blue-600/20 transition-all">
              <faq.icon className="w-4 h-4 md:w-5 md:h-5 text-slate-400 group-hover:text-blue-400" />
            </div>
            <h3 className="text-base md:text-lg font-bold text-white mb-1.5 md:mb-2">{faq.question}</h3>
            <p className="text-[11px] md:text-sm text-slate-400 leading-relaxed">{faq.answer}</p>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8 md:gap-10">
        <div className="relative z-10 space-y-3 md:space-y-4">
          <h2 className="text-xl md:text-3xl font-bold text-white">Masih Butuh Bantuan?</h2>
          <p className="text-[10px] md:text-base text-blue-100 max-w-md">Tim support kami tersedia 24/7 untuk membantu masalah teknis atau pertanyaan Anda.</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4">
            <a 
              href="https://wa.me/6285188009152" 
              target="_blank" 
              className="flex items-center gap-2 bg-white text-blue-600 px-5 py-2.5 md:px-6 md:py-3 rounded-full text-xs md:text-base font-bold hover:bg-blue-50 transition-all shadow-xl"
            >
              <MessageCircle className="w-4 h-4" />
              Chat WhatsApp
            </a>
            <a 
              href="mailto:support@garudanexa.com" 
              className="flex items-center gap-2 bg-blue-700/50 text-white border border-white/20 px-5 py-2.5 md:px-6 md:py-3 rounded-full text-xs md:text-base font-bold hover:bg-blue-700 transition-all"
            >
              <Mail className="w-4 h-4" />
              Kirim Email
            </a>
          </div>
        </div>
        <div className="relative z-10 flex gap-3 md:gap-4">
          <div className="bg-white/10 backdrop-blur-md p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 text-center w-28 md:w-40">
            <p className="text-lg md:text-2xl font-bold text-white">99%</p>
            <p className="text-[8px] md:text-[10px] text-blue-200 uppercase tracking-widest font-bold">Uptime</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 text-center w-28 md:w-40">
            <p className="text-lg md:text-2xl font-bold text-white">24h</p>
            <p className="text-[8px] md:text-[10px] text-blue-200 uppercase tracking-widest font-bold">Response</p>
          </div>
        </div>
        
        {/* Background Decorative Circles */}
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] w-64 h-64 bg-black/10 rounded-full blur-3xl" />
      </div>
    </div>
  );
};

export default HelpCenter;
