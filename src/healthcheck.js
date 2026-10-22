const port = process.env.PORT || 3000;
const url = `http://127.0.0.1:${port}/health`;

try {
  const res = await fetch(url, { timeout: 3000 });
  if (res.status === 200) {
    const json = await res.json();
    if (json.status === "OK") {
      process.exit(0);
    }
  }
  process.exit(1);
} catch (_err) {
  process.exit(1);
}
