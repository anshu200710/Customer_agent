const SERVICE_CENTERS = [
    { id: 1, city_name: 'AJMER', branch_name: 'AJMER', branch_code: '1', lat: 26.43488884, lng: 74.698112488 },
    { id: 2, city_name: 'ALWAR', branch_name: 'ALWAR', branch_code: '2', lat: 27.582258224, lng: 76.647377014 },
    { id: 3, city_name: 'BANSWARA', branch_name: 'UDAIPUR', branch_code: '7', lat: 23.563598633, lng: 74.417541504 },
    { id: 4, city_name: 'BHARATPUR', branch_name: 'ALWAR', branch_code: '2', lat: 27.201648712, lng: 77.46295166 },
    { id: 5, city_name: 'BHILWARA', branch_name: 'BHILWARA', branch_code: '3', lat: 25.374652863, lng: 74.623023987 },
    { id: 6, city_name: 'BHIWADI', branch_name: 'ALWAR', branch_code: '2', lat: 28.202623367, lng: 76.808448792 },
    { id: 7, city_name: 'DAUSA', branch_name: 'JAIPUR', branch_code: '4', lat: 26.905101776, lng: 76.370185852 },
    { id: 8, city_name: 'DHOLPUR', branch_name: 'ALWAR', branch_code: '2', lat: 26.693515778, lng: 77.876922607 },
    { id: 9, city_name: 'DUNGARPUR', branch_name: 'UDAIPUR', branch_code: '7', lat: 23.844612122, lng: 73.737922668 },
    { id: 10, city_name: 'GONER ROAD', branch_name: 'JAIPUR', branch_code: '4', lat: 26.889762878, lng: 75.873939514 },
    { id: 11, city_name: 'JAIPUR', branch_name: 'JAIPUR', branch_code: '4', lat: 26.865495682, lng: 75.681541443 },
    { id: 12, city_name: 'JHALAWAR', branch_name: 'KOTA', branch_code: '5', lat: 24.547901154, lng: 76.194129944 },
    { id: 13, city_name: 'JHUNJHUNU', branch_name: 'SIKAR', branch_code: '6', lat: 28.09862709, lng: 75.374809265 },
    { id: 14, city_name: 'KARAULI', branch_name: 'JAIPUR', branch_code: '4', lat: 26.512748718, lng: 77.021934509 },
    { id: 15, city_name: 'KEKRI', branch_name: 'AJMER', branch_code: '1', lat: 25.961145401, lng: 75.157318115 },
    { id: 16, city_name: 'KOTA', branch_name: 'KOTA', branch_code: '5', lat: 25.12909317, lng: 75.868736267 },
    { id: 17, city_name: 'KOTPUTLI', branch_name: 'JAIPUR', branch_code: '4', lat: 27.680557251, lng: 76.160636902 },
    { id: 18, city_name: 'NEEM KA THANA', branch_name: 'JAIPUR', branch_code: '4', lat: 27.741991043, lng: 75.788673401 },
    { id: 19, city_name: 'NIMBAHERA', branch_name: 'BHILWARA', branch_code: '3', lat: 24.617570877, lng: 74.672302246 },
    { id: 20, city_name: 'PRATAPGARH', branch_name: 'BHILWARA', branch_code: '3', lat: 24.038845062, lng: 74.776138306 },
    { id: 21, city_name: 'RAJSAMAND', branch_name: 'UDAIPUR', branch_code: '7', lat: 25.078897476, lng: 73.866836548 },
    { id: 22, city_name: 'RAMGANJMANDI', branch_name: 'KOTA', branch_code: '5', lat: 24.655239105, lng: 75.971496582 },
    { id: 23, city_name: 'SIKAR', branch_name: 'SIKAR', branch_code: '6', lat: 27.591619492, lng: 75.171058655 },
    { id: 25, city_name: 'SUJANGARH', branch_name: 'SIKAR', branch_code: '6', lat: 27.706758499, lng: 74.481445312 },
    { id: 26, city_name: 'TONK', branch_name: 'JAIPUR', branch_code: '4', lat: 26.177381516, lng: 75.81086731 },
    { id: 27, city_name: 'UDAIPUR', branch_name: 'UDAIPUR', branch_code: '7', lat: 24.570493698, lng: 73.745994568 },
    { id: 28, city_name: 'VKIA', branch_name: 'JAIPUR', branch_code: '4', lat: 27.0103827, lng: 75.7703344 },
    { id: 29, city_name: 'SIROHI', branch_name: 'UDAIPUR', branch_code: '7', lat: 24.8868, lng: 72.8589 },
    { id: 30, city_name: 'ABU ROAD', branch_name: 'UDAIPUR', branch_code: '7', lat: 24.4821, lng: 72.7056 },
    { id: 31, city_name: 'SWARUPGANJ', branch_name: 'JAIPUR', branch_code: '4', lat: 26.8754, lng: 75.8103 },
    { id: 32, city_name: 'NOON', branch_name: 'UDAIPUR', branch_code: '7', lat: 24.5, lng: 72.6 },
    { id: 33, city_name: 'MAWAL', branch_name: 'UDAIPUR', branch_code: '7', lat: 24.48, lng: 72.71 },
    { id: 34, city_name: 'NAGAUR', branch_name: 'AJMER', branch_code: '1', lat: 27.2028, lng: 73.7331 },
    { id: 35, city_name: 'PALI', branch_name: 'AJMER', branch_code: '1', lat: 25.7711, lng: 73.3234 },
    { id: 36, city_name: 'BARMER', branch_name: 'UDAIPUR', branch_code: '7', lat: 25.7465, lng: 71.3918 },
    { id: 37, city_name: 'JODHPUR', branch_name: 'AJMER', branch_code: '1', lat: 26.2389, lng: 73.0243 },
    { id: 38, city_name: 'BIKANER', branch_name: 'SIKAR', branch_code: '6', lat: 28.0229, lng: 73.3119 },
    { id: 39, city_name: 'CHITTORGARH', branch_name: 'BHILWARA', branch_code: '3', lat: 24.8888, lng: 74.6269 },
    { id: 40, city_name: 'BUNDI', branch_name: 'KOTA', branch_code: '5', lat: 25.4385, lng: 75.6478 },
    { id: 41, city_name: 'SAWAI MADHOPUR', branch_name: 'JAIPUR', branch_code: '4', lat: 26.0178, lng: 76.3561 },
    { id: 42, city_name: 'CHURU', branch_name: 'SIKAR', branch_code: '6', lat: 28.2961, lng: 74.9670 },
    { id: 43, city_name: 'HANUMANGARH', branch_name: 'SIKAR', branch_code: '6', lat: 29.5833, lng: 74.3333 },
    { id: 44, city_name: 'GANGANAGAR', branch_name: 'SIKAR', branch_code: '6', lat: 29.9167, lng: 73.8833 },
    { id: 45, city_name: 'JAISALMER', branch_name: 'UDAIPUR', branch_code: '7', lat: 26.9157, lng: 70.9083 },
    { id: 46, city_name: 'JALOR', branch_name: 'UDAIPUR', branch_code: '7', lat: 25.3474, lng: 72.6170 },
    { id: 47, city_name: 'BARAN', branch_name: 'KOTA', branch_code: '5', lat: 25.1017, lng: 76.5136 },
];

