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

async function dataIsComplete() {
  try {
    const raw = await fs.readFile(heroesFile, "utf-8");
    const heroes = JSON.parse(raw);

    if (!Array.isArray(heroes) || heroes.length === 0) {
      return false;
    }

    const hasAbilitiesInData = heroes.some((hero) => Array.isArray(hero.abilities) && hero.abilities.length > 0);

    if (!hasAbilitiesInData) {
      return false;
    }

    const [heroImageCount, abilityImageCount] = await Promise.all([
      fileCount(heroesDir),
      fileCount(abilitiesDir)
    ]);

    return heroImageCount >= heroes.length && abilityImageCount > 0;
  } catch {
    return false;
  }
}

if (await dataIsComplete()) {
  console.log("Hero data already present, skipping sync.");
} else {
  console.log("Hero data or ability assets are missing. Running sync...");
  await syncHeroes();
}
