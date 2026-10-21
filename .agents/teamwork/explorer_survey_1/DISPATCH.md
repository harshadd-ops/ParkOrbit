# Survey Explorer 1 Dispatch

Focus: Data layer, mock database (`data/parkorbit-db.json`), seed scripts/data, models, types, API routes/actions, and test suite (`tests/marketplace.test.ts`).
Document all non-Pune data references, schema definitions, and what needs to change for complete Pune localization and test verification.

## 2026-10-19T16:21:48Z
Conduct a comprehensive exploration of the data and testing layer of ParkOrbit:
1. Inspect `data/parkorbit-db.json`, `src/lib/` (types, storage, seed scripts, db utilities), and all locations where seed data, mock listings, users, bookings, and reviews are defined.
2. Identify all references to non-Pune locations (Bengaluru, Mumbai, Delhi, etc.) across the database, seed files, and types.
3. Check the exact schema and data structures for User (role, persona), Listing (coordinates, address, neighborhood, pricePerHour, pricePerDay, hostId, etc.), Booking, and Review.
4. Inspect `tests/marketplace.test.ts` and package.json test scripts to see what tests currently exist, how they run, and what tests need to be updated or added for Pune localization and Host->Driver demo flow.
5. Provide a concrete inventory of files that must be updated, specific Pune seed accounts and listings to create, and test verification requirements.
