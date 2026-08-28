import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-[#F8FAF6] py-14 px-6 md:px-12 border-t border-black/10 mt-auto text-[#191C1A]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-black text-white">
            <span className="text-lg font-bold text-white" style={{ fontFamily: "'Instrument Serif', serif" }}>
              F
            </span>
          </div>
          <span
            className="text-2xl tracking-tight font-normal text-black"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Friday<sup style={{ fontSize: '9px', verticalAlign: 'super' }}>®</sup>
          </span>
        </Link>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-8">
          <Link
            to="/explore"
            className="text-xs uppercase tracking-widest font-semibold text-[#6F6F6F] hover:text-black transition-colors"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Discover
          </Link>
          <Link
            to="/plan-trip"
            className="text-xs uppercase tracking-widest font-semibold text-[#6F6F6F] hover:text-black transition-colors"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            AI Copilot
          </Link>
          <a
            href="#"
            className="text-xs uppercase tracking-widest font-semibold text-[#6F6F6F] hover:text-black transition-colors"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Privacy Policy
          </a>
          <a
            href="#"
            className="text-xs uppercase tracking-widest font-semibold text-[#6F6F6F] hover:text-black transition-colors"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Terms of Service
          </a>
          <a
            href="#"
            className="text-xs uppercase tracking-widest font-semibold text-[#6F6F6F] hover:text-black transition-colors"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Contact
          </a>
        </div>

        {/* Copyright */}
        <div
          className="text-xs text-[#6F6F6F]"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          © {new Date().getFullYear()} Friday AI Travel. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
