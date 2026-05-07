// slot_engine.js
// Unified slot extraction, validation, and management

import axios from 'axios';

const BASE_URL = 'http://gprs.rajeshmotors.com/jcbServiceEnginerAPIv7';
const API_HEADERS = { JCBSERVICEAPI: 'MakeInJcb' };
const API_TIMEOUT = 12000;

// Import SERVICE_CENTERS from ai.js
const SERVICE_CENTERS = [
  { id: 1, city_name: "AJMER", branch_name: "AJMER", branch_code: "1", lat: 26.43488884, lng: 74.698112488 },
  { id: 2, city_name: "ALWAR", branch_name: "ALWAR", branch_code: "2", lat: 27.582258224, lng: 76.647377014 },
  { id: 3, city_name: "BANSWARA", branch_name: "UDAIPUR", branch_code: "7", lat: 23.563598633, lng: 74.417541504 },
  { id: 4, city_name: "BHARATPUR", branch_name: "ALWAR", branch_code: "2", lat: 27.201648712, lng: 77.46295166 },
  { id: 5, city_name: "BHILWARA", branch_name: "BHILWARA", branch_code: "3", lat: 25.374652863, lng: 74.623023987 },
  { id: 6, city_name: "BHIWADI", branch_name: "ALWAR", branch_code: "2", lat: 28.202623367, lng: 76.808448792 },
  { id: 7, city_name: "DAUSA", branch_name: "JAIPUR", branch_code: "4", lat: 26.905101776, lng: 76.370185852 },
  { id: 8, city_name: "DHOLPUR", branch_name: "ALWAR", branch_code: "2", lat: 26.693515778, lng: 77.876922607 },
  { id: 9, city_name: "DUNGARPUR", branch_name: "UDAIPUR", branch_code: "7", lat: 23.844612122, lng: 73.737922668 },
  { id: 10, city_name: "GONER ROAD", branch_name: "JAIPUR", branch_code: "4", lat: 26.889762878, lng: 75.873939514 },
  { id: 11, city_name: "JAIPUR", branch_name: "JAIPUR", branch_code: "4", lat: 26.865495682, lng: 75.681541443 },
  { id: 12, city_name: "JHALAWAR", branch_name: "KOTA", branch_code: "5", lat: 24.547901154, lng: 76.194129944 },
  { id: 13, city_name: "JHUNJHUNU", branch_name: "SIKAR", branch_code: "6", lat: 28.09862709, lng: 75.374809265 },
  { id: 14, city_name: "KARAULI", branch_name: "JAIPUR", branch_code: "4", lat: 26.512748718, lng: 77.021934509 },
  { id: 15, city_name: "KEKRI", branch_name: "AJMER", branch_code: "1", lat: 25.961145401, lng: 75.157318115 },
  { id: 16, city_name: "KOTA", branch_name: "KOTA", branch_code: "5", lat: 25.12909317, lng: 75.868736267 },
  { id: 17, city_name: "KOTPUTLI", branch_name: "JAIPUR", branch_code: "4", lat: 27.680557251, lng: 76.160636902 },
  { id: 18, city_name: "NEEM KA THANA", branch_name: "JAIPUR", branch_code: "4", lat: 27.741991043, lng: 75.788673401 },
  { id: 19, city_name: "NIMBAHERA", branch_name: "BHILWARA", branch_code: "3", lat: 24.617570877, lng: 74.672302246 },
  { id: 20, city_name: "PRATAPGARH", branch_name: "BHILWARA", branch_code: "3", lat: 24.038845062, lng: 74.776138306 },
  { id: 21, city_name: "RAJSAMAND", branch_name: "UDAIPUR", branch_code: "7", lat: 25.078897476, lng: 73.866836548 },
  { id: 22, city_name: "RAMGANJMANDI", branch_name: "KOTA", branch_code: "5", lat: 24.655239105, lng: 75.971496582 },
  { id: 23, city_name: "SIKAR", branch_name: "SIKAR", branch_code: "6", lat: 27.591619492, lng: 75.171058655 },
  { id: 25, city_name: "SUJANGARH", branch_name: "SIKAR", branch_code: "6", lat: 27.706758499, lng: 74.481445312 },
  { id: 26, city_name: "TONK", branch_name: "JAIPUR", branch_code: "4", lat: 26.177381516, lng: 75.81086731 },
  { id: 27, city_name: "UDAIPUR", branch_name: "UDAIPUR", branch_code: "7", lat: 24.570493698, lng: 73.745994568 },
  { id: 28, city_name: "VKIA", branch_name: "JAIPUR", branch_code: "4", lat: 27.0103827, lng: 75.7703344 },
  { id: 29, city_name: "SIROHI", branch_name: "UDAIPUR", branch_code: "7", lat: 24.8868, lng: 72.8589 },
  { id: 30, city_name: "ABU ROAD", branch_name: "UDAIPUR", branch_code: "7", lat: 24.4821, lng: 72.7056 },
  { id: 31, city_name: "SWARUPGANJ", branch_name: "JAIPUR", branch_code: "4", lat: 26.8754, lng: 75.8103 },
  { id: 32, city_name: "NOON", branch_name: "UDAIPUR", branch_code: "7", lat: 24.5, lng: 72.6 },
  { id: 33, city_name: "MAWAL", branch_name: "UDAIPUR", branch_code: "7", lat: 24.48, lng: 72.71 },
  { id: 34, city_name: "NAGAUR", branch_name: "AJMER", branch_code: "1", lat: 27.2028, lng: 73.7331 },
  { id: 35, city_name: "PALI", branch_name: "AJMER", branch_code: "1", lat: 25.7711, lng: 73.3234 },
  { id: 36, city_name: "BARMER", branch_name: "UDAIPUR", branch_code: "7", lat: 25.7465, lng: 71.3918 },
  { id: 37, city_name: "JODHPUR", branch_name: "AJMER", branch_code: "1", lat: 26.2389, lng: 73.0243 },
  { id: 38, city_name: "BIKANER", branch_name: "SIKAR", branch_code: "6", lat: 28.0229, lng: 73.3119 },
  { id: 39, city_name: "CHITTORGARH", branch_name: "BHILWARA", branch_code: "3", lat: 24.8888, lng: 74.6269 },
  { id: 40, city_name: "BUNDI", branch_name: "KOTA", branch_code: "5", lat: 25.4385, lng: 75.6478 },
  { id: 41, city_name: "SAWAI MADHOPUR", branch_name: "JAIPUR", branch_code: "4", lat: 26.0178, lng: 76.3561 },
  { id: 42, city_name: "CHURU", branch_name: "SIKAR", branch_code: "6", lat: 28.2961, lng: 74.9670 },
  { id: 43, city_name: "HANUMANGARH", branch_name: "SIKAR", branch_code: "6", lat: 29.5833, lng: 74.3333 },
  { id: 44, city_name: "GANGANAGAR", branch_name: "SIKAR", branch_code: "6", lat: 29.9167, lng: 73.8833 },
  { id: 45, city_name: "JAISALMER", branch_name: "UDAIPUR", branch_code: "7", lat: 26.9157, lng: 70.9083 },
  { id: 46, city_name: "JALOR", branch_name: "UDAIPUR", branch_code: "7", lat: 25.3474, lng: 72.6170 },
  { id: 47, city_name: "BARAN", branch_name: "KOTA", branch_code: "5", lat: 25.1017, lng: 76.5136 },
];

