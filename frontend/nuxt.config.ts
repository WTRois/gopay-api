import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: false },

  app: {
    head: {
      title: "QRIS Dinamis & Gateway Pembayaran",
      titleTemplate: "%s · GoPay Gateway",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1" },
        {
          name: "description",
          content: "Payment gateway mandiri QRIS dinamis GoPay Merchant dengan auto-polling dan notifikasi suara real-time.",
        },
        { name: "theme-color", content: "#689D4B" },
      ],
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      ],
    },
  },

  css: ["~/assets/css/main.css"],

  vite: {
    plugins: [tailwindcss()],
  },

  runtimeConfig: {
    backendUrl: process.env.BACKEND_URL || "http://localhost:3000",
    apiKey: process.env.API_KEY || "YOUR_API_KEY_HERE",
    public: {
      appName: "GoPay Gateway",
    },
  },
});
