# GitHub Location Experiment — Derived Analysis (2026-09-12)

Derived from `github-1000-unique-events.json`, `github-1000-unique-user-locations.json`,
and `github-1000-unique-location-frequency.csv` in this directory. All counts below
were computed from the raw files; the raw files themselves are the source of record.

## Verified dataset totals

| Metric | Value | Method |
|---|---|---|
| Unique event IDs | **1000** | `"id"` field deduped |
| Unique actor logins | **927** | `"actor.login"` in events |
| Profile records | **723** | `Username` entries in profiles file |
| Profiles with non-empty location | **166** (23.0%) | `Location` non-null |
| Profiles with null/empty location | **557** (77.0%) | `Location: null` |
| Unique raw location strings | **144** | frequency CSV rows |

Note: profiles (723) < actors (927): some profiles were unavailable/failed during
collection. Missing locations are valid source data, not a failure.

## Classification of the 166 located profiles

Classification assumptions (documented, deterministic):
- **Country-only**: matches a known country/demonym name, optionally with a country
  code (USA, NZ, UK, México, UAE) — no city part.
- **City-like**: the leading segment before a comma/dash names a real city, with or
  without region/country qualifiers. Non-Latin CJK city names counted as cities
  (中国, 广州) but are not usable for the Latin-script resolver without transliteration.
- **Region/state/province-like**: leading segment is a first-level region (NSW,
  Tamil Nadu, Zhejiang, Kentucky, Europe) — NOT a city.
- **Institution/company-like**: contains an institution, company, campus, or
  non-geographic entity (IIT BHU, The Cyan hill, Cloud, ~, mojibake strings).
- **Invalid/junk**: mojibake/encoding-damaged strings, placeholders (~), timezone
  annotations (Guam (UTC+10)), continent references (Europe).

Approximate distribution (some strings are borderline; classified conservatively):

| Category | Strings | Profiles (approx) |
|---|---|---|
| City-like (resolvable with curated catalog) | 78 | ~92 |
| Country-only | 33 | ~42 |
| Region/state/province-like | 12 | ~13 |
| Institution/company-like | 4 | ~4 |
| Invalid/junk (incl. mojibake, continents) | 17 | ~15 |

Multi-city strings (`London / San Francisco`, `Japan - Tokyo and Tochigi`) are
treated as AMBIGUOUS-by-construction; the resolver must not guess.

## Resolution against the 12-city catalog (pre-expansion)

Strings the current catalog resolves: `San Francisco`(+2), `sf` (alias), `London`,
`Tokyo, Japan`, `New York, New York`, `New York`, `Singapore`, `Paris, France`,
`Toronto, ON`, `Montreal`(+2), `Montréal` (diacritics), `Berlin`(+3) →
roughly **14–18 of 166 located profiles (~9–11%)**; ~2% of all 723 profiles.

## High-value cities observed but MISSING from the catalog

(Frequency >=2 first; all verified real cities with authoritative coordinates.)

Frequency >= 2: **Barcelona (2), Madrid (2), Chennai (3 via variants)**.
Frequency 1 (major global hubs / notable tech cities): New Delhi, Seoul, Shanghai (2
via variants), Guangzhou (2), Wuhan, Hangzhou, Jakarta, Bangkok (Chiang Mai is
distinct), Manila (via Philippines — country-only, excluded), Istanbul, Moscow,
Bucharest, Warsaw, Wrocław, Stockholm, Lisbon, Porto, Lyon, Málaga, Girona,
A Coruña, Zurich, Munich, Amsterdam-present, The Hague, Groningen, Poznan, Riga,
Dublin (not observed), Tel Aviv, Dubai (Abu Dhabi observed), Dhaka, Pune (2 via
variants), Jaipur, Rajkot (2), Visakhapatnam, Coimbatore, Buenos Aires, Lima,
São Paulo-present, Mexico City (México is country-only), Taipei, Ho Chi Minh City,
Karachi/Lahore (not observed), Nairobi (not observed), Lagos (Ibadan observed),
Cairo (Minia observed), Sydney-present, Melbourne (not observed), Auckland (NZ is
country-only), Ottawa, Seattle, Chicago, Atlanta, Dallas, Los Angeles, Boston
(Cambridge, MA adjacent), Washington DC, Pittsburgh, Columbus, Charlotte.

## Country-only strings (must NOT become cities)

India, Japan, France, Philippines, Norway, Indonesia, The Netherlands, Netherlands,
Brazil, Russia, China/CHINA/中国, Czech Republic, Sri Lanka, Bulgaria, Vietnam,
Egypt, Iran, Sweden, Switzerland, Poland, Italy, United Kingdom, Portugal, USA,
NZ/New Zealand, México, United Arab Emirates, Guatemala, Taiwan variants, Europe
(continent). Existing product contract visualizes **city-level** locations only;
country-only strings remain unresolved (counted globally, never plotted) per
DATA_CONTRACT/ADR-005.

## Catalog expansion recommendation (implemented in this change)

Evidence bar: add a city if it (a) appears in the sample, AND (b) is a major
tech hub or significant regional center, AND (c) has authoritative coordinates.
Borderline singletons without hub status were not added. See
`apps/backend/src/enrichment/locationCatalog.ts` for the implemented set.
