import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Reveal } from '../ui/Reveal';

const FAQ: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: "Berapa lama proses pembuatan satu website?",
      a: "Waktu pengerjaan bervariasi tergantung paket. Paket Basic memakan waktu 4-7 hari, sedangkan Paket Profesional dan Premium berkisar antara 10-14 hari kerja."
    },
    {
      q: "Apakah harga sudah termasuk hosting dan domain?",
      a: "Ya, untuk tahun pertama kami memberikan gratis Hosting Cloud kecepatan tinggi dan Domain (.com/.id/.net) untuk setiap paket yang Anda pilih."
    },
    {
      q: "Apakah website yang dibuat bisa saya edit sendiri?",
      a: "Tentu. Kami menggunakan sistem CMS (Content Management System) yang memudahkan Anda untuk mengubah teks, gambar, atau menambahkan artikel blog tanpa harus mengerti bahasa pemrograman."
    },
    {
      q: "Bagaimana dengan sistem keamanannya?",
      a: "Setiap website yang kami bangun dilengkapi dengan sertifikat SSL (HTTPS) gratis dan sistem keamanan standar industri untuk melindungi data Anda dan pengunjung."
    },
    {
      q: "Siapa pemilik konten yang saya buat?",
      a: "Seluruh konten dan data yang ada pada website atau aplikasi Anda sepenuhnya adalah milik Anda. Kami hanya membantu dalam proses pengembangan dan pemeliharaan sistem."
    }
  ];

  return (
    <section id="faq" className="py-12 lg:py-32 bg-bg-dark light-theme:bg-white transition-colors duration-500">
      <div className="max-w-[1280px] mx-auto px-8">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
          <div className="lg:w-1/3 text-left">
            <Reveal>
              <h2 className="text-xl md:text-3xl lg:text-5xl font-semibold text-white mb-4 lg:mb-8 leading-tight light-theme:text-slate-900">Answers to your top questions</h2>
              <p className="text-xs md:text-base lg:text-lg mb-6 lg:mb-12 light-theme:text-slate-600">Everything you need to know about working with Garuda Nexa.</p>
              <button className="btn btn-secondary px-6 py-2 md:px-8 md:py-2.5 lg:py-3 text-xs md:text-sm lg:text-base light-theme:bg-slate-900 light-theme:text-white">Contact support</button>
            </Reveal>
          </div>

          <div className="lg:w-2/3">
            <div className="space-y-2 lg:space-y-4">
              {faqs.map((faq, index) => (
                <Reveal key={index} delay={0.2 + (index * 0.1)}>
                  <div 
                    className="glass-panel overflow-hidden light-theme:bg-white light-theme:border-slate-200 light-theme:shadow-none transition-all duration-300"
                  >
                    <button 
                      onClick={() => setActiveIndex(activeIndex === index ? null : index)}
                      className="w-full flex items-center justify-between p-4 lg:p-6 text-left hover:bg-white/5 light-theme:hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-sm md:text-base lg:text-lg font-medium text-white light-theme:text-slate-900">{faq.q}</span>
                      <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${activeIndex === index ? 'rotate-180' : ''}`} />
                    </button>
                    <div 
                      className={`transition-all duration-300 ease-in-out ${activeIndex === index ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
                    >
                      <div className="p-4 lg:p-6 pt-4 lg:pt-4 text-xs md:text-sm lg:text-base text-slate-400 leading-relaxed border-t border-white/5 light-theme:text-slate-600 light-theme:border-slate-100">
                        {faq.a}
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
