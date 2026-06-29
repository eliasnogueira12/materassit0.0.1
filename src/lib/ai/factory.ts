import { AIProvider } from "./types";
import { CloudflareProvider } from "./cloudflare-provider";

export function getAIProvider(): AIProvider {
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
  const cfApiToken = process.env.CLOUDFLARE_API_TOKEN || "";

  if (!cfAccountId || !cfApiToken) {
    throw new Error(
      "Credenciais Cloudflare não configuradas no ficheiro .env (CLOUDFLARE_ACCOUNT_ID e CLOUDFLARE_API_TOKEN são necessárias).",
    );
  }

  return new CloudflareProvider(cfAccountId, cfApiToken);
}

