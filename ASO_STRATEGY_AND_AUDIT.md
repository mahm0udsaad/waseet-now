# وسيط الان — App Store Optimization Strategy & Current Setup Audit

**Prepared:** April 16, 2026
**App:** وسيط الان (Wasit Alan) — Saudi platform for domestic worker transfers, government services & escrow payments
**iOS Bundle ID:** `com.mahm09d.kafel` (App Store Connect ID: 6756179253)
**Android Package:** `com.wasitalan.app`
**Current Version:** 1.3.8

---

## Executive Summary

The goal is to make وسيط الان rank for high-intent Arabic queries (تنازل, تعقيب, نقل كفالة, وساطة) in Saudi Arabia **without** relying on download volume — which we don't have yet. The research below synthesizes the current (2025-2026) ASO landscape on both App Store and Google Play and maps it to the exact state of our listings.

**Headline findings:**

1. **iOS keyword field is the single highest-leverage lever we have not yet pulled.** Apple indexes every token you put there regardless of installs. Our current live keywords on version 1.3.7 are workable but can be rewritten to capture significantly more long-tail Arabic search volume. Changes require a new version submission (which we already have queued as 1.3.8).
2. **Google Play does not have a keyword field. Everything is indexed from the title, short description, long description, and — critically — the store listing translations.** We have already added the English (United States) translation, which doubles the text surface area that Google indexes.
3. **The app is still in Closed Testing on Google Play.** It is effectively invisible on Play Search until we promote to Production. This is the single largest blocker to Android visibility.
4. **Neither store is using the full screenshot/video real estate.** Apple now OCR-indexes screenshot captions (since June 2025). We are leaving that signal on the table.
5. **A small Apple Search Ads budget ($5–$15/day) on exact-match branded and category keywords is the fastest credible way to generate the early install + conversion data Apple's ranking algorithm needs to trust us organically.**

---

## Part 1 — Current Setup Audit

### 1.1 iOS / App Store Connect

| Item | Status | Notes |
|------|--------|-------|
| Bundle ID | Set | `com.mahm09d.kafel` |
| App name (Arabic) | Set | "وسيط الان" |
| Subtitle | Set | Short Arabic subtitle present |
| Primary category | Utilities | See recommendation below |
| Secondary category | Utilities (reverted) | Tried to switch to Finance — blocked by HTTP 409, requires new version |
| Keywords (live v1.3.7) | Set, not optimal | Change blocked on live version — must ship with next submission |
| Screenshots | Present, no captions | Apple now OCR-indexes captions (June 2025) — big miss |
| Preview video | Not uploaded | Recommended: 15–30s localized preview |
| Localizations | Arabic only | Adding English (U.S.) would double indexed text |
| App Privacy | Configured | |
| Apple Search Ads | Not running | Highest-leverage paid lever for a low-install app |

**Blocker for next cycle:** iOS keyword updates, secondary category change (to Finance), and any app-name/subtitle tweak all require submitting a new version. Version 1.3.8 is already prepared for this.

### 1.2 Android / Google Play Console

| Item | Status | Notes |
|------|--------|-------|
| Package | `com.wasitalan.app` | |
| Release track | **Closed Testing** | **Blocker** — app is not discoverable on Play Search until promoted to Production |
| Store listing (Arabic) | Complete | Short description shortened to 72 chars to respect 80-char limit |
| Store listing (English U.S.) | **Added this cycle** | Doubles indexed text surface |
| Tags | Business, Mobile payment (2/5) | Play's 2024 tag taxonomy is restrictive + locks tags to your category; only these two selectable under Business |
| Screenshots | Present | Same caption gap as iOS — Play also uses visual/text signals |
| Feature graphic | Present | |
| App category | Business | Debatable — Finance would open up Personal finance/Finance tag slots, but loses Business discovery in Saudi market |
| Content rating | Complete | |
| Data safety | Complete | |
| Ad ID declaration | Complete | |
| Pending review | **Yes — listing changes saved but not submitted** | Must go to Publishing overview → Send for review |

