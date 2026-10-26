export default defineEventHandler(async () => {
  const config = useRuntimeConfig();

  try {
    const response = await $fetch(`${config.backendUrl}/api/logs`, {
      method: "GET",
      headers: {
        "x-api-key": config.apiKey,
      },
    });
    return response;
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.data?.message || err.message || "Gagal mengambil log aktivitas",
    });
  }
});