/**
 * Extract all data from user input using regex patterns
 */
export function extractAllData(text, currentData = {}) {
    const extracted = {};
    const original = text;
    const lower = text.toLowerCase().replace(/[।\.\!\?]/g, ' ').replace(/\s+/g, ' ').trim();

    // Skip extraction for hold phrases
    if (/^(ek minute|ek second|ruko|ruk|dhundh|dekh raha|hold on|thoda|leke aata|ek dam|bas)\s*$/i.test(lower)) {
        return {};
    }

    // Machine number (4-7 digits, not phone)
    if (!currentData.machine_no) {
        const cleanedLower = lower.replace(/\b[6-9]\d{9}\b/g, '').replace(/\b[6-9]\d{8}\b/g, '');
        const machineMatch = cleanedLower.match(/\b(\d{4,7})\b/);
        if (machineMatch) {
            extracted.machine_no = machineMatch[1];
        }
    }

    // Phone number (10 digits starting with 6-9)
    if (!currentData.customer_phone || !/^[6-9]\d{9}$/.test(currentData.customer_phone)) {
        const compressed = text.replace(/[\s\-,।\.]/g, '');
        for (const sequence of compressed.match(/\d+/g) || []) {
            if (/^[6-9]\d{9}$/.test(sequence)) {
                extracted.customer_phone = sequence;
                break;
            }
            for (let i = 0; i <= sequence.length - 10; i++) {
                const chunk = sequence.slice(i, i + 10);
                if (/^[6-9]\d{9}$/.test(chunk)) {
                    extracted.customer_phone = chunk;
                    break;
                }
            }
            if (extracted.customer_phone) break;
        }
    }

    // City extraction
    if (!currentData.city) {
        // Devanagari cities
        const devanagariCities = {
            'भीलवाड़ा': 'BHILWARA', 'जयपुर': 'JAIPUR', 'अजमेर': 'AJMER', 'अलवर': 'ALWAR',
            'जोधपुर': 'JODHPUR', 'उदयपुर': 'UDAIPUR', 'कोटा': 'KOTA', 'सीकर': 'SIKAR',
            'बीकानेर': 'BIKANER', 'टोंक': 'TONK', 'झुंझुनू': 'JHUNJHUNU', 'दौसा': 'DAUSA',
        };

        for (const [dev, latin] of Object.entries(devanagariCities)) {
            if (original.includes(dev)) {
                extracted.city = latin;
                break;
            }
        }

        // English cities
        if (!extracted.city) {
            for (const center of [...SERVICE_CENTERS].sort((a, b) => b.city_name.length - a.city_name.length)) {
                if (lower.includes(center.city_name.toLowerCase())) {
                    extracted.city = center.city_name;
                    break;
                }
            }
        }
    }

    // Machine status
    if (!currentData.machine_status) {
        const breakdownPattern = /(band|khadi|khari|stop|ruk|breakdown|बंद|खड़ी|chalu nahi|chalti nahi|start nahi|start nhi|nahi chal|ho nahi rahi|chalu nhi|chal nahi|padi hai|khari hai|band padi|chal nhi rahi)/;
        const runningPattern = /(chal rahi|chal rhi|running|chalu hai|dikkat|problem hai|चल रही|चालू है)/;
        const servicePattern = /(filter|filttar|service|oil change|tel badlo|सर्विस|फिल्टर)/;

        if (breakdownPattern.test(lower) || breakdownPattern.test(original)) {
            extracted.machine_status = 'Breakdown';
        } else if (servicePattern.test(lower)) {
            extracted.machine_status = 'Running With Problem';
        } else if (runningPattern.test(lower) || runningPattern.test(original)) {
            extracted.machine_status = 'Running With Problem';
        }
    }

    // Job location
    if (!currentData.job_location) {
        if (/(workshop|garage|वर्कशॉप|गैराज)/.test(lower)) {
            extracted.job_location = 'Workshop';
        } else if (/(site|field|bahar|khet|sadak|onsite|साइट|खेत)/.test(lower)) {
            extracted.job_location = 'Onsite';
        }
    }

    // Complaint title
    if (!currentData.complaint_title) {
        const machineContext = /(machine|jcb|start|chalu|engine|मशीन|इंजन)/.test(lower);
        const notStarting = /(start nahi|start nhi|chalu nahi|chalu nhi|chalti nahi|chal nahi rahi|nahi chal rahi|चालू नहीं|स्टार्ट नहीं|नहीं चल)/.test(lower);
        const notHappening = /(ho nahi rahi|nahi ho rahi|नहीं हो रही)/.test(lower) && machineContext;
        const stopped = /(band hai|band ho gayi|band pad|khari hai|बंद है|बंद हो)/.test(lower);

        if (notStarting || notHappening || stopped) {
            extracted.complaint_title = 'Engine Not Starting';
        } else if (/(filter|filttar|service|oil change|tel badlo|सर्विस|फिल्टर)/.test(lower)) {
            extracted.complaint_title = 'Service/Filter Change';
        } else if (/(dhuan|dhua|smoke|धुआं)/.test(lower)) {
            extracted.complaint_title = 'Engine Smoke';
        } else if (/(garam|dhak|overheat|ubhal|tapta|ज्यादा गरम|ढक गई)/.test(lower)) {
            extracted.complaint_title = 'Engine Overheating';
        } else if (/(tel nikal|oil leak|rissa|tel nikal ryo|तेल निकल|रिस)/.test(lower)) {
            extracted.complaint_title = 'Oil Leakage';
        } else if (/(hydraulic|hydro|cylinder|bucket|boom|jack|हाइड्रोलिक)/.test(lower)) {
            extracted.complaint_title = 'Hydraulic System Failure';
        } else if (/(race nahi|ras nahi|accelerator|रेस नहीं|gas nahi)/.test(lower)) {
            extracted.complaint_title = 'Accelerator Problem';
        } else if (/(ac nahi|hawa nahi|thanda nahi|ac band|ठंडा नहीं)/.test(lower)) {
            extracted.complaint_title = 'AC Not Working';
        } else if (/(brake nahi|brake nhi|rokti nahi|ब्रेक)/.test(lower)) {
            extracted.complaint_title = 'Brake Failure';
        } else if (/(bijli nahi|headlight|bulb|electrical|लाइट)/.test(lower)) {
            extracted.complaint_title = 'Electrical Problem';
        } else if (/(tire|tyre|pankchar|puncture|टायर)/.test(lower)) {
            extracted.complaint_title = 'Tire Problem';
        } else if (/(khatakhat|khatak|thokta|awaaz aa rhi|aawaz|vibration|खटखट)/.test(lower)) {
            extracted.complaint_title = 'Abnormal Noise';
        } else if (/(steering|स्टीयरिंग)/.test(lower)) {
            extracted.complaint_title = 'Steering Problem';
        } else if (/(gear|transmission|गियर)/.test(lower)) {
            extracted.complaint_title = 'Transmission Problem';
        }
    }

    return extracted;
}

