# Test Conversation Summary for JCB Voice Bot (Priya)

## Quick Reference - How to Test

### Start Server
```bash
node server.js
```

### Test via Twilio Console or ngrok
Speak the customer lines to test each scenario.

---

## SCENARIO 1: Basic Complaint Registration (Happy Path)
**Expected Flow:** Greeting → Machine → Problem → City → Phone Confirm → Final Confirm → Submit

| Turn | Speaker | Text |
|------|---------|------|
| 1 | BOT | Namaste ji, Rajesh Motors mein aapka swagat hai. Kya seva kar sakti hun? |
| 2 | CUSTOMER | Mera machine start nahi ho raha hai |
| 3 | BOT | Chassis number bataiye? |
| 4 | CUSTOMER | 3305447 |
| 5 | BOT | Aur shahar kaunsa hai? |
| 6 | CUSTOMER | Jaipur |
| 7 | BOT | Ji, ye number theek hai jisme last mein 47 aata hai? |
| 8 | CUSTOMER | Haan |
| 9 | BOT | Aur koi problem hai? Ya save kar dun? |
| 10 | CUSTOMER | Nahi |
| 11 | BOT | Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad! |

---

## SCENARIO 2: Phone Confirm - Customer Says "Nahi" (Wants New Number)

| Turn | Speaker | Text |
|------|---------|------|
| 1 | BOT | Namaste ji, Rajesh Motors mein aapka swagat hai. Kya seva kar sakti hun? |
| 2 | CUSTOMER | Machine band hai |
| 3 | BOT | Chassis number bataiye? |
| 4 | CUSTOMER | 4455667 |
| 5 | BOT | Aur shahar kaunsa hai? |
| 6 | CUSTOMER | Jodhpur |
| 7 | BOT | Ji, ye number theek hai jisme last mein 67 aata hai? |
| 8 | CUSTOMER | Nahi, naya number dena hai |
| 9 | BOT | Pura 10 digit naya number bataiye. |
| 10 | CUSTOMER | 9876543210 |
| 11 | BOT | Aur koi problem hai? Ya save kar dun? |
| 12 | CUSTOMER | Nahi |
| 13 | BOT | Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad! |

---

## SCENARIO 3: Phone Confirm - Customer Says "Haan" (Confirms Existing)

| Turn | Speaker | Text |
|------|---------|------|
| 1 | BOT | Namaste ji, Rajesh Motors mein aapka swagat hai. Kya seva kar sakti hun? |
| 2 | CUSTOMER | Filter badlavana hai |
| 3 | BOT | Chassis number bataiye? |
| 4 | CUSTOMER | 2233445 |
| 5 | BOT | Aur shahar kaunsa hai? |
| 6 | CUSTOMER | Kota |
| 7 | BOT | Ji, ye number theek hai jisme last mein 45 aata hai? |
| 8 | CUSTOMER | Haan theek hai |
| 9 | BOT | Aur koi problem hai? Ya save kar dun? |
| 10 | CUSTOMER | Nahi |
| 11 | BOT | Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad! |

---

## SCENARIO 4: Chassis Not Found - Multiple Attempts

| Turn | Speaker | Text |
|------|---------|------|
| 1 | BOT | Namaste ji, Rajesh Motors mein aapka swagat hai. Kya seva kar sakti hun? |
| 2 | CUSTOMER | Machine start nahi ho raha |
| 3 | BOT | Chassis number bataiye? |
| 4 | CUSTOMER | 1234567 |
| 5 | BOT | Ye number nahi mila ji. Ek baar phir bataiye. |
| 6 | CUSTOMER | 1122334 |
| 7 | BOT | Ye bhi nahi mila ji. Ek baar aur check karein. |
| 8 | CUSTOMER | 5566778 |
| 9 | BOT | Chassis nahi mila ji. Engineer ko bhej raha hun, wo directly aayega. Dhanyavaad! |

---

## SCENARIO 5: Repeat Caller - Existing Complaint (Escalation)

| Turn | Speaker | Text |
|------|---------|------|
| 1 | BOT | Namaste ji, Rajesh Motors mein aapka swagat hai. Kya seva kar sakti hun? |
| 2 | CUSTOMER | Pehle complaint ki thi, engineer nahi aaya |
| 3 | BOT | Complaint 12345 mili. Nayi complaint karein ya engineer ko urgent message bhejein? |
| 4 | CUSTOMER | Urgent message bhejo |
| 5 | BOT | Engineer ko urgent message bhej diya. Jaldi aayega. Dhanyavaad! |

---

## SCENARIO 6: Angry Customer - Engineer Not Arrived

