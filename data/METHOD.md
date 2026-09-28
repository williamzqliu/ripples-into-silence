# Data and method

The source is the user-supplied IOM Missing Migrants Project CSV, received September 2026. Its dates cover 2014-01-02 through 2025-12-31. This is not a claim that the snapshot is the latest IOM release or that reporting is complete.

Run `python scripts/build_data.py` to reproduce the sample and summary. The SHA-256 of the source is stored in summary.json. The previous website CSV remains in archive/.

The sample retains unique Main IDs dated 2014–2025 whose supplied coordinates fall within 50 km of (35.5086, 12.5929), using a haversine distance and a 6,371 km Earth radius. This is distance to a reference point, not nearest coastline or a visibility threshold. Different Main IDs at the same date and coordinates remain separate. Main IDs are records, not boat counts.

Coordinates can represent incidents, rescues, discoveries of remains or arrivals. Original location descriptions are retained in tooltips. Four known location discrepancies have explicit notes; these are examples identified during review, not an exhaustive certification of every coordinate. No coordinates are silently corrected or excluded to force a narrative.

Blank component fields remain blank in the CSV. Numeric aggregation uses reported values and is checked against the combined total. Blank is not a confirmed zero. The final dot chart expands every record into its combined death and missing count, producing 833 person marks. Each person retains its source Main ID. Cause groups describe the cause field of the associated record, not individually confirmed causes for every missing person. Exact single-category matches are checked before grouping multiple causes; multi-cause records form one mutually exclusive group.

The 95 records sum to 833 reported dead or missing: 199 in the death field and 634 in the missing field. Changes from the former 94-row / 703-person sample include merged split rows, historical source changes, additional records, and the addition of 2025. This is a versioned source replacement, not simply deduplication.

Radial direction and inward motion are editorial devices, not reconstructed journeys. Size uses a shared square-root scale with a minimum visible radius, not an exact proportional-area claim. Chronological playback pauses on the opening three records for reading, then uses a uniform date scale. Annual counts describe this coordinate-selected sample, not mortality risk, all journeys or completeness of reporting.

## Annual discs to people

The final scene shares a sticky container with the twelve annual discs. Source positions are measured from each record's rendered SVG mark. Each record expands into its own number of person marks, then moves to a cause group. The scroll state determines every position, so reversing scroll restores the annual layout. The final groups are Drowning 689; Mixed or unknown 56; Hazardous transport 35; Multiple reported causes 29; Harsh conditions / lack of essentials 15; Sickness / lack of healthcare 7; Accidental death 2. They sum to 833. Reduced-motion mode uses a direct change to the grouped state. Arrival counts are not part of this transition.
