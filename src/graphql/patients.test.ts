// node --experimental-strip-types --test src/graphql/patients.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { addPatient, changePatient, listPatients, removePatient } from "./patients.ts";

const valid = { name: " Ann ", phone: "555-0000", provider: "Dr. X", nextVisit: "2026-01-02" };

test("add trims, defaults status and balance, and appends", async () => {
  const before = (await listPatients()).length;
  const added = await addPatient({ ...valid });
  assert.equal(added.name, "Ann");
  assert.equal(added.status, "SCHEDULED");
  assert.equal(added.balance, 0);
  assert.equal((await listPatients()).length, before + 1);
  await removePatient(added.id);
});

test("blank strings, bad dates and negative balances are rejected", async () => {
  for (const bad of [
    { ...valid, name: "   " },
    { ...valid, nextVisit: "02/01/2026" },
    { ...valid, nextVisit: "2026-02-31" },
    { ...valid, balance: -1 },
  ]) {
    await assert.rejects(
      async () => addPatient(bad),
      /blank|YYYY-MM-DD|not a real date|positive amount/,
      JSON.stringify(bad),
    );
  }
});

test("change touches only the fields sent, and an empty change is an error", async () => {
  const added = await addPatient({ ...valid, balance: 40 });
  const changed = await changePatient(added.id, { status: "NO_SHOW" });
  assert.equal(changed.status, "NO_SHOW");
  assert.equal(changed.balance, 40, "balance must survive a status-only change");
  assert.equal(changed.name, "Ann");
  await assert.rejects(async () => changePatient(added.id, {}), /at least one field/);
  await removePatient(added.id);
});

test("unknown ids are named in the error, not silently ignored", async () => {
  await assert.rejects(async () => changePatient("nope", { status: "COMPLETED" }), /No patient has id nope/);
  await assert.rejects(async () => removePatient("nope"), /No patient has id nope/);
});

test("remove drops exactly one row and returns its id", async () => {
  const added = await addPatient({ ...valid });
  const before = (await listPatients()).length;
  assert.equal(await removePatient(added.id), added.id);
  assert.equal((await listPatients()).length, before - 1);
});
