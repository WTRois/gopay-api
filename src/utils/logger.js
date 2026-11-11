const config = require("../config/env");

const activityLogs = [];

function logActivity(type, message, details = null) {
  const timestamp = new Date().toISOString();
  const logObj = { id: Date.now(), timestamp, type, message, details };
  activityLogs.unshift(logObj);
  if (activityLogs.length > config.maxLogs) {
    activityLogs.pop();
  }
  // Suppress verbose console output in test mode to keep test runs clean
  if (config.env !== "test") {
    console.log(`[${timestamp}] [${type}] ${message}`);
  }
  return logObj;
}

module.exports = {
  activityLogs,
  logActivity,
};