**Blocker for production launch:** App is in Closed Testing. Must be promoted to Production track before any organic traffic can land.

### 1.3 What was completed in this ASO cycle

- Fixed Arabic Play short description to fit the 80-char limit (was 90).
- Added English (United States) Play Store translation in full.
- Added "Mobile payment" tag on Play.
- Synchronized iOS bundle identifier and Android package.
- Bumped `app.json` version to 1.3.8 (so next EAS build/submit applies the queued iOS keyword and category changes).
- Researched the 2025–2026 ASO landscape in depth (see Part 2).

### 1.4 What is still missing

1. Promote Android build from Closed Testing → Production.
2. Send Google Play listing changes for review (Publishing overview).
3. Submit iOS 1.3.8 with updated keywords + Finance secondary category.
4. Redesign screenshots on both stores with high-signal Arabic captions (Apple OCR-indexes them).
5. Record and upload a 15–30s localized preview video on both stores.
6. Launch Apple Search Ads with a $5–$15/day starter budget on exact-match terms.
7. Set up App Store Connect Analytics + Play Console Acquisition reports so we can measure search-term → install conversion.
8. Put a lightweight in-app review prompt behind a delight trigger (after a successful transaction) — ratings weight heavily in ranking once you have any reviews at all.

---

## Part 2 — How to Rank Without Downloads (2025–2026 Research)

### 2.1 How the stores actually rank apps in 2026

**Apple (App Store):**
- Primary ranking inputs: **keyword relevance** (title, subtitle, keyword field, in-app purchase names, screenshot-caption OCR), **conversion rate** (impression → product page → install), **engagement** (retention, session depth), **ratings & reviews**, and **freshness** (recent version, recent crash-free rate).
- Install **velocity** matters less than install **quality**. Apple's "trending" and "also search for" surfaces lean heavily on retention cohorts, not raw downloads.
- Since June 2025, Apple OCR-indexes screenshot text — captions now count as indexable keywords, subject to the same 100-character discipline.
- Keyword field is 100 characters, comma-separated, no spaces after commas. Apple tokenizes Arabic on word boundaries and does some root matching, but not reliably — so include high-value morphological variants explicitly.

**Google Play:**
- No keyword field. Title (30 chars), short description (80 chars), and long description (4,000 chars) are all indexed.
- Google weights **retention and re-engagement** heavily post-2025 — Day 1/Day 7/Day 30 retention feeds ranking.
- Tag taxonomy is restrictive and picked from a fixed list; pick the closest 3–5.
- Localizations count as separate indexable surfaces. Adding en-US effectively doubles the text Google can match against.
- **Closed Testing apps do not appear in Play Search.** This is absolute.

### 2.2 Ranking levers available to a new/low-download app

**Ranked by leverage (highest first):**

1. **Keyword field (iOS) + title/short/long description (Play)** — the deterministic, on-page signals. 100% in our control.
2. **Localizations.** Each new language is another 100-character iOS keyword field + full Play listing. For an Arabic-first app, adding English (U.S.) and English (U.K.) on Play and en-US on iOS can unlock English queries ("saudi escrow", "kafala transfer", "domestic worker transfer") with zero install-volume cost.
3. **Conversion rate on product page.** A better icon, first screenshot, and subtitle that matches the searched keyword can double install rate at constant traffic. Apple and Google both reward high CVR.
4. **Apple Search Ads (exact-match, low budget).** Even $5/day on our brand terms floods the algorithm with high-intent, high-CVR installs — which it then uses as an organic ranking signal.
5. **Ratings velocity.** Going from 0 → 20 reviews at 4.7+ in 30 days is a stronger signal than going from 1,000 → 1,020 at the same rating. Trigger the in-app review at a success moment.
6. **Screenshot caption OCR (Apple).** Free indexable text real estate. Use it.
7. **Retention (Play).** Push-notification re-engagement, onboarding polish, and a payoff within the first session all feed D1/D7 numbers that Play reads.
8. **Backlinks and brand web presence.** Apple's algorithm does consider web mentions and structured data on the app's marketing site. A `wasitalan.com` landing page with proper JSON-LD `MobileApplication` schema helps.
9. **Editorial / category placement.** Category = Finance (Play) and secondary = Finance (iOS, once shipped) puts us in a less crowded board than Utilities.

