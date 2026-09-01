/**
 * Dynamic Destination & Web Photography Service
 * Provides genuine, high-resolution web photography for Pakistan destinations
 * with multi-photo variation pools so different trips to the same city display distinct images.
 */

import api from '../services/api';

// Curated Dynamic Web Photography Banks (High-Resolution Wikimedia & Unsplash URLs)
export const DESTINATION_WEB_PHOTOS = {
  rawalpindi: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Rawalpindi_railway_station_4.JPG/1280px-Rawalpindi_railway_station_4.JPG',
    'https://upload.wikimedia.org/wikipedia/commons/d/dc/Mall_of_Rawalpindi_in_Saddar_bazaar.png',
    'https://upload.wikimedia.org/wikipedia/en/thumb/f/ff/Rawalpindi_Cricket_Stadium_2025.jpg/1280px-Rawalpindi_Cricket_Stadium_2025.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Dharmarajika.jpg/1280px-Dharmarajika.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Murree_Road_isb.jpg/1280px-Murree_Road_isb.jpg',
    'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=1200&q=80',
  ],
  islamabad: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Faisal_Mosque%2C_Islamabad_III.jpg/1280px-Faisal_Mosque%2C_Islamabad_III.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Blue_Hour_at_Pakistan_Monument.jpg/1280px-Blue_Hour_at_Pakistan_Monument.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Faisal_Mosque_and_Margalla_Hills.jpg/1280px-Faisal_Mosque_and_Margalla_Hills.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Jinnah_Convention_Centre%2C_Islamabad.jpg/1280px-Jinnah_Convention_Centre%2C_Islamabad.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/5/57/Islamabad_skyline.jpg',
    'https://images.unsplash.com/photo-1598887142487-3c854d51d2c7?auto=format&fit=crop&w=1200&q=80',
  ],
  murree: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Sunset_in_hills_-_Holy_Trinity_Church%2C_Murree.jpg/1280px-Sunset_in_hills_-_Holy_Trinity_Church%2C_Murree.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/GPO_Mall_Road_Murree.jpg/1280px-GPO_Mall_Road_Murree.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Murree_Road_isb.jpg/1280px-Murree_Road_isb.jpg',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
  ],
  skardu: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Shangrila_resort_skardu.jpg/1280px-Shangrila_resort_skardu.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Unexpected_Snow_in_Katpana_Skardu.jpg/1280px-Unexpected_Snow_in_Katpana_Skardu.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Aerial_view_of_the_Indus_River_in_Skardu.png/1280px-Aerial_view_of_the_Indus_River_in_Skardu.png',
    'https://upload.wikimedia.org/wikipedia/commons/7/7f/Kharpocho_Fort%2C_Skardu.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Trekkers_along_with_porters_towards_Snow_Lake%2C_over_Biafo_Glacier_61Km.jpg/1280px-Trekkers_along_with_porters_towards_Snow_Lake%2C_over_Biafo_Glacier_61Km.jpg',
    'https://images.unsplash.com/photo-1571216332002-282dce467b32?auto=format&fit=crop&w=1200&q=80',
  ],
  hunza: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Attabad.jpg/1280px-Attabad.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Hunza_Valley_HDR.jpg/1280px-Hunza_Valley_HDR.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Baltit_Fort%2C_Karimabad%2C_Hunza%2C_Gilgit_Baltistan.jpg/1280px-Baltit_Fort%2C_Karimabad%2C_Hunza%2C_Gilgit_Baltistan.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Hussaini_Village%2C_Gojal%2C_Upper_Hunza%2C_Gilgit-Baltistan.jpg/1280px-Hussaini_Village%2C_Gojal%2C_Upper_Hunza%2C_Gilgit-Baltistan.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Hunza_River_near_Gulmit_Hunza.jpg/1280px-Hunza_River_near_Gulmit_Hunza.jpg',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
  ],
  swat: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Mahodand_l.jpg/1280px-Mahodand_l.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/River_Swat_Pakistan_3.jpg/1280px-River_Swat_Pakistan_3.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Kabal_Swat_valley.JPG/1280px-Kabal_Swat_valley.JPG',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
  ],
  naran: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Saif_ul_Malook_Lake_by_Ahmad_Waqas.jpg/1280px-Saif_ul_Malook_Lake_by_Ahmad_Waqas.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Lulusar_Lake%2C_Naran.jpg/1280px-Lulusar_Lake%2C_Naran.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Babusar_Pass_Kaghan_Valley.jpg/1280px-Babusar_Pass_Kaghan_Valley.jpg',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
  ],
  kaghan: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Saif_ul_Malook_Lake_by_Ahmad_Waqas.jpg/1280px-Saif_ul_Malook_Lake_by_Ahmad_Waqas.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Lulusar_Lake%2C_Naran.jpg/1280px-Lulusar_Lake%2C_Naran.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Babusar_Pass_Kaghan_Valley.jpg/1280px-Babusar_Pass_Kaghan_Valley.jpg',
  ],
  chitral: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Kalash_Valley_Bumburet.jpg/1280px-Kalash_Valley_Bumburet.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Chitral_Fort_and_Mosque.jpg/1280px-Chitral_Fort_and_Mosque.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Shandur_Polo_Ground_Chitral.jpg/1280px-Shandur_Polo_Ground_Chitral.jpg',
  ],
  gwadar: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Gwadar_Port_Hammerhead.jpg/1280px-Gwadar_Port_Hammerhead.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Ormara_Beach_Balochistan.jpg/1280px-Ormara_Beach_Balochistan.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Kund_Malir_Princess_of_Hope.jpg/1280px-Kund_Malir_Princess_of_Hope.jpg',
  ],
  lahore: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Lahore_Fort_view_from_Baradari.jpg/1280px-Lahore_Fort_view_from_Baradari.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Badshahi_Mosquee%2C_Lahore.jpg/1280px-Badshahi_Mosquee%2C_Lahore.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/4/42/Minar_e_Pakistan_2021.jpg',
    'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=1200&q=80',
  ],
  karachi: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Clifton_Karachi_View.jpg/1280px-Clifton_Karachi_View.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/PK_Karachi_asv2020-02_img06_Bagh_Ibne_Qasim.jpg/1280px-PK_Karachi_asv2020-02_img06_Bagh_Ibne_Qasim.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Karachi_Seaport.jpg/1280px-Karachi_Seaport.jpg',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  ],
  neelum: [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Neelum_Valley%2C_Azad_Jammu_%26_Kashmir%2C_Pakistan.jpg/1280px-Neelum_Valley%2C_Azad_Jammu_%26_Kashmir%2C_Pakistan.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Keran_-_Neelum_Valley%2C_Azad_Kashmir.JPG/1280px-Keran_-_Neelum_Valley%2C_Azad_Kashmir.JPG',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Dhani_Waterfall.jpg/1280px-Dhani_Waterfall.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/View_From_Sharda_Fort%2C_Azad_Jammu_%26_Kashmir%2C_Pakistan.jpg/1280px-View_From_Sharda_Fort%2C_Azad_Jammu_%26_Kashmir%2C_Pakistan.jpg',
  ],
};

