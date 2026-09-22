# Recommended Places and Image Confidence Fix

## Stable identifiers and favourites

Recommended Places retain `json-{jsonId}` as their stable Module 03 item ID. A
favourite stores the external `placeId` when one is available, but keeps the
stable item ID for favourite-state and removal operations. Place details also
accept `json-*` identifiers so favourites created before this change remain
usable without a database migration.

The detail resolver first reads the authoritative MOTAC record. It may enrich
an incomplete record through the existing Geoapify search client, but a failed
or inconclusive external lookup does not prevent the official name, address,
phone number, quality award, and available coordinates from being displayed.

## Official-place enrichment

A full manual quality-rating sync searches Geoapify for records missing a
provider ID, standard fields, or coordinates. Candidates must represent a
specific entity and must have a distinctive company-name match supported by
address overlap or provider confidence. Rejected or unavailable Geoapify
matches fall back to the existing Nominatim address geocoder for coordinates.

The existing nullable D1 columns hold all enrichment data. Sample sync and the
server-side daily scrape do not perform enrichment, so they do not add external
API usage. D1 upsert `COALESCE` semantics preserve earlier enrichment.

## Conservative image selection

Image cache namespace v6 invalidates v5 decisions. Wikimedia candidates are
rejected when their titles identify portraits, selfies, ceremonies, group
photos, or other known non-place media. Generic venue terms such as `club`,
`golf`, `hotel`, and `resort` cannot establish relevance by themselves.

Wikivoyage and Wikipedia rank candidates by distinctive matches in both the
article title and file name. Commons geosearch uses 300 m and 1,000 m stages and
never falls back to an arbitrary nearby image. Coordinate-based Commons and
Mapillary lookup runs only when the place has a trusted external identifier.
When no candidate meets these rules, the UI intentionally displays its existing
no-image placeholder.

## Sync result fields

`QualityRatingSyncResult` now reports `geoapifyEnriched` and
`nominatimFallback` in addition to `newlyGeocoded`, `failed`, and the existing
scrape statistics. Failures remain per-record and do not abort the full sync.