| Turn | Speaker | Text |
|------|---------|------|
| 1 | BOT | Namaste ji, Rajesh Motors mein aapka swagat hai. Kya seva kar sakti hun? |
| 2 | CUSTOMER | Engineer nahi aaya, bahut der ho gayi |
| 3 | BOT | Samajh rahi hun, pareshani hui. Abhi solve karti hun. |
| 4 | BOT | Chassis number bataiye? |
| 5 | CUSTOMER | 9988776 |
| 6 | BOT | Aur shahar kaunsa hai? |
| 7 | CUSTOMER | Udaipur |
| 8 | BOT | Ji, ye number theek hai jisme last mein 76 aata hai? |
| 9 | CUSTOMER | Haan |
| 10 | BOT | Aur koi problem hai? Ya save kar dun? |
| 11 | CUSTOMER | Nahi |
| 12 | BOT | Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad! |

---

## SCENARIO 7: Side Question - "Tum Kaun Ho"

| Turn | Speaker | Text |
|------|---------|------|
| 1 | BOT | Namaste ji, Rajesh Motors mein aapka swagat hai. Kya seva kar sakti hun? |
| 2 | CUSTOMER | Tum kaun ho? |
| 3 | BOT | Priya hun, Rajesh Motors se. |
| 4 | BOT | Kya problem hai machine mein? |
| 5 | CUSTOMER | Hydraulic problem hai |
| 6 | BOT | Chassis number bataiye? |
| 7 | CUSTOMER | 7744555 |
| 8 | BOT | Aur shahar kaunsa hai? |
| 9 | CUSTOMER | Alwar |
| 10 | BOT | Ji, ye number theek hai jisme last mein 55 aata hai? |
| 11 | CUSTOMER | Haan |
| 12 | BOT | Aur koi problem hai? Ya save kar dun? |
| 13 | CUSTOMER | Nahi |
| 14 | BOT | Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad! |

---

## SCENARIO 8: Multi-Field in Opening Sentence

| Turn | Speaker | Text |
|------|---------|------|
| 1 | BOT | Namaste ji, Rajesh Motors mein aapka swagat hai. Kya seva kar sakti hun? |
| 2 | CUSTOMER | Mera machine 3305447 hai, Jaipur mein hai, engine start nahi ho raha |
| 3 | BOT | Ji, ye number theek hai jisme last mein 47 aata hai? |
| 4 | CUSTOMER | Haan |
| 5 | BOT | Aur koi problem hai? Ya save kar dun? |
| 6 | CUSTOMER | Nahi |
| 7 | BOT | Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad! |

---

## SCENARIO 9: Machine Status - "Abhi Theek Ho Gayi"

| Turn | Speaker | Text |
|------|---------|------|
| 1 | BOT | Namaste ji, Rajesh Motors mein aapka swagat hai. Kya seva kar sakti hun? |
| 2 | CUSTOMER | Machine abhi theek ho gayi, lekin dubara problem ho sakti hai |
| 3 | BOT | Chassis number bataiye? |
| 4 | CUSTOMER | 6655443 |
| 5 | BOT | Aur shahar kaunsa hai? |
| 6 | CUSTOMER | Sikar |
| 7 | BOT | Ji, ye number theek hai jisme last mein 43 aata hai? |
| 8 | CUSTOMER | Haan |
| 9 | BOT | Aur koi problem hai? Ya save kar dun? |
| 10 | CUSTOMER | Nahi |
| 11 | BOT | Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad! |

---

## SCENARIO 10: Final Confirm - "Nahi" = Submit

| Turn | Speaker | Text |
|------|---------|------|
| 1 | BOT | Namaste ji, Rajesh Motors mein aapka swagat hai. Kya seva kar sakti hun? |
| 2 | CUSTOMER | Oil leak hai machine mein |
| 3 | BOT | Chassis number bataiye? |
| 4 | CUSTOMER | 8877665 |
| 5 | BOT | Aur shahar kaunsa hai? |
| 6 | CUSTOMER | Bikaner |
| 7 | BOT | Ji, ye number theek hai jisme last mein 65 aata hai? |
| 8 | CUSTOMER | Haan |
| 9 | BOT | Aur koi problem hai? Ya save kar dun? |
| 10 | CUSTOMER | Nahi |
| 11 | BOT | Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad! |

---

## SCENARIO 11: Side Question - Company Info

