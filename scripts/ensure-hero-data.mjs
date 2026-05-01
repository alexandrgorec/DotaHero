import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { main as syncHeroes } from "./sync-heroes.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const heroesFile = path.join(rootDir, "data", "heroes.json");
const heroesDir = path.join(rootDir, "public", "assets", "heroes");
const abilitiesDir = path.join(rootDir, "public", "assets", "abilities");

async function fileCount(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).length;
  } catch {
    return 0;
  }
}

async function readHeroes() {
  try {
    const raw = await fs.readFile(heroesFile, "utf-8");
    const heroes = JSON.parse(raw);
    return Array.isArray(heroes) ? heroes : [];
  } catch {
    return [];
  }
}

async function collectStats() {
  const heroes = await readHeroes();
  const heroesWithAbilities = heroes.filter((hero) => Array.isArray(hero.abilities) && hero.abilities.length > 0).length;
  const [heroImageCount, abilityImageCount] = await Promise.all([fileCount(heroesDir), fileCount(abilitiesDir)]);

  return {
    heroesCount: heroes.length,
    heroesWithAbilities,
    heroImageCount,
    abilityImageCount
  };
}

function dataIsComplete(stats) {
  return (
    stats.heroesCount > 0 &&
    stats.heroesWithAbilities > 0 &&
    stats.heroImageCount >= stats.heroesCount &&
    stats.abilityImageCount > 0
  );
}

function printStats(label, stats) {
  console.log(
    `${label}: heroes=${stats.heroesCount}, heroesWithAbilities=${stats.heroesWithAbilities}, heroImages=${stats.heroImageCount}, abilityImages=${stats.abilityImageCount}`
  );
}

async function ensureData() {
  const before = await collectStats();
  printStats("Current data", before);

  if (dataIsComplete(before)) {
    console.log("Hero data already present, skipping sync.");
    return;
  }

  console.log("Hero data or ability assets are missing. Running sync...");
  await syncHeroes();

  const after = await collectStats();
  printStats("After sync", after);

  if (!dataIsComplete(after)) {
    throw new Error(
      "Hero data is still incomplete after sync. Verify that the latest sync script is deployed and outbound network to data sources is available."
    );
  }
}

try {
  await ensureData();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
