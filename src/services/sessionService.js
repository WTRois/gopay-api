const path = require("node:path");
// Obfuscated sessionManager in root directory
const sessionManager = require(path.resolve(process.cwd(), "sessionManager"));
const { logActivity } = require("../utils/logger");

class SessionService {
  constructor() {
    this.manager = sessionManager;
  }

  loadSession() {
    return this.manager.loadSession();
  }

  saveSession(sessionData) {
    return this.manager.saveSession(sessionData);
  }

  isExpired(session) {
    return this.manager.isExpired(session);
  }

  async refreshSession() {
    return await this.manager.refreshSession();
  }

  async getValidHeaders(userAgent) {
    return await this.manager.getValidHeaders(userAgent);
  }

  async autoRefreshIfExpired() {
    try {
      const session = this.loadSession();
      if (session?.refresh_token && this.isExpired(session)) {
        logActivity("INFO", "Auto Refresh: Token mendekati kedaluwarsa, memperbarui sesi...");
        const refreshed = await this.refreshSession();
        if (refreshed) {
          logActivity("INFO", "Auto Refresh: Sesi GoPay berhasil diperbarui.");
          return true;
        }
      }
    } catch (err) {
      logActivity("ERROR", `Gagal auto refresh session: ${err.message}`);
    }
    return false;
  }
}

const sessionService = new SessionService();
module.exports = sessionService;
