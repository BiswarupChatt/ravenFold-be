const express = require("express");

const authController = require("../controllers/auth.controller");

const router = express.Router();

router.post("/auth/login", authController.login);

router.post("/auth/register", authController.register);

module.exports = router;
