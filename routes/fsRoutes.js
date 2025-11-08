const express = require("express");
const router = express.Router();
const fsController = require("../controllers/fsController");

router.post("/", fsController.createFsTable);
router.get("/", fsController.getFsTable);
router.put("/:id", fsController.updateFsTable);
router.delete("/:id", fsController.deleteFsTable);

module.exports = router;
