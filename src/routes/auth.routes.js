const express = require("express");
const router = express.Router();

router.post("/login", (req, res) => {
  res.json({ message: "Login user" });
});

router.post("/register", (req, res) => {
  res.json({ message: "Register user" });
});

module.exports = router;