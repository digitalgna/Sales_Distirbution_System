const multer = require("multer");
const path = require("path");

// Define where and how to store uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/receipts/"); // create this folder if it doesn't exist
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

// Initialize multer instance
const upload = multer({ storage });

module.exports = upload;
