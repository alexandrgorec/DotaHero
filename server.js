const fs = require("fs");
const path = require("path");
const express = require("express");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(__dirname, ".env"));

const app = express();
const PORT = Number.parseInt(process.env.PORT, 10) || 2500;
const DATA_FILE = path.join(__dirname, "data", "heroes.json");
const PUBLIC_DIR = path.join(__dirname, "public");

function loadHeroes() {
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  const heroes = JSON.parse(raw);

  if (!Array.isArray(heroes)) {
    throw new Error("heroes.json must contain an array");
  }

  return heroes;
}

app.use("/assets", express.static(path.join(PUBLIC_DIR, "assets")));
app.use(express.static(PUBLIC_DIR));

app.get("/api/heroes", (_req, res) => {
  try {
    const heroes = loadHeroes();
    res.json(heroes);
  } catch (error) {
    res.status(500).json({
      error: "Failed to load hero data.",
      details: error.message
    });
  }
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DotaHero server is running on http://localhost:${PORT}`);
  });
}

module.exports = {
  app,
  loadHeroes
};
