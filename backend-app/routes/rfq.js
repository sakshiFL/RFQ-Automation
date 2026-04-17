const express = require("express");
const router = express.Router();
const multer = require("multer");
// const { uploadToDrive } = require("../services/googleDrive");
// const { getSessionId } = require("../services/odoo");
const { createProject, createTask, getTaskDescription } = require("../services/odoo");
const { createProjectDummy } = require("../services/odoo");
let driveLink = `https://docs.google.com/spreadsheets/d/1I14OyWPDSL-DR-QkWW2OWpIxyrPQHHh7/edit?usp=sharing&ouid=108065393827917820463&rtpof=true&sd=true`;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/zip" || file.originalname.endsWith(".zip")) {
      cb(null, true);
    } else {
      cb(new Error("Only .zip files are allowed"), false);
    }
  },
});

router.post("/submit", upload.single("file"), async (req, res) => {
  let mappedObject = {};

  try {
    const { customerName, rfqType, category } = req.body;

    if (!customerName || !rfqType || !category) {
      return res.status(400).json({ message: "customerName, rfqType, and category are required." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "A ZIP file is required." });
    }

    const fs = require("fs");
    const path = require("path");

    const uploadDir = path.join(__dirname, "../uploads", customerName);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `${customerName}_${rfqType}_${category}_${timestamp}.zip`.replace(/\s+/g, "_");

    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, req.file.buffer);

    console.log("File saved at:", filePath);

    const odooResult = await createProject(customerName);

    mappedObject = {
      project: odooResult,
      task: "processing..." // since it will happen later
    };

    // 🚀 Fire and forget (background execution)
    processPostProjectCreation(customerName, odooResult.projectId);

    return res.json({
      message: "RFQ submitted successfully",
      customerName,
      odoo: mappedObject,
    });

  } catch (err) {
    console.error("FULL ERROR:", err);
    console.error("STACK:", err.stack);

    res.status(500).json({
      message: err.message || "Internal server error"
    });
  }
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processPostProjectCreation(customerName, projectId) {
  try {
    console.log("⏳ Waiting before processing dummy + task...");

    // ⏱️ Add delay (e.g., 5 seconds)
    await delay(5000);

    console.log("🚀 Starting dummy + task creation");

    const dummyJson = await createProjectDummy(customerName);

    let taskResult = null;
    const taskName = "Review Extracted Data";
    const description = await getTaskDescription(taskName);

    if (dummyJson) {
      taskResult = await createTask(
        taskName,
        projectId, 
        description,
        "Data Extraction"
      );
      console.log("✅ Task created:", taskResult);
    }

    return {
      dummy: dummyJson,
      task: taskResult
    };

  } catch (error) {
    console.error("❌ Error in background process:", error);
  }
}

// Multer error handler
router.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "File too large. Maximum size is 100MB." });
  }
  res.status(400).json({ message: err.message });
});


module.exports = router;