const GENERAL_FALLBACK_POOL = [
  'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1598887142487-3c854d51d2c7?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1571216332002-282dce467b32?auto=format&fit=crop&w=1200&q=80',
];

/**
 * Get a dynamic, rotated destination photograph based on destination name and an optional seed.
 */
export function getDestinationFallback(dest, seed = null) {
  const d = (dest || '').toLowerCase().trim();
  
  let numericSeed;
  if (seed === null || seed === undefined || seed === '') {
    numericSeed = Math.floor(Math.random() * 1000);
  } else if (typeof seed === 'number') {
    numericSeed = Math.abs(seed);
  } else if (typeof seed === 'string') {
    numericSeed = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  } else {
    numericSeed = Math.floor(Math.random() * 1000);
  }

  for (const [key, photos] of Object.entries(DESTINATION_WEB_PHOTOS)) {
    if (d.includes(key) && photos.length > 0) {
      const idx = numericSeed % photos.length;
      return photos[idx];
    }
  }

  const idx = numericSeed % GENERAL_FALLBACK_POOL.length;
  return GENERAL_FALLBACK_POOL[idx];
}

/**
 * Fetch live dynamic web images for any query from the backend search endpoint.
 */
export async function searchDestinationImages(query, destination = '') {
  try {
    const res = await api.get('/trips/images/search', {
      params: { query, destination, limit: 12 },
    });
    return res.data?.images || [];
  } catch (err) {
    console.warn('Live image search failed, using dynamic pool:', err);
    return [getDestinationFallback(query)];
  }
}
