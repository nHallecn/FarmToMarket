import assert from "node:assert/strict";

import { createSeedState } from "../src/lib/seed-data";
import { getPrisma } from "../src/server/db/prisma";
import {
  loadDomainState,
  replaceDomainState,
  StateConflictError,
} from "../src/server/db/state-repository";

const marker = "database smoke-test marker";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map(canonicalize)
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right)),
      );
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  }
  return value;
}

async function main() {
  try {
    const seeded = await replaceDomainState(createSeedState(), { force: true });

    assert.equal(seeded.users.length, 10);
    assert.equal(seeded.organisations.length, 8);
    assert.equal(seeded.products.length, 10);
    assert.equal(seeded.orders.length, 6);

    const expected = createSeedState();
    expected.updatedAt = seeded.updatedAt;
    assert.deepEqual(canonicalize(seeded), canonicalize(expected));

    const changed = structuredClone(seeded);
    changed.listings[0].notes = marker;
    changed.updatedAt = new Date().toISOString();

    const persisted = await replaceDomainState(changed, {
      expectedUpdatedAt: seeded.updatedAt,
    });
    assert.equal(persisted.listings[0].notes, marker);

    const loaded = await loadDomainState();
    assert.equal(loaded.listings[0].notes, marker);

    await assert.rejects(
      replaceDomainState(seeded, { expectedUpdatedAt: seeded.updatedAt }),
      StateConflictError,
    );

    console.log(
      `Database smoke test passed at revision ${persisted.updatedAt} ` +
        `(${persisted.listings.length} listings, ${persisted.demands.length} demands).`,
    );
  } finally {
    await replaceDomainState(createSeedState(), { force: true });
    await getPrisma().$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