/**
 * Match service center from city name
 */
export function matchServiceCenter(cityText) {
    if (!cityText || cityText.length < 2) return null;

    const input = cityText.trim().toUpperCase();

    // Exact match
    const exact = SERVICE_CENTERS.find(c =>
        c.city_name === input || c.branch_name === input
    );
    if (exact) return exact;

    // Partial match mapping
    const partialMatches = {
        'JAYPUR': 'JAIPUR', 'JYPUR': 'JAIPUR', 'JODHPURR': 'JODHPUR',
        'BYKANIR': 'BIKANER', 'UDAI': 'UDAIPUR', 'ODAIPUR': 'UDAIPUR',
        'VKI': 'VKIA', 'ABU': 'ABU ROAD', 'SWARUP': 'SWARUPGANJ',
        'NEEM': 'NEEM KA THANA', 'SONG': 'TONK', 'MAVAL': 'MAWAL',
        'JHUNJ': 'JHUNJHUNU', 'RAMGANJ': 'RAMGANJMANDI',
        'SAWAI': 'SAWAI MADHOPUR', 'GANGANA': 'GANGANAGAR',
        'HANUMAN': 'HANUMANGARH', 'CHITT': 'CHITTORGARH',
        'PRATAP': 'PRATAPGARH', 'BANSWA': 'BANSWARA',
        'RAJSAM': 'RAJSAMAND', 'NIMBA': 'NIMBAHERA',
        'KARAUL': 'KARAULI', 'KOTPUT': 'KOTPUTLI',
    };

    for (const [shortForm, fullCity] of Object.entries(partialMatches)) {
        if (input.includes(shortForm)) {
            return SERVICE_CENTERS.find(sc => sc.city_name === fullCity);
        }
    }

    // Prefix match (3+ chars)
    if (input.length >= 3) {
        const prefix3 = input.slice(0, 3);
        const found = SERVICE_CENTERS.find(c =>
            c.city_name.startsWith(prefix3) || prefix3.startsWith(c.city_name.slice(0, 3))
        );
        if (found) return found;
    }

    return null;
}

