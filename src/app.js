const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const registerRoutes = require("./routes");

const app = express();

// Middlewares
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan("dev"));

// Register all routes
registerRoutes(app);

module.exports = app;