export class SlotEngine {
  
  // Extract ALL possible slots from a single utterance
  // Returns: { machine_no, complaint_title, complaint_details, machine_status, city, customer_phone, summary }
  static extractAll(text, engine) {
    const result = {
      machine_no: null,
      complaint_title: null,
      all_complaints: [],
      machine_status: null,
      city: null,
      customer_phone: null,
      summary: {},
    };
    
    // ── Phone number (highest priority, most specific) ─────────
    result.customer_phone = this.extractPhone(text);
    
    // ── City ──────────────────────────────────────────────────
    result.city = this.extractCity(text);
    
    // ── Machine status ────────────────────────────────────────
    result.machine_status = this.extractMachineStatus(text);
    
    // ── All complaints ────────────────────────────────────────
    result.all_complaints = this.extractAllComplaints(text);
    if (result.all_complaints.length > 0) {
      result.complaint_title = result.all_complaints[0];
    }
    
    // ── Machine number (last — to avoid phone/complaint digit confusion) ─
    // Only extract if no phone number was found (avoid collision)
    if (!result.customer_phone) {
      result.machine_no = this.extractMachineNumber(text);
    }
    
    // Build summary for logging
    result.summary = Object.fromEntries(
      Object.entries(result)
        .filter(([k, v]) => v && k !== 'summary')
        .map(([k, v]) => [k, Array.isArray(v) ? v.join('+') : v])
    );
    
    return result;
  }
  
