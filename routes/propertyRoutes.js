const express = require("express");
const router = express.Router();
const Property = require("../models/property");

// Add new property
router.post("/add-property", async (req, res) => {
  try {
    const property = new Property(req.body);
    await property.save();
    res.status(200).json({ message: "Property added!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all properties
router.get("/properties", async (req, res) => {
  try {
    const data = await Property.find();
    res.json(data);
  } catch (err) {
    res.status(500).send("Error fetching properties.");
  }
});

// Get property by ID
router.get("/property/:id", async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: "Property not found." });
    res.json(property);
  } catch (err) {
    res.status(500).send("Error fetching property.");
  }
});

// Update property by ID
router.put("/property/:id", async (req, res) => {
  try {
    const updatedProperty = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedProperty) return res.status(404).json({ message: "Property not found to update." });
    res.json(updatedProperty);
  } catch (err) {
    res.status(500).send("Error updating property.");
  }
});

// DELETE /properties/:id
router.delete("/properties/:id", async (req, res) => {
  try {
    const deleted = await Property.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Property not found" });
    res.json({ message: "Property deleted!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ─── NEW: Process raw WhatsApp text ───────────────────────────────────────────────
//
// POST /process-message
//   Receives { raw: string } in the body,
//   parses it into your Property fields,
//   saves a new Property and returns a 200 on success.
//

router.post("/process-message", async (req, res) => {
  try {
    const { raw } = req.body;
    if (!raw || typeof raw !== "string") {
      return res.status(400).json({ error: "Missing or invalid raw message text" });
    }

    // ----- parsing logic (copy your script.js parser here) -----
    // For brevity below is a minimal example—
    // replace it with your full unitBlockRegex logic etc.

    const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
    const firstLine = lines[0] || "";
    let developer = "";
    let project = firstLine;
    const byIdx = firstLine.toLowerCase().lastIndexOf(" by ");
    if (byIdx !== -1) {
      project   = firstLine.slice(0, byIdx).trim();
      developer = firstLine.slice(byIdx + 4).trim();
    }

    // you’d run your full regex extraction here to populate:
    //   priceArr, sizeArr, unitTypeArr, status, launchDate

    const payload = {
      developer,
      project,
      price:     [0],    // ← replace with your priceArr
      size:      [""],   // ← replace with your sizeArr
      unitType:  [""],   // ← replace with your unitTypeArr
      status:    "",     // ← your status extraction
      launchDate:"",     // ← your launchDate extraction
      notes:     raw
    };
    // ------------------------------------------------------------

    const newProp = new Property(payload);
    await newProp.save();

    return res.status(200).json({ message: "Message processed and saved." });
  } catch (err) {
    console.error("process-message error:", err);
    return res.status(500).json({ error: err.message });
  }
});


module.exports = router;
