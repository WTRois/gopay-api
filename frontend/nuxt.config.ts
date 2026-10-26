import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: false },

  css: ["~/assets/css/main.css"],

  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  runtimeConfig: {
    backendUrl: process.env.BACKEND_URL || "http://localhost:3000",
    apiKey: process.env.API_KEY || "YOUR_API_KEY_HERE",
    public: {
      appName: "GoPay Gateway",
    },
  },
});
