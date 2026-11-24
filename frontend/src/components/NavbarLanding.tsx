import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Shield, ShieldCheck, UserCheck, Globe, Moon, Sun, 
  Menu, X, Leaf, Sparkles 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';

export const NavbarLanding: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    localStorage.setItem('agrishield_lang', lang);
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/90 dark:bg-[#07130F]/90 border-b border-emerald-900/10 dark:border-emerald-500/20 shadow-sm transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group focus:outline-none">
          <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-700/25 group-hover:scale-105 transition-transform duration-200">
            <Shield className="w-6 h-6 stroke-[2.2]" />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-[#07130F] flex items-center justify-center">
              <Leaf className="w-2.5 h-2.5 text-emerald-950" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-sans">
                AGRI<span className="text-emerald-600 dark:text-emerald-400">SHIELD</span>
              </span>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                IoT SAFETY
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 dark:text-emerald-300/60 hidden sm:block -mt-0.5">
              Smart Technology for Safer Farming
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-8">
          <button
            onClick={() => scrollToSection('home')}
            className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            {t('nav.home') || 'Home'}
          </button>
          <button
            onClick={() => scrollToSection('about')}
            className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            {t('nav.aboutUs') || 'About Us'}
          </button>
          <button
            onClick={() => scrollToSection('features')}
            className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            {t('nav.features') || 'Features'}
          </button>
          <button
            onClick={() => scrollToSection('how-it-works')}
            className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            {t('nav.howItWorks') || 'How It Works'}
          </button>
          <button
            onClick={() => scrollToSection('contact')}
            className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            {t('nav.contact') || 'Contact'}
          </button>
        </nav>

        {/* Right Section: Language, Theme & Dual Portals */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Connection Status Badge (PWA) */}
          <ConnectionStatusBadge />

          {/* Language Selector */}
          <div className="flex items-center gap-1.5 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 text-xs">
            <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <select
              value={i18n.language}
              onChange={handleLanguageChange}
              className="bg-transparent font-semibold focus:outline-none cursor-pointer pr-1 text-slate-800 dark:text-slate-100"
              aria-label="Select Language"
            >
              <option value="en" className="dark:bg-[#07130F] text-slate-900 dark:text-white">English</option>
              <option value="kn" className="dark:bg-[#07130F] text-slate-900 dark:text-white">ಕನ್ನಡ (Kannada)</option>
              <option value="hi" className="dark:bg-[#07130F] text-slate-900 dark:text-white">हिन्दी (Hindi)</option>
            </select>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-slate-700 dark:text-slate-200 transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Dark/Light Mode"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-emerald-700" />}
          </button>

          {/* 1. ADMIN PORTAL BUTTON */}
          <button
            onClick={() => navigate('/login?portal=admin')}
            className="px-4 py-2 rounded-xl border-2 border-slate-700/80 dark:border-emerald-500/40 bg-slate-900 dark:bg-emerald-950/80 text-white dark:text-emerald-200 hover:bg-slate-800 dark:hover:bg-emerald-900 font-bold text-xs tracking-wide shadow-sm flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ADMIN PORTAL</span>
          </button>

          {/* 2. FARMER / USER PORTAL BUTTON */}
          <button
            onClick={() => navigate('/login?portal=farmer')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs tracking-wide shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400/40 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserCheck className="w-4 h-4" />
            <span>FARMER / USER PORTAL</span>
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex sm:hidden items-center gap-2">
          {/* Quick theme toggle on mobile */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/80 dark:bg-emerald-950/40 text-slate-700 dark:text-slate-200"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-emerald-700" />}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors"
            aria-label="Open Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-[#07130F] px-4 pt-4 pb-6 space-y-4 shadow-xl animate-in slide-in-from-top-4 duration-200">
          {/* Mobile Links */}
          <div className="flex flex-col space-y-2.5">
            <button
              onClick={() => scrollToSection('home')}
              className="text-left text-sm font-semibold text-slate-800 dark:text-slate-100 py-2 border-b border-slate-100 dark:border-emerald-950"
            >
              {t('nav.home') || 'Home'}
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="text-left text-sm font-semibold text-slate-800 dark:text-slate-100 py-2 border-b border-slate-100 dark:border-emerald-950"
            >
              {t('nav.aboutUs') || 'About Us'}
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="text-left text-sm font-semibold text-slate-800 dark:text-slate-100 py-2 border-b border-slate-100 dark:border-emerald-950"
            >
              {t('nav.features') || 'Features'}
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-left text-sm font-semibold text-slate-800 dark:text-slate-100 py-2 border-b border-slate-100 dark:border-emerald-950"
            >
              {t('nav.howItWorks') || 'How It Works'}
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="text-left text-sm font-semibold text-slate-800 dark:text-slate-100 py-2 border-b border-slate-100 dark:border-emerald-950"
            >
              {t('nav.contact') || 'Contact'}
            </button>
          </div>

          {/* Mobile Language Selector */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Language / ಭಾಷೆ / भाषा</span>
            </div>
            <select
              value={i18n.language}
              onChange={handleLanguageChange}
              className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer text-slate-900 dark:text-white"
            >
              <option value="en" className="dark:bg-[#07130F]">English</option>
              <option value="kn" className="dark:bg-[#07130F]">ಕನ್ನಡ</option>
              <option value="hi" className="dark:bg-[#07130F]">हिन्दी</option>
            </select>
          </div>

          {/* Prominent Mobile Portal Buttons */}
          <div className="grid grid-cols-1 gap-2.5 pt-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/login?portal=admin');
              }}
              className="w-full py-3 rounded-xl border-2 border-slate-800 dark:border-emerald-600/50 bg-slate-900 dark:bg-emerald-950 text-white font-bold text-xs tracking-wider flex items-center justify-center gap-2 shadow-sm"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ADMIN PORTAL</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/login?portal=farmer');
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-700/30"
            >
              <UserCheck className="w-4 h-4" />
              <span>FARMER / USER PORTAL</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
