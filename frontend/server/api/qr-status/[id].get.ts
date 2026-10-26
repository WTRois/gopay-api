export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const id = getRouterParam(event, "id");

  try {
    const response = await $fetch(`${config.backendUrl}/api/qr-status/${id}`, {
      method: "GET",
    });
    return response;
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.data?.message || err.message || "Gagal memeriksa status QRIS",
    });
  }
});
