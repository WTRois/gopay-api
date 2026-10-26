export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const query = getQuery(event);

  try {
    const response = await $fetch(`${config.backendUrl}/transactions/all`, {
      method: "GET",
      headers: {
        "x-api-key": config.apiKey,
      },
      query,
    });
    return response;
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.data?.error || err.message || "Gagal mengambil data transaksi",
    });
  }
});