  // Merge extracted data into engine slots (respects existing valid data)
  static mergeIntoEngine(engine, extracted) {
    if (extracted.machine_no && !engine.slots.machine_no.value) {
      engine.setSlot('machine_no', extracted.machine_no, 0.85, 'regex');
    }
    
    if (extracted.complaint_title && !engine.slots.complaint_title.value) {
      engine.setSlot('complaint_title', extracted.complaint_title, 0.90, 'regex');
    }
    
    // Accumulate all complaints
    if (extracted.all_complaints.length > 0) {
      const existing = engine.slots.complaint_details?.all_problems || [];
      const existingSet = new Set([engine.slots.complaint_title.value, ...existing]);
      const newOnes = extracted.all_complaints.filter(c => !existingSet.has(c));
      
      if (newOnes.length > 0) {
        const all = [...existing, ...newOnes];
        engine.slots.complaint_details = {
          value: all.join('; '),
          all_problems: all,
        };
      }
    }
    
    if (extracted.machine_status && !engine.slots.machine_status.value) {
      engine.setSlot('machine_status', extracted.machine_status, 0.85, 'regex');
    }
    
    if (extracted.city && !engine.slots.city.value) {
      const matched = this.matchServiceCenter(extracted.city);
      if (matched) {
        engine.slots.city = {
          value: matched.city_name,
          city_id: matched.branch_code,
          branch: matched.branch_name,
          confirmed: true, // Auto-confirm if explicitly mentioned
          lat: matched.lat,
          lng: matched.lng,
        };
      }
    }
    
    if (extracted.customer_phone && !engine.slots.customer_phone.value) {
      engine.setSlot('customer_phone', extracted.customer_phone, 0.95, 'regex');
    }
  }
  
  // ─── EXTRACTORS ───────────────────────────────────────────
  
  static extractPhone(text) {
    const compact = text.replace(/[\s\-,।.]/g, '');
    const match = compact.match(/[6-9]\d{9}/);
    return match ? match[0] : null;
  }
  
  static extractMachineNumber(text) {
    // Remove phone numbers first
    const noPhone = text.replace(/[6-9]\d{9}/g, '');
    // Normalize spoken numbers
    const normalized = this.normalizeSpokenNumbers(noPhone);
    const digits = normalized.replace(/\D/g, '');
    
    // Try 7-digit first, then down to 3-digit
    for (let len = 7; len >= 3; len--) {
      for (let i = 0; i <= digits.length - len; i++) {
        const chunk = digits.slice(i, i + len);
        // Skip if it looks like a phone number fragment
        if (len === 7 && /^[6-9]/.test(chunk)) continue;
        return chunk;
      }
    }
    return null;
  }
  
