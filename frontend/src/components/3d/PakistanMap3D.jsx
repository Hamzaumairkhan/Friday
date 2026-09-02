import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Sparkles,
  ShieldCheck,
  Compass,
  Navigation,
  Sun,
  CloudSun,
} from 'lucide-react';

const PAKISTAN_WAYPOINTS = [
  {
    id: 'hunza',
    name: 'Hunza Valley',
    sub: 'Karimabad, Altit Fort & Passu Cones',
    altitude: '2,438m',
    x: 70, // Accurately placed in northern Gilgit-Baltistan
    y: 11,
    region: 'Gilgit-Baltistan',
    temp: '18°C Sunny',
    status: 'Peak Season',
  },
  {
    id: 'skardu',
    name: 'Skardu & Deosai',
    sub: 'Shangrila Lake & Cold Desert',
    altitude: '2,228m',
    x: 78, // Accurately placed in southeastern Baltistan inside Pakistan border
    y: 17,
    region: 'Baltistan',
    temp: '16°C Clear',
    status: 'Open Pass',
  },
  {
    id: 'fairy_meadows',
    name: 'Fairy Meadows',
    sub: 'Nanga Parbat Basecamp & Raikot',
    altitude: '3,300m',
    x: 68,
    y: 19,
    region: 'Diamer',
    temp: '12°C Alpine',
    status: 'Jeep Route',
  },
  {
    id: 'swat',
    name: 'Swat & Kalam',
    sub: 'Malam Jabba, Bahrain & Mahodand',
    altitude: '980m',
    x: 59,
    y: 25,
    region: 'Khyber Pakhtunkhwa',
    temp: '22°C Pleasant',
    status: 'Motorway',
  },
  {
    id: 'islamabad',
    name: 'Islamabad Capital',
    sub: 'Departure Gateway & Motorway Hub',
    altitude: '540m',
    x: 66,
    y: 33,
    region: 'Federal Hub',
    temp: '28°C Hub',
    status: 'Main Origin',
  },
  {
    id: 'lahore',
    name: 'Lahore Cultural Hub',
    sub: 'Walled City & Direct Flights Hub',
    altitude: '217m',
    x: 71, // Accurately placed inside eastern Punjab on the map
    y: 46,
    region: 'Punjab',
    temp: '32°C Sunny',
    status: 'Travel Hub',
  },
  {
    id: 'gwadar',
    name: 'Gwadar & Makran',
    sub: 'Coastal Highway, Hammerhead & Ormara',
    altitude: '8m',
    x: 17,
    y: 80,
    region: 'Balochistan Coast',
    temp: '29°C Coastal',
    status: 'Coastal Route',
  },
];

export default function PakistanMap3D({ variant = 'home' }) {
  const containerRef = useRef(null);
  const [activeWaypoint, setActiveWaypoint] = useState(PAKISTAN_WAYPOINTS[0]);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setRotateX(((y - centerY) / centerY) * -12);
    setRotateY(((x - centerX) / centerX) * 12);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-[540px] mx-auto perspective-[1200px] select-none py-2"
    >
      {/* Ambient Gradient Glow Background */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#BBEAD5]/50 via-emerald-100/35 to-transparent blur-3xl pointer-events-none" />

      {/* 3D Tilted Container (No Dark Box - Pure Transparent Light Theme) */}
      <motion.div
        animate={{ rotateX, rotateY }}
        transition={{ type: 'spring', damping: 20, stiffness: 150 }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative z-10 w-full space-y-4"
      >
        {/* Pakistan Outline Map Visual (Transparent Background with Green Boundary Lines) */}
        <div className="relative w-full flex items-center justify-center p-2">
          {/* Exact aspect ratio container matching the 980x1024 Pakistan outline map */}
          <div className="relative aspect-[980/1024] h-[360px] sm:h-[420px] max-w-full">
            {/* Pakistan Map Image */}
            <img
              src="/images/pakistan_map.png"
              alt="Pakistan Geographic Outline Map"
              className="w-full h-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,38,29,0.12)] mix-blend-multiply opacity-90 transition-transform duration-500 pointer-events-none"
            />

          {/* Interactive Floating Waypoint Pins */}
          {PAKISTAN_WAYPOINTS.map((wp) => {
            const isSelected = activeWaypoint.id === wp.id;
            return (
              <button
                key={wp.id}
                type="button"
                onClick={() => setActiveWaypoint(wp)}
                onMouseEnter={() => setActiveWaypoint(wp)}
                style={{
                  top: `${wp.y}%`,
                  left: `${wp.x}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-30 group cursor-pointer focus:outline-none"
              >
                <div className="relative flex items-center justify-center">
                  {/* Ping Animation on Active */}
                  {isSelected && (
                    <span className="absolute w-8 h-8 rounded-full bg-emerald-400 animate-ping opacity-75 pointer-events-none" />
                  )}

                  {/* Pin Dot */}
                  <div
                    className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-[#00261D] text-[#BBEAD5] scale-125 shadow-xl ring-4 ring-emerald-400/40'
                        : 'bg-white text-[#00261D] border-2 border-[#00261D] shadow-md hover:scale-115'
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-[#BBEAD5]' : 'bg-[#00261D]'
                      }`}
                    />
                  </div>

                  {/* Floating Tag */}
                  <div
                    className={`absolute left-5 sm:left-6 whitespace-nowrap px-2.5 py-1 rounded-lg backdrop-blur-md text-[11px] font-bold transition-all shadow-md pointer-events-none ${
                      isSelected
                        ? 'bg-[#00261D] text-white opacity-100 translate-x-0'
                        : 'bg-white/95 text-[#00261D] border border-black/10 opacity-0 group-hover:opacity-100 -translate-x-1'
                    }`}
                  >
                    {wp.name}
                  </div>
                </div>
              </button>
            );
          })}
          </div>
        </div>

        {/* Dynamic Waypoint Intelligence Pill Bar (Shows selected city info & weather) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeWaypoint.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-black/10 shadow-lg flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00261D] text-[#BBEAD5] flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[#00261D]">
                    {activeWaypoint.name}
                  </h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-800/10">
                    {activeWaypoint.region}
                  </span>
                </div>
                <p className="text-xs text-[#555E59]">{activeWaypoint.sub}</p>
              </div>
            </div>

            <div className="text-right space-y-1">
              <div className="flex items-center justify-end gap-1 text-xs font-bold text-[#00261D]">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>{activeWaypoint.temp}</span>
              </div>
              <span className="text-[10px] font-extrabold text-emerald-900 bg-[#BBEAD5]/60 px-2.5 py-0.5 rounded-full inline-block">
                Alt: {activeWaypoint.altitude}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
