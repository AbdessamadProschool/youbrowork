const { db } = require('./lib/db/dist/index.js');
const { sql } = require('drizzle-orm');

async function run() {
  const rs = await db.execute(sql`SELECT nom, specialite, type FROM formateurs`);
  console.log(rs);
  process.exit();
}
run();
