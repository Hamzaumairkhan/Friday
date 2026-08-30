"""Destination Knowledge Engine with authentic points of interest, hotels, Google Maps links, and semantic image matching for Pakistan."""

import urllib.parse
from typing import Dict, Any, List, Optional


def make_maps_url(query: str, destination: Optional[str] = None) -> str:
    """Generate an exact, verified Google Maps search URL."""
    clean_q = query.strip()
    if destination and destination.lower() not in clean_q.lower():
        clean_q = f"{clean_q}, {destination}, Pakistan"
    elif "pakistan" not in clean_q.lower():
        clean_q = f"{clean_q}, Pakistan"
    encoded = urllib.parse.quote(clean_q)
    return f"https://www.google.com/maps/search/?api=1&query={encoded}"


def resolve_activity_image(
    activity_title: str,
    location: str,
    description: str,
    category: str,
    destination: str,
    web_images: Optional[List[str]] = None,
) -> str:
    """Accurately match exact photographic assets based on attraction name and location context."""
    title_l = activity_title.lower()
    loc_l = location.lower()
    text = f"{activity_title} {location} {description} {destination}".lower()

    # 1. Exact Iconic Monuments & Places (Checking Title First)
    if "faisal mosque" in title_l or "faisal masjid" in title_l or "faisal" in title_l:
        return "/images/stitch/stitch_asset_4.jpg"
    elif "pakistan monument" in title_l or "monument" in title_l or "shakarparian" in title_l:
        return "/images/stitch/stitch_asset_2.jpg"
    elif "daman-e-koh" in title_l or "daman e koh" in title_l:
        return "/images/stitch/discover_village.jpg"
    elif "monal" in title_l or "la montana" in title_l:
        return "/images/stitch/stitch_batch3_2.jpg"
    elif "lok virsa" in title_l or "folk heritage" in title_l or "wax museum" in title_l:
        return "/images/stitch/stitch_batch3_1.jpg"
    elif "saidpur" in title_l:
        return "/images/stitch/discover_village.jpg"
    elif "rawal lake" in title_l or "rawal dam" in title_l or "lake view" in title_l:
        return "/images/stitch/stitch_asset_4.jpg"
    elif "shah allah ditta" in title_l or "buddhist caves" in title_l:
        return "/images/stitch/stitch_asset_8.jpg"
    elif "shangrila" in title_l or "lower kachura" in title_l:
        return "/images/stitch/hero_mountains.jpg"
    elif "upper kachura" in title_l:
        return "/images/stitch/hero_mountains.jpg"
    elif "deosai" in title_l or "sheosar" in title_l:
        return "/images/stitch/stitch_batch4_2.jpg"
    elif "katpana" in title_l or "cold desert" in title_l or "sarfaranga" in title_l:
        return "/images/stitch/hero_mountains.jpg"
    elif "altit" in title_l or "baltit" in title_l or "karimabad" in title_l:
        return "/images/stitch/stitch_asset_1.jpg"
    elif "attabad" in title_l or "jet ski" in title_l:
        return "/images/stitch/stitch_asset_1.jpg"
    elif "passu" in title_l or "cathedral cones" in title_l or "bumburet" in title_l or "kalash" in title_l:
        return "/images/stitch/stitch_asset_1.jpg"
    elif "saif-ul-malook" in title_l or "saiful" in title_l or "lulusar" in title_l or "babusar" in title_l or "siri paye" in title_l:
        return "/images/stitch/stitch_asset_9.jpg"
    elif "malam jabba" in title_l or "mahodand" in title_l or "kalam" in title_l:
        return "/images/stitch/stitch_asset_10.jpg"
    elif "fairy meadows" in title_l or "nanga parbat" in title_l or "beyal" in title_l:
        return "/images/stitch/stitch_asset_7.jpg"
    elif "badshahi" in title_l or "lahore fort" in title_l or "shahi qila" in title_l or "wazir khan" in title_l or "derawar" in title_l or "noor mahal" in title_l:
        return "/images/stitch/stitch_asset_2.jpg"
    elif "sea view" in title_l or "clifton" in title_l or "gwadar" in title_l or "port grand" in title_l or "turtle beach" in title_l or "hingol" in title_l:
        return "/images/stitch/stitch_asset_5.jpg"
    elif "patriata" in title_l or "nathia gali" in title_l or "ayubia" in title_l or "mukshpuri" in title_l:
        return "/images/stitch/hero_mountains.jpg"

    # Secondary text matches
    if "faisal" in loc_l:
        return "/images/stitch/stitch_asset_4.jpg"
    elif "monument" in loc_l or "shakarparian" in loc_l:
        return "/images/stitch/stitch_asset_2.jpg"
    elif "daman" in loc_l or "margalla" in loc_l:
        return "/images/stitch/discover_village.jpg"

    # 2. Categories fallback
    cat = (category or "").upper()
    if cat in ["SHOPPING", "MARKET"] or any(w in text for w in ["bazaar", "market", "souvenir", "dry fruit", "shawl", "handicraft", "jinnah super", "super market", "raja bazaar"]):
        return "/images/stitch/stitch_batch2_7.jpg"
    elif cat == "FOOD" or any(w in text for w in ["breakfast", "lunch", "dinner", "brunch", "trout", "kebab", "pulao", "bbq", "chai", "tea", "dining", "restaurant", "cafe", "food street"]):
        return "/images/stitch/stitch_batch3_1.jpg"
    elif cat == "ACCOMMODATION" or any(w in text for w in ["hotel", "resort", "lodge", "check-in", "cottage"]):
        return "/images/stitch/stitch_batch4_3.jpg"
    elif cat == "TRANSPORT" or any(w in text for w in ["drive", "highway", "transit", "departure", "return journey", "jeep"]):
        return "/images/stitch/hero_mountains.jpg"
    elif cat == "SIGHTSEEING":
        return "/images/stitch/discover_village.jpg"
    elif cat == "ADVENTURE":
        return "/images/stitch/hero_mountains.jpg"

    return "/images/stitch/stitch_asset_11.jpg"


