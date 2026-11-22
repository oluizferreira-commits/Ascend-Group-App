// Prints fresh secrets for the hosting environment variables (never commit the output).
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
const webpush = createRequire(import.meta.url)("web-push");

const token = () => randomBytes(32).toString("base64url");
const vapid = webpush.generateVAPIDKeys();
console.log(`SYNC_CRON_SECRET=${token()}
EA_SYNC_TOKEN=${token()}
NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapid.publicKey}
VAPID_PRIVATE_KEY=${vapid.privateKey}`);
