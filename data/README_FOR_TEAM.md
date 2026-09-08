# GeM Bid Compliance Dataset — Read This First
### SIH PS 26100 — AI-Powered Integrated Bid Compliance Verification Platform for GeM Procurement

Hi team,

Yeh humara **synthetic (fake but realistic) dataset** hai jo hum PS 26100 ke liye use karenge. Neeche
sab kuch detail mein explain kiya hai — kya hai, kyu banaya, kaise use karna hai.

---

## 1. Yeh Dataset Hai Kya?

PS ka official dataset link kehta hai: *"To be provided / Dummy bidder and tender datasets may be
used for development and testing."* Matlab real GeM/GST/Udyam data humein nahi milega (aur legally
milna bhi nahi chahiye — woh sensitive government/business data hai). Isliye humne khud ek
**realistic dummy dataset** generate kiya hai jo bilkul real jaisa dikhta hai, format aur structure
dono mein — lekin har entry fake hai, koi real company/person nahi hai.

**Important**: GSTIN numbers isme *format-correct* hain (real checksum algorithm follow karte hain)
lekin *real registered GSTINs nahi hain*. Inhe kabhi bhi real transactions/filing mein use mat karna.

---

## 2. Folder Structure

```
gem_dataset_package/
├── README_FOR_TEAM.md          <- yeh file (padho pehle)
├── generate_gem_mock_data.py   <- original data banane wala script
├── extend_dataset.py           <- EXTENSION: local content %, turnover, tenders (dobara chalao to naya banega)
├── generate_sample_docs.py     <- EXTENSION: sample certificate PDFs banata hai
├── sample_documents/           <- AI document-extraction demo ke liye 3 fake PDFs
│   ├── BID00001_gst_certificate.pdf   <- clean case (sab match karta hai)
│   ├── BID00003_gst_certificate.pdf   <- name mismatch case
│   └── BID00002_udyam_certificate.pdf <- expired registration case
└── data/
    ├── bidders.csv              <- MAIN table: 150 fake bidders (ab local_content_percent + annual_turnover_cr bhi hai)
    ├── udyam_portal.csv         <- Udyam/MSME "government portal" simulation
    ├── gst_portal.csv           <- GST "government portal" simulation
    ├── pan_portal.csv           <- PAN/Income-Tax "government portal" simulation
    ├── epfo_esic_portal.csv     <- EPFO/ESIC "government portal" simulation
    ├── startup_nsic_portal.csv  <- Startup India / NSIC "government portal" simulation
    ├── blacklist_registry.csv   <- Blacklist/Debarment "government portal" simulation
    ├── tender_criteria.csv      <- NEW: 4 sample tenders with eligibility rules (min turnover, local content %, MSME-only etc.)
    ├── tender_bids.csv          <- NEW: which bidder applied to which tender
    └── all_tables.json          <- saari files ek hi JSON mein (backend seeding ke liye)
```

### Kya add kiya (aur kyu)
Original dataset mein PS ke kuch requirements missing the — add kar diye:
- `local_content_percent` + `annual_turnover_cr` bidders.csv mein — Make in India check aur turnover-eligibility ke liye
- `tender_criteria.csv` — har tender ki apni alag eligibility rules hoti hain (MSME-only, min turnover, min local content) - isse "tender-specific compliance" feature dikha paoge
- `tender_bids.csv` — bidder-tender mapping, taaki pata chale kaunsa bidder kis tender ke liye eligible hai
- `sample_documents/` — 3 demo PDFs (clean / name-mismatch / expired) taaki "PDF upload → AI extract → portal se match" wala flow live demo mein dikha sako. Ye clearly "SAMPLE/DEMO DOCUMENT" labelled hain, koi real government format copy nahi kiya.

---

## 3. Har File Ka Kaam (Detail Mein)

### `bidders.csv` — Sabse Important File
Yeh humara **central/master table** hai. Har row ek fake company hai jo GeM tender mein bid kar rahi
hai. Columns: `bidder_id`, `company_name`, `pan_number`, `gst_number`, `udyam_number`, `category`,
`state`, `registration_date`, `known_issue_tags`.