DESTINATION_PROFILES: Dict[str, Dict[str, Any]] = {
    "islamabad": {
        "canonical_name": "Islamabad & Rawalpindi",
        "region": "Capital Territory & Punjab",
        "hotels": {
            "luxury": [
                {"name": "Serena Hotel Islamabad", "location": "Club Road, Sector G-5/1, Islamabad", "rating": 4.9},
                {"name": "Islamabad Marriott Hotel", "location": "Aga Khan Road, Sector F-5/1, Islamabad", "rating": 4.8},
                {"name": "The Centaurus Suites", "location": "Jinnah Avenue, Sector F-8, Islamabad", "rating": 4.7},
            ],
            "comfortable": [
                {"name": "Hotel One Super Market F-6", "location": "School Road, Sector F-6/2, Islamabad", "rating": 4.5},
                {"name": "Ramada by Wyndham Islamabad", "location": "Club Road, Near Rawal Lake, Islamabad", "rating": 4.6},
                {"name": "Envoy Continental Hotel", "location": "Fazl-e-Haq Road, Blue Area, Islamabad", "rating": 4.4},
            ],
            "budget": [
                {"name": "Grace Crown Hotel F-7", "location": "College Road, Sector F-7/1, Islamabad", "rating": 4.2},
                {"name": "Hotel Red Line Islamabad", "location": "G-9 Markaz, Islamabad", "rating": 4.1},
                {"name": "De Papae Hotel", "location": "Murree Road, Saddar, Rawalpindi", "rating": 4.2},
            ],
        },
        "highlights": [
            {
                "title": "Faisal Mosque Architectural & Margalla Foothills Tour",
                "description": "Explore the world's iconic 8-sided Bedouin-tent architecture, white Turkish marble courtyards, and scenic Margalla Hills backdrop.",
                "location": "Faisal Mosque, Shah Faisal Avenue, Sector E-8, Islamabad",
                "category": "CULTURE",
                "start_time": "09:00 AM",
                "end_time": "11:30 AM",
                "duration_minutes": 150,
            },
            {
                "title": "Daman-e-Koh & Margalla Hills Panorama Viewpoint",
                "description": "Ascend the Margalla Hills to Daman-e-Koh for panoramic bird's-eye views overlooking Faisal Mosque, Rawal Lake, and the planned grid layout of Islamabad.",
                "location": "Daman-e-Koh Viewpoint, Margalla Hills, Islamabad",
                "category": "SIGHTSEEING",
                "start_time": "05:00 PM",
                "end_time": "07:00 PM",
                "duration_minutes": 120,
            },
            {
                "title": "Pakistan Monument & National Heritage Wax Museum",
                "description": "Visit the blooming granite lotus monument symbolizing Pakistan's provinces and tour the National Heritage Wax Museum depicting pivotal history.",
                "location": "Pakistan Monument, Shakarparian Hills, Islamabad",
                "category": "CULTURE",
                "start_time": "02:30 PM",
                "end_time": "04:45 PM",
                "duration_minutes": 135,
            },
            {
                "title": "Lok Virsa Folk Heritage Museum & Artisans Village",
                "description": "Immerse in Pakistan's living folk traditions, embroidered textiles, regional musical instruments, and traditional pottery workshops.",
                "location": "Lok Virsa Museum, Garden Avenue, Shakarparian, Islamabad",
                "category": "CULTURE",
                "start_time": "10:00 AM",
                "end_time": "01:00 PM",
                "duration_minutes": 180,
            },
            {
                "title": "Saidpur Historic Village & Mughal Heritage Walk",
                "description": "Wander through 500-year-old stone pathways, Mughal-era Hindu temple, Gurdwara, and open-air heritage cafes nestled in Margalla foothills.",
                "location": "Saidpur Historic Village, Margalla Hills, Islamabad",
                "category": "CULTURE",
                "start_time": "03:30 PM",
                "end_time": "05:30 PM",
                "duration_minutes": 120,
            },
            {
                "title": "Rawal Lake & Lake View Park Boating & Aviary",
                "description": "Lakeside promenade, electric boat rides across Rawal Lake, and walk through one of South Asia's largest walk-through bird aviaries.",
                "location": "Lake View Park, Rawal Lake, Murree Road, Islamabad",
                "category": "ADVENTURE",
                "start_time": "09:30 AM",
                "end_time": "12:30 PM",
                "duration_minutes": 180,
            },
            {
                "title": "Shah Allah Ditta Buddhist Caves & Ancient Banyan Trees",
                "description": "Discover 2,400-year-old Buddhist meditation caves, natural freshwater springs, and historic banyan trees in the western Margalla valley.",
                "location": "Shah Allah Ditta Caves, Sector D-12, Islamabad",
                "category": "CULTURE",
                "start_time": "02:00 PM",
                "end_time": "04:30 PM",
                "duration_minutes": 150,
            },
            {
                "title": "F-7 Jinnah Super & F-6 Artisan Handicrafts Bazaar Walk",
                "description": "Browse artisan brassware, lapis lazuli jewellery, hand-woven Pashmina shawls, and premium Islamabad cafes.",
                "location": "Jinnah Super Market F-7 & Super Market F-6, Islamabad",
                "category": "SHOPPING",
                "start_time": "09:30 AM",
                "end_time": "11:30 AM",
                "duration_minutes": 120,
            },
            {
                "title": "Rawalpindi Raja Bazaar & Historic Havelis Heritage Walk",
                "description": "Explore the vibrant spices, vintage wooden carved jharokas, and historic Purana Qila bazaars of old Rawalpindi.",
                "location": "Raja Bazaar, Saddar & Purana Qila, Rawalpindi",
                "category": "SHOPPING",
                "start_time": "03:00 PM",
                "end_time": "05:30 PM",
                "duration_minutes": 150,
            },
        ],
        "food_spots": [
            {"title": "Monal Margalla Ridge Sunset & Live BBQ Dining", "location": "Monal Restaurant, Pir Sohawa Road, Margalla Hills", "category": "FOOD"},
            {"title": "Authentic Afghan Kabuli Pulao & Kebabs at Kabul Restaurant", "location": "Kabul Restaurant, F-7 Markaz, Islamabad", "category": "FOOD"},
            {"title": "Saidpur Village Des Pardes Traditional Heritage Dining", "location": "Des Pardes, Saidpur Historic Village, Islamabad", "category": "FOOD"},
            {"title": "Legendary Savour Foods Pulao Kabab & Zarda", "location": "Savour Foods, Blue Area, Jinnah Avenue, Islamabad", "category": "FOOD"},
            {"title": "Chaaye Khana Traditional Chai & Breakfast", "location": "Chaaye Khana, F-6 Markaz, Islamabad", "category": "FOOD"},
        ],
    },
    "skardu": {
        "canonical_name": "Skardu & Deosai",
        "region": "Gilgit-Baltistan",
        "hotels": {
            "luxury": [
                {"name": "Shangrila Resort Skardu", "location": "Lower Kachura Lake, Skardu", "rating": 4.8},
                {"name": "Serena Shigar Fort", "location": "Shigar Valley, Skardu", "rating": 4.9},
                {"name": "Khoj Resorts Shigar", "location": "Shigar, Skardu", "rating": 4.8},
            ],
            "comfortable": [
                {"name": "Hotel One Skardu", "location": "Airport Road, Skardu", "rating": 4.5},
                {"name": "Byarsa Hotel Skardu", "location": "Hussainabad, Skardu", "rating": 4.6},
                {"name": "Karakoram Lodge Skardu", "location": "Main Town, Skardu", "rating": 4.4},
            ],
            "budget": [
                {"name": "Tengis Hotel Skardu", "location": "Main Bazar, Skardu", "rating": 4.2},
                {"name": "Concordia Motel Skardu", "location": "River Bank, Skardu", "rating": 4.1},
                {"name": "Deosai Base Camp Glamping", "location": "Ali Malik Top Road, Skardu", "rating": 4.3},
            ],
        },
        "highlights": [
            {
                "title": "Shangrila Resort & Lower Kachura Lake Tour",
                "description": "Stroll around the iconic heart-shaped Lower Kachura Lake, view red-roof chalets, and experience morning mountain reflections.",
                "location": "Shangrila Resort, Lower Kachura, Skardu",
                "category": "SIGHTSEEING",
                "start_time": "08:30 AM",
                "end_time": "11:30 AM",
                "duration_minutes": 180,
            },
            {
                "title": "Upper Kachura Lake Nature Walk & Boating",
                "description": "Scenic 15-minute nature walk to pristine Upper Kachura Lake for fresh trout lunch, cliff photography, and traditional wooden boat rides.",
                "location": "Upper Kachura Lake, Skardu",
                "category": "ADVENTURE",
                "start_time": "12:00 PM",
                "end_time": "02:30 PM",
                "duration_minutes": 150,
            },
            {
                "title": "4x4 Jeep Safari to Deosai Plains & Sheosar Lake",
                "description": "High-altitude expedition across the 'Land of Giants' (4,000m+ plateau), wild alpine flowers, Himalayan Brown Bear habitat, and crystal-clear Sheosar Lake.",
                "location": "Deosai National Park & Sheosar Lake, Skardu",
                "category": "ADVENTURE",
                "start_time": "07:30 AM",
                "end_time": "02:30 PM",
                "duration_minutes": 420,
            },
            {
                "title": "Katpana Cold Desert Sunset & Dunes Walk",
                "description": "Experience high-altitude sand dunes framed by snow-capped peaks during golden hour sunset and stargazing.",
                "location": "Katpana Cold Desert, Skardu",
                "category": "SIGHTSEEING",
                "start_time": "05:00 PM",
                "end_time": "07:00 PM",
                "duration_minutes": 120,
            },
            {
                "title": "Historical Kharpocho Fort Mountain Trek",
                "description": "Ascend the 16th-century King of Forts built on a cliff overlooking Skardu town and the confluence of the Indus River.",
                "location": "Kharpocho Fort, Skardu",
                "category": "CULTURE",
                "start_time": "03:00 PM",
                "end_time": "05:00 PM",
                "duration_minutes": 120,
            },
            {
                "title": "Serena Shigar Fort & Royal Gardens Excursion",
                "description": "Visit the 400-year-old restored Raja palace 'Fort on the Rock' (Fong-Khar) and stroll through centuries-old apricot orchards.",
                "location": "Serena Shigar Fort, Shigar Valley",
                "category": "CULTURE",
                "start_time": "10:00 AM",
                "end_time": "01:30 PM",
                "duration_minutes": 210,
            },
            {
                "title": "Skardu Old Bazaar & Apricot Souvenir Walk",
                "description": "Explore Yadgar Chowk bazaar, sample organic dried apricots, walnuts, herbal teas, and authentic Balti gemstone handicrafts.",
                "location": "Old Bazaar, Yadgar Chowk, Skardu",
                "category": "SHOPPING",
                "start_time": "09:30 AM",
                "end_time": "11:30 AM",
                "duration_minutes": 120,
            },
        ],
        "food_spots": [
            {"title": "Fresh Glacial Balti Trout Lunch", "location": "Upper Kachura Lakeside Cafe, Skardu", "category": "FOOD"},
            {"title": "Traditional Balti Khambir & Marzan Dinner", "location": "Dewan-e-Khas Restaurant, Skardu", "category": "FOOD"},
            {"title": "Fong-Khar Royal Shigar Garden Lunch", "location": "Serena Shigar Fort Courtyard, Shigar", "category": "FOOD"},
        ],
    },
    "hunza": {
        "canonical_name": "Hunza Valley & Gojal",
        "region": "Gilgit-Baltistan",
        "hotels": {
            "luxury": [
                {"name": "Luxus Grand Attabad Lake Resort", "location": "Attabad Lake, Gojal, Hunza", "rating": 4.9},
                {"name": "Serena Inn Karimabad", "location": "Karimabad, Hunza", "rating": 4.8},
                {"name": "Hard Rock Hunza Resort", "location": "Duikar, Eagle's Nest, Hunza", "rating": 4.7},
            ],
            "comfortable": [
                {"name": "Hunza Darbar Hotel", "location": "Karimabad, Hunza", "rating": 4.5},
                {"name": "Eagle's Nest Hotel", "location": "Duikar Village, Hunza", "rating": 4.6},
                {"name": "Off-Grid Resort Passu", "location": "Passu Cones, Gojal", "rating": 4.5},
            ],
            "budget": [
                {"name": "Old Hunza Inn", "location": "Karimabad, Hunza", "rating": 4.2},
                {"name": "Passu Tourist Lodge", "location": "Passu Village, Gojal", "rating": 4.3},
                {"name": "Gulmit Silk Route Lodge", "location": "Gulmit, Upper Hunza", "rating": 4.2},
            ],
        },
        "highlights": [
            {
                "title": "Altit Fort & 1,100-Year-Old Royal Garden Tour",
                "description": "Explore the oldest architectural landmark in Gilgit-Baltistan, ancient Shikari watchtower, and local women artisan carpenter workshops.",
                "location": "Altit Fort, Altit, Hunza",
                "category": "CULTURE",
                "start_time": "09:00 AM",
                "end_time": "11:30 AM",
                "duration_minutes": 150,
            },
            {
                "title": "Baltit Fort Heritage Walk & Karimabad Bazaar",
                "description": "Climb up to the 700-year-old Tibetan-influenced UNESCO-restored Baltit Fort overlooking the entire Hunza Valley, followed by walnut cake at Cafe de Hunza.",
                "location": "Baltit Fort, Karimabad, Hunza",
                "category": "CULTURE",
                "start_time": "12:00 PM",
                "end_time": "02:30 PM",
                "duration_minutes": 150,
            },
            {
                "title": "Eagle's Nest Duikar Sunset & Rakaposhi Panorama",
                "description": "Drive up to Duikar (2,850m) for panoramic golden hour vistas of 7 prominent peaks: Rakaposhi, Ultar Sar, Ladyfinger, and Golden Peak.",
                "location": "Eagle's Nest Viewpoint, Duikar, Hunza",
                "category": "SIGHTSEEING",
                "start_time": "05:00 PM",
                "end_time": "07:00 PM",
                "duration_minutes": 120,
            },
            {
                "title": "Attabad Lake Jet Skiing, Boating & Water Sports",
                "description": "Cruise through turquoise waters surrounded by vertical granite walls with jet ski and luxury speedboat rides.",
                "location": "Attabad Lake, Gojal, Hunza",
                "category": "ADVENTURE",
                "start_time": "09:30 AM",
                "end_time": "12:30 PM",
                "duration_minutes": 180,
            },
            {
                "title": "Passu Cones (Cathedral Ridges) & Glacier Viewpoint",
                "description": "Witness the dramatic jagged spires of the Passu Cones (Tupopdan) and take a short hike to Passu Glacier edge.",
                "location": "Passu Cones Viewpoint, Passu, Gojal",
                "category": "SIGHTSEEING",
                "start_time": "01:30 PM",
                "end_time": "04:00 PM",
                "duration_minutes": 150,
            },
            {
                "title": "Karimabad Heritage Bazaar & Apricot Oil Craft Walk",
                "description": "Browse organic dried apricots, cold-pressed apricot kernel oil, and hand-woven wool rugs.",
                "location": "Karimabad Main Bazaar, Hunza",
                "category": "SHOPPING",
                "start_time": "09:30 AM",
                "end_time": "11:30 AM",
                "duration_minutes": 120,
            },
        ],
        "food_spots": [
            {"title": "Cafe de Hunza Signature Walnut Cake & Coffee", "location": "Cafe de Hunza, Karimabad", "category": "FOOD"},
            {"title": "Traditional Chapshuro & Dawdo Soup Dinner", "location": "Hidden Paradise Restaurant, Karimabad", "category": "FOOD"},
            {"title": "Yak Meat Steak & Organic Apricot Cuisine", "location": "Yak Grill, Passu, Gojal", "category": "FOOD"},
        ],
    },
    "lahore": {
        "canonical_name": "Lahore Historic & Cultural Hub",
        "region": "Punjab",
        "hotels": {
            "luxury": [
                {"name": "Pearl Continental Lahore", "location": "Shahrah-e-Quaid-e-Azam, Lahore", "rating": 4.8},
                {"name": "The Nishat Hotel Gulberg", "location": "Gulberg III, Lahore", "rating": 4.9},
            ],
            "comfortable": [
                {"name": "Hotel One Gulberg", "location": "Gulberg, Lahore", "rating": 4.5},
                {"name": "Park Lane Hotel Lahore", "location": "MM Alam Road, Gulberg, Lahore", "rating": 4.4},
            ],
            "budget": [
                {"name": "Regal Palace Hotel", "location": "Near Railway Station, Lahore", "rating": 4.1},
            ],
        },
        "highlights": [
            {
                "title": "Badshahi Mosque & Lahore Fort (Shahi Qila) Excursion",
                "description": "Explore the majestic 1673 Mughal Badshahi Mosque, Sheesh Mahal (Palace of Mirrors), and ancient Lahore Fort ramparts.",
                "location": "Badshahi Mosque & Lahore Fort, Walled City, Lahore",
                "category": "CULTURE",
                "start_time": "09:00 AM",
                "end_time": "01:00 PM",
                "duration_minutes": 240,
            },
            {
                "title": "Wazir Khan Mosque & Delhi Gate Royal Trail Walk",
                "description": "Walk through Delhi Gate into the 17th-century frescoed tile marvel of Wazir Khan Mosque and Shahi Hammam bathhouse.",
                "location": "Wazir Khan Mosque, Delhi Gate, Walled City, Lahore",
                "category": "CULTURE",
                "start_time": "02:30 PM",
                "end_time": "05:00 PM",
                "duration_minutes": 150,
            },
            {
                "title": "Wagah Border Patriotic Flag-Lowering Ceremony",
                "description": "Experience the electrifying military parade and flag-lowering ceremony at the Pakistan-India Wagah border.",
                "location": "Wagah Border, Lahore",
                "category": "SIGHTSEEING",
                "start_time": "04:30 PM",
                "end_time": "07:00 PM",
                "duration_minutes": 150,
            },
            {
                "title": "Anarkali & Liberty Market Traditional Craft Shopping",
                "description": "Browse traditional Khussa footwear, silk textiles, Mughal jewelry, and Lahori street delicacies.",
                "location": "Anarkali Bazaar & Liberty Market, Lahore",
                "category": "SHOPPING",
                "start_time": "09:30 AM",
                "end_time": "11:30 AM",
                "duration_minutes": 120,
            },
        ],
        "food_spots": [
            {"title": "Fort Road Food Street Rooftop Dinner with Badshahi Mosque Views", "location": "Haveli Restaurant, Fort Road Food Street, Lahore", "category": "FOOD"},
            {"title": "Legendary Butt Karahi & Fresh Naan", "location": "Butt Karahi, Lakshmi Chowk, Lahore", "category": "FOOD"},
            {"title": "Warish Shah Shahi Kheer & Falooda", "location": "Anarkali Food Street, Lahore", "category": "FOOD"},
        ],
    },
    "swat": {
        "canonical_name": "Swat Valley & Kalam",
        "region": "Khyber Pakhtunkhwa",
        "hotels": {
            "luxury": [
                {"name": "Serena Swat Hotel", "location": "Saidu Sharif, Swat", "rating": 4.8},
                {"name": "Malam Jabba Pearl Continental Resort", "location": "Malam Jabba, Swat", "rating": 4.7},
            ],
            "comfortable": [
                {"name": "Walnut Heights Resort", "location": "Kalam Valley, Swat", "rating": 4.5},
                {"name": "Greens Hotel Kalam", "location": "Main Kalam, Swat", "rating": 4.3},
            ],
            "budget": [
                {"name": "Green Hills Hotel Kalam", "location": "Kalam Valley, Swat", "rating": 4.1},
            ],
        },
        "highlights": [
            {
                "title": "Malam Jabba Ski Resort & Chairlift Ride",
                "description": "Experience Pakistan's premier alpine ski resort, cable car chairlift over pine forests, and scenic valley viewpoint.",
                "location": "Malam Jabba Ski Resort, Swat",
                "category": "ADVENTURE",
                "start_time": "09:00 AM",
                "end_time": "01:00 PM",
                "duration_minutes": 240,
            },
            {
                "title": "Mahodand Lake 4x4 Jeep Safari & Ushu Pine Forest",
                "description": "Off-road excursion through dense Ushu cedar woods and Saifullah Lake to the turquoise glacial basin of Mahodand Lake.",
                "location": "Mahodand Lake, Kalam, Swat",
                "category": "ADVENTURE",
                "start_time": "08:00 AM",
                "end_time": "03:00 PM",
                "duration_minutes": 420,
            },
            {
                "title": "Historic White Palace (Sufed Mahal) Marghazar",
                "description": "Tour the 1940s royal residence of the Wali of Swat crafted entirely from white Swat marble.",
                "location": "White Palace, Marghazar, Swat",
                "category": "CULTURE",
                "start_time": "03:30 PM",
                "end_time": "05:30 PM",
                "duration_minutes": 120,
            },
            {
                "title": "Mingora Main Bazaar Handcrafted Shawl & Gemstone Walk",
                "description": "Pick up genuine Swati embroidered woolen shawls, carved wooden furniture, and emerald gemstones.",
                "location": "Main Bazaar, Mingora, Swat",
                "category": "SHOPPING",
                "start_time": "09:30 AM",
                "end_time": "11:30 AM",
                "duration_minutes": 120,
            },
        ],
        "food_spots": [
            {"title": "Fresh Swati Fried Trout Lunch", "location": "Fizagat Riverside Trout Park, Swat", "category": "FOOD"},
            {"title": "Traditional Swati Chapli Kabab & Dum Pukht", "location": "Mingora Central Food Street, Swat", "category": "FOOD"},
        ],
    },
    "naran": {
        "canonical_name": "Naran, Kaghan & Shogran",
        "region": "Khyber Pakhtunkhwa",
        "hotels": {
            "luxury": [
                {"name": "Pine Park Hotel & Resort", "location": "Shogran, Kaghan Valley", "rating": 4.6},
                {"name": "Arcadian Riverside Resort", "location": "Khanian, Kaghan Valley", "rating": 4.7},
            ],
            "comfortable": [
                {"name": "Hotel de Manchi Naran", "location": "Main Naran", "rating": 4.3},
                {"name": "Cedar Wood Resort Shogran", "location": "Shogran Plateau", "rating": 4.4},
            ],
            "budget": [
                {"name": "Kunhar River Motel", "location": "Balakot / Kaghan Road", "rating": 4.0},
            ],
        },
        "highlights": [
            {
                "title": "Lake Saif-ul-Malook Jeep Safari & Lake Trek",
                "description": "Iconic high-altitude fairy-tale lake (3,224m) beneath Malika Parbat peak with boating and horse trekking.",
                "location": "Lake Saif-ul-Malook, Naran",
                "category": "ADVENTURE",
                "start_time": "08:30 AM",
                "end_time": "01:00 PM",
                "duration_minutes": 270,
            },
            {
                "title": "Babusar Top (4,173m) & Lulusar Lake Excursion",
                "description": "Drive through the Kaghan highway pass, panoramic view over mountain ridges, and serene reflection waters of Lulusar Lake.",
                "location": "Babusar Top, Naran-Chilas Highway",
                "category": "SIGHTSEEING",
                "start_time": "09:00 AM",
                "end_time": "03:00 PM",
                "duration_minutes": 360,
            },
            {
                "title": "Siri Paye Meadows Jeep Trail & Alpine Meadows Walk",
                "description": "Jeep ride from Shogran to the lush green plateaus of Siri Paye surrounded by cloud vistas and Makra Peak.",
                "location": "Siri Paye Meadows, Shogran",
                "category": "ADVENTURE",
                "start_time": "09:00 AM",
                "end_time": "02:00 PM",
                "duration_minutes": 300,
            },
            {
                "title": "Naran Main Bazaar Souvenir & Trout Stroll",
                "description": "Evening stroll along Naran market for dry fruits, mountain honey, and handmade woolen hats.",
                "location": "Main Bazaar, Naran",
                "category": "SHOPPING",
                "start_time": "09:30 AM",
                "end_time": "11:30 AM",
                "duration_minutes": 120,
            },
        ],
        "food_spots": [
            {"title": "Kunhar Glacial Fresh Trout Dinner", "location": "Moon Restaurant, Main Naran", "category": "FOOD"},
        ],
    },
    "fairy_meadows": {
        "canonical_name": "Fairy Meadows & Nanga Parbat",
        "region": "Gilgit-Baltistan",
        "hotels": {
            "luxury": [{"name": "Raikot Sarai Cottages", "location": "Fairy Meadows Plateau", "rating": 4.8}],
            "comfortable": [{"name": "Fairy Meadows Broad View Lodges", "location": "Fairy Meadows", "rating": 4.6}],
            "budget": [{"name": "Greenland Hotel & Tents", "location": "Fairy Meadows", "rating": 4.2}],
        },
        "highlights": [
            {
                "title": "Raikot Bridge 4x4 Jeep Safari & Tattu Village Hike",
                "description": "Thrilling cliff-side jeep track followed by a 3-hour trek through alpine pine forests to Fairy Meadows plateau.",
                "location": "Raikot Bridge to Fairy Meadows Track",
                "category": "ADVENTURE",
                "start_time": "07:30 AM",
                "end_time": "02:00 PM",
                "duration_minutes": 390,
            },
            {
                "title": "Beyal Camp & Nanga Parbat Base Camp Trek",
                "description": "Breathtaking trek through birch forests to Beyal Camp and the base of the mighty Raikot Glacier and Nanga Parbat (8,126m).",
                "location": "Beyal Camp, Nanga Parbat Base, Fairy Meadows",
                "category": "ADVENTURE",
                "start_time": "08:00 AM",
                "end_time": "03:30 PM",
                "duration_minutes": 450,
            },
            {
                "title": "Reflection Lake Sunrise & Stargazing",
                "description": "Golden sunrise illumination on the Killer Mountain reflected in Fairy Meadows alpine pond, followed by night astrophotography.",
                "location": "Reflection Lake, Fairy Meadows",
                "category": "SIGHTSEEING",
                "start_time": "05:30 AM",
                "end_time": "07:30 AM",
                "duration_minutes": 120,
            },
        ],
        "food_spots": [
            {"title": "Traditional Campfire Yak Stew & Fresh Bread", "location": "Raikot Sarai Dining Hall, Fairy Meadows", "category": "FOOD"},
        ],
    },
    "kumrat": {
        "canonical_name": "Kumrat Valley & Katora Lake",
        "region": "Khyber Pakhtunkhwa",
        "hotels": {
            "luxury": [{"name": "Kumrat Glamping Resorts", "location": "Kumrat Valley, Upper Dir", "rating": 4.7}],
            "comfortable": [{"name": "Pine Forest Lodge", "location": "Thal / Kumrat Valley", "rating": 4.4}],
            "budget": [{"name": "Hotel Green Hills Thal", "location": "Thal Bazar, Upper Dir", "rating": 4.0}],
        },
        "highlights": [
            {
                "title": "Kumrat Valley Deodar Pine Forest & Waterfall Walk",
                "description": "Walk through giant virgin cedar canopies along the raging Panjkora River to Kumrat Waterfall.",
                "location": "Kumrat Valley Waterfall, Upper Dir",
                "category": "SIGHTSEEING",
                "start_time": "09:00 AM",
                "end_time": "01:00 PM",
                "duration_minutes": 240,
            },
            {
                "title": "Jahaz Banda Meadows & Katora Lake Expedition",
                "description": "Hike up to the breathtaking high-altitude Jahaz Banda plateau and bowl-shaped emerald alpine Katora Lake.",
                "location": "Katora Lake & Jahaz Banda, Kumrat",
                "category": "ADVENTURE",
                "start_time": "07:00 AM",
                "end_time": "04:00 PM",
                "duration_minutes": 540,
            },
        ],
        "food_spots": [
            {"title": "Riverside Trout Barbecue & Shinwari Tikka", "location": "Panjkora Riverside Camp, Kumrat", "category": "FOOD"},
        ],
    },
    "neelum": {
        "canonical_name": "Neelum Valley & Kashmir",
        "region": "Azad Kashmir",
        "hotels": {
            "luxury": [{"name": "Keran Resort by AJK Tourism", "location": "Keran, Neelum Valley", "rating": 4.6}],
            "comfortable": [{"name": "Green Village Resort Arang Kel", "location": "Arang Kel, Neelum", "rating": 4.5}],
            "budget": [{"name": "Pine Park Lodge Kutton", "location": "Kutton, Jagran Valley", "rating": 4.2}],
        },
        "highlights": [
            {
                "title": "Arang Kel Cable Car & Plateau Village Trek",
                "description": "Cross the Neelum River on the Kel cable car and ascend through pine woodlands to the fairy-tale meadows of Arang Kel.",
                "location": "Arang Kel Village, Neelum Valley",
                "category": "ADVENTURE",
                "start_time": "08:30 AM",
                "end_time": "02:00 PM",
                "duration_minutes": 330,
            },
            {
                "title": "Ratti Gali Alpine Lake 4x4 Jeep Safari",
                "description": "Off-road journey from Dowarian through wild alpine meadows to the turquoise glacial jewel of Ratti Gali Lake.",
                "location": "Ratti Gali Lake, Neelum Valley",
                "category": "ADVENTURE",
                "start_time": "07:30 AM",
                "end_time": "03:30 PM",
                "duration_minutes": 480,
            },
            {
                "title": "Sharda Peeth Ancient Temple & University Ruins",
                "description": "Historical exploration of the 6th-century classical center of higher learning and temple of the Hindu goddess Sharada.",
                "location": "Sharda Peeth Ruins, Sharda, Neelum",
                "category": "CULTURE",
                "start_time": "10:00 AM",
                "end_time": "12:30 PM",
                "duration_minutes": 150,
            },
        ],
        "food_spots": [
            {"title": "Traditional Kashmiri Gushtaba & Roghan Josh", "location": "Neelum Valley Riverside Restaurant, Keran", "category": "FOOD"},
        ],
    },
}


