import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
const serverEnv = loadEnv(
  process.env["NODE_ENV"] === "production" ? "production" : "development",
  process.cwd(),
  "",
);
Object.assign(process.env, serverEnv);
export default defineConfig({
  vite: {
    plugins: [
      {
        name: "require-browser-supabase-config",
        apply: "build",
        configResolved(config) {
          const required = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"];
          const missing = required.filter((key) => !String(config.env[key] ?? "").trim());
          if (missing.length) {
            throw new Error(
              `Missing browser build variables: ${missing.join(", ")}. Set them in your build environment (Cloudflare: Settings > Build > Variables and secrets) and rebuild. Worker runtime variables cannot populate an already-built browser bundle. Use the public Supabase publishable/anon key, never a service-role or secret key.`,
            );
          }
        },
      },
    ],
    resolve: {
      alias: {
        "entities/lib/decode.js": path.resolve(
          process.cwd(),
          "node_modules/entities/lib/decode.js",
        ),
        "entities/lib/encode.js": path.resolve(
          process.cwd(),
          "node_modules/entities/lib/encode.js",
        ),
        entities: path.resolve(process.cwd(), "node_modules/entities"),
      },
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
