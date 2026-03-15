const fs = require("fs");
const path = require("path");

const registerRoutes = (app) => {
    const routesPath = __dirname;

    fs.readdirSync(routesPath).forEach((file) => {
        if (file !== "index.js") {
            const route = require(path.join(routesPath, file));
            app.use("/api", route);
        }
    });
};

module.exports = registerRoutes;