| Turn | Speaker | Text |
|------|---------|------|
| 1 | BOT | Namaste ji, Rajesh Motors mein aapka swagat hai. Kya seva kar sakti hun? |
| 2 | CUSTOMER | Rajesh Motors kahan hai? |
| 3 | BOT | Rajesh Motors Rajasthan mein hai. |
| 4 | BOT | Kya problem hai machine mein? |
| 5 | CUSTOMER | Smoke aata hai |
| 6 | BOT | Chassis number bataiye? |
| 7 | CUSTOMER | 5566778 |
| 8 | BOT | Aur shahar kaunsa hai? |
| 9 | CUSTOMER | Bhilwara |
| 10 | BOT | Ji, ye number theek hai jisme last mein 78 aata hai? |
| 11 | CUSTOMER | Haan |
| 12 | BOT | Aur koi problem hai? Ya save kar dun? |
| 13 | CUSTOMER | Nahi |
| 14 | BOT | Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad! |

---

## SCENARIO 12: Short Ack - Fast Path

| Turn | Speaker | Text |
|------|---------|------|
| 1 | BOT | Namaste ji, Rajesh Motors mein aapka swagat hai. Kya seva kar sakti hun? |
| 2 | CUSTOMER | Theek |
| 3 | BOT | Chassis number bataiye? |
| 4 | CUSTOMER | 4433221 |
| 5 | BOT | Aur shahar kaunsa hai? |
| 6 | CUSTOMER | Ok Jaipur |
| 7 | BOT | Ji, ye number theek hai jisme last mein 21 aata hai? |
| 8 | CUSTOMER | Ha |
| 9 | BOT | Aur koi problem hai? Ya save kar dun? |
| 10 | CUSTOMER | Nahi |
| 11 | BOT | Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad! |

---

## SCENARIO 13: Hold Intent - "Ek Minute"

| Turn | Speaker | Text |
|------|---------|------|
| 1 | BOT | Namaste ji, Rajesh Motors mein aapka swagat hai. Kya seva kar sakti hun? |
| 2 | CUSTOMER | Ek minute, machine ki file dhundh raha hun |
| 3 | BOT | Zarur. |
| 4 | BOT | Chassis number bataiye? |
| 5 | CUSTOMER | 1234567 |
| 6 | BOT | Aur shahar kaunsa hai? |
| 7 | CUSTOMER | Nagaur |
| 8 | BOT | Ji, ye number theek hai jisme last mein 67 aata hai? |
| 9 | CUSTOMER | Haan |
| 10 | BOT | Aur koi problem hai? Ya save kar dun? |
| 11 | CUSTOMER | Nahi |
| 12 | BOT | Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad! |

---

## SCENARIO 14: Question - Engineer Timing

| Turn | Speaker | Text |
|------|---------|------|
| 1 | BOT | Namaste ji, Rajesh Motors mein aapka swagat hai. Kya seva kar sakti hun? |
| 2 | CUSTOMER | Engineer kab aayega? |
| 3 | BOT | JCB complaint ke liye. |
| 4 | BOT | Chassis number bataiye? |
| 5 | CUSTOMER | 9988776 |
| 6 | BOT | Aur shahar kaunsa hai? |
| 7 | CUSTOMER | Pali |
| 8 | BOT | Ji, ye number theek hai jisme last mein 76 aata hai? |
| 9 | CUSTOMER | Haan |
| 10 | BOT | Aur koi problem hai? Ya save kar dun? |
| 11 | CUSTOMER | Nahi |
| 12 | BOT | Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad! |

---

## SCENARIO 15: Multiple Problems

| Turn | Speaker | Text |
|------|---------|------|
| 1 | BOT | Namaste ji, Rajesh Motors mein aapka swagat hai. Kya seva kar sakti hun? |
| 2 | CUSTOMER | Machine mein noise hai aur hydraulic bhi problem hai |
| 3 | BOT | Chassis number bataiye? |
| 4 | CUSTOMER | 3344556 |
| 5 | BOT | Aur shahar kaunsa hai? |
| 6 | CUSTOMER | Kota |
| 7 | BOT | Ji, ye number theek hai jisme last mein 56 aata hai? |
| 8 | CUSTOMER | Haan |
| 9 | BOT | Aur koi problem hai? Ya save kar dun? |
| 10 | CUSTOMER | Nahi |
| 11 | BOT | Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad! |

---

## Quick Test Checklist

- [ ] Greeting responds correctly
- [ ] Chassis extraction works (4-7 digits)
- [ ] City matching works (Jaipur, Jodhpur, etc.)
- [ ] Phone confirmation asks last 2 digits
- [ ] "Nahi" at phone confirm → asks for new number
- [ ] "Haan" at phone confirm → proceeds
- [ ] Final confirm "Nahi" → submits complaint
- [ ] Side questions answered (identity, company)
- [ ] Short acks fast-path (haan, theek, ok)
- [ ] Hold intent handled (ek minute, ruko)
- [ ] Angry triggers detected
- [ ] Chassis not found handled gracefully
- [ ] Repeat caller detection works