/**
 * Build candidate machine numbers from digits
 */
export function buildCandidates(thisTurnDigits, prevTurnDigits) {
    const set = new Set();

    for (const source of [thisTurnDigits, prevTurnDigits + thisTurnDigits]) {
        if (!source) continue;

        for (let length = 7; length >= 4; length--) {
            for (let i = 0; i <= source.length - length; i++) {
                const chunk = source.slice(i, i + length);

                // Skip if looks like phone number
                if (/^[6-9]/.test(chunk) && source.length >= 10) continue;

                set.add(chunk);
            }
        }
    }

    return [...set]
        .filter(c => !c.startsWith('0'))
        .sort((a, b) => b.length - a.length)
        .slice(0, 8);
}

/**
 * Validate complaint data before submission
 */
export function validateComplaintData(data) {
    if (!data.job_location) data.job_location = 'Onsite';

    const requiredFields = ['machine_no', 'complaint_title', 'machine_status', 'job_location', 'city', 'customer_phone'];

    for (const field of requiredFields) {
        if (!data[field] || data[field] === 'NA' || data[field] === 'Unknown') {
            return { valid: false, reason: `Missing ${field}` };
        }
    }

    if (!/^[6-9]\d{9}$/.test(data.customer_phone)) {
        return { valid: false, reason: 'Invalid phone number' };
    }

    if (!/^\d{4,7}$/.test(data.machine_no)) {
        return { valid: false, reason: 'Invalid machine number' };
    }

    return { valid: true };
}

export default {
    extractAllData,
    matchServiceCenter,
    buildCandidates,
    validateComplaintData,
    SERVICE_CENTERS
};