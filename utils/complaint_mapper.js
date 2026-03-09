import { askGroqAI } from './ai_agent.js';

const complaintMap = {
  Engine: {
    keywords: [
      "engine", "motor", "इंजन", "मोटर", "चालू नहीं", "शुरू नहीं", "मशीन चालू नहीं", "मशीन स्टार्ट नहीं", 
      "मोटर खराब", "इंजन खराब", "इंजिन", "start नहीं", "chalu नहीं", "शुरुआत नहीं", "run नहीं", "झटके", 
      "थरथार", "इंजन में समस्या", "इंजन की समस्या", "इंजन में प्रॉब्लम", "मशीन में समस्या", "मशीन खराब", 
      "भी ठंडा नहीं", "ठंडा नहीं कर रहा", "engine problem", "engine issue", "machine problem", 
      "machine issue", "engine काम नहीं", "मशीन काम नहीं",
    ],
    priority: 10,
    subTitles: {
      Overheating: ["overheat", "गर्म", "गरम", "heat", "temperature", "गर्मी", "बहुत गर्म", "high temperature", "आग"],
      "Black Smoke": ["smoke", "धुआ", "काला धुआ", "black smoke", "smoking", "fumes", "dhaua"],
      "Loss of Power": ["power कम", "weak", "कमजोर", "no power", "slow", "sluggish", "तेजी नहीं", "गति नहीं"],
      "Knocking Noise": ["knock", "knocking", "टकटक", "chattering", "खटाखट", "खड़खड़"],
      "Diesel Leak": ["leak", "लीक", "fuel leak", "diesel बह रहा", "ईंधन लीक", "तेल निकल रहा"],
      "Abnormal Noise": ["noise", "आवाज", "sound", "शोर", "grinding", "whining", "whistling"],
      "Fuel Consumption": ["fuel", "petrol", "diesel", "खर्च", "consumption", "mileage", "ईंधन खपत"],
      Misfire: ["misfire", "coughing", "jerking", "stumbling", "कंपन", "झटका", "थरथराना"],
    },
  },
  "Starting Trouble": {
    keywords: [
      "स्टार्ट नहीं", "मशीन का स्टार्ट", "मशीन का स्टार्ट नहीं", "ए मशीन चल रही है।", "मशीन चल ", "चल नहीं", 
      "चालू नहीं", "शुरू नहीं", "बंद है", "चालू नहीं हो रहा", "स्टार्ट नहीं हो रहा", "मशीन नहीं चली", 
      "इग्निशन नहीं", "क्रैंक", "स्टार्टिंग", "शुरु नहीं", "शुरुआत नहीं", "स्टार्ट नहीं होता", "स्टार्टर खराब", 
      "स्टार्टर समस्या", "शुरुआत की समस्या", "चालू करने में समस्या", "मशीन स्टार्ट नहीं हो रही", 
      "स्टार्ट करना मुश्किल", "स्टार्ट नहीं हो पा रहा", "starting", "start nahi", "chalu nahi", "band hai", 
      "start ho nahi raha", "start problem", "starting problem", "start nahi hota", "start issue", 
      "cold start", "hard start", "slow start", "no start", "wont start", "start nahi ho raha", 
      "start hi nahi", "engine start", "crank", "ignition", "start karna", "starting trouble", 
      "shuru nahi", "starter", "starter problem", "starting issue", "won't start", "doesn't start", "fails to start",
      "kaam nahi kar rahi", "kaam nahi karta", "kaam nahi kar raha", "kam nahi kar rahi", "काम नहीं कर रही", "काम नहीं कर रहा"
    ],
    priority: 10,
    subTitles: {
      "No Start Condition": ["no start", "बिल्कुल नहीं", "शुरू ही नहीं", "dead", "complete fail", "wont start", "start hi nahi", "bilkul nahi", "engine hi nahi"],
      "Hard Starting": ["hard start", "कठिन", "मुश्किल से", "कई बार", "attempt", "mushkil", "baar baar"],
      "Cold Starting Issue": ["cold start", "सर्द", "ठंड में", "morning", "raat ke baad", "subah", "sardi"],
      "Slow Starting": ["slow start", "धीमा", "samay lagta", "late", "dheere", "der lagti"],
      "Cranking Weak": ["cranking", "weak crank", "कमजोर क्रैंक", "rpm", "turnover", "ghoomta nahi"],
      "Self Starter Fail": ["self", "self starter", "self nahi", "सेल्फ", "सेल्फ नहीं", "self problem"],
    },
  },
  Transmission: {
    keywords: [
      "transmission", "gear", "shift", "गियर", "ट्रांसमिशन", "gear box", "ट्रांसमिशन खराब", "गियर समस्या", 
      "शिफ्ट", "gear change", "shifting", "नहीं लग रहा", "गियर नहीं लग", "ट्रांसमिशन की समस्या", 
      "गियर की समस्या", "गियर में समस्या", "ट्रांसमिशन में समस्या", "shift problem", "transmission problem", "gear problem",
    ],
    priority: 9,
    subTitles: {
      "Gear Shifting Hard": ["shift hard", "shift difficult", "gear नहीं लग रहा", "grinding", "stuck", "jam", "मुश्किल", "जाम हो गया"],
      Slipping: ["slipping", "rpm बढ़ रहा", "power loss", "slip करना", "खिसकना"],
      "Neutral Problem": ["neutral", "neutral में फंस", "न्यूट्रल"],
      "Gear Grinding": ["grind", "grinding", "grinding noise", "scraping", "चरमरा", "खरखराहट"],
    },
  },
  "Hydraulic System": {
    keywords: [
      "hydraulic", "pressure", "pump", "हाइड्रोलिक", "पंप", "दबाव", "प्रेशर", "pressure कम", "दबाव कम", 
      "hydraulic oil", "हाइड्रोलिक तेल", "loader", "bucket", "boom", "arm",
    ],
    priority: 9,
    subTitles: {
      "Low Pressure": ["pressure कम", "प्रेशर कम", "दबाव कम", "low", "weak", "slow", "तेजी नहीं", "स्पीड कम"],
      "Bucket Not Lifting": ["bucket नहीं उठ", "lift नहीं", "boom slow", "arm नहीं उठ", "उठता नहीं", "बाल्टी नहीं"],
      "Hydraulic Leak": ["leak", "लीक", "oil leak", "seeping", "बह रहा", "dripping", "तेल गिरना"],
      "Pump Failure": ["pump fail", "pump नहीं", "pump problem", "पंप खराब", "पंप मर गया"],
      "Cylinder Problem": ["cylinder", "cylinder leak", "rod", "seal", "सिलेंडर"],
      "Hose Pressure": ["hose", "hose leak", "pipe burst", "नली", "पाइप"],
    },
  },
  "Braking System": {
    keywords: [
      "brake", "ब्रेक", "braking", "stop", "रोक", "पैडल", "brake pedal", "ब्रेकिंग", "ब्रेक खराब", 
      "रुकना मुश्किल", "disc brake", "band brake",
    ],
    priority: 10,
    subTitles: {
      "Brake Not Working": ["brake काम नहीं", "no braking", "brake fail", "नहीं रुक रहा", "ब्रेक नहीं", "रोकना नहीं"],
      "Weak Braking": ["brake कमजोर", "weak", "slow stop", "soft pedal", "दुर्बल", "हल्का"],
      "Brake Pads Worn": ["pads", "pad worn", "पैड", "पैड पहना", "पैड टूटा", "घिसाव"],
      "Brake Fluid Leak": ["fluid leak", "brake leak", "पेडल दबता नहीं", "spongy pedal", "तरल लीक"],
      "Brake Noise": ["noise", "squealing", "grinding", "creaking", "screeching", "शोर", "चीख"],
    },
  },
  "Electrical System": {
    keywords: ["electrical", "battery", "light", "बिजली", "बैटरी", "स्टार्टर", "अल्टरनेटर", "wiring", "spark", "ignition"],
    priority: 8,
    subTitles: {
      "Battery Problem": ["battery", "dead", "weak", "बैटरी नहीं चार्ज", "charge नहीं हो रहा"],
      "Starter Motor": ["starter", "स्टार्टर", "cranking weak", "starter खराब", "no crank"],
      "Alternator Problem": ["alternator", "charge नहीं", "alternator खराब", "बिजली नहीं"],
      "Wiring Issue": ["wiring", "wire", "short", "spark", "electrical short"],
      "Light Problem": ["light", "लाइट", "headlight", "taillight", "बत्ती नहीं जल रही"],
    },
  },
  "Cooling System": {
    keywords: ["cooling", "coolant", "radiator", "fan", "पंखा", "ठंडा करना", "water pump", "thermostat", "temperature", "water system"],
    priority: 8,
    subTitles: {
      "Radiator Leak": ["radiator leak", "radiator खराब", "पानी निकल रहा", "water leak"],
      "Fan Problem": ["fan", "पंखा", "fan काम नहीं", "fan slow", "fan noise"],
      Thermostat: ["thermostat", "temperature control", "temp problem"],
      "Water Pump": ["pump", "पंप", "water नहीं घूम रहा", "pump leak"],
    },
  },
  "AC/Cabin": {
    keywords: [
      "ऐसी", "ऐ.सी", "ऐ सी", "ऐ", "ऐकी", "एसी खराब", "एसी", "ए.सी", "ए सी", "एअर कंडीशनर", "एयर कंडीशनर", 
      "ठंडा नहीं", "ठंडक नहीं", "गरम हवा", "कैबिन गर्म", "ठंडी नहीं", "ऐसी खराब", "एसी खराब", "ऐसी बंद", 
      "एसी बंद", "ऐसी काम नहीं", "ब्लोअर", "कंप्रेसर", "कंडेंसर", "फिल्टर", "एसी की खराबी", "एयर", "सी खराब", 
      "ठंडक नहीं दे रहा", "हवा नहीं", "ठंड नहीं आ रही", "ठंडा कर नहीं रहा", "एक भी ठंडा नहीं", "बिल्कुल ठंडा नहीं", 
      "ठंडा नहीं कर रहा", "ठंडा नहीं कर पा रहा", "ठंडक नहीं दे पा रहा", "कूलिंग नहीं", "कूल नहीं", "गर्मी बहुत है", 
      "कोई ठंडक नहीं", "ठंडक नहीं दे रहा", "पहुँच नहीं रहा", "ac", "a.c", "a/c", "air conditioner", "air conditioning", 
      "esi", "aisi", "aesi", "a c", "ac nahi", "ac band", "ac kharab", "cabin cool", "cooling nahi", "thanda nahi", 
      "thandi nahi", "compressor", "condenser", "blower", "ac filter", "cabin hot", "ac chal nahi", "ac chalta nahi", 
      "ac problem", "cool nahi kar raha", "ac cooling", "cooling band", "cabin temperature", "ac issue", "cooling kharab", 
      "cooling problem", "no cooling", "not cooling", "ac weak", "weak cooling",
    ],
    priority: 8,
    subTitles: {
      "AC Not Cooling": ["ठंडा नहीं", "thanda nahi", "thandi nahi", "cooling नहीं", "cool nahi", "ac weak", "temperature high", "गरम हवा", "hot air", "ठंडक नहीं"],
      "AC Not Working": ["ac काम नहीं", "ac band", "ac off", "ac chalta nahi", "compressor fail", "कंप्रेसर", "ac nahi chala", "बिल्कुल बंद"],
      "Blower Problem": ["blower", "ब्लोअर", "blower noise", "blower kharab", "hawa nahi aa rahi", "हवा नहीं", "fan nahi"],
      "Gas Leakage": ["gas", "gas leak", "refrigerant", "re-gas", "gas khatam", "गैस", "रेफ्रिजरेंट"],
      "Filter Choked": ["filter", "filter chok", "filter kharab", "air flow कम", "dust", "jaam", "जाम"],
    },
  },
  Steering: {
    keywords: ["steering", "पहिया", "wheel", "turn", "स्टीयरिंग", "पावर स्टीयरिंग", "power steering", "turning"],
    priority: 8,
    subTitles: {
      "Hard Steering": ["hard", "heavy", "कड़ा", "difficult turn", "मुश्किल से मुड़ता"],
      "Power Steering Fail": ["power steering", "पावर खो गया", "power loss", "steering काम नहीं"],
      "Steering Noise": ["noise", "whining", "groaning", "creaking"],
      Vibration: ["vibration", "shake", "कंपन", "road feel"],
    },
  },
  Clutch: {
    keywords: ["clutch", "क्लच", "clutch pedal", "disengagement", "engagement", "क्लच पैडल", "क्लच खराब", "clutch plate"],
    priority: 7,
    subTitles: {
      "Clutch Slip": ["slip", "slipping", "गति नहीं बढ़ रही", "rpm बढ़ता है", "क्लच फिसल"],
      "Hard Pedal": ["hard", "tight", "कड़ा", "difficult depress", "पेडल कड़ा", "दबाना मुश्किल"],
      "Clutch Noise": ["noise", "squeak", "groaning", "whistling", "शोर", "चीख"],
      "Clutch Wear": ["wear", "worn", "friction कम", "response slow", "घिसाव"],
    },
  },
  "Fuel System": {
    keywords: ["fuel", "petrol", "diesel", "फ्यूल", "tank", "injector", "fuel pump", "fuel filter", "fuel supply"],
    priority: 8,
    subTitles: {
      "Fuel Pump": ["pump", "pump fail", "no fuel supply", "fuel नहीं आ रहा"],
      "Fuel Filter": ["filter", "choke", "filter खराब", "fuel flow कम"],
      "Injector Problem": ["injector", "injector block", "spray problem"],
      "Fuel Leak": ["leak", "leaking", "fuel बह रहा", "tank leak"],
    },
  },
  "Bucket/Boom": {
    keywords: ["bucket", "boom", "bucket arm", "loader arm", "loader", "dipper", "arm", "bucket lift", "boom not rising"],
    priority: 8,
    subTitles: {
      "Bucket Not Working": ["bucket नहीं", "bucket खराब", "bucket ठीक नहीं", "bucket stuck"],
      "Boom Slow": ["boom slow", "boom power कम", "lifting slow", "लिफ्टिंग कमजोर"],
      "Bucket Weld Crack": ["crack", "टूटा", "weld break", "टूटन"],
      "Arm Bent": ["bent", "टेढ़ा", "damage", "misalignment"],
    },
  },
  "Oil Leak": {
    keywords: ["oil leak", "leak", "oil", "तेल", "तेल बह रहा", "leaking", "निकल रहा है", "बह रहा है", "टपक रहा है", "निकलना", "टपकना", "रिस रहा है", "nikal raha hai", "bah raha hai", "tapak raha hai", "ris raha hai"],
    priority: 7,
    subTitles: {
      "Engine Oil Leak": ["engine", "engine leak", "तेल टपक रहा"],
      "Transmission Leak": ["transmission", "gear oil leak"],
      "Hydraulic Leak": ["hydraulic", "hydraulic fluid leak"],
      "Seal Problem": ["seal", "gasket", "seal खराब"],
    },
  },
  Vibration: {
    keywords: ["vibration", "shake", "vibrate", "कंपन", "shaking", "tremor"],
    priority: 6,
    subTitles: {
      "Engine Vibration": ["engine", "engine shake", "unbalance"],
      "Driveline Vibration": ["drive", "drivetrain", "transmission"],
      "Wheel Vibration": ["wheel", "tyre", "balancing"],
    },
  },
  Noise: {
    keywords: ["noise", "sound", "आवाज", "creaking", "grinding", "clunking", "शोर", "ध्वनि", "खरखराहट"],
    priority: 5,
    subTitles: {
      "Engine Knocking": ["knock", "knocking", "ping", "खटाखट", "टकटक"],
      Grinding: ["grinding", "grinding noise", "metal sound", "अपघर्षण"],
      Squealing: ["squeal", "squealing", "high pitch", "चीख"],
      Clunking: ["clunk", "clanking", "metallic", "धड़ाम"],
    },
  },
  "Wiper System": {
    keywords: ["wiper", "वाइपर", "wiper nahi chal raha", "wiper kharab", "wiper band", "wiper problem", "glass saaf nahi", "wiper chalana", "windshield wiper", "wipers"],
    priority: 6,
    subTitles: {
      "Wiper Not Working": ["nahi chal raha", "band", "kharab", "nahi", "काम नहीं कर रहा"],
      "Wiper Slow": ["slow", "dheere", "dhima", "धीमी", "धीरे"],
      "Wiper Noise": ["kharkhara", "खरखराना"]
    }
  },
  "Tyre/Wheel": {
    keywords: ["tyre", "tire", "type", "टायर", "puncture", "flat", "pankchar", "chakka", "चक्का", "wheel kharab", "rim", "tube", "पहिया"],
    priority: 6,
    subTitles: {
      "Puncture": ["puncture", "pankchar", "flat", "hawa nahi", "हवा नहीं", "फटा"],
      "Tyre Wear": ["ghisa", "wear", "purana", "घिसा", "पुरानी", "खराब"],
      "Rim Damage": ["rim", "bent", "toda", "टूटा", "टेढ़ा", "नुकसान"]
    }
  },
  "Track/Undercarriage": {
    keywords: ["track", "chain", "sprocket", "undercarriage", "ट्रैक", "चेन", "patri", "पटरी", "track nahi chal raha", "track utar gaya", "crawler", "undercarriage damage"],
    priority: 7,
    subTitles: {
      "Track Off": ["utar gaya", "off", "girna", "nikal gaya", "उतर गई", "गिर गई"],
      "Chain Break": ["tuta", "break", "cut", "टूटी", "टूट गई", "कट गई"],
      "Sprocket Wear": ["ghisa", "wear", "sprocket", "घिसी", "घिस गई"]
    }
  },
  "Exhaust": {
    keywords: ["silencer", "exhaust", "साइलेंसर", "एग्जॉस्ट", "pipe", "dhuan pipe", "exhaust kharab", "silencer tuta", "muffler", "पाइप"],
    priority: 5,
    subTitles: {
      "Silencer Broken": ["tuta", "crack", "phata", "दरार"],
      "Smoke from Exhaust": ["dhuan", "smoke", "कala", "काला"]
    }
  },
  "Cabin/Body": {
    keywords: ["glass", "शीशा", "sheesa", "door", "दरवाजा", "darwaza", "cabin", "seat", "सीट", "mirror", "deur", "body damage", "cabin tuta", "darwaza nahi band", "canopy", "कैनोपी"],
    priority: 4,
    subTitles: {
      "Glass Broken": ["tuta", "crack", "दरार"],
      "Door Problem": ["band nahi", "khulta nahi", "खुलता नहीं"],
      "Seat Problem": ["tuti", "adjust nahi", "टूटी", "समायोजन नहीं"]
    }
  },
  "Electrical Accessories": {
    keywords: ["horn", "हॉर्न", "light", "लाइट", "indicator", "headlight", "work light", "horn nahi baj raha", "light nahi jal rahi", "batti", "बत्ती", "electrical", "battery", "बैटरी"],
    priority: 5,
    subTitles: {
      "Horn Not Working": ["nahi baj raha", "silent", "बजता नहीं"],
      "Light Problem": ["headlight", "dark", "अंधेरा"]
    }
  },
  "Oil Service": {
    keywords: [
      "oil", "service", "सर्विस", "सर्विस की जरूरत", "सर्विस चाहिए", "सर्वि", "oil change", "तेल", "ऑयल", 
      "तेल बदलना", "oil badalna", "maintenance", "maintenance service", "रखरखाव", "रखरखाव सेवा", 
      "indian oil", "इंडियन ऑयल", "inspection", "machine check", "general service", "servicing", 
      "regular service", "checkup", "ब्रेकडाउन सर्विस", "emergency service", "तेल की जांच", "oil check", 
      "maintenance due", "service due",
    ],
    priority: 8,
    subTitles: {
      "Oil Change": ["oil change", "तेल बदलना", "oil badalna", "engine oil", "इंजन ऑयल", "naya tel"],
      "Routine Maintenance": ["maintenance", "check", "inspection", "regular service", "checkup", "जांच", "रखरखाव"],
      "Filter Replacement": ["filter", "फिल्टर", "oil filter", "air filter", "fuel filter", "फिल्टर बदलना"],
      "General Service": ["service", "general service", "basic service", "सर्विस", "आधारभूत सेवा"],
    },
  },
  "Hydraulic AC Service": {
    keywords: [
      "hydraulic", "हाइड्रोलिक", "hydraulic service", "हाइड्रोलिक सर्विस", "hydraulic maintenance", "pressure", 
      "pressure service", "प्रेशर सर्विस", "pump service", "पंप सर्विस", "hydraulic fluid", "हाइड्रोलिक तेल", 
      "hydraulic oil", "hydraulic system service", "hydraulic check", "ac", "a.c", "ऐसी", "एसी", "ac service", 
      "एसी सर्विस", "ac maintenance", "एसी मेंटेनेंस", "ac servicing", "एसी सर्विसिंग", "ac filter", "एसी फिल्टर", 
      "ac gas", "एसी गैस", "ac refrigerant", "compressor service", "कंप्रेसर सर्विस", "ac check", "एसी चेक", 
      "ac recharge", "कूलिंग सर्विस", "cooling service", "cabin service", "सर्विस चाहिए", "service chahiye", 
      "सर्विस करनी है", "service krani hai", "सर्विस दे दो", "service de do", "सर्विस की जरूरत है", 
      "service ki zaroorat", "maintenance krani hai", "maintenance chahiye", "maintenance deni hai", 
      "service करवाना है", "service karvana hai",
    ],
    priority: 7,
    subTitles: {
      "Hydraulic Service": ["hydraulic", "हाइड्रोलिक", "hydraulic service", "हाइड्रोलिक सर्विस", "pressure", "pump", "पंप", "hydraulic fluid", "hydraulic maintenance", "pressure check", "प्रेशर चेक", "hydraulic system"],
      "AC Service": ["ac", "ऐसी", "एसी", "ac service", "एसी सर्विस", "ac maintenance", "एसी मेंटेनेंस", "ac filter", "एसी फिल्टर", "ac gas", "एसी गैस", "compressor", "कंप्रेसर", "ac recharge", "कूलिंग"],
      "Combined Service": ["service", "सर्विस", "maintenance", "रखरखाव", "checkup", "जांच", "inspection", "सर्विस चाहिए", "maintenance krani hai", "service chahiye"],
    },
  },
  "Service": {
    keywords: [
      "सर्विस", "सर्विस करनी है", "सर्विस करना है", "सर्विस चाहिए", "सर्विस दे दो", "सर्विस देनी है", 
      "सर्विस की जरूरत है", "सर्विस की आवश्यकता है", "सर्विस का समय है", "रखरखाव", "रखरखाव करनी है", 
      "रखरखाव चाहिए", "मेंटेनेंस", "मेंटेनेंस चाहिए", "मेंटेनेंस करनी है", "जांच", "जांच करनी है", 
      "जांच चाहिए", "inspection", "checkup", "service", "service krani hai", "service karna hai", 
      "service chahiye", "service de do", "service deni hai", "service ki zaroorat", "maintenance krani hai", 
      "maintenance chahiye", "maintenance deni hai", "checkup krani hai", "inspection krani hai", 
      "service करवाना है", "service karvana hai", "servicing", "regular service", "general service", 
      "servicing krani hai", "सर्विसिंग", "नियमित सर्विस", "सामान्य सर्विस",
    ],
    priority: 7,
    subTitles: {
      "Regular Service": ["service", "सर्विस", "regular", "नियमित", "general service", "सामान्य सर्विस", "basic service", "रूटीन सर्विस", "routine"],
      "Maintenance": ["maintenance", "रखरखाव", "maintain", "preventive", "रोकथाम", "upkeep", "रखभाल"],
      "Checkup/Inspection": ["checkup", "inspection", "check", "जांच", "inspect", "diagnosis", "निदान", "examine"],
      "Service Due": ["due", "time", "समय", "service due", "maintenance due", "checkup due", "inspection due", "दिन हो गए", "समय आ गया"],
    },
  },
  "General Problem": {
    keywords: ["problem", "issue", "समस्या", "दिक्कत", "खराब", "trouble", "परेशानी", "प्रॉब्लम", "प्रॉब्लेम", "समस्या है", "दिक्कत है", "मुसीबत", "नुकसान", "टूटा", "फटा", "खराबी", "problem hai", "issue hai", "trouble hai", "something wrong", "कुछ गलत", "कुछ समस्या"],
    priority: 1,
    subTitles: {
      "Service Needed": ["service", "maintenance", "check", "inspection", "सेवा", "रखरखाव"],
      Other: ["other", "general", "कुछ खराब", "और", "अन्य"],
    },
  },
};

