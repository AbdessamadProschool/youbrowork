const { Client } = require('pg');
const fs = require('fs');

// Extraction manuelle depuis .env.local
const env = fs.readFileSync('.env.local', 'utf8');
const dbUrl = env.match(/DATABASE_URL="(.+)"/)[1];

console.log("Tentative de connexion à :", dbUrl.replace(/:[^:]+@/, ":****@"));

const client = new Client({
  connectionString: dbUrl,
  connectionTimeoutMillis: 5000,
});

client.connect()
  .then(() => {
    console.log("DB_STATUS: CONNECTED ✅");
    return client.query('SELECT current_database(), now()');
  })
  .then(res => {
    console.log("DB_CHECK:", res.rows[0]);
    process.exit(0);
  })
  .catch(err => {
    console.error("DB_STATUS: FAILED ❌");
    console.error("ERROR_MSG:", err.message);
    process.exit(1);
  });