  static extractCity(text) {
    const lo = text.toLowerCase();
    
    // Devanagari mapping
    const devaMap = {
      'जयपुर': 'JAIPUR', 'भीलवाड़ा': 'BHILWARA', 'अजमेर': 'AJMER',
      'कोटा': 'KOTA', 'अलवर': 'ALWAR', 'सीकर': 'SIKAR',
      'उदयपुर': 'UDAIPUR', 'जोधपुर': 'JODHPUR', 'बीकानेर': 'BIKANER',
      'टोंक': 'TONK', 'दौसा': 'DAUSA', 'नागौर': 'NAGAUR',
    };
    for (const [d, e] of Object.entries(devaMap)) {
      if (text.includes(d)) return e;
    }
    
    // English/Hinglish - sorted by length (longer first to avoid partial matches)
    const sorted = [...SERVICE_CENTERS].sort((a, b) => b.city_name.length - a.city_name.length);
    for (const sc of sorted) {
      if (lo.includes(sc.city_name.toLowerCase())) return sc.city_name;
    }
    
    return null;
  }
  
  static extractMachineStatus(text) {
    const lo = text.toLowerCase();
    
    // Breakdown indicators (machine is stopped)
    const breakdownPattern = /(band|khadi|khari|nahi chal|chal nahi|start nahi|chalu nahi|ruk gayi|breakdown|बंद|खड़ी|band padi|chal nhi|nhi chal|chal nai|chaalti nai|chalti nahi|stop kar|stop ho|kal se band|subah se band)/;
    if (breakdownPattern.test(lo)) return 'Breakdown';
    
    // Running with problem (machine is working but has issues)
    const runningPattern = /(chal rahi|chal rhi|chalti hai|running|chalu hai|problem ke saath|chal ryi|chaalti hai|dikkat se chal)/;
    if (runningPattern.test(lo)) return 'Running With Problem';
    
    // Service (explicit service request)
    const servicePattern = /(service|filter|oil change|tel badlo|filttar|filtar|seva)/;
    if (servicePattern.test(lo)) return 'Running With Problem';
    
    return null;
  }
  
  static extractAllComplaints(text) {
    const lo = text.toLowerCase().replace(/[।.!?]/g, ' ');
    const found = [];
    
    const checks = [
      [/(start nahi|start nhi|chalu nahi|chal nahi rahi|nahi chal|band hai|band ho|khadi hai|chal nai|chaalti nai|engine band)/, 'Engine Not Starting'],
      [/(filter|filttar|filtar|service|oil change|tel badlo|seva karwani)/, 'Service/Filter Change'],
      [/(dhuan|dhua|smoke|dhuen|kala dhuan|nila dhuan)/, 'Engine Smoke'],
      [/(garam|dhak|overheat|bahut garam|tapta|dhak gyi)/, 'Engine Overheating'],
      [/(tel nikal|oil leak|rissa|risso|tel aa raha|oil nikal raha)/, 'Oil Leakage'],
      [/(hydraulic|hydraulik|hydro|ailak|cylinder|bucket nahi uthta|boom slow)/, 'Hydraulic System Failure'],
      [/(race nahi|accelerator|gas nahi|pickup nahi|gas nai leti|throttle)/, 'Accelerator Problem'],
      [/(ac nahi|thanda nahi|ac band|ac kharab|cooling nahi)/, 'AC Not Working'],
      [/(brake nahi|brake fail|rokti nahi|brake kharab)/, 'Brake Failure'],
      [/(bijli nahi|headlight|light nahi|electrical|battery down)/, 'Electrical Problem'],
      [/(tire|tyre|puncture|pankchar|flat)/, 'Tire Problem'],
      [/(khatakhat|khatak|awaaz aa rhi|noise|vibration|thokata|aavaaz)/, 'Abnormal Noise'],
      [/(steering kharab|steering nahi ghoom)/, 'Steering Problem'],
      [/(gear nahi|gear slip|transmission|gear lagta nahi)/, 'Transmission Problem'],
      [/(coolant|paani nikal|water leak|radiator)/, 'Coolant Leakage'],
      [/(boom|arm nahi uthta|dipper slow|bucket nahi)/, 'Boom/Arm Failure'],
      [/(turbo|turbocharger|black smoke zyada)/, 'Turbocharger Issue'],
    ];
    
    for (const [rx, title] of checks) {
      if (rx.test(lo)) found.push(title);
    }
    
    return [...new Set(found)]; // Deduplicate
  }
  
