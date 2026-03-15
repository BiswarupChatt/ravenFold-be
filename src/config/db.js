const mongoose = require("mongoose");

const logger = require("../utils/logger");

let listenersRegistered = false;

const registerConnectionListeners = () => {
  if (listenersRegistered) {
    return;
  }

  listenersRegistered = true;

  mongoose.connection.on("connected", () => {
    logger.info("MongoDB connection established");
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("MongoDB connection disconnected");
  });

  mongoose.connection.on("error", (error) => {
    logger.error("MongoDB connection error", { message: error.message });
  });
};

const connectDatabase = async () => {
  const { DATABASE_URL } = process.env;

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }

  registerConnectionListeners();

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  await mongoose.connect(DATABASE_URL, {
    serverSelectionTimeoutMS: 5000,
  });

  return mongoose.connection;
};

module.exports = connectDatabase;