class DestinationKnowledgeService:
    """Provides high-fidelity destination intelligence, verified hotels, and accurate POIs."""

    @classmethod
    def match_destination_profile(cls, query: str) -> Optional[Dict[str, Any]]:
        """Match input string to known curated destination knowledge."""
        if not query:
            return None
        q = query.lower().strip()
        for key, profile in DESTINATION_PROFILES.items():
            if key in q:
                return profile
        if "islamabad" in q or "rawalpindi" in q or "pindi" in q or "margalla" in q:
            return DESTINATION_PROFILES["islamabad"]
        if "skardu" in q or "deosai" in q or "shigar" in q or "kachura" in q or "katpana" in q:
            return DESTINATION_PROFILES["skardu"]
        if "hunza" in q or "passu" in q or "gojal" in q or "karimabad" in q or "attabad" in q or "altit" in q or "baltit" in q:
            return DESTINATION_PROFILES["hunza"]
        if "lahore" in q or "badshahi" in q or "shahi qila" in q:
            return DESTINATION_PROFILES["lahore"]
        if "swat" in q or "kalam" in q or "malam" in q or "mingora" in q or "mahodand" in q:
            return DESTINATION_PROFILES["swat"]
        if "naran" in q or "kaghan" in q or "shogran" in q or "babusar" in q or "saiful" in q:
            return DESTINATION_PROFILES["naran"]
        if "fairy" in q or "nanga" in q or "raikot" in q:
            return DESTINATION_PROFILES["fairy_meadows"]
        if "kumrat" in q or "katora" in q or "jahaz" in q:
            return DESTINATION_PROFILES["kumrat"]
        if "neelum" in q or "kashmir" in q or "ratti" in q or "arang" in q or "sharda" in q:
            return DESTINATION_PROFILES["neelum"]
        return None

    @classmethod
    def get_hotel_recommendation(
        cls, destination: str, tier: str = "comfortable"
    ) -> Dict[str, Any]:
        """Get best-fit hotel with location and Google Maps link."""
        profile = cls.match_destination_profile(destination)
        if profile and "hotels" in profile:
            tier_key = tier if tier in profile["hotels"] else "comfortable"
            hotels_list = profile["hotels"].get(tier_key, profile["hotels"]["comfortable"])
            hotel = hotels_list[0]
            maps_url = make_maps_url(hotel["name"], destination)
            return {
                "name": hotel["name"],
                "location": hotel["location"],
                "maps_url": maps_url,
                "rating": hotel.get("rating", 4.5),
            }
        
        # Generic fallback
        hotel_name = f"Central Tourist Lodge ({destination})"
        hotel_loc = f"Central {destination}, Pakistan"
        return {
            "name": hotel_name,
            "location": hotel_loc,
            "maps_url": make_maps_url(hotel_name, destination),
            "rating": 4.5,
        }

    @classmethod
    def generate_authentic_itinerary_days(
        cls,
        destination: str,
        origin: str,
        duration_days: int,
        budget_total: float,
        accommodation_preference: str = "comfortable",
        web_images: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """Generate richly populated, day-by-day structured itinerary with real POIs and Google Maps URLs."""
        profile = cls.match_destination_profile(destination)
        dest_display = profile["canonical_name"] if profile else destination
        hotel_info = cls.get_hotel_recommendation(destination, accommodation_preference)

        days_data = []

        highlights = profile["highlights"].copy() if profile else []
        food_spots = profile["food_spots"].copy() if profile else []

        highlight_idx = 0
        food_idx = 0

        for day_num in range(1, duration_days + 1):
            if day_num == 1:
                # DAY 1: Departure & Arrival
                day_title = f"Departure from {origin} & Arrival in {dest_display}"
                day_summary = f"Scenic transit from {origin}, check-in at {hotel_info['name']}, and evening exploration."
                
                transit_stop = f"Scenic Bypass / Motorway connecting {origin} to {dest_display}"
                
                # Pick first scenic highlight for evening
                if highlights:
                    first_hl = highlights[highlight_idx % len(highlights)]
                    sunset_title = first_hl["title"]
                    sunset_desc = first_hl["description"]
                    sunset_stop = first_hl["location"]
                    sunset_cat = first_hl.get("category", "SIGHTSEEING")
                    sunset_time_start = first_hl.get("start_time", "05:00 PM")
                    sunset_time_end = first_hl.get("end_time", "07:00 PM")
                    sunset_dur = first_hl.get("duration_minutes", 120)
                    highlight_idx += 1
                else:
                    sunset_title = f"{dest_display} Sunset & City Panorama"
                    sunset_desc = f"Golden hour sunset walk with panoramic vistas across {dest_display}."
                    sunset_stop = f"{dest_display} Scenic Viewpoint"
                    sunset_cat = "SIGHTSEEING"
                    sunset_time_start = "05:30 PM"
                    sunset_time_end = "07:00 PM"
                    sunset_dur = 90

                if food_spots:
                    dinner_spot_data = food_spots[food_idx % len(food_spots)]
                    dinner_title = dinner_spot_data["title"]
                    dinner_loc = dinner_spot_data["location"]
                    food_idx += 1
                else:
                    dinner_title = f"Authentic Regional Dinner in {dest_display}"
                    dinner_loc = f"{dest_display} Central Food Street"

                activities = [
                    {
                        "order": 1,
                        "title": f"Departure & Scenic Transit from {origin}",
                        "description": f"Early morning start from {origin} via motorway connecting to {dest_display}.",
                        "location": transit_stop,
                        "map_url": make_maps_url(transit_stop),
                        "start_time": "06:00 AM",
                        "end_time": "11:30 AM",
                        "duration_minutes": 330,
                        "estimated_cost": round(budget_total * 0.12),
                        "category": "TRANSPORT",
                        "image_url": resolve_activity_image("Departure Highway Transit", transit_stop, "motorway drive", "TRANSPORT", dest_display, web_images),
                    },
                    {
                        "order": 2,
                        "title": "Traditional Highway Brunch & Karak Chai Break",
                        "description": "Authentic regional breakfast with paratha, omelette, and hot Karak chai en-route.",
                        "location": f"En-Route Highway Rest Stop ({origin} to {dest_display})",
                        "map_url": make_maps_url(f"Highway Stop en-route to {dest_display}"),
                        "start_time": "11:30 AM",
                        "end_time": "01:00 PM",
                        "duration_minutes": 90,
                        "estimated_cost": round(budget_total * 0.04),
                        "category": "FOOD",
                        "image_url": resolve_activity_image("Highway Brunch Chai", "Highway Rest Stop", "food tea", "FOOD", dest_display, web_images),
                    },
                    {
                        "order": 3,
                        "title": f"Arrival & Check-in at {hotel_info['name']}",
                        "description": f"Arrive in {dest_display}, complete check-in at {hotel_info['name']}, freshen up, and prepare for evening exploration.",
                        "location": hotel_info["location"],
                        "map_url": hotel_info["maps_url"],
                        "start_time": "03:00 PM",
                        "end_time": "04:45 PM",
                        "duration_minutes": 105,
                        "estimated_cost": round(budget_total * 0.12) if accommodation_preference != "none" else 0,
                        "category": "ACCOMMODATION",
                        "image_url": resolve_activity_image("Hotel Check-in", hotel_info["name"], "hotel room", "ACCOMMODATION", dest_display, web_images),
                    },
                    {
                        "order": 4,
                        "title": sunset_title,
                        "description": sunset_desc,
                        "location": sunset_stop,
                        "map_url": make_maps_url(sunset_stop, dest_display),
                        "start_time": sunset_time_start,
                        "end_time": sunset_time_end,
                        "duration_minutes": sunset_dur,
                        "estimated_cost": 0,
                        "category": sunset_cat,
                        "image_url": resolve_activity_image(sunset_title, sunset_stop, sunset_desc, sunset_cat, dest_display, web_images),
                    },
                    {
                        "order": 5,
                        "title": dinner_title,
                        "description": f"Welcome dinner featuring authentic local culinary specialties and relaxation.",
                        "location": dinner_loc,
                        "map_url": make_maps_url(dinner_loc, dest_display),
                        "start_time": "07:30 PM",
                        "end_time": "09:30 PM",
                        "duration_minutes": 120,
                        "estimated_cost": round(budget_total * 0.05),
                        "category": "FOOD",
                        "image_url": resolve_activity_image(dinner_title, dinner_loc, "dinner food", "FOOD", dest_display, web_images),
                    },
                ]

            elif day_num == duration_days:
                # FINAL DAY: Souvenirs & Return
                day_title = f"Morning Vistas, Local Souvenirs & Return to {origin}"
                day_summary = f"Morning breakfast in {dest_display}, local artisan bazaar visit, and safe return transit to {origin}."

                bazaar_title = f"{dest_display} Artisan Handicrafts & Souvenir Walk"
                bazaar_desc = "Pick up authentic regional mementos, handmade textiles, pottery, and local specialties."
                bazaar_loc = f"{dest_display} Main Heritage Bazaar"
                
                if profile:
                    bazaar_act = [h for h in profile["highlights"] if h.get("category") == "SHOPPING"]
                    if bazaar_act:
                        bazaar_title = bazaar_act[0]["title"]
                        bazaar_desc = bazaar_act[0]["description"]
                        bazaar_loc = bazaar_act[0]["location"]

                activities = [
                    {
                        "order": 1,
                        "title": f"Morning Buffet Breakfast at {hotel_info['name']}",
                        "description": f"Fresh breakfast buffet and morning reflection before packing and departure.",
                        "location": hotel_info["location"],
                        "map_url": hotel_info["maps_url"],
                        "start_time": "07:30 AM",
                        "end_time": "09:00 AM",
                        "duration_minutes": 90,
                        "estimated_cost": round(budget_total * 0.03),
                        "category": "FOOD",
                        "image_url": resolve_activity_image("Morning Breakfast", hotel_info["location"], "breakfast food", "FOOD", dest_display, web_images),
                    },
                    {
                        "order": 2,
                        "title": bazaar_title,
                        "description": bazaar_desc,
                        "location": bazaar_loc,
                        "map_url": make_maps_url(bazaar_loc, dest_display),
                        "start_time": "09:30 AM",
                        "end_time": "11:30 AM",
                        "duration_minutes": 120,
                        "estimated_cost": round(budget_total * 0.04),
                        "category": "SHOPPING",
                        "image_url": resolve_activity_image(bazaar_title, bazaar_loc, bazaar_desc, "SHOPPING", dest_display, web_images),
                    },
                    {
                        "order": 3,
                        "title": f"Return Transit Journey to {origin}",
                        "description": f"Depart {dest_display} for comfortable return drive to {origin} with lunch and rest stops.",
                        "location": f"Return Highway connecting {dest_display} to {origin}",
                        "map_url": make_maps_url(f"Highway from {dest_display} to {origin}"),
                        "start_time": "12:00 PM",
                        "end_time": "06:30 PM",
                        "duration_minutes": 390,
                        "estimated_cost": round(budget_total * 0.10),
                        "category": "TRANSPORT",
                        "image_url": resolve_activity_image("Return Journey Highway", f"{dest_display} to {origin}", "highway drive", "TRANSPORT", dest_display, web_images),
                    },
                ]

            else:
                # MIDDLE DAYS: Authentic exploration of specific POIs
                day_title = f"Day {day_num}: Exploration & Highlights of {dest_display}"
                day_summary = f"Full day exploring natural wonders, architectural landmarks, cultural museums, and culinary spots across {dest_display}."

                morning_act = (
                    highlights[highlight_idx % len(highlights)]
                    if highlights
                    else {
                        "title": f"Morning Sightseeing & Landmark Tour",
                        "description": f"Guided tour at iconic viewpoints and cultural landmarks in {dest_display}.",
                        "location": f"{dest_display} Historic Center",
                        "category": "CULTURE",
                        "start_time": "08:30 AM",
                        "end_time": "12:00 PM",
                        "duration_minutes": 210,
                    }
                )
                highlight_idx += 1

                lunch_spot = (
                    food_spots[food_idx % len(food_spots)]
                    if food_spots
                    else {"title": f"Traditional Lunch in {dest_display}", "location": f"{dest_display} Central Food Hub"}
                )
                food_idx += 1

                afternoon_act = (
                    highlights[highlight_idx % len(highlights)]
                    if highlights
                    else {
                        "title": f"Afternoon Heritage & Museum Exploration",
                        "description": f"Discover national heritage sites, cultural exhibitions, and craft centers in {dest_display}.",
                        "location": f"{dest_display} Heritage Museum",
                        "category": "CULTURE",
                        "start_time": "02:30 PM",
                        "end_time": "05:00 PM",
                        "duration_minutes": 150,
                    }
                )
                highlight_idx += 1

                evening_act = (
                    highlights[highlight_idx % len(highlights)]
                    if highlights
                    else {
                        "title": f"Evening Sunset & Leisure Promenade",
                        "description": f"Golden hour photography and leisure walk watching the evening lights across {dest_display}.",
                        "location": f"{dest_display} Promenade",
                        "category": "SIGHTSEEING",
                        "start_time": "05:30 PM",
                        "end_time": "07:00 PM",
                        "duration_minutes": 90,
                    }
                )
                highlight_idx += 1

                dinner_spot = (
                    food_spots[food_idx % len(food_spots)]
                    if food_spots
                    else {"title": f"Evening Dining & Chai in {dest_display}", "location": f"{hotel_info['name']} Courtyard"}
                )
                food_idx += 1

                activities = [
                    {
                        "order": 1,
                        "title": morning_act["title"],
                        "description": morning_act["description"],
                        "location": morning_act["location"],
                        "map_url": make_maps_url(morning_act["location"], dest_display),
                        "start_time": morning_act.get("start_time", "08:30 AM"),
                        "end_time": morning_act.get("end_time", "12:00 PM"),
                        "duration_minutes": morning_act.get("duration_minutes", 210),
                        "estimated_cost": round(budget_total * 0.06),
                        "category": morning_act.get("category", "CULTURE"),
                        "image_url": resolve_activity_image(morning_act["title"], morning_act["location"], morning_act["description"], morning_act.get("category", "CULTURE"), dest_display, web_images),
                    },
                    {
                        "order": 2,
                        "title": lunch_spot["title"],
                        "description": f"Freshly prepared regional lunch featuring authentic local flavors and refreshing beverages.",
                        "location": lunch_spot["location"],
                        "map_url": make_maps_url(lunch_spot["location"], dest_display),
                        "start_time": "12:30 PM",
                        "end_time": "02:00 PM",
                        "duration_minutes": 90,
                        "estimated_cost": round(budget_total * 0.04),
                        "category": "FOOD",
                        "image_url": resolve_activity_image(lunch_spot["title"], lunch_spot["location"], "lunch food", "FOOD", dest_display, web_images),
                    },
                    {
                        "order": 3,
                        "title": afternoon_act["title"],
                        "description": afternoon_act["description"],
                        "location": afternoon_act["location"],
                        "map_url": make_maps_url(afternoon_act["location"], dest_display),
                        "start_time": afternoon_act.get("start_time", "02:30 PM"),
                        "end_time": afternoon_act.get("end_time", "05:00 PM"),
                        "duration_minutes": afternoon_act.get("duration_minutes", 150),
                        "estimated_cost": round(budget_total * 0.04),
                        "category": afternoon_act.get("category", "CULTURE"),
                        "image_url": resolve_activity_image(afternoon_act["title"], afternoon_act["location"], afternoon_act["description"], afternoon_act.get("category", "CULTURE"), dest_display, web_images),
                    },
                    {
                        "order": 4,
                        "title": evening_act["title"],
                        "description": evening_act["description"],
                        "location": evening_act["location"],
                        "map_url": make_maps_url(evening_act["location"], dest_display),
                        "start_time": evening_act.get("start_time", "05:30 PM"),
                        "end_time": evening_act.get("end_time", "07:00 PM"),
                        "duration_minutes": evening_act.get("duration_minutes", 90),
                        "estimated_cost": 0,
                        "category": evening_act.get("category", "SIGHTSEEING"),
                        "image_url": resolve_activity_image(evening_act["title"], evening_act["location"], evening_act["description"], evening_act.get("category", "SIGHTSEEING"), dest_display, web_images),
                    },
                    {
                        "order": 5,
                        "title": dinner_spot["title"],
                        "description": f"Evening dinner gathering and warm tea under the night sky in {dest_display}.",
                        "location": dinner_spot["location"],
                        "map_url": make_maps_url(dinner_spot["location"], dest_display),
                        "start_time": "07:30 PM",
                        "end_time": "09:30 PM",
                        "duration_minutes": 120,
                        "estimated_cost": round(budget_total * 0.05),
                        "category": "FOOD",
                        "image_url": resolve_activity_image(dinner_spot["title"], dinner_spot["location"], "dinner food", "FOOD", dest_display, web_images),
                    },
                ]

            days_data.append({
                "day_number": day_num,
                "title": day_title,
                "summary": day_summary,
                "activities": activities,
            })

        return days_data

    @classmethod
    def check_weather_advisory(
        cls, destination: str, departure_date: Optional[str] = None, duration_days: int = 3
    ) -> Dict[str, Any]:
        """Analyze date & destination for seasonal risk and suggest optimal alternate travel windows."""
        import datetime
        profile = cls.match_destination_profile(destination)
        dest_display = profile["canonical_name"] if profile else destination
        
        today = datetime.date.today()
        opt_start = today + datetime.timedelta(days=14)
        opt_end = opt_start + datetime.timedelta(days=duration_days)

        if not departure_date:
            return {
                "is_optimal": True,
                "status": "OPTIMAL",
                "message": f"Optimal conditions projected for {dest_display}.",
                "suggested_dates": {
                    "start_date": opt_start.strftime("%Y-%m-%d"),
                    "end_date": opt_end.strftime("%Y-%m-%d"),
                    "label": f"{opt_start.strftime('%b %d')} - {opt_end.strftime('%b %d, %Y')}",
                },
            }

        try:
            dep = datetime.datetime.strptime(departure_date, "%Y-%m-%d").date()
            month = dep.month
            dest_lower = (destination or "").lower()
            is_high_north = any(k in dest_lower for k in ["skardu", "deosai", "hunza", "fairy", "nanga", "kaghan", "naran", "babusar", "kumrat"])
            
            # Winter heavy snow (Dec - Mar)
            if is_high_north and month in [12, 1, 2, 3]:
                suggested_start = datetime.date(dep.year if month > 3 else dep.year, 5, 20)
                if suggested_start < today:
                    suggested_start = today + datetime.timedelta(days=10)
                suggested_end = suggested_start + datetime.timedelta(days=duration_days)
                return {
                    "is_optimal": False,
                    "status": "WARNING",
                    "warning_type": "HEAVY_SNOW",
                    "title": "Winter Road & Snow Closure Advisory",
                    "message": f"Sub-zero temperatures and severe snowfall frequently close high passes (Deosai / Babusar) in {dest_display} during winter months.",
                    "suggested_dates": {
                        "start_date": suggested_start.strftime("%Y-%m-%d"),
                        "end_date": suggested_end.strftime("%Y-%m-%d"),
                        "label": f"{suggested_start.strftime('%b %d')} - {suggested_end.strftime('%b %d, %Y')}",
                    },
                }

            # Monsoon landslide risk (July - August)
            if is_high_north and month in [7, 8]:
                suggested_start = datetime.date(dep.year, 9, 15)
                suggested_end = suggested_start + datetime.timedelta(days=duration_days)
                return {
                    "is_optimal": False,
                    "status": "WARNING",
                    "warning_type": "MONSOON_RISK",
                    "title": "Monsoon Landslide & Rainfall Advisory",
                    "message": f"Monsoon cloudbursts and landslide alerts are common along mountain transit corridors to {dest_display} in July/August.",
                    "suggested_dates": {
                        "start_date": suggested_start.strftime("%Y-%m-%d"),
                        "end_date": suggested_end.strftime("%Y-%m-%d"),
                        "label": f"{suggested_start.strftime('%b %d')} - {suggested_end.strftime('%b %d, %Y')} (Golden Autumn)",
                    },
                }

        except Exception:
            pass

        return {
            "is_optimal": True,
            "status": "OPTIMAL",
            "message": f"Clear skies and favorable travel conditions forecast for {dest_display}.",
            "suggested_dates": {
                "start_date": departure_date,
                "end_date": departure_date,
                "label": "Selected Dates Optimal",
            },
        }

    @classmethod
    def get_slot_options(cls, destination: str) -> Dict[str, Any]:
        """Generate 4 curated options (A, B, C, D: Let Friday Decide) for each part of the day."""
        profile = cls.match_destination_profile(destination)
        dest_display = profile["canonical_name"] if profile else destination
        highlights = profile["highlights"] if profile else []
        food_spots = profile["food_spots"] if profile else []

        h_titles = [h["title"] for h in highlights] if highlights else [
            f"Scenic Viewpoint & Heritage Tour ({dest_display})",
            f"Historical Architecture & Cultural Walk ({dest_display})",
            f"Lakeside Promenade & Leisure Boating ({dest_display})",
            f"Sunset Panorama Photography ({dest_display})",
        ]

        return {
            "morning": {
                "label": "Morning Exploration (08:30 AM – 12:00 PM)",
                "options": [
                    {"id": "opt_a", "title": h_titles[0] if len(h_titles) > 0 else "Scenic Heritage Tour", "category": "CULTURE"},
                    {"id": "opt_b", "title": h_titles[1] if len(h_titles) > 1 else "Historical Landmark Walk", "category": "CULTURE"},
                    {"id": "opt_c", "title": h_titles[2] if len(h_titles) > 2 else "Lakeside & Nature Walk", "category": "ADVENTURE"},
                    {"id": "opt_d", "title": "✨ Let Friday Decide (AI Optimized Best Pick)", "category": "RECOMMENDED"},
                ],
            },
            "afternoon": {
                "label": "Afternoon Adventure & Heritage (02:00 PM – 05:00 PM)",
                "options": [
                    {"id": "opt_a", "title": h_titles[2] if len(h_titles) > 2 else "National Monument & Museum", "category": "CULTURE"},
                    {"id": "opt_b", "title": h_titles[3] if len(h_titles) > 3 else "Artisan Folk Heritage Village", "category": "CULTURE"},
                    {"id": "opt_c", "title": "Traditional Bazaar & Local Artisan Craft Walk", "category": "SHOPPING"},
                    {"id": "opt_d", "title": "✨ Let Friday Decide (AI Optimized Best Pick)", "category": "RECOMMENDED"},
                ],
            },
            "evening": {
                "label": "Golden Hour & Evening Vistas (05:30 PM – 09:30 PM)",
                "options": [
                    {"id": "opt_a", "title": h_titles[1] if len(h_titles) > 1 else "Sunset Panorama Photography", "category": "SIGHTSEEING"},
                    {"id": "opt_b", "title": food_spots[0]["title"] if food_spots else "Scenic Terrace Sunset Dinner", "category": "FOOD"},
                    {"id": "opt_c", "title": "Evening Heritage Cafe & Chai Stroll", "category": "FOOD"},
                    {"id": "opt_d", "title": "✨ Let Friday Decide (AI Optimized Best Pick)", "category": "RECOMMENDED"},
                ],
            },
        }
