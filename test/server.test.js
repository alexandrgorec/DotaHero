const http = require("http");
const test = require("node:test");
const assert = require("node:assert/strict");

const { app } = require("../server");

let server;

test.before(async () => {
  server = http.createServer(app);

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
});

test("GET /api/heroes returns a non-empty hero list", async () => {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/heroes`);
  assert.equal(response.status, 200);

  const heroes = await response.json();
  assert.ok(Array.isArray(heroes));
  assert.ok(heroes.length > 0);

  for (const hero of heroes) {
    assert.equal(typeof hero.id, "string");
    assert.ok(hero.id.length > 0);
    assert.equal(typeof hero.nameRu, "string");
    assert.ok(hero.nameRu.length > 0);
    assert.equal(typeof hero.image, "string");
    assert.ok(hero.image.startsWith("/assets/heroes/"));
    assert.ok(Array.isArray(hero.abilities));

    for (const ability of hero.abilities) {
      assert.equal(typeof ability.id, "string");
      assert.ok(ability.id.length > 0);
      assert.equal(typeof ability.name, "string");
      assert.ok(ability.name.length > 0);
      assert.equal(typeof ability.image, "string");
      assert.ok(ability.image.startsWith("/assets/abilities/"));
    }
  }
});

test("GET / returns the main page", async () => {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/`);
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Все герои/);
  assert.match(html, /Рандом/);
});