/**
 * Categorize a problem text into title and sub-title
 */
export async function categorizeProblem(text) {
  if (!text) return { title: "General Problem", subTitle: "Other" };
  const input = text.toLowerCase();

  // 1. Keyword Matching (Fast Path)
  let bestTitle = null;
  let bestSubTitle = "Other";
  let maxPriority = -1;

  for (const [title, entry] of Object.entries(complaintMap)) {
    const hasKeyword = entry.keywords.some(k => input.includes(k.toLowerCase()));
    if (hasKeyword && entry.priority > maxPriority) {
      bestTitle = title;
      maxPriority = entry.priority;
      
      // Try SubTitles
      bestSubTitle = "Other";
      for (const [sub, subKeywords] of Object.entries(entry.subTitles)) {
        if (subKeywords.some(sk => input.includes(sk.toLowerCase()))) {
          bestSubTitle = sub;
          break;
        }
      }
    }
  }

  // 2. AI Fallback (If no high-priority keyword match found)
  if (!bestTitle || maxPriority < 5) {
    console.log(`[Complaint Mapping] No strong keyword match, calling AI...`);
    const titlesList = Object.keys(complaintMap).join(", ");
    
    const systemPrompt = {
      role: "system",
      content: `You are a technical support expert for JCB machines. 
Categorize the user's problem into a Category and Subcategory from this list: [${titlesList}]

RULES:
1. Choose the most relevant category from the list.
2. Return ONLY: CATEGORY | SUBCATEGORY
3. If the input is NOT a machine problem (e.g. social talk, unrelated), return: INVALID | INVALID`
    };

    try {
      const response = await askGroqAI([
        systemPrompt, 
        { role: "user", content: `Problem: "${text}"` }
      ], { max_tokens: 100, temperature: 0.1 });
      
      console.log(`[Complaint Mapping] AI Response: "${response}"`);

      // ROBUST EXTRACTION: Look for ANY category from our list INSIDE the AI response
      const upperResponse = response.toUpperCase();
      
      for (const title of Object.keys(complaintMap)) {
        if (upperResponse.includes(title.toUpperCase())) {
          // If we found a title, try to find a subtitle within the same category
          let sub = "Other";
          for (const subTitle of Object.keys(complaintMap[title].subTitles)) {
            if (upperResponse.includes(subTitle.toUpperCase())) {
              sub = subTitle;
              break;
            }
          }
          console.log(`[Complaint Mapping] Extracted from AI: "${title} | ${sub}"`);
          return { title, subTitle: sub };
        }
      }

      if (upperResponse.includes("INVALID")) return { title: "INVALID", subTitle: "INVALID" };

    } catch (err) {
      console.error("[Complaint Mapping] AI Error:", err.message);
    }
  }

  return { title: bestTitle || "General Problem", subTitle: bestSubTitle };
}

