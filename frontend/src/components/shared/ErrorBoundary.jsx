import { useRouteError, useNavigate } from 'react-router-dom';
import { Compass, RefreshCw, Home } from 'lucide-react';

export default function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  const errorMessage =
    error?.statusText || error?.message || 'An unexpected error occurred while loading this expedition view.';

  return (
    <div className="min-h-screen bg-[#F8FAF6] text-[#191C1A] flex items-center justify-center p-4 selection:bg-[#00261D] selection:text-white">
      <div className="max-w-md w-full bg-white rounded-3xl border border-black/10 p-8 text-center space-y-6 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200/60 text-[#00261D] flex items-center justify-center mx-auto shadow-2xs">
          <Compass className="w-8 h-8 animate-pulse text-[#00261D]" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#717975]">
            Friday Travel Copilot
          </span>
          <h2
            className="text-3xl font-normal text-[#00261D]"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Expedition Paused
          </h2>
          <p className="text-xs text-[#555E59] leading-relaxed">
            {errorMessage}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="w-full sm:flex-1 py-3 px-4 rounded-full bg-[#00261D] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#00261D]/90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload View</span>
          </button>
          <button
            onClick={() => navigate('/explore')}
            className="w-full sm:flex-1 py-3 px-4 rounded-full border border-black/10 text-[#00261D] text-xs font-bold uppercase tracking-wider hover:bg-black/5 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Explore Feed</span>
          </button>
        </div>
      </div>
    </div>
  );
}
