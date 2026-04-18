import { unlinkSync } from "fs";
import { existsSync } from "fs";

// Remove package-lock.json and yarn.lock
const filesToRemove = ["package-lock.json", "yarn.lock"];
filesToRemove.forEach((file) => {
  if (existsSync(file)) {
    try {
      unlinkSync(file);
      console.log(`Removed ${file}`);
    } catch (err) {
      console.error(`Failed to remove ${file}:`, err.message);
    }
  }
});

// Check that pnpm is being used
const userAgent = process.env.npm_config_user_agent;
if (userAgent && !userAgent.startsWith("pnpm/")) {
  console.error("Use pnpm instead");
  process.exit(1);
}
