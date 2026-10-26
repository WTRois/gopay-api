export default defineEventHandler(async () => {
  const config = useRuntimeConfig();

  try {
    const response = await $fetch(`${config.backendUrl}/health`, {
      method: "GET",
    });
    return response;
  } catch (err: any) {
    return {
      status: "down",
      error: err.message,
    };
  }
});
