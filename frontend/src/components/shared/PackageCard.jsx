import { Link } from 'react-router-dom';
import { MapPin, Clock, ShieldCheck, Star } from 'lucide-react';

const STITCH_FALLBACKS = [
  '/images/stitch/stitch_asset_1.jpg',
  '/images/stitch/stitch_asset_6.jpg',
  '/images/stitch/stitch_asset_9.jpg',
  '/images/stitch/stitch_asset_14.jpg',
  '/images/stitch/stitch_asset_11.jpg',
  '/images/stitch/stitch_asset_4.jpg',
];

export default function PackageCard({ pkg, organizer }) {
  // Deterministic fallback based on ID if image_url is missing or invalid
  const fallbackIndex = Math.abs((pkg?.id || 'default').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % STITCH_FALLBACKS.length;
  const defaultImage = STITCH_FALLBACKS[fallbackIndex];
  const imageUrl = pkg?.image_url || defaultImage;

  return (
    <article className="group bg-white rounded-3xl border border-black/10 overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col justify-between">
      {/* 400px Image Container with Film Matte Overlay */}
      <div className="relative h-72 sm:h-96 w-full overflow-hidden bg-slate-100">
        <img
          src={imageUrl}
          alt={pkg?.title || 'Tour Package'}
          onError={(e) => {
            if (!e.currentTarget.src.includes(defaultImage)) {
              e.currentTarget.src = defaultImage;
            }
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

        {/* Verified Expedition Badge */}
        <div className="absolute top-4 left-4">
          <span className="bg-white/95 backdrop-blur-md text-black px-3.5 py-1.5 rounded-full flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Verified Expedition
          </span>
        </div>

        {/* Price Tag Overlay */}
        <div className="absolute bottom-4 left-4 text-white">
          <span className="text-2xl sm:text-3xl font-medium tracking-tight" style={{ fontFamily: "'Instrument Serif', serif" }}>
            PKR {Number(pkg?.price_per_person || 0).toLocaleString()}
          </span>
          <span className="text-xs text-white/80 ml-1.5 font-sans">per person</span>
        </div>
      </div>

      {/* Card Details */}
      <div className="p-6 md:p-8 flex flex-col gap-4 flex-1 justify-between">
        <div className="space-y-2">
          <div className="flex justify-between items-start gap-2">
            <h3
              className="text-3xl font-normal text-black leading-snug group-hover:text-emerald-900 transition-colors"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              {pkg?.title}
            </h3>
          </div>

          <p className="text-sm text-[#6F6F6F] flex items-center gap-1.5" style={{ fontFamily: 'Inter, sans-serif' }}>
            <MapPin className="w-4 h-4 text-[#6F6F6F] shrink-0" />
            {pkg?.destination || 'Northern Pakistan'}
          </p>

          <p className="text-xs text-[#555E59] line-clamp-2 leading-relaxed mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
            {pkg?.description || 'Experience the natural wonders, rich culture, and guided mountain expeditions.'}
          </p>
        </div>

        {/* Organizer Host Row */}
        <div className="flex items-center gap-3 py-3 border-y border-black/10">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0 flex items-center justify-center font-bold text-black border border-black/10">
            {organizer?.name?.charAt(0) || 'O'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-black truncate" style={{ fontFamily: 'Inter, sans-serif' }}>
              Hosted by {organizer?.name || 'Alpine Treks & Expeditions'}
            </p>
            <p className="text-[11px] text-[#6F6F6F] flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>{organizer?.rating || 4.9} ({organizer?.reviews_count || 48} reviews)</span>
            </p>
          </div>
        </div>

        {/* Duration, Capacity & CTA */}
        <div className="flex justify-between items-center pt-2">
          <div className="flex gap-4 text-xs">
            <div>
              <span className="text-[10px] text-[#6F6F6F] uppercase font-semibold block">Duration</span>
              <span className="font-medium text-black">{pkg?.duration_days || 5} Days</span>
            </div>
            <div>
              <span className="text-[10px] text-[#6F6F6F] uppercase font-semibold block">Capacity</span>
              <span className="font-medium text-black">Max {pkg?.max_travelers || 20}</span>
            </div>
          </div>

          <Link to={`/explore/${pkg?.id}`}>
            <button className="bg-black text-white text-xs font-medium uppercase tracking-wider px-6 py-2.5 rounded-full hover:bg-slate-800 transition-colors shadow-sm cursor-pointer">
              View Trip
            </button>
          </Link>
        </div>
      </div>
    </article>
  );
}