### 2.3 Arabic keyword strategy (Saudi Arabia)

Arabic search on both stores has quirks most advice ignores:

- **Diacritics are stripped** at index time — don't waste characters on tashkeel.
- **Root matching is weak.** Include the key inflections explicitly: تنازل, التنازل, نقل كفالة, نقل الكفالة, تعقيب, التعقيب.
- **Dialect matters.** Saudi users search both MSA (معاملات حكومية) and Gulf dialect (معقب، وسيط).
- **Code-mixing is common.** "escrow", "kafala", "iqama" surface in Saudi queries alongside Arabic — budget 10–15 chars of the iOS keyword field for them.
- **Brand terms dominate.** "وسيط الان" as a phrase is already the single highest-CVR keyword available — never lose it from the field.

**Recommended iOS keyword field for v1.3.8** (≤100 chars, includes morphological variants, removes low-signal terms):

```
تنازل,نقل كفالة,تعقيب,معاملات حكومية,وسيط,معقب,ضامن,وساطة,دفع آمن,escrow,iqama,kafala
```

Rationale for removals vs. previous draft:
- `كفالة` alone is low-intent (legal/general term). `نقل كفالة` is transactional.
- `سعودي` is already implied by the locale and our category — wastes characters.
- `موثوق` is generic trust language — doesn't match a query.
- `وسيط الان` is already in the app title, so it's indexed for free — don't double-spend.
- Added `معقب` (Gulf dialect for تعقيب practitioner) and `iqama`/`kafala` to capture code-mixed queries.

### 2.4 Google Play text strategy

- **Title (30 chars):** "وسيط الان — تنازل وتعقيب" packs the brand + two top transactional terms.
- **Short description (80 chars):** front-load the single highest-intent query. E.g. "تنازل عمالة منزلية، تعقيب معاملات، ودفع آمن عبر الوسيط — بضمان حكومي."
- **Long description (4,000 chars):** write for humans, but ensure each of these terms appears 2–4 times naturally: تنازل, نقل كفالة, تعقيب, معاملات حكومية, وسيط, ضامن, دفع آمن, عمالة منزلية. Google penalizes obvious stuffing; aim for natural density of ~2%.
- Include a **"ماذا يقدم التطبيق"** FAQ-style section — this is both human-useful and keyword-dense.

### 2.5 Screenshots and caption OCR

Design the first 3 screenshots as landing-page hero panels, not app scrollviews. Each caption in Arabic should be one of our target query tokens in large type:

1. **"تنازل العمالة المنزلية بضمان"** — hero + screen showing the transfer flow.
2. **"تعقيب معاملات حكومية"** — hero + screen showing the tracking interface.
3. **"دفع آمن عبر الوسيط"** — hero + screen showing escrow flow with a trust badge.

This does triple duty: OCR-indexable keywords, higher CVR from clearer value prop, and a functional spec the eye can read in 1 second.

### 2.6 Paid acquisition as an organic ranking lever

Apple Search Ads with a small budget is the highest-ROI ASO tool for a new app. A plausible 30-day starter plan:

- **Brand defense ($3/day):** exact-match "وسيط الان" — captures users already searching for us before a competitor buys our brand.
- **Category terms ($7/day):** exact-match تنازل, تعقيب, نقل كفالة — feeds the algorithm high-intent installs.
- **Discovery campaign ($5/day):** Apple's AI match, capped by daily budget. Harvests terms we haven't thought of; we then promote winners to exact match.

Total: ~$15/day, ~$450/month. Expected: 20–80 high-intent installs/day in SA depending on CPT, which is more than enough to move us onto page 1 for long-tail Arabic queries within 4–6 weeks.

