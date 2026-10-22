const express = require("express");
const cors = require("cors");
const healthRoutes = require("./routes/health");
const logsRoutes = require("./routes/logs");
const qrisRoutes = require("./routes/qris");
const paymentRoutes = require("./routes/payment");
const transactionsRoutes = require("./routes/transactions");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Route Mounts
app.use(healthRoutes);
app.use(logsRoutes);
app.use(qrisRoutes);
app.use(paymentRoutes);
app.use(transactionsRoutes);

// Centralized Error Handling
app.use(errorHandler);

module.exports = app;
