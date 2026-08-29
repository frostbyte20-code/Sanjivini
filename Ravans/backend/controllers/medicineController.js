const Medicine = require('../models/Medicine');
const mongoose = require('mongoose');

exports.search = async (req, res, next) => {
  try {
    const q = req.query.q || '';
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    // Partial, case-insensitive search: prefer text search, fallback to regex partial matches
    const textQuery = q.trim();
    let mongoQuery = {};
    if (textQuery) {
      // Use text search to leverage indexes
      mongoQuery = { $text: { $search: textQuery } };
    } else {
      mongoQuery = {};
    }

    // If text search yields no results (or to support partial matches), also allow regex-based matching
    let medicinesQuery = Medicine.find(mongoQuery);

    if (textQuery) {
      const regex = new RegExp(textQuery, 'i');
      // Combine text search with regex OR to support partial matches
      medicinesQuery = Medicine.find({ $or: [{ $text: { $search: textQuery } }, { name: regex }, { genericName: regex }, { category: regex }] });
    }

    const [total, medicines] = await Promise.all([
      Medicine.countDocuments(medicinesQuery.getQuery()),
      medicinesQuery.skip(skip).limit(limit),
    ]);

    res.json({ success: true, data: { total, page, limit, medicines } });
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid medicine id' });

    const medicine = await Medicine.findById(id);
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });

    res.json({ success: true, data: { medicine } });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, genericName, category, description } = req.body;
    const existing = await Medicine.findOne({ name });
    if (existing) return res.status(400).json({ success: false, message: 'Medicine already exists' });

    const medicine = await Medicine.create({ name, genericName, category, description });
    res.status(201).json({ success: true, data: { medicine } });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid medicine id' });

    const medicine = await Medicine.findByIdAndUpdate(id, req.body, { new: true });
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });

    res.json({ success: true, data: { medicine } });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid medicine id' });

    const medicine = await Medicine.findByIdAndDelete(id);
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });

    res.json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};