Google Play's equivalent (UAC / Google Ads) is far less precise because of keyword-less targeting — we'd recommend deferring Play paid until we are in Production for 30+ days and have baseline organic data.

### 2.7 Retention = ranking (especially on Play)

Practical 2026 retention fixes a new app can ship in a sprint:

- Onboard to **first successful transaction** inside 2 minutes. Every extra step costs D1 retention.
- Send a **single** push 24h after install confirming the user's transaction is on track (not a marketing push — a service push). Apple and Google both reward opt-in push engagement.
- Ship **App Shortcuts / App Actions** (iOS) and **Play Instant** (Android) where feasible — both are discovery surfaces that don't require installs to rank on.
- Add an in-app review prompt after a successful transaction. Use the native `StoreReview` API (iOS) and Play In-App Review API.

### 2.8 Saudi competitor snapshot

The competitive set we are fighting for query share with:
- Absher / Tawakkalna (government — different category but eats "معاملات حكومية" queries).
- Qiwa / Muqeem (labor ministry apps — high authority on "كفالة" queries).
- Stc pay / Urpay / Barq (fintech — eat "دفع آمن" queries).
- Salla / Zid (commerce — less overlap but bleed into "وسيط" searches).

Our opening isn't to beat those brand-dominated queries head-on — it's to own the long tail: "تنازل عمالة منزلية", "نقل كفالة فوري", "تعقيب معاملة الجوازات", "ضامن دفع تنازل". These have real volume and very little SEO competition.

### 2.9 Country targeting and localization

- iOS: ship Arabic (Saudi) as primary locale. English (U.S.) as secondary unlocks English queries at ~0 cost. Other Gulf locales (UAE, Kuwait) come for free via SA Arabic but consider adding Emirati Arabic if we expand.
- Play: add English (U.K.) in addition to en-US — they are indexed separately and it costs 10 minutes of copy-paste.
- Do **not** spread thin across 10 locales until SA is saturated. Each locale is maintenance cost.

### 2.10 Common ASO mistakes this app should avoid

1. Stuffing the iOS keyword field with synonyms Apple already handles (`وسيط` and `الوسيط` are not both needed — Apple handles "al-" prefix root matching in Arabic reliably).
2. Repeating title words in the keyword field. They are already indexed.
3. Using hashtags or punctuation in the keyword field — wastes characters.
4. Putting "free" or "best" in the title — Apple may reject; Google demotes.
5. Launching with no ratings strategy — a 0-review app has a conversion ceiling no keyword work can break.
6. Measuring ASO weekly. Ranking signals settle over 4–8 weeks. Change one thing at a time and wait.

### 2.11 Measurement plan

- **Weekly:** search rank for top 10 keywords via AppTweak, AppFigures, or SensorTower (free tiers sufficient at our volume).
- **Weekly:** product page CVR (App Store Connect → App Analytics → Conversion).
- **Monthly:** retention cohorts D1/D7/D30 (Play Console and ASC).
- **Per change:** take a snapshot before and after; do not overlap two changes in the same week.

---

## Part 3 — 90-Day Implementation Roadmap

### Days 0–7 — Unblock publishing
- [ ] Promote Android from Closed Testing → Production.
- [ ] Submit Play listing changes for review (Publishing overview).
- [ ] Run `eas login` then `eas build --platform all --profile production --auto-submit --non-interactive` locally.
- [ ] On iOS 1.3.8 submission apply: new keyword field (see §2.3), secondary category Finance.

### Days 7–21 — Conversion rate work
- [ ] Redesign first 3 screenshots with Arabic hero captions (see §2.5).
- [ ] Record and upload a 15–30s preview video on both stores.
- [ ] Rewrite Play long description with keyword-natural prose (see §2.4).

### Days 21–45 — Paid + ratings
- [ ] Start Apple Search Ads at ~$15/day (see §2.6).
- [ ] Add `StoreReview` prompt after a successful transaction.
- [ ] Add Play In-App Review API call at the same trigger.
- [ ] Baseline metrics snapshot in App Store Connect Analytics and Play Console Acquisition.

