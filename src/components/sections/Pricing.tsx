import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Reveal } from '../ui/Reveal';
import { motion } from 'framer-motion';

const Pricing: React.FC = () => {
   const defaultPlans = [
    {
      name: 'Basic Package',
      description: 'For SMEs & landing pages',
      price: 'Rp 2.000.000',
      period: 'one-time',
      buttonText: 'Pilih Paket',
      features: 'Max 5 Pages, Form & WA Button, 1 Month Maintenance, Basic SEO, Duration: 4-7 Days',
      isPopular: false
    },
    {
      name: 'Professional Package',
      description: 'Exclusive custom design',
      price: 'Rp 4.500.000',
      period: 'one-time',
      buttonText: 'Pilih Paket',
      features: 'Max 10 Pages, Custom Branding Design, CMS & Blog, Advanced SEO Optimization, Duration: 10-14 Days',
      isPopular: true
    },
    {
      name: 'Premium Package',
      description: 'E-commerce & Custom Systems',
      price: 'Rp 8.500.000',
      period: 'one-time',
      buttonText: 'Pilih Paket',
      features: 'Dynamic Web / E-Commerce, Catalog & Cart, Payment Gateway, Membership / Account, 3 Months Maintenance',
      isPopular: false
    }
  ];

  const [title, setTitle] = useState("Pricelist Product");
  const [subtitle, setSubtitle] = useState("Modern website and app development solutions");
  const [plans, setPlans] = useState<any[]>(defaultPlans);

  useEffect(() => {
    const fetchDynamicData = async () => {
      try {
        const apiUrl = '/api.php';
        const response = await fetch(`${apiUrl}?action=get_settings`);
        const data = await response.json();
        if (data.pricing_title) setTitle(data.pricing_title);
        if (data.pricing_subtitle) setSubtitle(data.pricing_subtitle);
        if (data.pricing_data) {
          setPlans(JSON.parse(data.pricing_data));
        }
      } catch (e) {
        console.error('Error fetching dynamic pricing:', e);
      }
    };
    fetchDynamicData();
  }, []);

  return (
    <section id="pricing" className="py-12 lg:py-32 bg-bg-dark relative overflow-hidden light-theme:bg-white transition-colors duration-500">
      <div className="max-w-[1280px] mx-auto px-8 relative z-10">
        <Reveal>
          <div className="text-center mb-6 sm:mb-12 lg:mb-20 px-4">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-semibold text-white mb-4 light-theme:text-slate-900 tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs md:text-sm lg:text-xl text-slate-400 light-theme:text-slate-500 max-w-2xl mx-auto mt-2 md:mt-4">
                {subtitle}
              </p>
            )}
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch pt-2 sm:pt-10 max-w-[1240px] mx-auto">
          {plans.map((plan, index) => {
            const featureList = typeof plan.features === 'string' 
              ? plan.features.split(',').map((f: string) => f.trim()).filter(Boolean)
              : (Array.isArray(plan.features) ? plan.features : []);

            return (
              <Reveal key={index} delay={0.2 + (index * 0.1)} width="100%" height="100%" overflowVisible={true}>
                <motion.div 
                  whileHover={{ y: -15 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={`relative h-full p-10 rounded-[30px] border transition-all duration-500 flex flex-col hover:border-[#D4AF37] hover:shadow-[0_0_25px_rgba(212,175,55,0.3)] ${
                    plan.isPopular 
                    ? 'bg-[#0f0f12] border-primary light-theme:bg-white light-theme:border-primary shadow-[0_20px_50px_rgba(59,130,246,0.1)]' 
                    : 'bg-[#0f0f12] border-white/5 light-theme:bg-white light-theme:border-slate-200'
                  }`}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-primary text-white text-[10px] font-semibold uppercase tracking-widest rounded-full z-20">
                      Best Value
                    </div>
                  )}

                  <div className="mb-6 sm:mb-8">
                    <h3 className="text-base sm:text-2xl font-semibold text-white mb-1.5 light-theme:text-slate-900">{plan.name}</h3>
                    <p className="text-slate-400 text-[10px] sm:text-xs mb-4 sm:mb-6 light-theme:text-slate-500 leading-relaxed">{plan.description}</p>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-2xl sm:text-4xl font-semibold text-white light-theme:text-slate-900 leading-none">
                        {plan.price.toLowerCase().startsWith('rp') ? plan.price : `Rp ${plan.price}`}
                      </span>
                    </div>
                  </div>

                  <a 
                    href={`https://wa.me/6285188009152?text=Halo%20Admin%2C%20saya%20tertarik%20dengan%20paket%20${encodeURIComponent(plan.name)}`}
                    target="_blank"
                    className={`w-full py-2.5 sm:py-3 rounded-xl font-semibold text-[10px] sm:text-xs mb-8 sm:mb-10 text-center transition-all duration-300 ${
                      plan.isPopular 
                      ? 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20 block' 
                      : 'bg-white/5 text-white hover:bg-white/10 border border-white/10 light-theme:bg-slate-900 light-theme:text-white light-theme:hover:bg-slate-800 block'
                    }`}
                  >
                    {plan.buttonText || 'Pilih Paket'}
                  </a>

                  <ul className="space-y-3 sm:space-y-4 mt-auto">
                    {featureList.map((feature: string, fIndex: number) => (
                      <li key={fIndex} className="flex items-start gap-2 sm:gap-3 text-slate-400 text-[10px] sm:text-xs light-theme:text-slate-600 text-left">
                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      </div>
      
      {/* Decorative Blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[150px] rounded-full -z-0 opacity-50 pointer-events-none" />
    </section>
  );
};

export default Pricing;
