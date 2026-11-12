/**
 * Builds the CORS origin policy from a configured allow-list.
 * Requests without an Origin header (server-to-server, curl) stay allowed.
 */
function buildCorsOptions(allowedOrigins = []) {
  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
  };
}

module.exports = {
  buildCorsOptions,
};