  static normalizeSpokenNumbers(text) {
    const map = {
      'zero': '0', 'shunya': '0', 'एक': '1', 'ek': '1', 'do': '2', 'दो': '2',
      'teen': '3', 'तीन': '3', 'char': '4', 'chaar': '4', 'चार': '4',
      'paanch': '5', 'पांच': '5', 'chhe': '6', 'chheh': '6', 'छह': '6',
      'saat': '7', 'सात': '7', 'aath': '8', 'आठ': '8', 'nau': '9', 'नौ': '9',
    };
    let result = text;
    for (const [word, digit] of Object.entries(map)) {
      result = result.replace(new RegExp(`\\b${word}\\b`, 'gi'), digit);
    }
    return result;
  }
  
  static matchServiceCenter(cityText) {
    if (!cityText || cityText.length < 2) return null;
    const inp = cityText.trim().toUpperCase();
    
    const exact = SERVICE_CENTERS.find(c => c.city_name === inp || c.branch_name === inp);
    if (exact) return exact;
    
    const PARTIAL_MAP = {
      "JAYPUR": "JAIPUR", "JYPUR": "JAIPUR", "VKI": "VKIA",
      "ABU": "ABU ROAD", "SWARUP": "SWARUPGANJ", "NEEM": "NEEM KA THANA",
      "BADHI": "BHILWARA", "BADI": "BHILWARA", "BHIL": "BHILWARA",
      "JHUNJ": "JHUNJHUNU", "RAMGANJ": "RAMGANJMANDI", "SAWAI": "SAWAI MADHOPUR",
      "GANGANA": "GANGANAGAR", "HANUMAN": "HANUMANGARH", "CHITT": "CHITTORGARH",
      "PRATAP": "PRATAPGARH", "BANSWA": "BANSWARA", "RAJSAM": "RAJSAMAND",
      "NIMBA": "NIMBAHERA", "KARAUL": "KARAULI", "KOTPUT": "KOTPUTLI",
      "SUJAN": "SUJANGARH", "DHOLP": "DHOLPUR", "DUNGAR": "DUNGARPUR",
      "JHALA": "JHALAWAR", "BARME": "BARMER", "JAISAL": "JAISALMER",
      "UDAI": "UDAIPUR", "ODAI": "UDAIPUR", "BYKAN": "BIKANER",
      "SONG": "TONK", "MAVAL": "MAWAL",
    };
    for (const [w, c] of Object.entries(PARTIAL_MAP)) {
      if (inp.includes(w)) return SERVICE_CENTERS.find(sc => sc.city_name === c) || null;
    }
    
    if (inp.length >= 3) {
      const p3 = inp.slice(0, 3);
      const f = SERVICE_CENTERS.find(c => c.city_name.startsWith(p3));
      if (f) return f;
    }
    return null;
  }
  
  // ─── API CALLS ────────────────────────────────────────────
  
  static async validateMachine(machineNo) {
    try {
      const r = await axios.get(
        `${BASE_URL}/get_machine_by_machine_no.php?machine_no=${machineNo}`,
        { timeout: API_TIMEOUT, headers: API_HEADERS, validateStatus: s => s < 500 }
      );
      if (r.status === 200 && r.data?.status === 1 && r.data?.data) {
        const d = r.data.data;
        return {
          valid: true,
          data: {
            name: d.customer_name || 'Unknown',
            city: d.city || 'Unknown',
            model: d.machine_model || 'Unknown',
            machineNo: d.machine_no || machineNo,
            phone: d.customer_phone_no || null,
            subModel: d.sub_model || 'NA',
            machineType: d.machine_type || 'Warranty',
            businessPartnerCode: d.business_partner_code || 'NA',
            purchaseDate: d.purchase_date || 'NA',
            installationDate: d.installation_date || 'NA',
          },
        };
      }
      return { valid: false };
    } catch {
      return { valid: false };
    }
  }
  
