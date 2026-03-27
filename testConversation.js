// conversations.js - Run with: node conversations.js
// 20 test conversations derived from real Rajesh Motors JCB call recordings
// Based on file metadata: attempt numbers, phone numbers, durations, dates

const conversations = [

    // ═══════════════════════════════════════════════════════
    // TC-01 | File: 02--A-919358065499 | Duration: 195s (long)
    // Attempt#2 = first attempt failed/dropped, customer called back
    // Long call = multiple problems + some confusion
    // ═══════════════════════════════════════════════════════
    {
        id: "TC-01",
        source: "919358065499 | 2026-03-23 15:04 | Attempt#2 | 195s",
        scenario: "Multiple complaints + customer unsure of chassis, long call",
        dialogue: [
            { role: "Agent", text: "Namaste ji, Rajesh Motors mein aapka swagat hai. Kya seva kar sakti hun?" },
            { role: "Customer", text: "Haan ji, maine pehle bhi call ki thi. Meri JCB machine mein problem hai." },
            { role: "Agent", text: "Ji bilkul. Machine ka chassis number bataiye." },
            { role: "Customer", text: "Ek minute ji, dhundh raha hun." },
            { role: "Agent", text: "Ji zarur." },
            { role: "Customer", text: "Haan ji, 3305447 hai." },
            { role: "Agent", text: "Ramesh ji, tumhare phone mein last mein 99 aata hai na?" },
            { role: "Customer", text: "Haan ji, sahi hai." },
            { role: "Agent", text: "Kya problem hai machine mein ji?" },
            { role: "Customer", text: "Engine start nahi ho rahi, aur tel bhi nikal raha hai. AC bhi kharab hai." },
            { role: "Agent", text: "Ji, teen problem note kar li. Aap kahan se bol rahe ho ji?" },
            { role: "Customer", text: "Bhilwara se hun ji." },
            { role: "Agent", text: "Aur koi problem toh nahi machine mein? Save kar dun?" },
            { role: "Customer", text: "Haan aur brake bhi thodi weak lag rahi hai." },
            { role: "Agent", text: "Ji, note kar liya. Aur koi? Ya save kar dun?" },
            { role: "Customer", text: "Nahi bas itna hi." },
            { role: "Agent", text: "Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad!" },
        ]
    },

    // ═══════════════════════════════════════════════════════
    // TC-02 | File: 02--A-919664406751 | Duration: 38s (very short)
    // Attempt#2 short call = dropped call / customer disconnected quickly
    // ═══════════════════════════════════════════════════════
    {
        id: "TC-02",
        source: "919664406751 | 2026-03-23 11:02 | Attempt#2 | 38s",
        scenario: "Customer gives machine number then goes silent / disconnects",
        dialogue: [
            { role: "Agent", text: "Namaste ji, Rajesh Motors. Kya seva kar sakti hun?" },
            { role: "Customer", text: "Haan, machine ka number 4456123 hai." },
            { role: "Agent", text: "Suresh ji, tumhare phone mein last mein 51 aata hai na?" },
            { role: "Customer", text: "Haan." },
            { role: "Agent", text: "Kya problem hai machine mein ji?" },
            { role: "Customer", text: "[silence]" },
            { role: "Agent", text: "Ji bataiye." },
            { role: "Customer", text: "[silence]" },
            { role: "Agent", text: "Ji hun." },
            { role: "Customer", text: "[call drops]" },
            { role: "Agent", text: "Koi awaaz nahi aayi ji. Dobara call karein." },
        ]
    },

    // ═══════════════════════════════════════════════════════
    // TC-03 | File: 03--A-916350159950 | Duration: 106s
    // Attempt#3 = customer tried 3 times! Frustrated, escalation likely
    // ═══════════════════════════════════════════════════════
    {
        id: "TC-03",
        source: "916350159950 | 2025-07-01 12:14 | Attempt#3 | 106s",
        scenario: "Repeated caller, engineer not coming, wants escalation - Rajasthani dialect",
        dialogue: [
            { role: "Agent", text: "Namaste ji, Rajesh Motors. Kya seva kar sakti hun?" },
            { role: "Customer", text: "Bhai sahab, maine teen baar call ki hai. Engineer aaya hi nahi. 2 din ho gaye hain." },
            { role: "Agent", text: "Ji, maafi chahti hun. Chassis number bataiye jaldi dekh leti hun." },
            { role: "Customer", text: "3391820 hai. Kota se hun." },
            { role: "Agent", text: "Mahesh ji, tumhare phone mein last mein 50 aata hai na?" },
            { role: "Customer", text: "Haan. Par engineer kab aayega? Machine band padi hai khet mein. Bahut nuksan ho raha hai." },
            { role: "Agent", text: "Ji samajh rahi hun. Complaint SAP4521 mili. Engineer ko urgent message bhejein?" },
            { role: "Customer", text: "Haan haan jaldi bhejo. Kal bhi kaam nahi ho sakta." },
            { role: "Agent", text: "Ji bilkul. Engineer ko urgent message bhej diya. Jaldi aayega. Dhanyavaad ji!" },
        ]
    },

    // ═══════════════════════════════════════════════════════
    // TC-04 | File: 03--A-916377117816 | Duration: 111s
    // Attempt#3 = persistent caller, medium-long call
    // ═══════════════════════════════════════════════════════
    {
        id: "TC-04",
        source: "916377117816 | 2025-07-04 10:53 | Attempt#3 | 111s",
        scenario: "Hydraulic failure + customer changes phone number mid-call",
        dialogue: [
            { role: "Agent", text: "Namaste ji, Rajesh Motors. Kya seva kar sakti hun?" },
            { role: "Customer", text: "Ji, JCB ka hydraulic kaam nahi kar raha. Bucket nahi uthta." },
            { role: "Agent", text: "Ji. Machine ka chassis number bataiye." },
            { role: "Customer", text: "5512634 hai ji." },
            { role: "Agent", text: "Vikas ji, tumhare phone mein last mein 16 aata hai na?" },
            { role: "Customer", text: "Nahi ji, wo purana number hai. Naya number dena hai." },
            { role: "Agent", text: "Ji, naya number bataiye." },
            { role: "Customer", text: "9351288471 hai." },
            { role: "Agent", text: "9351288471 — theek hai ji. Aap kahan se bol rahe hain?" },
            { role: "Customer", text: "Jodhpur se." },
            { role: "Agent", text: "Aur koi problem? Save kar dun complaint?" },
            { role: "Customer", text: "Nahi, bas hydraulic hi hai. Bahut jaldi chahiye." },
            { role: "Agent", text: "Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad!" },
        ]
    },

    // ═══════════════════════════════════════════════════════
    // TC-05 | File: 03--A-916377224969 | Duration: 89s
    // Attempt#3, speaks Rajasthani heavily
    // ═══════════════════════════════════════════════════════
    {
        id: "TC-05",
        source: "916377224969 | 2025-07-01 11:31 | Attempt#3 | 89s",
        scenario: "Rajasthani dialect - machine 'band padi', oil leak, Udaipur",
        dialogue: [
            { role: "Agent", text: "Namaste ji, Rajesh Motors. Kya seva kar sakti hun?" },
            { role: "Customer", text: "Haan bhen ji, mhari machine band padi hai. Tel bhi nikal ryo hai." },
            { role: "Agent", text: "Ji. Chassis number bataiye." },
            { role: "Customer", text: "6612340 hai ji." },
            { role: "Agent", text: "Pratap ji, tumhare phone mein last mein 69 aata hai na?" },
            { role: "Customer", text: "Haan ji, sahi hai." },
            { role: "Agent", text: "Machine band hai aur tel nikal raha — dono note kar liye. Aap kahan se hain ji?" },
            { role: "Customer", text: "Udaipur se hun ji." },
            { role: "Agent", text: "Aur koi dikkat? Ya save kar dun?" },
            { role: "Customer", text: "Nai ji, bas itna hi. Dhak bhi jaati hai thodi." },
            { role: "Agent", text: "Ji, overheating bhi note kar li. Save kar rahi hun." },
            { role: "Agent", text: "Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad!" },
        ]
    },

    // ═══════════════════════════════════════════════════════
    // TC-06 | File: 03--A-917568614556 | Duration: 108s
    // Attempt#3, morning call
    // ═══════════════════════════════════════════════════════
    {
        id: "TC-06",
        source: "917568614556 | 2025-07-01 11:16 | Attempt#3 | 108s",
        scenario: "Customer doesn't know chassis number, phone lookup fallback",
        dialogue: [
            { role: "Agent", text: "Namaste ji, Rajesh Motors. Kya seva kar sakti hun?" },
            { role: "Customer", text: "Meri machine mein problem hai. Engine smoke kar rahi hai aur race nahi le rahi." },
            { role: "Agent", text: "Ji. Machine ka chassis number bataiye." },
            { role: "Customer", text: "Wo mujhe yaad nahi ji. Bohot lambi number hoti hai." },
            { role: "Agent", text: "Koi baat nahi ji. Machine ki dashboard pe ek plate hoti hai, uspe number hota hai." },
            { role: "Customer", text: "Abhi site pe hoon, plate dhundh raha hun. Thoda ruko." },
            { role: "Agent", text: "Ji zarur." },
            { role: "Customer", text: "4478932 likha hai." },
            { role: "Agent", text: "Dinesh ji, tumhare phone mein last mein 56 aata hai na?" },
            { role: "Customer", text: "Haan ji." },
            { role: "Agent", text: "Smoke aur accelerator problem note kar li. Kahan se hain ji?" },
            { role: "Customer", text: "Sikar se hoon." },
            { role: "Agent", text: "Aur koi problem? Save kar dun?" },
            { role: "Customer", text: "Nahi bas yahi hai." },
            { role: "Agent", text: "Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad!" },
        ]
    },

    // ═══════════════════════════════════════════════════════
    // TC-07 | File: 03--A-917615925782 | Duration: 106s, afternoon
    // Attempt#3, service/filter related (routine maintenance)
    // ═══════════════════════════════════════════════════════
    {
        id: "TC-07",
        source: "917615925782 | 2025-07-01 16:38 | Attempt#3 | 106s",
        scenario: "Routine service/filter change request + slight overheat",
        dialogue: [
            { role: "Agent", text: "Namaste ji, Rajesh Motors. Kya seva kar sakti hun?" },
            { role: "Customer", text: "Haan ji. Meri machine ka filttar badlana hai. Service bhi ho gayi nahi kai mahine se." },
            { role: "Agent", text: "Ji bilkul. Chassis number bataiye." },
            { role: "Customer", text: "7723456 hai." },
            { role: "Agent", text: "Ramkishan ji, tumhare phone mein last mein 82 aata hai na?" },
            { role: "Customer", text: "Haan." },
            { role: "Agent", text: "Machine chal rahi hai ya band hai?" },
            { role: "Customer", text: "Chal rahi hai ji. Thodi dhak bhi jaati hai sometimes." },
            { role: "Agent", text: "Ji, service/filter change aur overheating dono note kar li. Kahan se hain?" },
            { role: "Customer", text: "Ajmer se." },
            { role: "Agent", text: "Aur koi problem? Save kar dun?" },
            { role: "Customer", text: "Nahi, bas yahi two cheez hain." },
            { role: "Agent", text: "Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad!" },
        ]
    },

    // ═══════════════════════════════════════════════════════
    // TC-08 | File: 03--A-917688960203 | Duration: 129s (longer)
    // Attempt#3, longest of July batch = complex multi-issue
    // ═══════════════════════════════════════════════════════
    {
        id: "TC-08",
        source: "917688960203 | 2025-07-01 11:25 | Attempt#3 | 129s",
        scenario: "5+ complaints in one breath, customer speaks fast, Marwari mixed",
        dialogue: [
            { role: "Agent", text: "Namaste ji, Rajesh Motors. Kya seva kar sakti hun?" },
            { role: "Customer", text: "Ji, mhari machine ka chassis 5534129 hai. Aur bata dun saari problems ek saath?" },
            { role: "Agent", text: "Ji bilkul, bataiye." },
            { role: "Customer", text: "Engine start nai hoti, tel nikal ryo hai, hydraulic nai chal rahi, AC band hai, aur badi khatak aa rhi hai machine mein." },
            { role: "Agent", text: "Ji, pancho problems note kar li. Mohan ji, tumhare phone mein last mein 03 aata hai na?" },
            { role: "Customer", text: "Haan ji sahi hai." },
            { role: "Agent", text: "Kahan se hain ji?" },
            { role: "Customer", text: "Bhilwara se." },
            { role: "Agent", text: "Aur koi? Ya save kar dun?" },
            { role: "Customer", text: "Haan gear bhi nahi lagta sahi se. Aur headlight bhi nahi hai." },
            { role: "Agent", text: "Ji, dono aur note kar li. Ab save kar dun?" },
            { role: "Customer", text: "Haan kar do ji." },
            { role: "Agent", text: "Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad!" },
        ]
    },

    // ═══════════════════════════════════════════════════════
    // TC-09 | File: 03--A-917727842363 | Duration: 73s
    // Attempt#3, shorter = simpler issue
    // ═══════════════════════════════════════════════════════
    {
        id: "TC-09",
        source: "917727842363 | 2025-07-01 16:59 | Attempt#3 | 73s",
        scenario: "Brake failure, machine running, short and clean call",
        dialogue: [
            { role: "Agent", text: "Namaste ji, Rajesh Motors. Kya seva kar sakti hun?" },
            { role: "Customer", text: "Ji, JCB ka brake nahi lag raha. Chal rahi hai machine par rokti nahi." },
            { role: "Agent", text: "Ji. Chassis number bataiye." },
            { role: "Customer", text: "6634785 hai." },
            { role: "Agent", text: "Jagdish ji, tumhare phone mein last mein 63 aata hai na?" },
            { role: "Customer", text: "Haan ji." },
            { role: "Agent", text: "Kahan se hain ji?" },
            { role: "Customer", text: "Tonk se." },
            { role: "Agent", text: "Aur koi problem? Save kar dun?" },
            { role: "Customer", text: "Nahi bas brake hi hai. Urgent hai ji, kaam band ho gaya." },
            { role: "Agent", text: "Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad!" },
        ]
    },

    // ═══════════════════════════════════════════════════════
    // TC-10 | File: 03--A-919773360701 | Duration: 45s (short)
    // Attempt#3 but very short = machine number not found scenario
    // ═══════════════════════════════════════════════════════
    {
        id: "TC-10",
        source: "919773360701 | 2025-07-04 11:35 | Attempt#3 | 45s",
        scenario: "Wrong chassis given 3 times, call ends with engineer assignment",
        dialogue: [
            { role: "Agent", text: "Namaste ji, Rajesh Motors. Kya seva kar sakti hun?" },
            { role: "Customer", text: "Machine complaint karni hai. Number 9991111 hai." },
            { role: "Agent", text: "Ye number nahi mila ji. Sahi chassis number bataiye." },
            { role: "Customer", text: "8881234?" },
            { role: "Agent", text: "Ye bhi nahi mila ji. Ek baar aur check karein." },
            { role: "Customer", text: "Pata nahi sahi number kya hai." },
            { role: "Agent", text: "Chassis nahi mila ji. Engineer ko bhej raha hun aapke paas. Dhanyavaad!" },
        ]
    },

    // ═══════════════════════════════════════════════════════
    // TC-11 | File: 04--A-917976395197 | Duration: 84s
    // Attempt#4 = this customer tried 4 times! Very frustrated
    // ═══════════════════════════════════════════════════════
    {
        id: "TC-11",
        source: "917976395197 | 2025-07-04 14:46 | Attempt#4 | 84s",
        scenario: "4th attempt caller, very frustrated, transmission + engine issue",
        dialogue: [
            { role: "Agent", text: "Namaste ji, Rajesh Motors. Kya seva kar sakti hun?" },
            { role: "Customer", text: "Bhai sahab, chautha baar call kar raha hun. Koi sun bhi raha hai ya nahi?" },
            { role: "Agent", text: "Ji maafi chahti hun. Aapki problem zarur solve karenge. Chassis number bataiye." },
            { role: "Customer", text: "7712345. Jaipur se hun. Problem hai gear nahi lagta aur engine bhi problem kar raha hai." },
            { role: "Agent", text: "Sanjay ji, tumhare phone mein last mein 97 aata hai na?" },
            { role: "Customer", text: "Haan." },
            { role: "Agent", text: "Ji, transmission aur engine problem note kar li. Aur koi? Save kar dun?" },
            { role: "Customer", text: "Nahi bas yahi do problem hain. Aur please jaldi bhejo engineer, 3 din se kaam band hai." },
            { role: "Agent", text: "Ji bilkul, priority mein daala. Complaint register ho gayi ji. Dhanyavaad!" },
        ]
    },

    // ═══════════════════════════════════════════════════════
    // TC-12 | File: 09--A-918955812414 | Duration: 56s
    // Attempt#9 = extremely persistent caller, many failed attempts
    // ═══════════════════════════════════════════════════════
    {
        id: "TC-12",
        source: "918955812414 | 2026-03-23 14:06 | Attempt#9 | 56s",
        scenario: "9th attempt caller — pure escalation, engineer nahi aaya for weeks",
        dialogue: [
            { role: "Agent", text: "Namaste ji, Rajesh Motors. Kya seva kar sakti hun?" },
            { role: "Customer", text: "Ji, nau baar call kar chuka hun. Complaint already registered hai. Engineer aaya hi nahi." },
            { role: "Agent", text: "Ji, bahut maafi chahti hun. Chassis number bataiye, abhi hi escalate karta hun." },
            { role: "Customer", text: "5523411. Alwar se hun." },
            { role: "Agent", text: "Haan ji, complaint SAP8833 mili. Engineer ko urgent message bhejein?" },
            { role: "Customer", text: "Haan urgent bhejo. Agar abhi bhi nahi aaya toh main dealer pe aaunga." },
            { role: "Agent", text: "Ji bilkul. Engineer ko urgent message bhej diya. Aaj hi contact karega. Dhanyavaad ji!" },
        ]
    },

    // ═══════════════════════════════════════════════════════
    // TC-13 | File: 11--A-919664406751 (first) | Duration: 108s
    // Same phone 919664406751 appears 4 TIMES in dataset - 11th attempt at 11:57
    // ═══════════════════════════════════════════════════════
    {
        id: "TC-13",
        source: "919664406751 | 2026-03-23 11:57 | Attempt#11 | 108s",
        scenario: "11th attempt caller, machine off for days, Marwari frustration",
        dialogue: [
            { role: "Agent", text: "Namaste ji, Rajesh Motors. Kya seva kar sakti hun?" },
            { role: "Customer", text: "Haan ji. Meri machine ka number 6634129 hai. Gyaraan baar call kar chuka hun." },
            { role: "Agent", text: "Kamal ji, tumhare phone mein last mein 51 aata hai na?" },
            { role: "Customer", text: "Haan." },
            { role: "Agent", text: "Complaint pehle se register hai. Engineer kab nahi aaya?" },
            { role: "Customer", text: "Teen hafte se nahi aaya ji. Machine band padi hai, kissa ho gaya." },
            { role: "Agent", text: "Ji SAP7721 complaint mili. Nayi complaint karein ya urgent escalate karein?" },
            { role: "Customer", text: "Escalate karo, manager ko bolo, mujhe callback chahiye." },
            { role: "Agent", text: "Ji zarur. Engineer ko urgent message aur senior manager ko bhi bhej raha hun. Dhanyavaad ji!" },
        ]
    },

    // ═══════════════════════════════════════════════════════
    // TC-14 | File: 11--A-919664406751 (second) | Duration: 81s
    // Same caller rang AGAIN 9 minutes later at 12:06 — follow-up on callback
    // ═══════════════════════════════════════════════════════
    {
        id: "TC-14",
        source: "919664406751 | 2026-03-23 12:06 | Attempt#11 | 81s",
        scenario: "Same caller rang again 9 mins later — checking on promised callback",
        dialogue: [
            { role: "Agent", text: "Namaste ji, Rajesh Motors. Kya seva kar sakti hun?" },
            { role: "Customer", text: "Main abhi thodi der pehle baat kiya tha. Callback aaya nahi abhi tak." },
            { role: "Agent", text: "Ji, chassis number bataiye, verify kar leti hun." },
            { role: "Customer", text: "6634129." },
            { role: "Agent", text: "Ji, escalation note hua hai. Engineer aur manager dono ko message gaya hai." },
            { role: "Customer", text: "Theek hai. Kitni der mein call aayega?" },
            { role: "Agent", text: "Ji ek ghante ke andar contact karega. Main bhi internally follow-up kar rahi hun." },
            { role: "Customer", text: "Theek hai. Dekhte hain." },
            { role: "Agent", text: "Ji zarur. Dhanyavaad ji." },
        ]
    },

    // ═══════════════════════════════════════════════════════
    // TC-15 | File: 13--A-919664406751 | Duration: 123s
    // SAME CALLER, now 13th attempt, afternoon 14:29
    // Long = new problems added + old escalation pending
    // ═══════════════════════════════════════════════════════
    {
        id: "TC-15",
        source: "919664406751 | 2026-03-23 14:29 | Attempt#13 | 123s",
        scenario: "13th attempt by same customer — new additional complaints on existing machine",
        dialogue: [
            { role: "Agent", text: "Namaste ji, Rajesh Motors. Kya seva kar sakti hun?" },
            { role: "Customer", text: "Main Kamal hun. 6634129. Phir se bol raha hun — engineer nahi aaya." },
            { role: "Agent", text: "Kamal ji, tumhare phone mein last mein 51 aata hai na?" },
            { role: "Customer", text: "Haan. Ab naya problem bhi aa gaya hai. AC bhi band ho gayi." },
            { role: "Agent", text: "Ji note kar liya. Pehle wali complaint ke saath nayi bhi register karein?" },
            { role: "Customer", text: "Haan. Aur machine ab bahut garam bhi ho rahi hai. Dhak jaati hai." },
            { role: "Agent", text: "Ji, AC kharab aur overheating dono note kar li. Koi aur problem?" },
            { role: "Customer", text: "Tel bhi nikal raha hai thoda." },
            { role: "Agent", text: "Ji, oil leakage bhi. Ab save kar dun?" },
            { role: "Customer", text: "Haan kar do." },
            { role: "Agent", text: "Complaint register ho gayi ji. SAP number SMS mein aayega. Engineer priority pe aayega. Dhanyavaad!" },
        ]
    },

    // ═══════════════════════════════════════════════════════
    // TC-16 | File: 13--A-919929911341 | Duration: 148s (very long)
    // Attempt#13, different caller, wants to give machine location
    // ═══════════════════════════════════════════════════════
    {
        id: "TC-16",
        source: "919929911341 | 2026-03-23 16:28 | Attempt#13 | 148s",
        scenario: "Multiple issues + customer gives detailed machine site address",
        dialogue: [
            { role: "Agent", text: "Namaste ji, Rajesh Motors. Kya seva kar sakti hun?" },
            { role: "Customer", text: "Ji, complaint register karni hai. Machine site pe hai." },
            { role: "Agent", text: "Ji. Chassis number bataiye." },
            { role: "Customer", text: "7789234 hai." },
            { role: "Agent", text: "Gopal ji, tumhare phone mein last mein 41 aata hai na?" },
            { role: "Customer", text: "Haan ji." },
            { role: "Agent", text: "Kya problem hai machine mein ji?" },
            { role: "Customer", text: "Engine start nahi hoti. Aur hydraulic cylinder bhi leak kar raha hai. Tel bahut nikal raha hai." },
            { role: "Agent", text: "Ji, teen problem note kar li. Kahan se hain?" },
            { role: "Customer", text: "Kota se hun. Machine ek village mein hai — Ramganj Mandi ke paas, Sitarampura gaon." },
            { role: "Agent", text: "Ji, location note kar li. Aur koi problem? Save kar dun?" },
            { role: "Customer", text: "Haan steering bhi thodi tight lagti hai. Aur awaaz aa rahi hai." },
            { role: "Agent", text: "Ji, steering aur noise bhi note kar li. Koi aur?" },
            { role: "Customer", text: "Gear bhi slip karta hai. Coolant nikal raha hai." },
            { role: "Agent", text: "Ji, dono aur note kar li. Ab save kar dun?" },
            { role: "Customer", text: "Haan. Aur wahan ka road bahut kharab hai, engineer ko bata dena." },
            { role: "Agent", text: "Ji zarur, note kar diya. Complaint register ho gayi. Dhanyavaad!" },
        ]
    },

    // ═══════════════════════════════════════════════════════
    // TC-17 | File: 14--A-916376632363 | Duration: 354s (6 MINUTES!)
    // Attempt#14 + longest call in dataset = serious multi-issue dispute
    // ═══════════════════════════════════════════════════════
    {
        id: "TC-17",
        source: "916376632363 | 2026-03-23 14:13 | Attempt#14 | 354s",
        scenario: "14th attempt, 6-min call — 10 complaints, price query, ETA discussion",
        dialogue: [
            { role: "Agent", text: "Namaste ji, Rajesh Motors. Kya seva kar sakti hun?" },
            { role: "Customer", text: "Bhai sahab, main Harikishen hun. Chaudhvan baar call kar raha hun. Machine 3344521." },
            { role: "Agent", text: "Harikishen ji, tumhare phone mein last mein 63 aata hai na?" },
            { role: "Customer", text: "Haan. Main Jaipur ke paas Dausa se hun." },
            { role: "Agent", text: "Ji. Kya problem hai machine mein?" },
            { role: "Customer", text: "Engine start nahi hoti. Tel nikal raha hai. Hydraulic nahi chal raha. AC kharab. Brake nahi lagti. Badi awaaz aa rahi hai." },
            { role: "Agent", text: "Ji, 6 problems note kar li. Aur koi?" },
            { role: "Customer", text: "Aur puchhna tha — kitna charge lagega repair mein?" },
            { role: "Agent", text: "Ji wo engineer dekhke batayega. Warranty mein hoga toh free. Aur koi problem?" },
            { role: "Customer", text: "Steering bhi tight hai. Battery bhi down lagti hai." },
            { role: "Agent", text: "Ji, dono aur note kar li. Koi aur?" },
            { role: "Customer", text: "Gear bhi slip karta hai. Coolant nikal raha hai." },
            { role: "Agent", text: "Ji, gear aur coolant bhi. Aur koi? Save kar dun?" },
            { role: "Customer", text: "Haan. Aur engineer kab aayega? Kal tak?" },
            { role: "Agent", text: "Ji koshish karenge. Priority mein daala." },
            { role: "Customer", text: "Theek hai. Ek baat aur — turbo kuch lag raha hai, black smoke aa rahi hai." },
            { role: "Agent", text: "Ji, turbocharger issue bhi note kar liya. Ab save kar dun?" },
            { role: "Customer", text: "Haan haan kar do bhai." },
            { role: "Agent", text: "Complaint register ho gayi ji. SAP number SMS mein aayega. Engineer priority se aayega. Dhanyavaad!" },
        ]
    },

    // ═══════════════════════════════════════════════════════
    // TC-18 | File: 15--A-917852043732 | Duration: 97s
    // Attempt#15, morning, overheating + noise
    // ═══════════════════════════════════════════════════════
    {
        id: "TC-18",
        source: "917852043732 | 2025-07-04 11:32 | Attempt#15 | 97s",
        scenario: "Overheating + abnormal noise + oil leak, machine still running, Chittorgarh",
        dialogue: [
            { role: "Agent", text: "Namaste ji, Rajesh Motors. Kya seva kar sakti hun?" },
            { role: "Customer", text: "Ji, machine chal toh rahi hai lekin bahut garam ho jaati hai. Aur khatak khatak awaaz aa rahi hai." },
            { role: "Agent", text: "Ji. Chassis number bataiye." },
            { role: "Customer", text: "Ek minute, dekh raha hun. 5567891 hai." },
            { role: "Agent", text: "Bharat ji, tumhare phone mein last mein 32 aata hai na?" },
            { role: "Customer", text: "Haan ji." },
            { role: "Agent", text: "Overheating aur abnormal noise note kar li. Kahan se hain?" },
            { role: "Customer", text: "Chittorgarh se hun." },
            { role: "Agent", text: "Aur koi problem? Save kar dun?" },
            { role: "Customer", text: "Tel thoda nikal raha hai bhi. Bas itna." },
            { role: "Agent", text: "Ji, oil leakage bhi note kar li. Save kar rahi hun." },
            { role: "Agent", text: "Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad!" },
        ]
    },

    // ═══════════════════════════════════════════════════════
    // TC-19 | File: 15--A-917898411365 | Duration: 97s
    // Attempt#15, afternoon, electrical + site location given
    // ═══════════════════════════════════════════════════════
    {
        id: "TC-19",
        source: "917898411365 | 2025-07-04 16:03 | Attempt#15 | 97s",
        scenario: "Electrical/battery issue, machine on field site, customer gives location",
        dialogue: [
            { role: "Agent", text: "Namaste ji, Rajesh Motors. Kya seva kar sakti hun?" },
            { role: "Customer", text: "Ji namaskar. Machine ki headlight nahi hai. Raat ko kaam karna hai." },
            { role: "Agent", text: "Ji. Chassis number bataiye." },
            { role: "Customer", text: "8834567 hai ji." },
            { role: "Agent", text: "Ramesh ji, tumhare phone mein last mein 65 aata hai na?" },
            { role: "Customer", text: "Haan ji sahi hai." },
            { role: "Agent", text: "Electrical problem note kar li. Machine kahan hai — site pe ya workshop?" },
            { role: "Customer", text: "Site pe hai ji. Khet mein kaam chal raha hai. Pali ke paas Sumerpur hai." },
            { role: "Agent", text: "Ji, onsite Sumerpur-Pali note kar li. Koi aur problem?" },
            { role: "Customer", text: "Battery bhi thodi down lagti hai. Tyre kal change ho gaya, wo theek hai." },
            { role: "Agent", text: "Ji, battery problem note kar li. Save kar dun?" },
            { role: "Customer", text: "Haan kar do." },
            { role: "Agent", text: "Complaint register ho gayi ji. Engineer aayega. Dhanyavaad!" },
        ]
    },

    // ═══════════════════════════════════════════════════════
    // TC-20 | COMBINED EDGE CASE
    // Hold + wrong number + Rajasthani dialect + adds problems at confirmation
    // ═══════════════════════════════════════════════════════
    {
        id: "TC-20",
        source: "SYNTHETIC — combined edge cases from all real recordings",
        scenario: "Hold pause + wrong chassis + Rajasthani dialect + adds more complaints at confirmation step",
        dialogue: [
            { role: "Agent", text: "Namaste ji, Rajesh Motors mein aapka swagat hai. Kya seva kar sakti hun?" },
            { role: "Customer", text: "Haan bhen ji. Mhari machine chaalti nai hai. Khatak bhi aa ri hai." },
            { role: "Agent", text: "Ji. Chassis number bataiye." },
            { role: "Customer", text: "Ek minute ji, dhundh ri hun." },
            { role: "Agent", text: "Ji zarur." },
            { role: "Customer", text: "4456712 lagta hai." },
            { role: "Agent", text: "Ye number nahi mila ji. Ek baar aur check karein." },
            { role: "Customer", text: "Arrey ruko, galat bola. 4467512 hai." },
            { role: "Agent", text: "Savitri ji, tumhare phone mein last mein 69 aata hai na?" },
            { role: "Customer", text: "Haan ji sahi hai." },
            { role: "Agent", text: "Kahan se hain ji?" },
            { role: "Customer", text: "Udaipur se hun." },
            { role: "Agent", text: "Aur koi problem? Save kar dun?" },
            { role: "Customer", text: "Haan, race bhi nai leti machine. Aur hydraulic bhi problem hai." },
            { role: "Agent", text: "Ji, accelerator aur hydraulic bhi note kar li. Ab save kar dun?" },
            { role: "Customer", text: "Haan kar do ji. Jaldi bhejo engineer, kaam band pada hai." },
            { role: "Agent", text: "Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad!" },
        ]
    }

];

// ─── Print as formatted test script ─────────────────────────────
conversations.forEach(c => {
    console.log(`\n${"═".repeat(70)}`);
    console.log(`📋 ${c.id} | ${c.source}`);
    console.log(`📌 Scenario: ${c.scenario}`);
    console.log("─".repeat(70));
    c.dialogue.forEach(turn => {
        const label = turn.role === "Agent" ? "🤖 Agent   :" : "👤 Customer:";
        console.log(`${label} ${turn.text}`);
    });
});

console.log(`\n\n✅ Total: ${conversations.length} test conversations`);
module.exports = conversations;