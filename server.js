// Backward compatibility shim pointing to modularized src/server.js
const serverModule = require("./src/server");

if (!import.meta.main) {
  module.exports = serverModule;
}
