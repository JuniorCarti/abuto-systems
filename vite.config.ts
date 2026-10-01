import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ mode }) => {
  const publicEnv = loadEnv(mode, process.cwd(), "NEXT_PUBLIC_");

  return {
    define: Object.fromEntries(
      Object.entries(publicEnv).map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]),
    ),
    plugins: [
      tailwindcss(),
      vinext(),
      cloudflare({
        viteEnvironment: {
          name: "rsc",
          childEnvironments: ["ssr"],
        },
      }),
    ],
  };
});
