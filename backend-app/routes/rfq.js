const express = require("express");
const router = express.Router();
const multer = require("multer");
// const { uploadToDrive } = require("../services/googleDrive");
// const { getSessionId } = require("../services/odoo");
const { createProject } = require("../services/odoo");
const { createProjectDummy } = require("../services/odoo");

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
  try {
    const { customerName, rfqType, category } = req.body;

    if (!customerName || !rfqType || !category) {
      return res.status(400).json({ message: "customerName, rfqType, and category are required." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "A ZIP file is required." });
    }

//     // 1. Upload file to Google Drive
//     const driveResult = await uploadToDrive({
//       fileName: req.file.originalname,
//       mimeType: "application/zip",
//       buffer: req.file.buffer,
//       customerName,
//       rfqType,
//       category,
//     });
// console.log(driveResult.fileUrl , "      driveFileUrl: driveResult.fileUrl,");
// console.log(clientFolderId);
// console.log(process.env.GOOGLE_DRIVE_FOLDER_ID);

const fs = require("fs");
const path = require("path");

// Create folder: uploads/customerName
const uploadDir = path.join(__dirname, "../uploads", customerName);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Create unique file name
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const fileName = `${customerName}_${rfqType}_${category}_${timestamp}.zip`.replace(/\s+/g, "_");

const filePath = path.join(uploadDir, fileName);

// Save file
fs.writeFileSync(filePath, req.file.buffer);

console.log("File saved at:", filePath);

// Fake drive response (so your flow doesn't break)
const driveResult = {
  fileName,
  fileUrl: filePath,
};

    // let auth = await getSessionId();

    // console.log(auth);
    
    // 2. Create Odoo project + task
    const odooResult = await createProject(customerName);
    console.log(odooResult); 
    
    if(odooResult){
        const dummyJson = createProjectDummy(customerName);
        if(dummyJson){
            const taskResult = createTask(customerName);
        }
        console.log(taskResult); 
        
    } 


    // res.json({
    //   message: "RFQ submitted successfully",
    //   customerName,
    // //   rfqType,
    // //   category,
    // //   drive: driveResult,
    //   odoo: odooResult,
    // });
  } catch (err) {
    console.error("FULL ERROR:", err);
    console.error("STACK:", err.stack);

    res.status(500).json({
        message: err.message || "Internal server error"
    });
    }
});

// Multer error handler
router.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "File too large. Maximum size is 100MB." });
  }
  res.status(400).json({ message: err.message });
});


module.exports = router;