- `bidder_id` — ye unique ID har jagah use hoga baaki tables se link karne ke liye (jaise ek "foreign
  key" sochlo)
- `known_issue_tags` — **ye ground truth hai**. Isme likha hai ki us bidder mein kya-kya problems
  jaan-bujh kar daali gayi hain (e.g., `GST_FILING_PENDING;UDYAM_EXPIRED`). Isse hum apne AI system
  ki accuracy test kar sakte hain — "system ne 45 mein se 42 issues sahi pakde = 93% accuracy"

### `udyam_portal.csv`, `gst_portal.csv`, `pan_portal.csv`, `epfo_esic_portal.csv`, `startup_nsic_portal.csv`, `blacklist_registry.csv`
Real duniya mein bidder ka compliance check karne ke liye **6 alag-alag government websites** pe jaana
padta hai (Udyam ki website, GST ki website, EPFO ki website, etc — sab separate systems hain).

Humare paas real access nahi hai in websites ka, isliye humne **6 alag CSV files banayi hain jo in
websites ka data simulate karti hain**. Jab hamara AI Verification Engine kisi bidder ko check karega,
woh in files mein data dhoondega — jaise real system mein API call karta.

**Sabse zaroori baat**: In files mein jaan-bujh kar kuch bidders ke data mein problems daali gayi hain:
- Company ka naam GST portal pe thoda alag likha hai (e.g. "Pvt Ltd" vs "Private Limited") →
  **name mismatch**
- GST filing 6 mahine se pending hai → **non-compliance**
- Udyam certificate expire ho chuka hai → **expired registration**
- EPFO/ESIC compliance lapse ho gaya → **statutory non-compliance**
- Kuch bidders blacklist mein hain → **debarred, auto-reject case**

Ye problems isliye daali hain taaki jab hum demo dein, hamara system **kuch genuinely detect kar
ke dikhaye** — sirf "sab bidders clean hain" bolne se demo boring lagega aur judges ko lagega system
kuch kaam nahi kar raha.

### `all_tables.json`
Yeh sab 7 CSV files ka combined version hai, JSON format mein. Backend developers (jo FastAPI/Flask/
Node mein mock APIs banayenge) isko seedha use karenge apna mock database/API seed karne ke liye.
Frontend/analysis karne walo ke liye CSV zyada aasan hai (Excel mein khol sakte ho), backend walo ke
liye JSON zyada convenient hai.

### `generate_gem_mock_data.py`
Yeh woh script hai jisne ye saari CSV/JSON files banayi hain. Isko dobara chalane se **naya fresh
data** ban sakta hai — jaise agar humein 500 bidders chahiye demo ke liye, ya zyada/kam problems
chahiye, to bas ek command se naya set generate ho jayega:

```bash
python3 generate_gem_mock_data.py --num_bidders 500 --inconsistency_rate 0.3 --seed 42
```

- `--num_bidders` = kitne fake bidders chahiye
- `--inconsistency_rate` = kitna % bidders mein problems honge (0.25 = 25%)
- `--seed` = same number dalne se HAMESHA same data banega (reproducible — taaki sabki machine pe
  same data ho, testing consistent rahe)

Koi extra library install karne ki zarurat nahi — pure Python hai, bas `python3` chahiye.

---

## 4. Poora Flow Kaise Kaam Karega (Real Use Case Samjho)

```
STEP 1: bidders.csv se pata chala "Sai Traders Pvt Ltd" ne bid daala hai
         (PAN: XXXXX, GST: YYYYY, Udyam: ZZZZZ)

STEP 2: Hamara AI engine cross-check karta hai:
         → gst_portal.csv mein "YYYYY" dhoondo → filing status "Pending 6 months" mila → FLAG
         → udyam_portal.csv mein "ZZZZZ" dhoondo → status "Expired" mila → FLAG
         → blacklist_registry.csv mein naam dhoondo → "Clear" mila → OK

STEP 3: Compliance Dashboard pe dikhega:
         "Sai Traders Pvt Ltd — Risk: HIGH — 2 issues: GST filing pending, Udyam expired"

STEP 4: Procurement Officer dashboard dekh ke decide karta hai:
         Approve / Reject / Request Clarification (AI sirf suggest karta hai, final decision
         officer ki hoti hai — PS mein yeh explicitly likha hai)
```

Yehi flow judges ko live demo mein dikhana hai.

---

## 5. Kya Karna Hai Ab (Next Steps For Team)

1. **Backend team**: `all_tables.json` ya CSV files ko database mein load karo (PostgreSQL/SQLite),
   ya seedha in-memory mock APIs banao jo real Udyam/GST/EPFO APIs jaisa response dein
2. **AI/Logic team**: Cross-verification rules likho — PAN-GSTIN match check, name fuzzy-matching,
   filing status check, blacklist check, expiry date check
3. **Frontend team**: Bidder list, compliance dashboard, risk score, officer action panel banao
   in tables ke data ke saath
4. Testing karte waqt `known_issue_tags` column use karo yeh verify karne ke liye ki system sahi
   issues pakad raha hai ya nahi

Koi confusion ho to mujhe poochlo. Data dobara banana ho (zyada bidders, different settings) to
script hai hi, bas chala dena.
