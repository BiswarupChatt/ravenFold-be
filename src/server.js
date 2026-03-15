require("dotenv").config({ quiet: true });

const app = require("./app");
const connectDatabase = require("./config/db");
const logger = require("./utils/logger");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server", { message: error.message });
    process.exit(1);
  }
};

startServer();