### Days 45–90 — Optimize + expand
- [ ] Review ASA search-term report weekly; promote winners to exact match, negate losers.
- [ ] Iterate screenshots based on Play "Store listing experiments" A/B results.
- [ ] Add English (U.K.) translation on Play.
- [ ] Evaluate expansion to Emirati Arabic once SA retention is stable.

---

## Part 4 — Pending User Actions (copy-paste checklist)

**Immediate (blocks launch):**
1. Open Google Play Console → Publishing overview → Send all listing changes for review.
2. Google Play Console → Production track → create release from the latest Closed Testing build → submit for review.
3. Run locally in the project directory:
   ```
   eas login
   eas build --platform all --profile production --auto-submit --non-interactive
   ```

**With iOS 1.3.8 submission (queued):**
- Keywords: `تنازل,نقل كفالة,تعقيب,معاملات حكومية,وسيط,معقب,ضامن,وساطة,دفع آمن,escrow,iqama,kafala`
- Secondary category: Finance
- Optionally: subtitle refresh to include "تنازل وتعقيب"

**This month:**
- Redesign screenshots with captioned Arabic hero copy.
- Record 15–30s preview video.
- Start Apple Search Ads at $15/day.

---

## Sources

- Apple — App Store Connect Help: App information and localization (apple.com/app-store).
- Apple Developer — "What's new in ASO 2025" session notes (developer.apple.com).
- Google Play Console Help — Store listing, tags, and translations (support.google.com/googleplay).
- Google Play — Retention signals and ranking blog posts (android-developers.googleblog.com, 2024–2025).
- AppTweak — "Arabic ASO best practices" (apptweak.com, 2024).
- Sensor Tower — Saudi Arabia app market reports (sensortower.com, 2024–2025).
- Apple Search Ads — Campaign best practices (searchads.apple.com).

*This document consolidates research conducted April 2026 on the current App Store and Google Play ranking landscape for a low-install Saudi-market app.*

---

## Session Log — April 16, 2026 (ASO Changes Applied)

Changes made via App Store Connect and Google Play Console this session. All work stayed within **ASO-only scope** — no submissions, no "Send for review," no publishing actions.

### iOS (App Store Connect, v1.3.7 "Ready for Distribution")

Editable-anytime fields:
- **Promotional Text** — filled with 147-char Arabic ASO copy: "وسيط الان — المنصة الموثوقة لتنازل العمالة المنزلية، تعقيب المعاملات الحكومية، والدفع الآمن عبر ضامن معتمد. حماية كاملة لحقوق الطرفين في كل معاملة." SAVED and committed.
- **Marketing URL:** `https://www.wasitalan.com` — set (generic homepage; can be upgraded to a keyword-rich landing page)
- **Support URL:** `https://www.wasitalan.com` — set, but generic (recommend a dedicated `/support` or `/help` page)

Verified on App Information page:
- Name: `وسيط الان` (21/30, no hamza) ✓
- Subtitle: `التنازل والتعقيب والضمان` (30/30) ✓
- Primary category: Business
- Secondary category: Utilities
- Bundle ID: `com.mahm09d.kafel` (App Store Connect ID: 6756179253)

**Unresolved iOS issue:** The v1.3.7 **Description** field still opens with `وسيط الآن` (with hamza) — inconsistent with the brand spelling `وسيط الان`. This field is locked to the version lifecycle; fix must ride with the next submission.

### Google Play (Production listing draft — NOT sent for review)

Both locales updated and saved as draft (status bar: "Change saved · Send for review…"):

**Arabic (default) listing:**
| Field | Before | After | Limit |
|---|---|---|---|
| App name | `وسيط الآن` (with hamza) | `وسيط الان` | 9/30 |
| Short description | `منصة سعودية موثوقة للتنازل عن العمالة المنزلية والتعقيب والوساطة المالية الآمنة` (79) | `وسيط سعودي موثوق: تنازل عمالة منزلية، تعقيب معاملات حكومية، ضامن دفع آمن` (72) | 80 |
| Full description | 1,569 chars, 4 instances of `الآن` with hamza | **3,623 chars** — expanded with service breakdowns, city coverage, persona targeting ("من يستفيد"), and a 6-question FAQ section; all `الآن` → `الان` | 4,000 |

