const fs = require('fs');
let code = fs.readFileSync('artifacts/api-server/src/lib/ia-engine.ts', 'utf8');

// 1. Add gte to import
if (!code.includes('gte')) {
    code = code.replace('import { eq, and, sql } from "drizzle-orm";', 'import { eq, and, sql, gte } from "drizzle-orm";');
}

// 2. Modify delete to only delete from the current day onwards
const deleteStr = 'await db.delete(emploisIaTable).where(eq(emploisIaTable.etablissementId, etablissementId));';

const newDelete = `
  const now = new Date();
  const currentDayStr = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Africa/Casablanca' }).format(now);
  const dayMap: Record<string, number> = { 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 7 };
  let startDay = dayMap[currentDayStr] || 1;
  if(startDay === 7) startDay = 1; // Sunday resets to Monday
  
  await db.delete(emploisIaTable).where(
    and(
      eq(emploisIaTable.etablissementId, etablissementId),
      gte(emploisIaTable.jourSemaine, startDay)
    )
  );
`;

code = code.replace(deleteStr, newDelete);

// 3. Prevent loop from generating past days!
const loopPre = 'for (let jour = 1; jour <= 6; jour++) {';
const loopPost = 'for (let jour = startDay; jour <= 6; jour++) {';
code = code.replace(loopPre, loopPost);

fs.writeFileSync('artifacts/api-server/src/lib/ia-engine.ts', code);
console.log('Fixed ia-engine.ts');
