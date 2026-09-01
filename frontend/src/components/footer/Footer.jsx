import { Link } from 'react-router-dom';
import { Sparkles, ShieldCheck, MapPin } from 'lucide-react';
import TextRepel from '../ui/TextRepel';

const Footer = () => {
  return (
    <footer className="bg-[#00261D] text-white py-16 px-6 sm:px-8 lg:px-12 border-t border-white/10 mt-auto">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Main 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-12">
          {/* Brand & Purpose Statement */}
          <div className="md:col-span-5 space-y-5">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#00261D] shadow-sm">
                <span className="text-xl font-bold text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  F
                </span>
              </div>
              <div className="flex items-baseline">
                <TextRepel
                  text="Friday"
                  className="text-3xl tracking-tight font-normal text-white"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                  force={25}
                  radius={70}
                />
                <sup style={{ fontSize: '10px', verticalAlign: 'super', color: '#BBEAD5' }}>®</sup>
              </div>
            </Link>

            <p className="text-sm text-white/80 max-w-sm leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              Your trusted travel marketplace for discovering, planning and experiencing Pakistan.
            </p>

            <div className="flex items-center gap-2 text-xs text-[#BBEAD5] font-medium pt-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Built with love for Pakistan's alpine peaks and valleys</span>
            </div>
          </div>

          {/* Explore Links */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#BBEAD5]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Explore
            </h4>
            <ul className="space-y-2.5 text-xs text-white/70" style={{ fontFamily: 'Inter, sans-serif' }}>
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/explore" className="hover:text-white transition-colors">
                  Explore
                </Link>
              </li>
              <li>
                <Link to="/#how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#BBEAD5]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Company
            </h4>
            <ul className="space-y-2.5 text-xs text-white/70" style={{ fontFamily: 'Inter, sans-serif' }}>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link to="/about#contact" className="hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links (Active links redirecting to home) */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#BBEAD5]" style={{ fontFamily: 'Inter, sans-serif' }}>
              Legal
            </h4>
            <ul className="space-y-2.5 text-xs text-white/70" style={{ fontFamily: 'Inter, sans-serif' }}>
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Attribution */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/60" style={{ fontFamily: 'Inter, sans-serif' }}>
          <p>© {new Date().getFullYear()} Friday® AI Travel Operating System. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <span>Verified 0% Commission Direct Booking for Pakistan</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
