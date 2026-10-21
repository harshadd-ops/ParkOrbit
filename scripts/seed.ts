import { writeDb } from "../src/lib/db";
import { createInitialSeedData } from "../src/lib/seed";

function runSeed() {
  const seedData = createInitialSeedData();
  writeDb(seedData);
  console.log(`[ParkOrbit] Database successfully seeded with 100% Pune data:`);
  console.log(
    ` - ${seedData.users.length} Demo Users (${seedData.users.map((u) => u.name).join(", ")})`
  );
  console.log(` - ${seedData.listings.length} Pune Listings`);
  console.log(` - ${seedData.bookings.length} Sample Bookings`);
  console.log(` - Destination: data/parkorbit-db.json`);
}

runSeed();