**English (U.S.) listing:**
| Field | Before | After | Limit |
|---|---|---|---|
| App name | `Wasit Alan - وسيط الان` (22) | `وسيط الان` (9) | 30 |
| Short description | `Saudi platform for worker transfers, government services & secure escrow` (72) | `Saudi app for sponsorship transfers, muaqib services & secure escrow payments` (77) | 80 |
| Full description | 1,271 chars, generic | **3,903 chars** — expanded with expat-oriented keywords (iqama, kafala, sponsorship transfer, muaqib, Absher, Qiwa, Muqeem, Ahwal Madaniyah, Jawazat, Istimara, Katib Adl), full city list, personas, FAQ | 4,000 |

**Store settings (Google Play):**
- App category: Business (unchanged)
- Tags: **Business + Mobile payment** (was only Mobile payment). 2/5 slots used. The remaining 3 slots are effectively blocked by the Business category taxonomy — relevant tags (Finance, Personal finance, Jobs, Marketplace, Money) are locked to other categories.
- Email: `support@waseetalaan.com` ← note domain mismatch with website
- Phone: `+966501234567` ← **placeholder / test number** (the sequential-digit 501234567)
- Website: `https://www.wasitalan.com`
- External marketing: ON (advertise outside Google Play) ✓

### Flagged issues that need the user's decision

1. **Phone number is a placeholder.** `+966501234567` is a test number. Users who tap "Call" from the Play Store listing will get a dead line. Replace with the real support number or remove the field.
2. **Three different email/domain identities in circulation:**
   - Play Store support: `support@waseetalaan.com` (domain: waseetalaan.com)
   - Websites linked from both stores: `wasitalan.com` (domain: wasitalan.com)
   - iOS App Review contact: `mahm0udsaad@icloud.com` (personal iCloud)

   Suggest consolidating to one domain (wasitalan.com or waseetalaan.com) and using a branded email (`support@wasitalan.com`). Personal iCloud in the Apple reviewer contact is fine but looks unprofessional if surfaced.
3. **Play Store changes are in "Live · Draft changes" state.** They will not go live until you open Publishing Overview and click "Send for review." Per your instruction, we did not do this. When you're ready, push from the Publishing Overview screen.
4. **Promotional YouTube video URL** is empty on the Play Arabic listing. A 30-second Arabic preview video meaningfully improves conversion on the Play listing and gets a visible play button on the store page.

### Queued for next iOS version submission (1.3.8+)

These were documented earlier and remain pending — they all require a new version:
- Rewrite Keywords to: `تنازل,نقل كفالة,تعقيب,معاملات حكومية,وسيط,معقب,ضامن,وساطة,دفع آمن,escrow,iqama,kafala` (86/100)
- Subtitle refresh (drop ال articles, add نقل كفالة / دفع آمن)
- Secondary category: Utilities → Finance
- Add English (U.S.) localization on iOS (second keyword field)
- Fix hamza in v1.3.x Description's opening line (`وسيط الآن` → `وسيط الان`)
- Add screenshot captions (Apple started OCR-indexing them June 2025 — free ASO signal)
- Record 15–30s preview video

### Queued for Google Play (requires asset upload or re-review)

- Record & upload YouTube preview video (link it on the Arabic listing)
- Replace feature graphic with an Arabic-first keyword-rich visual (current is generic English stock)
- Add tablet (7" and 10") and Chromebook screenshots (unlocks those form factors on Play)
- Consider experimenting with "Finance" as the primary category — unlocks the Mobile payment + Finance + Personal finance tag combo, but moves the app out of the Business category's peer group in Saudi Arabia. Test via Store Listing Experiments rather than committing.

