// models/Property.js
const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema({
  developer: String,
  project: String,
  price: [Number],
  size: [String],
  unitType: [String],
  status: String,
  launchDate: String,
  notes: String,
  brochure: String, // ← NEW
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Property", propertySchema);
