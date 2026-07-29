import { createSeedState } from "../src/lib/seed-data";
import { getPrisma } from "../src/server/db/prisma";
import { replaceDomainState } from "../src/server/db/state-repository";

const seed = createSeedState();

async function main() {
  try {
    const persisted = await replaceDomainState(seed, { force: true });
    console.log(
      `Seeded FarmToMarket PostgreSQL state at ${persisted.updatedAt} ` +
        `(${persisted.users.length} users, ${persisted.organisations.length} organisations, ` +
        `${persisted.products.length} products, ${persisted.orders.length} orders).`,
    );
  } finally {
    await getPrisma().$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
