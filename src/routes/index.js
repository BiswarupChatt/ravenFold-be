const fs = require("fs");
const path = require("path");

const registerRoutes = (app) => {
  const routesPath = __dirname;
  const routeFiles = fs
    .readdirSync(routesPath)
    .filter((file) => file.endsWith(".routes.js"))
    .sort();

  routeFiles.forEach((file) => {
    const route = require(path.join(routesPath, file));
    app.use("/api", route);
  });
};

module.exports = registerRoutes;