  static async getExistingComplaint(identifier) {
    if (!identifier) return { found: false };
    try {
      const param = /^\d{10}$/.test(identifier) ? `phone=${identifier}` : `machine_no=${identifier}`;
      const r = await axios.get(
        `${BASE_URL}/get_complaint_by_machine.php?${param}`,
        { timeout: API_TIMEOUT, headers: API_HEADERS, validateStatus: s => s < 500 }
      );
      if (r.status === 200 && r.data?.status === 1 && r.data?.data) {
        return {
          found: true,
          complaintId: r.data.data.complaint_sap_id || r.data.data.sap_id || 'N/A',
        };
      }
      return { found: false };
    } catch {
      return { found: false };
    }
  }
  
  static async escalateComplaint(complaintId, callerPhone) {
    if (!complaintId) return;
    try {
      await axios.post(
        `${BASE_URL}/escalate_complaint.php`,
        { complaint_id: complaintId, caller_phone: callerPhone, reason: 'Customer called again' },
        { timeout: API_TIMEOUT, headers: { 'Content-Type': 'application/json', ...API_HEADERS } }
      );
    } catch (err) {
      console.error('Escalation failed:', err.message);
    }
  }
  
  static async submitComplaint(engine) {
    try {
      const slots = engine.slots;
      const customer = engine.customerData || {};
      
      const payload = {
        machine_no: slots.machine_no.value,
        customer_name: slots.customer_name.value || customer.name || 'Unknown',
        caller_name: slots.customer_name.value || customer.name || 'Customer',
        caller_no: slots.customer_phone.value || customer.phone || engine.callerPhone || 'Unknown',
        contact_person: slots.customer_name.value || customer.name || 'Customer',
        contact_person_number: slots.customer_phone.value || customer.phone || engine.callerPhone || 'Unknown',
        machine_model: customer.model || 'Unknown',
        sub_model: customer.subModel || 'NA',
        installation_date: customer.installationDate || '2025-01-01',
        machine_type: customer.machineType || 'Warranty',
        city_id: slots.city.city_id || '4',
        complain_by: 'Customer',
        machine_status: slots.machine_status.value || 'Running With Problem',
        job_location: 'Onsite',
        branch: slots.city.branch || 'JAIPUR',
        outlet: slots.city.value || 'JAIPUR',
        complaint_details: slots.complaint_details?.value || slots.complaint_title.value || 'Not provided',
        complaint_title: slots.complaint_title.value || 'General Problem',
        sub_title: 'Other',
        business_partner_code: customer.businessPartnerCode || 'NA',
        complaint_sap_id: 'NA',
        machine_location_address: 'Not provided',
        pincode: '0',
        service_date: '', from_time: '', to_time: '',
        job_open_lat: slots.city.lat || 0,
        job_open_lng: slots.city.lng || 0,
        job_close_lat: slots.city.lat || 0,
        job_close_lng: slots.city.lng || 0,
      };
      
      const r = await axios.post(
        `${BASE_URL}/ai_call_complaint.php`,
        payload,
        { timeout: API_TIMEOUT, headers: { 'Content-Type': 'application/json', ...API_HEADERS } }
      );
      
      if (r.status === 200 && r.data?.status === 1) {
        return {
          success: true,
          sapId: r.data.data?.complaint_sap_id || r.data.data?.sap_id,
          jobId: r.data.data?.job_id,
        };
      }
      return { success: false };
    } catch (err) {
      console.error('Submit failed:', err.message);
      return { success: false };
    }
  }
}
