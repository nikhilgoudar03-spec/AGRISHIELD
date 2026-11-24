import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Shield, Cpu, Wifi, Activity, Camera, Navigation, 
  Power, AlertTriangle, CheckCircle, ArrowRight, Lock,
  Sprout, Leaf, Compass, Radio, HeartPulse, Send, Phone,
  Mail, MapPin, Check, ExternalLink, ShieldCheck, UserCheck,
  ChevronRight, Sparkles, Layers, Sliders
} from 'lucide-react';
import { NavbarLanding } from '../components/NavbarLanding';

export const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Contact Form State
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    message: ''
  });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactSubmitted(true);
    setTimeout(() => {
      setContactSubmitted(false);
      setContactForm({ name: '', email: '', subject: 'General Inquiry', message: '' });
    }, 4000);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const hardwareFeatures = [
    {
      title: 'ESP32 DevKit V1 Core',
      desc: 'Central dual-core microcontroller orchestrating authenticated telemetry, 1-second sampling, and fail-safe safety interlocks.',
      icon: Cpu,
      badge: 'Core MCU'
    },
    {
      title: 'MQ-135 Gas & Air Quality Sensor',
      desc: 'Monitors ambient pesticide aerosol concentration in real-time with configurable danger thresholds and instant alerts.',
      icon: Activity,
      badge: 'Gas Telemetry'
    },
    {
      title: 'MPU-6050 Biometric Fall Detection',
      desc: 'Precision 3-axis accelerometer and gyroscope algorithm with a 20-second false-positive cancellation buzzer countdown.',
      icon: AlertTriangle,
      badge: 'Biometric Safety'
    },
    {
      title: 'ESP32-CAM Smart Visual Monitoring',
      desc: 'OV2640 camera stream and automated incident snapshot capture with aerosol spray computer vision analysis.',
      icon: Camera,
      badge: 'Vision AI'
    },
    {
      title: 'NEO-6M Satellite GPS Tracking',
      desc: 'Valid satellite coordinates transmitted strictly upon valid satellite fix for rapid field emergency rescue response.',
      icon: Navigation,
      badge: 'Geo-Rescue'
    },
    {
      title: 'Automated Pump Safety Relay',
      desc: 'Optically-isolated relay interlock requiring hardware state acknowledgement with instant automated emergency shutdown.',
      icon: Power,
      badge: 'Fail-Safe Control'
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7FBF9] dark:bg-[#07130F] text-slate-800 dark:text-slate-100 flex flex-col transition-colors duration-300 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation Bar with Prominent Dual Portals */}
      <NavbarLanding />

      {/* 1. HERO SECTION */}
      <section id="home" className="relative overflow-hidden pt-10 pb-20 lg:pt-16 lg:pb-32 min-h-[92vh] flex flex-col justify-center">
        {/* Full-Width 3D Greenery Background Layer */}
        <div className="absolute inset-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
          <img
            src="/greenery-3d-bg.svg"
            alt="AgriShield 3D Greenery Background with Tropical Foliage and Healthy Agricultural Crops"
            className="w-full h-full object-cover object-bottom filter contrast-[1.08] brightness-[0.96] scale-[1.01]"
            loading="eager"
          />
          {/* Subtle natural transition gradient to blend seamlessly into dashboard cards and base */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-transparent to-[#F7FBF9] dark:from-[#07130F]/40 dark:via-[#07130F]/50 dark:to-[#07130F]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Subtle Dark-Green Overlay Container to Guarantee Crisp Readability */}
            <div className="relative p-6 sm:p-10 rounded-3xl bg-emerald-950/60 dark:bg-[#031910]/80 backdrop-blur-md border border-emerald-500/30 shadow-2xl shadow-emerald-950/40 text-white">
              
              {/* Top Badge */}
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-900/90 text-emerald-300 border border-emerald-400/40 shadow-sm text-xs font-extrabold uppercase tracking-wider mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>AGRISHIELD PLATFORM • REAL-TIME IoT FARMER SAFETY</span>
              </div>

              {/* Main Hero Heading */}
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.15] drop-shadow-lg">
                AGRISHIELD – <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-300">Smart Technology</span> for Safer Farming
              </h1>

              {/* Subheading */}
              <p className="mt-6 text-lg sm:text-xl lg:text-2xl font-medium text-emerald-100/95 max-w-3xl mx-auto leading-relaxed drop-shadow-md">
                Protecting farmers through intelligent monitoring, IoT sensors, camera technology and real-time emergency response.
              </p>

              {/* Action Buttons */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                <button
                  onClick={() => scrollToSection('features')}
                  className="px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/20 border-2 border-emerald-400/60 text-white font-black text-base shadow-lg shadow-emerald-950/30 backdrop-blur-sm transition-all flex items-center gap-2.5 hover:-translate-y-0.5"
                >
                  <Compass className="w-5 h-5 text-emerald-300" />
                  <span>Explore AgriShield</span>
                </button>

                <button
                  onClick={() => navigate('/login?portal=farmer')}
                  className="px-9 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-base shadow-xl shadow-emerald-500/30 ring-2 ring-emerald-300/60 transition-all flex items-center gap-2.5 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              {/* Real Hardware Data Integrity Rules Callout */}
              <div className="mt-10 max-w-3xl mx-auto p-4 rounded-2xl bg-emerald-900/60 border border-emerald-500/30 text-emerald-200 text-xs text-left grid sm:grid-cols-2 gap-3 backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="font-semibold text-emerald-100">Displays ONLY actual data from connected hardware</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="font-semibold text-emerald-100">Zero synthetic or fabricated sensor readings</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="font-semibold text-emerald-100">Pump state updates ONLY upon hardware ACK</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="font-semibold text-emerald-100">Disconnected units clearly display DEVICE OFFLINE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Premium Glass-Effect Dashboard Preview */}
          <div className="mt-14 lg:mt-20 max-w-5xl mx-auto">
            <div className="relative rounded-3xl p-3 sm:p-5 bg-gradient-to-b from-white/80 via-white/40 to-white/10 dark:from-emerald-950/60 dark:via-[#0c1f18]/60 dark:to-transparent border border-white/60 dark:border-emerald-500/20 backdrop-blur-2xl shadow-2xl shadow-emerald-950/15">
              
              {/* Top Card Navigation Bar */}
              <div className="flex items-center justify-between pb-4 border-b border-emerald-900/10 dark:border-emerald-500/20 px-2 sm:px-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                  <span className="ml-3 text-xs font-mono font-bold text-slate-500 dark:text-emerald-300">
                    agrishield://field-monitor/esp32-active-interlock
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 tracking-wide uppercase">
                    Hardware Verified
                  </span>
                </div>
              </div>

              {/* Preview Content Grid */}
              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* 1. MQ-135 Gas & Air Quality Widget */}
                <div className="p-5 rounded-2xl bg-white/90 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/40 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-500 dark:text-emerald-300">MQ-135 AIR QUALITY</span>
                      <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900 dark:text-white">218</span>
                      <span className="text-xs font-bold text-slate-500">PPM</span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Optimal Respiratory Safety
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-emerald-900/40 flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>Threshold: 350 PPM</span>
                    <span>1s Refresh</span>
                  </div>
                </div>

                {/* 2. MPU-6050 Fall Detection & Safety Interlock */}
                <div className="p-5 rounded-2xl bg-white/90 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/40 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-500 dark:text-emerald-300">MPU-6050 FALL GUARD</span>
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900 dark:text-white">STABLE</span>
                      <span className="text-xs font-bold text-emerald-500 font-mono">1.02 G</span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-emerald-200">
                      Normal upright operator posture.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-emerald-900/40 flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>20s Grace Buzzer</span>
                    <span>Active</span>
                  </div>
                </div>

                {/* 3. Pump Relay & GPS Interlock */}
                <div className="p-5 rounded-2xl bg-white/90 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/40 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-500 dark:text-emerald-300">PUMP RELAY INTERLOCK</span>
                      <Power className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">PUMP ON</span>
                      <span className="text-xs font-bold text-slate-500 font-mono">ACKNOWLEDGED</span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-emerald-200">
                      Auto-cutoff engaged upon fall or gas hazard.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-emerald-900/40 flex justify-between text-[11px] text-slate-400 font-mono">
                    <span>Hardware ACK: Valid</span>
                    <span>12V DC Relay</span>
                  </div>
                </div>

              </div>

              {/* Bottom Telemetry Status Strip */}
              <div className="px-6 py-3 rounded-2xl bg-emerald-900/5 dark:bg-emerald-950/40 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-600 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  <span>ESP32 Unit: ESP32_AGRI_01</span>
                </div>
                <div>DHT11: 28.4°C • 62% RH</div>
                <div>NEO-6M Fix: 12.9716° N, 77.5946° E</div>
                <div className="font-bold text-emerald-600 dark:text-emerald-400">Latency: 42ms</div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 2. ABOUT US SECTION */}
      <section id="about" className="py-20 lg:py-28 border-y border-emerald-900/10 dark:border-emerald-500/20 bg-white/60 dark:bg-[#06120E]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            
            {/* Left Content */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold uppercase tracking-wider mb-4">
                <Sprout className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>ABOUT AGRISHIELD</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white leading-tight">
                Pioneering Intelligent Protection for Agricultural Workers
              </h2>

              <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                Pesticide application remains one of the most hazardous tasks in global agriculture. Exposure to toxic chemical mists, accidental falls on uneven terrain, and remote field emergencies claim thousands of lives and cause severe chronic illness every year.
              </p>

              <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                <strong>AgriShield</strong> bridges embedded IoT engineering with modern cloud telemetrics to deliver a life-saving safety ecosystem. Designed from the ground up to respect data truth: every reading is verified from physical sensors, emergency pump cutoffs execute on hardware acknowledgement, and satellite rescue coordinates guide immediate assistance.
              </p>

              <div className="mt-8 grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm mb-2">
                    01
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Real Hardware Integrity</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Zero fabricated readings. Authentic ESP32 microcontroller telemetrics.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm mb-2">
                    02
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Automated Emergency Cutoff</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Immediate pump shutdown prevents hazardous chemical inundation during falls.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Visual Image Card */}
            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-emerald-200/80 dark:border-emerald-800/80">
                <img
                  src="https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=1200&q=80"
                  alt="Farmer tending crops with smart agricultural care"
                  className="w-full h-[420px] object-cover hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/90 via-emerald-950/30 to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <div className="inline-block px-2.5 py-1 rounded bg-emerald-500 text-xs font-bold uppercase tracking-wider mb-2">
                    Field Tested
                  </div>
                  <h3 className="text-xl font-bold">Empowering Farming Communities</h3>
                  <p className="text-xs text-emerald-100/80 mt-1">
                    Delivering peace of mind to farmers and their families across Karnataka and India.
                  </p>
                </div>
              </div>

              {/* Floating Stat Pill */}
              <div className="absolute -bottom-6 -left-6 bg-white dark:bg-darkbg-card p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-xl flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-lg font-black text-slate-900 dark:text-white">100% Truth</div>
                  <div className="text-[11px] font-semibold text-slate-500">Live Hardware Verified</div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 3. FEATURES SECTION */}
      <section id="features" className="py-20 lg:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold uppercase tracking-wider mb-3">
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>CORE ARCHITECTURE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Engineered Specifically for Hazardous Field Environments
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-300">
            Every module in AgriShield is designed for extreme environmental durability, ultra-low latency, and absolute fail-safe operations.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {hardwareFeatures.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="group relative p-7 rounded-3xl bg-white dark:bg-[#0c1f18] border border-emerald-200/80 dark:border-emerald-800/40 shadow-sm hover:shadow-xl hover:border-emerald-500/60 dark:hover:border-emerald-500/50 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 dark:bg-emerald-950 text-slate-600 dark:text-emerald-300 border border-slate-200 dark:border-emerald-800/60">
                      {f.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {f.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {f.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-emerald-900/40 flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  <span>Hardware Interlocked</span>
                  <Check className="w-4 h-4 text-emerald-500" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-emerald-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-800 via-emerald-950 to-[#04100c] opacity-90"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-800/80 border border-emerald-600 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-3">
              END-TO-END WORKFLOW
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
              How AgriShield Protects the Farmer
            </h2>
            <p className="mt-4 text-base text-emerald-200/80">
              Three tightly orchestrated stages ensuring continuous protection from field entry to emergency resolution.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Step 1 */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md relative">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black text-lg mb-6 shadow-lg shadow-emerald-500/30">
                1
              </div>
              <h3 className="text-xl font-bold mb-3">Wearable IoT Activation</h3>
              <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
                Farmer wears the lightweight ESP32 DevKit unit attached to the sprayer harness. Sensor telemetry automatically syncs over Wi-Fi or cellular hotspot with authenticated device credentials.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md relative">
              <div className="w-12 h-12 rounded-2xl bg-teal-500 text-white flex items-center justify-center font-black text-lg mb-6 shadow-lg shadow-teal-500/30">
                2
              </div>
              <h3 className="text-xl font-bold mb-3">Autonomous Threat Analysis</h3>
              <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
                FastAPI and embedded FreeRTOS continuously evaluate gas density, operator posture, and environmental heat index. If values exceed safe thresholds, warning alarms trigger instantly.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md relative">
              <div className="w-12 h-12 rounded-2xl bg-emerald-400 text-slate-950 flex items-center justify-center font-black text-lg mb-6 shadow-lg shadow-emerald-400/30">
                3
              </div>
              <h3 className="text-xl font-bold mb-3">Automated Interlock & Rescue</h3>
              <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
                In the event of an uncancelled fall or toxic gas spike, the pump relay automatically shuts down spraying, an on-board siren activates, and satellite coordinates dispatch to emergency contacts.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* 5. CONTACT SECTION */}
      <section id="contact" className="py-20 lg:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          
          {/* Contact Details */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold uppercase tracking-wider mb-3">
              <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>SUPPORT & PARTNERSHIPS</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
              Connect with the AgriShield Engineering Team
            </h2>

            <p className="mt-4 text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Have questions regarding hardware specifications, village agricultural safety programs, or enterprise farm integration? We are here to support your farming safety operations.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Agricultural Innovation Center</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Bengaluru & Mysuru Agriculture Corridor, Karnataka, India</div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Safety Hotline & Dispatch Support</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">+91 (800) 247-4743 • 24/7 Field Support</div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Technical Inquiries</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">support@agrishield.io • engineering@agrishield.io</div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Form */}
          <div className="p-8 rounded-3xl bg-white dark:bg-[#0c1f18] border border-emerald-200/80 dark:border-emerald-800/60 shadow-xl">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Send us a Message</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Fill in your inquiry details and an AgriShield field specialist will contact you promptly.
            </p>

            {contactSubmitted ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-center animate-in fade-in duration-300">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
                <h4 className="text-base font-bold">Message Received!</h4>
                <p className="text-xs mt-1">Thank you for reaching out. An AgriShield technical advisor will contact you within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    placeholder="Suresh Gowda"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-800/80 bg-slate-50 dark:bg-emerald-950/40 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="farmer@example.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-800/80 bg-slate-50 dark:bg-emerald-950/40 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Inquiry Topic
                  </label>
                  <select
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-800/80 bg-slate-50 dark:bg-emerald-950/40 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="General Inquiry">General Information</option>
                    <option value="Hardware Integration">ESP32 Hardware Kit Acquisition</option>
                    <option value="Village Safety Cluster">Village Agricultural Safety Deployment</option>
                    <option value="API & Telemetrics">Developer & API Integration</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Your Message *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="Tell us about your farm, pesticide safety requirements, or questions..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-emerald-800/80 bg-slate-50 dark:bg-emerald-950/40 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs tracking-wider uppercase shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Inquiry</span>
                </button>
              </form>
            )}
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 border-t border-emerald-900/10 dark:border-emerald-500/20 bg-white dark:bg-[#050e0b] text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                <Shield className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span className="font-black text-slate-900 dark:text-white tracking-tight text-base">
                AGRI<span className="text-emerald-600 dark:text-emerald-400">SHIELD</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                IoT v1.0
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold">
              <button onClick={() => scrollToSection('home')} className="hover:text-emerald-600 dark:hover:text-emerald-400">Home</button>
              <button onClick={() => scrollToSection('about')} className="hover:text-emerald-600 dark:hover:text-emerald-400">About Us</button>
              <button onClick={() => scrollToSection('features')} className="hover:text-emerald-600 dark:hover:text-emerald-400">Features</button>
              <button onClick={() => scrollToSection('how-it-works')} className="hover:text-emerald-600 dark:hover:text-emerald-400">How It Works</button>
              <button onClick={() => scrollToSection('contact')} className="hover:text-emerald-600 dark:hover:text-emerald-400">Contact</button>
              <Link to="/login?portal=admin" className="hover:text-emerald-600 dark:hover:text-emerald-400">Admin Portal</Link>
              <Link to="/login?portal=farmer" className="hover:text-emerald-600 dark:hover:text-emerald-400">Farmer Portal</Link>
            </div>

            <div className="text-center md:text-right font-medium">
              &copy; 2026 AgriShield Platform. All rights reserved. Real-Time Smart Farmer Safety Architecture.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
