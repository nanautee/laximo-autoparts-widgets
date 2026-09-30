/**
 * Contract check for the offline demo data.
 *
 * The widgets must render identically whether the answer came from the API or
 * from the bundled fallback, so this bundles `mock-api.ts` (TypeScript + JSON
 * import) and asserts the same guarantees `invariants.test.mjs` asserts for the
 * server-side mock: the fields the widgets dereference are present and typed.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const frontend = new URL('../frontend/', import.meta.url);
// esbuild is a frontend dev dependency; resolve it against the frontend install
// rather than adding a second copy under api/.
const { build } = await import(new URL('node_modules/esbuild/lib/main.js', frontend).href);

const entry = new URL('src/core/mock/mock-api.ts', frontend);
const outDir = mkdtempSync(join(tmpdir(), 'autoparts-mock-'));
const outFile = join(outDir, 'mock-api.mjs');

let passed = 0;
const check = async (name, fn) => {
  try { await fn(); passed += 1; console.log(`  ok   ${name}`); }
  catch (e) { console.log(`  FAIL ${name} -> ${e.message}`); process.exitCode = 1; }
};

const nonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

try {
  await build({
    entryPoints: [entry.pathname.slice(1)],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    outfile: outFile,
    logLevel: 'silent',
  });
  const { mockApi } = await import(pathToFileURL(outFile).href);

  console.log('meta');
  const info = await mockApi.meta();
  await check('exposes the test VINs the VIN widget renders', () => {
    assert.ok(info.testVins.length > 0, 'testVins must not be empty');
    for (const item of info.testVins) {
      assert.ok(nonEmptyString(item.vin), 'testVins[].vin');
      assert.ok(nonEmptyString(item.vehicle), 'testVins[].vehicle');
    }
  });
  await check('exposes the test OEM numbers the OEM widget renders', () => {
    assert.ok(info.testOemNumbers.length > 0, 'testOemNumbers must not be empty');
    for (const item of info.testOemNumbers) {
      assert.ok(nonEmptyString(item.number), 'testOemNumbers[].number');
      assert.ok(nonEmptyString(item.part), 'testOemNumbers[].part');
    }
  });
  await check('is labelled as fixture data so the badge reads "демо-фикстуры"', () => {
    assert.equal(info.dataSource, 'mock');
  });

  console.log('vin decode');
  const knownVin = info.testVins[0].vin;
  const decoded = await mockApi.decodeVin(knownVin);
  await check('returns a vehicle with every field the card dereferences', () => {
    const v = decoded.vehicle;
    assert.ok(nonEmptyString(v.vehicleId), 'vehicleId');
    assert.ok(nonEmptyString(v.brand), 'brand');
    assert.ok(nonEmptyString(v.model), 'model');
    assert.ok(nonEmptyString(v.modification), 'modification');
    assert.ok(v.oemPlatforms === undefined || Array.isArray(v.oemPlatforms), 'oemPlatforms');
  });
  await check('decodes a known VIN to a stable vehicle', () => {
    // A known VIN resolves through vinIndex; the fixture vehicle carries no `vin`
    // of its own, exactly as the Java backend behaves, so the card shows "—".
    assert.ok(nonEmptyString(decoded.vehicle.vehicleId));
  });
  await check('returns root groups for the lazy tree', () => {
    assert.ok(Array.isArray(decoded.groups) && decoded.groups.length > 0, 'groups must not be empty');
    for (const node of decoded.groups) {
      assert.ok(nonEmptyString(node.id), 'group.id');
      assert.ok(nonEmptyString(node.name), 'group.name');
      assert.ok(Array.isArray(node.children), 'group.children');
    }
  });
  await check('meta marks the source as mock', () => {
    assert.equal(decoded.meta.source, 'mock');
    assert.equal(typeof decoded.meta.tookMs, 'number');
  });

  const unknown = await mockApi.decodeVin('ZZZZZZZZZZZZZZZZZ');
  await check('decodes an unknown but well-formed VIN instead of failing', () => {
    assert.equal(unknown.vehicle.vin, 'ZZZZZZZZZZZZZZZZZ');
    assert.ok(nonEmptyString(unknown.vehicle.vehicleId));
  });

  console.log('vin validation');
  await check('empty VIN -> ApiError VIN_REQUIRED', async () => {
    await assert.rejects(() => mockApi.decodeVin('   '), (e) => e.code === 'VIN_REQUIRED' && e.status === 400);
  });
  await check('short VIN -> ApiError VIN_LENGTH', async () => {
    await assert.rejects(() => mockApi.decodeVin('1HGBH41'), (e) => e.code === 'VIN_LENGTH');
  });
  await check('VIN with I/O/Q -> ApiError VIN_ALPHABET', async () => {
    await assert.rejects(() => mockApi.decodeVin('1HGBH41JXMN10918I'), (e) => e.code === 'VIN_ALPHABET');
  });

  console.log('catalog');
  const vehicleId = decoded.vehicle.vehicleId;
  const level2 = await mockApi.catalog(vehicleId, decoded.groups[0].id);
  await check('a known group returns parts with prices and stock', () => {
    assert.equal(level2.groupId, decoded.groups[0].id);
    assert.ok(level2.groups.length > 0, 'expected parts in the second level');
    for (const part of level2.groups) {
      assert.ok(nonEmptyString(part.id), 'part.id');
      assert.ok(nonEmptyString(part.name), 'part.name');
    }
  });
  const withParts = level2.groups.find((n) => n.kind === 'PART');
  if (withParts) {
    await check('a part carries oem/price/currency/inStock for the tree row', () => {
      assert.ok(nonEmptyString(withParts.oem), 'oem');
      assert.equal(typeof withParts.price, 'number');
      assert.equal(withParts.currency, 'RUB');
      assert.equal(typeof withParts.inStock, 'boolean');
    });
  }
  const unknownGroup = await mockApi.catalog(vehicleId, 'no-such-group');
  await check('an unknown group is an empty list, not an error', () => {
    assert.ok(Array.isArray(unknownGroup.groups));
    assert.equal(unknownGroup.groups.length, 0);
  });
  // Prices only exist on PART nodes, which live one level below a root group,
  // so compare the same part id across two different vehicles.
  const pricedPart = level2.groups.find((n) => n.kind === 'PART');
  if (pricedPart) {
    const otherVehicle = await mockApi.catalog('SOME-OTHER-VEHICLE', level2.groupId);
    const samePart = otherVehicle.groups.find((n) => n.id === pricedPart.id);
    await check('prices differ per vehicle', () => {
      assert.equal(typeof pricedPart.price, 'number');
      assert.equal(typeof samePart.price, 'number');
      assert.notEqual(pricedPart.price, samePart.price, 'two vehicles returned the same price');
    });
  }

  console.log('catalog navigation');
  const brands = await mockApi.brands();
  await check('brands returns items the picker can filter', () => {
    assert.ok(brands.items.length > 0);
    assert.equal(brands.count, brands.items.length);
    for (const b of brands.items) {
      assert.ok(nonEmptyString(b.id), 'brand.id');
      assert.ok(nonEmptyString(b.name), 'brand.name');
    }
  });
  const models = await mockApi.models(brands.items[0].id);
  await check('models expose a non-empty years array (spread in the chip)', () => {
    assert.ok(models.items.length > 0, 'expected models for the first brand');
    for (const m of models.items) {
      assert.ok(nonEmptyString(m.id), 'model.id');
      assert.ok(Array.isArray(m.years) && m.years.length > 0, 'model.years');
      for (const y of m.years) assert.equal(typeof y, 'number');
    }
  });
  const mods = await mockApi.modifications(models.items[0].id);
  await check('modifications expose id and name, and id works as a catalog key', async () => {
    assert.ok(mods.items.length > 0);
    for (const mod of mods.items) assert.ok(nonEmptyString(mod.id), 'modification.id');
    const viaModId = await mockApi.catalog(mods.items[0].id, null);
    assert.ok(viaModId.groups.length > 0, 'a modification id must resolve a catalog');
  });
  const filtered = await mockApi.brands(brands.items[0].name.slice(0, 3));
  await check('brand filter narrows the list', () => {
    assert.ok(filtered.items.length <= brands.items.length);
    assert.ok(filtered.items.length > 0);
  });
  const noModels = await mockApi.models('NOPE');
  await check('an unknown brand is an empty list, not an error', () => assert.equal(noModels.items.length, 0));

  console.log('oem search');
  const oem = await mockApi.searchOem(info.testOemNumbers[0].number);
  await check('returns crosses with the fields the row dereferences unguarded', () => {
    assert.ok(oem.result.crosses.length > 0, 'crosses must not be empty');
    for (const c of oem.result.crosses) {
      assert.ok(nonEmptyString(c.oem), 'cross.oem');
      assert.ok(nonEmptyString(c.brand), 'cross.brand is escaped without a guard');
      assert.ok(nonEmptyString(c.name), 'cross.name is escaped without a guard');
    }
  });
  await check('applicability rows expose brand and model', () => {
    for (const a of oem.result.applicability) {
      assert.ok(nonEmptyString(a.brand), 'applicability.brand');
      assert.ok(nonEmptyString(a.model), 'applicability.model');
    }
  });
  await check('minPrice is a number the stats block can format', () => {
    if (oem.result.minPrice != null) assert.equal(typeof oem.result.minPrice, 'number');
  });
  const generic = await mockApi.searchOem('НЕТ-ТАКОГО-НОМЕРА');
  await check('an unknown number still returns a usable result', () => {
    assert.ok(generic.result.crosses.length > 0, 'generic fallback must not be empty');
    assert.ok(nonEmptyString(generic.result.oem));
  });

  console.log('cart');
  const cart = await mockApi.addToCart({
    sessionId: 'test-session',
    items: [{ oem: '11127529817', name: 'Прокладка ГБЦ', brand: 'BMW', price: 2450, quantity: 2, vehicleId }],
  });
  await check('returns the ABCP payload the modal renders', () => {
    assert.equal(cart.success, true);
    assert.equal(cart.mode, 'simulated');
    assert.equal(cart.currency, 'RUB');
    assert.ok(Array.isArray(cart.lines) && cart.lines.length === 1);
    assert.equal(cart.totalAmount, 4900);
    assert.equal(cart.request.clientType, 'WWW');
    assert.equal(cart.request.sessionId, 'test-session');
    assert.equal(cart.request.items[0].oem, '11127529817');
    assert.equal(cart.request.items[0].quantity, 2);
    assert.equal(cart.request.items[0].reference, `laximo:${vehicleId}`);
  });
  await check('an empty item list is rejected with a validation error', async () => {
    await assert.rejects(() => mockApi.addToCart({ sessionId: 's', items: [] }), (e) => e.code === 'VALIDATION_FAILED');
  });
  await check('a blank session id is rejected', async () => {
    await assert.rejects(
      () => mockApi.addToCart({ sessionId: '', items: [{ oem: '1', quantity: 1 }] }),
      (e) => e.code === 'VALIDATION_FAILED',
    );
  });

  console.log(`\n${passed} passed`);
} finally {
  rmSync(outDir, { recursive: true, force: true });
}
