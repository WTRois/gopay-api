export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const id = getRouterParam(event, "id");

  try {
    const response = await fetch(`${config.backendUrl}/qr/${id}?format=raw`);
    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        statusMessage: "Gagal mengambil gambar QR",
      });
    }

    setResponseHeader(event, "Content-Type", "image/png");
    setResponseHeader(event, "Cache-Control", "no-cache");
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err: any) {
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.message || "Error QR raw image",
    });
  }
});
