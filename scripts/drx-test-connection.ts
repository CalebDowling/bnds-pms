import { config } from "dotenv";
config({ path: ".env.local" });

async function test() {
  const url = "https://boudreaux.drxapp.com/external_api/v1/patients?per_page=1";
  const key = process.env.DRX_API_KEY || "";
  console.log("Testing auth methods against:", url);
  console.log("Key:", key.substring(0, 10) + "...\n");

  const methods = [
    { name: "Bearer token", headers: { Authorization: "Bearer " + key } },
    { name: "Token header", headers: { Authorization: "Token " + key } },
    { name: "X-API-Key header", headers: { "X-API-Key": key } },
    { name: "Api-Key header", headers: { "Api-Key": key } },
    { name: "Basic auth (key as user)", headers: { Authorization: "Basic " + Buffer.from(key + ":").toString("base64") } },
    { name: "Query param api_key", headers: {} as Record<string, string>, url: url + "&api_key=" + key },
    { name: "Query param key", headers: {} as Record<string, string>, url: url + "&key=" + key },
  ];

  for (const method of methods) {
    try {
      const fetchUrl = (method as any).url || url;
      const res = await fetch(fetchUrl, {
        headers: { Accept: "application/json", ...method.headers },
      });
      const text = await res.text();
      console.log(`${method.name}: ${res.status} ${res.statusText}`);
      if (res.status !== 401) {
        console.log("  Response:", text.substring(0, 200));
      }
    } catch (e: any) {
      console.log(`${method.name}: ERROR - ${e.message}`);
    }
  }
}

test();
