const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const registerRoutes = require("./routes");
const errorHandler = require("./middlewares/error.middleware");
const notFoundHandler = require("./middlewares/not-found.middleware");

const app = express();

// Middlewares
app.disable("x-powered-by");
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan("dev"));

// Register all routes
registerRoutes(app);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