/**
 * Check if the user's input is a valid machine problem
 */
export async function validateProblem(text) {
  if (!text || text.length < 5) return false;
  
  // Quick local check for common problem keywords (English + Hindi fast-path)
  const commonKeywords = [
    "starting", "engine", "break", "breakdown", "oil", "leak", "noise", "working", "start", "kharaab", "pareshani", "problem", "issue",
    "chalu", "shuru", "band", "kharab", "dikkat", "samasya", "kaakal", "kaam", "kam", 
    "चालू", "बंद", "खराब", "दिक्कत", "समस्या", "काम", "स्टार्ट"
  ];
  if (commonKeywords.some(k => text.toLowerCase().includes(k))) {
    console.log(`[Problem Validation] Fast-path Match: "${text}"`);
    return true;
  }

  // AI validation for ambiguous cases
  const category = await categorizeProblem(text);
  if (category.title === "INVALID") return false;
  if (category.title === "General Problem" && category.subTitle === "Other") {
      // If it's a generic catch-all, double check with AI for social talk
      const response = await askGroqAI([
          { role: "system", content: "Is this a technical problem with a machine? Return only YES or NO." },
          { role: "user", content: text }
      ], { max_tokens: 5 });
      return response.toUpperCase().includes("YES");
  }
  
  return true;
}

export default { categorizeProblem, validateProblem, complaintMap };
