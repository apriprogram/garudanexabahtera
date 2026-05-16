import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Chrome, ArrowLeft, Phone, Eye, EyeOff } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';

const Auth: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get('type') !== 'register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsLogin(searchParams.get('type') !== 'register');
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost/api.php' : '/api.php';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: isLogin ? 'login' : 'add_user', 
          email, 
          password, 
          name, 
          phone,
          role: 'user',
          status: 'active'
        })
      });
      const data = await response.json();
      
      if (data.success) {
        if (isLogin) {
          localStorage.setItem('currentUser', JSON.stringify(data.user));
          navigate('/admin');
        } else {
          alert('Registration successful! Please login.');
          setIsLogin(true);
        }
      } else {
        alert(data.error || 'Operation failed');
      }
    } catch (error) {
      alert('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white/5 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />

      <Link 
        to="/" 
        className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors group z-20 p-2.5 md:p-0 bg-white/5 md:bg-transparent rounded-full border border-white/5 md:border-none"
      >
        <ArrowLeft className="w-5 h-5 md:w-4 md:h-4 transition-transform group-hover:-translate-x-1" />
        <span className="text-sm font-medium hidden md:block">Back to Home</span>
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px] md:max-w-[480px] z-10"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2 md:mb-3">
            <img src="/assets/logo/logogarudanexa.png" alt="Logo" className="h-16 md:h-20 w-auto brightness-0 invert" />
          </div>
          <h1 className="text-xl md:text-3xl font-bold text-white mb-2 tracking-tight">
            {isLogin ? 'Welcome Back' : 'Get Started'}
          </h1>
          <p className="text-slate-400 text-xs md:text-sm">
            {isLogin 
              ? 'Sign in to manage your products and services' 
              : 'Create an account to order and access our solutions'}
          </p>
        </div>

        <motion.div 
          layout
          transition={{
            layout: { type: "spring", stiffness: 200, damping: 25 },
            opacity: { duration: 0.2 }
          }}
          className="bg-[#0D0D0D] p-5 md:p-8 border border-white/5 rounded-[2rem] md:rounded-3xl shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          
          {/* Tabs */}
          <div className="flex p-1 bg-black/40 backdrop-blur-md rounded-full mb-6 md:mb-8 border border-white/5 relative">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-1.5 md:py-3 text-[10px] md:text-xs font-medium rounded-full transition-all duration-300 relative z-10 ${isLogin ? 'text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Login
              {isLogin && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-[#262626] rounded-full shadow-lg -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-1.5 md:py-3 text-[10px] md:text-xs font-medium rounded-full transition-all duration-300 relative z-10 ${!isLogin ? 'text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Register
              {!isLogin && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-[#262626] rounded-full shadow-lg -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence initial={false}>
              {!isLogin && (
                <motion.div
                  key="register-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden space-y-5"
                >
                  <div className="pb-1">
                    <label className="block text-[10px] md:text-xs font-normal text-slate-400 mb-1.5 ml-1">Full Name</label>
                    <div className="relative group/input">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-500 group-focus-within/input:text-white transition-colors" />
                      <input 
                        type="text" 
                        placeholder="John Doe"
                        className="w-full bg-white/5 border border-white/10 rounded-lg py-2 md:py-3.5 px-10 md:px-12 text-xs md:text-sm text-white outline-none focus:border-white/20 focus:bg-white/10 transition-all"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="pb-1">
                    <label className="block text-[10px] md:text-xs font-normal text-slate-400 mb-1.5 ml-1">WhatsApp Number</label>
                    <div className="relative group/input">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-500 group-focus-within/input:text-white transition-colors" />
                      <input 
                        type="tel" 
                        placeholder="08123456789"
                        className="w-full bg-white/5 border border-white/10 rounded-lg py-2 md:py-3.5 px-10 md:px-12 text-xs md:text-sm text-white outline-none focus:border-white/20 focus:bg-white/10 transition-all"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-[10px] md:text-xs font-normal text-slate-400 mb-1.5 ml-1">Email Address</label>
              <div className="relative group/input">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-500 group-focus-within/input:text-white transition-colors" />
                <input 
                  type="email" 
                  placeholder="name@company.com"
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-2 md:py-3.5 px-10 md:px-12 text-xs md:text-sm text-white outline-none focus:border-white/20 focus:bg-white/10 transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label className="block text-[10px] md:text-xs font-normal text-slate-400">Password</label>
                {isLogin && (
                  <button type="button" className="text-[10px] md:text-xs font-medium text-white/50 hover:text-white transition-colors">Forgot Password?</button>
                )}
              </div>
              <div className="relative group/input">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 text-slate-500 group-focus-within/input:text-white transition-colors" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-lg py-2 md:py-3.5 px-10 md:px-12 text-xs md:text-sm text-white outline-none focus:border-white/20 focus:bg-white/10 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-3 md:py-4.5 bg-white hover:bg-slate-100 text-black font-semibold text-xs md:text-sm rounded-full shadow-xl shadow-white/5 transition-all duration-300 flex items-center justify-center gap-2 group/btn active:scale-[0.98]"
            >
              {isLogin ? 'Sign In' : 'Start Your Journey'}
              <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
            </button>
          </form>

          <div className="flex items-center gap-4 my-6 md:my-8">
            <div className="h-[1px] flex-1 bg-white/10"></div>
            <span className="text-[10px] text-slate-500 font-normal whitespace-nowrap">Or continue with</span>
            <div className="h-[1px] flex-1 bg-white/10"></div>
          </div>

          <div className="flex justify-center">
            <button className="flex items-center justify-center gap-2 py-2.5 md:py-4 px-8 bg-transparent border border-white/10 rounded-full text-[10px] md:text-xs font-medium text-white hover:bg-white/5 transition-all w-full active:scale-[0.98]">
              <Chrome className="w-4 h-4" />
              Continue with Google
            </button>
          </div>
        </motion.div>

        <p className="text-center mt-8 text-slate-500 text-sm">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="ml-2 text-white font-medium hover:underline"
          >
            {isLogin ? 'Register now' : 'Log in here'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
