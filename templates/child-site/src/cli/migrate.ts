import { runMigrations } from "@/lib/db";

const applied = runMigrations();

if (applied.length) {
  console.log(`Applied migrations: ${applied.join(", ")}`);
} else {
  console.log("Migrations already current.");
}
