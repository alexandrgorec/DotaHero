import fs from "fs/promises";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const publicHeroesDir = path.join(rootDir, "public", "assets", "heroes");
const publicAbilitiesDir = path.join(rootDir, "public", "assets", "abilities");
const heroesFile = path.join(dataDir, "heroes.json");

const HERO_LIST_URLS = {
  english: "https://www.dota2.com/datafeed/herolist?language=english",
  russian: "https://www.dota2.com/datafeed/herolist?language=russian"
};

const HERO_STATS_URL = "https://api.opendota.com/api/heroStats";
const HERO_ABILITIES_URL = "https://unpkg.com/dotaconstants@latest/build/hero_abilities.json";
const ABILITIES_URL = "https://unpkg.com/dotaconstants@latest/build/abilities.json";
const IMAGE_HOST = "https://cdn.cloudflare.steamstatic.com";

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function requestBuffer(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      const { statusCode = 0, headers } = response;

      if (statusCode >= 300 && statusCode < 400 && headers.location) {
        response.resume();
        resolve(requestBuffer(new URL(headers.location, url).toString()));
        return;
      }

      if (statusCode !== 200) {
        response.resume();
        const error = new Error(`Request failed for ${url}: ${statusCode}`);
        error.statusCode = statusCode;
        reject(error);
        return;
      }

      const chunks = [];

      response.on("data", (chunk) => {
        chunks.push(chunk);
      });

      response.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
    });

    request.setTimeout(60_000, () => {
      request.destroy(new Error(`Request timeout for ${url}`));
    });

    request.on("error", reject);
  });
}

async function fetchJson(url) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const buffer = await requestBuffer(url);
      return JSON.parse(buffer.toString("utf-8"));
    } catch (error) {
      if (attempt === 3) {
        throw error;
      }

      await sleep(400 * attempt);
    }
  }
}

function toSlug(heroName) {
  return heroName.replace(/^npc_dota_hero_/, "");
}

async function downloadAsset(outputPath, remoteImagePath) {
  const normalizedRemotePath = remoteImagePath.replace(/\?$/, "");

  try {
    await fs.access(outputPath);
    return;
  } catch {
    // File is missing, continue with download.
  }

  const imageUrl = `${IMAGE_HOST}${normalizedRemotePath}`;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const buffer = await requestBuffer(imageUrl);
      await fs.writeFile(outputPath, buffer);
      return true;
    } catch (error) {
      if (error.statusCode === 404) {
        return false;
      }

      if (attempt === 4) {
        throw error;
      }

      await sleep(500 * attempt);
    }
  }
}

async function downloadHeroImage(slug, remoteImagePath) {
  const outputPath = path.join(publicHeroesDir, `${slug}.png`);
  return downloadAsset(outputPath, remoteImagePath);
}

async function downloadAbilityImage(abilityId, remoteImagePath) {
  const outputPath = path.join(publicAbilitiesDir, `${abilityId}.png`);
  return downloadAsset(outputPath, remoteImagePath);
}

async function main() {
  await ensureDir(dataDir);
  await ensureDir(publicHeroesDir);
  await ensureDir(publicAbilitiesDir);

  const [englishPayload, russianPayload, heroStats, heroAbilitiesMap, abilitiesMap] = await Promise.all([
    fetchJson(HERO_LIST_URLS.english),
    fetchJson(HERO_LIST_URLS.russian),
    fetchJson(HERO_STATS_URL),
    fetchJson(HERO_ABILITIES_URL),
    fetchJson(ABILITIES_URL)
  ]);

  const englishHeroes = englishPayload?.result?.data?.heroes ?? [];
  const russianHeroes = russianPayload?.result?.data?.heroes ?? [];

  if (!englishHeroes.length || !russianHeroes.length) {
    throw new Error("Received empty hero list from official Dota 2 datafeed");
  }

  const russianById = new Map(russianHeroes.map((hero) => [hero.id, hero]));
  const heroStatsByName = new Map(heroStats.map((hero) => [hero.name, hero]));

  const abilitiesToDownload = new Map();
  const availableAbilityIds = new Set();

  for (const hero of englishHeroes) {
    const slug = toSlug(hero.name);
    const heroStat = heroStatsByName.get(hero.name);
    const heroAbilities = heroAbilitiesMap[hero.name]?.abilities ?? [];

    await downloadHeroImage(slug, heroStat.img);

    for (const abilityId of heroAbilities) {
      if (!abilityId || abilityId === "generic_hidden") {
        continue;
      }

      const abilityData = abilitiesMap[abilityId];

      if (!abilityData?.img) {
        continue;
      }

      abilitiesToDownload.set(abilityId, abilityData.img);
    }
  }

  for (const [abilityId, abilityImage] of abilitiesToDownload) {
    const downloaded = await downloadAbilityImage(abilityId, abilityImage);

    if (downloaded) {
      availableAbilityIds.add(abilityId);
    }
  }

  const heroes = englishHeroes
    .map((hero) => {
      const slug = toSlug(hero.name);
      const russianHero = russianById.get(hero.id);
      const heroStat = heroStatsByName.get(hero.name);
      const heroAbilities = heroAbilitiesMap[hero.name]?.abilities ?? [];

      if (!heroStat?.img) {
        throw new Error(`Missing image metadata for ${hero.name}`);
      }

      const abilities = heroAbilities
        .filter((abilityId) => abilityId && abilityId !== "generic_hidden" && availableAbilityIds.has(abilityId))
        .map((abilityId) => {
          const abilityData = abilitiesMap[abilityId];

          return {
            id: abilityId,
            name: abilityData.dname || abilityId,
            image: `/assets/abilities/${abilityId}.png`
          };
        });

      return {
        id: slug,
        nameRu: russianHero?.name_loc || hero.name_loc,
        image: `/assets/heroes/${slug}.png`,
        abilities
      };
    })
    .sort((left, right) => left.nameRu.localeCompare(right.nameRu, "ru"));

  await fs.writeFile(heroesFile, JSON.stringify(heroes, null, 2) + "\n", "utf-8");
  console.log(`Saved ${heroes.length} heroes to ${heroesFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
