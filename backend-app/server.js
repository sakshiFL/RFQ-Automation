const express = require("express");
const cors = require("cors");
require("dotenv").config();
const rfqRoutes = require("./routes/rfq");
const fs = require("fs");
const { google } = require("googleapis");
const { createOAuthClient } = require("./services/googleDrive");


const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }));
app.use(express.json());

app.use("/api/rfq", rfqRoutes);

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => console.log(`RFQ backend running on port ${PORT}`));