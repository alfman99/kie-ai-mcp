import { loadConfig } from "../src/config.js";
import { KieHttpClient } from "../src/http.js";

const config = loadConfig();

if (!config.apiKey) {
  console.log("Skipping live smoke test: KIE_API_KEY is not set.");
  process.exit(0);
}

const client = new KieHttpClient(config);
const credits = await client.requestJson({
  method: "GET",
  path: "/api/v1/chat/credit"
});

console.log(JSON.stringify({ ok: true, credits }, null, 2));
