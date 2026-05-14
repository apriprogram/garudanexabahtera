import React from 'react';
import { MessageSquare, Palette, Code2, Rocket, CheckCircle2, RotateCcw } from 'lucide-react';
import { Reveal } from '../ui/Reveal';
import { motion, AnimatePresence } from 'framer-motion';

const Process: React.FC = () => {
  const [activeStep, setActiveStep] = React.useState<string | null>(null);

  const steps = [
    {
      id: '01',
      title: 'Consultation',
      desc: 'Needs Analysis & Planning',
      detail: 'Kami memulai dengan mendalami visi bisnis Anda. Sesi brainstorming intensif untuk menentukan fitur utama, target pasar, dan strategi teknologi yang paling efektif untuk mencapai tujuan Anda.',
      icon: <MessageSquare className="w-8 h-8" />,
      color: 'from-blue-500 to-cyan-400'
    },
    {
      id: '02',
      title: 'Desain UI/UX',
      desc: 'Wireframing & Prototyping',
      detail: 'Fokus pada pengalaman pengguna yang intuitif dan estetika modern. Kami membuat purwarupa interaktif sehingga Anda dapat merasakan alur navigasi aplikasi sebelum proses coding dimulai.',
      icon: <Palette className="w-8 h-8" />,
      color: 'from-purple-500 to-pink-400'
    },
    {
      id: '03',
      title: 'Development',
      desc: 'Coding & System Testing',
      detail: 'Tim engineer kami membangun sistem menggunakan teknologi terkini yang skalabel. Kami menerapkan standar keamanan tinggi dan pengujian menyeluruh (QA) untuk memastikan performa yang stabil.',
      icon: <Code2 className="w-8 h-8" />,
      color: 'from-indigo-500 to-blue-400'
    },
    {
      id: '04',
      title: 'Launching',
      desc: 'Deployment & Maintenance',
      detail: 'Membantu proses rilis ke App Store/Play Store atau hosting cloud. Kami tidak berhenti di sana; kami menyediakan dukungan teknis berkelanjutan dan pemeliharaan untuk menjaga sistem tetap prima.',
      icon: <Rocket className="w-8 h-8" />,
      color: 'from-orange-500 to-yellow-400'
    }
  ];

  const profits = [
    'Bug Warranty',
    'Free Consultation',
    'Responsive Support',
    'Free Hosting & Domain',
    'Usage Training'
  ];

  return (
    <section id="process" className="py-12 lg:py-32 bg-[#0a0a0b] light-theme:bg-slate-50 relative overflow-hidden transition-colors duration-500">
      <div className="max-w-[1280px] mx-auto px-8 relative z-10">
        <Reveal>
          <div className="text-center mb-8 lg:mb-12 px-4">
            <h2 className="text-xl md:text-3xl lg:text-5xl font-semibold text-white mb-4 light-theme:text-slate-900 tracking-tight">Proses Pengembangan</h2>
            <p className="text-slate-400 text-xs md:text-sm lg:text-lg light-theme:text-slate-600 max-w-2xl mx-auto">
              Membangun Sistem Digital yang Bekerja Maksimal untuk Bisnis Anda. Klik setiap kartu untuk detail lebih lanjut.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {steps.map((step, index) => (
            <Reveal key={step.id} delay={0.2 + (index * 0.1)}>
              <div 
                className="group perspective-1000 h-[280px] lg:h-[350px] cursor-pointer my-2 lg:my-4 mx-2"
                onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
              >
                <motion.div 
                  initial={false}
                  animate={{ rotateY: activeStep === step.id ? 180 : 0 }}
                  transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                  className="relative w-full h-full preserve-3d"
                >
                  {/* Front Side */}
                  <div className={`absolute inset-0 backface-hidden p-6 lg:p-10 rounded-[30px] bg-white/5 border transition-all duration-500 flex flex-col items-start overflow-hidden ${
                    activeStep === step.id 
                      ? 'border-primary' 
                      : 'border-white/10 group-hover:border-primary/50 light-theme:bg-white light-theme:border-slate-200 light-theme:group-hover:border-primary/50'
                  }`}>
                    {/* Bottom Gradient on Hover */}
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    
                    <div className="flex items-center mb-6 lg:mb-8 w-full">
                      <div className={`${
                        step.id === '01' ? 'text-blue-500' : 
                        step.id === '02' ? 'text-purple-500' : 
                        step.id === '03' ? 'text-indigo-500' : 
                        'text-orange-500'
                      }`}>
                        {React.cloneElement(step.icon as React.ReactElement, { className: "w-10 h-10 lg:w-14 lg:h-14" })}
                      </div>
                    </div>
                    
                    <div className="absolute top-6 lg:top-10 right-6 lg:right-10 text-xs lg:text-sm font-black opacity-40 text-slate-500">
                      {step.id}
                    </div>
                    
                    <h3 className="text-lg lg:text-2xl font-semibold text-white mb-2 lg:mb-3 light-theme:text-slate-900">{step.title}</h3>
                    <p className="text-slate-400 text-[10px] lg:text-sm leading-relaxed light-theme:text-slate-600">{step.desc}</p>
                    
                    <div className="mt-auto w-full pt-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Detail Langkah</span>
                      <div className="w-6 h-px bg-slate-500/30" />
                    </div>
                  </div>

                  {/* Back Side */}
                  <div className={`absolute inset-0 backface-hidden rotate-y-180 p-6 lg:p-10 rounded-[30px] bg-[#121214] border flex flex-col items-start text-left transition-all duration-500 ${
                    activeStep === step.id 
                      ? 'border-primary' 
                      : 'border-white/10 light-theme:bg-slate-50 light-theme:border-slate-200'
                  } light-theme:bg-slate-50`}>
                    <div className="flex items-center gap-4 mb-6 w-full">
                      <div className={`${
                        step.id === '01' ? 'text-blue-500' : 
                        step.id === '02' ? 'text-purple-500' : 
                        step.id === '03' ? 'text-indigo-500' : 
                        'text-orange-500'
                      }`}>
                        {React.cloneElement(step.icon as React.ReactElement, { className: "w-8 h-8 lg:w-10 lg:h-10" })}
                      </div>
                      <h4 className="text-sm font-bold text-white light-theme:text-slate-900 uppercase tracking-[1px]">Detail {step.title}</h4>
                    </div>
                    
                    <p className="text-slate-300 text-xs lg:text-[13px] leading-relaxed light-theme:text-slate-700 font-medium mb-auto transition-colors duration-500">
                      {step.detail}
                    </p>
                  </div>
                </motion.div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.6}>
          <div className="mt-4 lg:mt-6 p-6 sm:p-8 lg:p-12 rounded-2xl lg:rounded-3xl bg-[#0f0f12] border border-white/5 hover:border-primary/50 transition-all duration-500 light-theme:bg-white light-theme:border-slate-200 light-theme:hover:border-primary/50 relative overflow-hidden w-full text-left group/benefits">
            {/* Bottom Gradient on Hover */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-primary/10 to-transparent opacity-0 group-hover/benefits:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 lg:gap-12 w-full relative z-10">
              <div className="lg:w-1/4 text-left w-full">
                <div className="h-1 bg-primary w-12 mb-4 rounded-full" />
                <h4 className="text-base lg:text-xl font-semibold text-white tracking-tight uppercase leading-tight light-theme:text-slate-900">
                  Keuntungan<br />Termasuk:
                </h4>
              </div>
              
              <div className="lg:w-3/4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-3 lg:gap-y-6 gap-x-8 w-full">
                {profits.map((profit, index) => (
                  <div key={index} className="flex items-center justify-start gap-3 group text-left">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 shrink-0" />
                    <span className="text-slate-300 text-[11px] sm:text-sm font-semibold light-theme:text-slate-600 group-hover:text-white light-theme:group-hover:text-primary transition-colors">
                      {profit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default Process;
