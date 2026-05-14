import React from 'react';
import { Check } from 'lucide-react';
import { Reveal } from '../ui/Reveal';
import { motion } from 'framer-motion';

const Pricing: React.FC = () => {
  const plans = [
    {
      name: 'Basic Package',
      desc: 'For SMEs & landing pages',
      price: 'Rp 2.000.000',
      btnText: 'Get Started',
      features: [
        'Max 5 Pages',
        'Form & WA Button',
        '1 Month Maintenance',
        'Basic SEO',
        'Duration: 4-7 Days'
      ],
      popular: false
    },
    {
      name: 'Professional Package',
      desc: 'Exclusive custom design',
      price: 'Rp 4.500.000',
      btnText: 'Get Started',
      features: [
        'Max 10 Pages',
        'Custom Branding Design',
        'CMS & Blog',
        'Advanced SEO Optimization',
        'Duration: 10-14 Days'
      ],
      popular: true
    },
    {
      name: 'Premium Package',
      desc: 'E-commerce & Custom Systems',
      price: 'Rp 8.500.000',
      btnText: 'Contact Us',
      features: [
        'Dynamic Web / E-Commerce',
        'Catalog & Cart',
        'Payment Gateway',
        'Membership / Account',
        '3 Months Maintenance'
      ],
      popular: false
    }
  ];

  return (
    <section id="pricing" className="py-12 lg:py-32 bg-bg-dark relative overflow-hidden light-theme:bg-white transition-colors duration-500">
      <div className="max-w-[1280px] mx-auto px-8 relative z-10">
        <Reveal>
          <div className="text-center mb-6 sm:mb-12 lg:mb-20 px-4">
            <h2 className="text-xl md:text-3xl lg:text-7xl font-semibold text-white mb-4 light-theme:text-slate-900">Pricelist Product</h2>
            <p className="text-xs md:text-sm lg:text-2xl text-slate-400 light-theme:text-slate-500">Modern website and app development solutions</p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch pt-2 sm:pt-10"> {/* Added padding top to prevent clipping */}
          {plans.map((plan, index) => (
            <Reveal key={index} delay={0.2 + (index * 0.1)} width="100%" overflowVisible={true}>
              <motion.div 
                whileHover={{ y: -15 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={`relative h-full p-10 rounded-[30px] border transition-all duration-500 flex flex-col hover:border-yellow-400 ${
                  plan.popular 
                  ? 'bg-[#0f0f12] border-primary light-theme:bg-white light-theme:border-primary' 
                  : 'bg-[#0f0f12] border-white/5 light-theme:bg-white light-theme:border-slate-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-primary text-white text-[10px] font-semibold uppercase tracking-widest rounded-full z-20">
                    Best Value
                  </div>
                )}

                <div className="mb-6 sm:mb-8">
                  <h3 className="text-base sm:text-2xl font-semibold text-white mb-1.5 light-theme:text-slate-900">{plan.name}</h3>
                  <p className="text-slate-400 text-[10px] sm:text-sm mb-4 sm:mb-6 light-theme:text-slate-500">{plan.desc}</p>
                  <div className="text-2xl sm:text-4xl font-semibold text-white light-theme:text-slate-900">{plan.price}</div>
                </div>

                <button className={`w-full py-2.5 sm:py-3 rounded-xl font-semibold text-[10px] sm:text-xs mb-8 sm:mb-10 transition-all duration-300 ${
                  plan.popular 
                  ? 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20' 
                  : 'bg-white/5 text-white hover:bg-white/10 border border-white/10 light-theme:bg-slate-900 light-theme:text-white light-theme:hover:bg-slate-800'
                }`}>
                  Pilih Paket
                </button>

                <ul className="space-y-3 sm:space-y-4 mt-auto">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center gap-2 sm:gap-3 text-slate-400 text-[10px] sm:text-xs light-theme:text-slate-600">
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
      
      {/* Decorative Blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[150px] rounded-full -z-0 opacity-50 pointer-events-none" />
    </section>
  );
};

export default Pricing;
