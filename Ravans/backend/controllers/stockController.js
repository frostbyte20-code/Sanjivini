const PharmacyStock = require('../models/PharmacyStock');
const Pharmacy = require('../models/Pharmacy');
const Medicine = require('../models/Medicine');
const mongoose = require('mongoose');

exports.list = async (req, res, next) => {
  try {
    const stocks = await PharmacyStock.find().populate('pharmacy').populate('medicine');
    res.json({ success: true, data: { stocks } });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { pharmacyId, medicineId, quantity, price, available } = req.body;
    if (!mongoose.isValidObjectId(pharmacyId) || !mongoose.isValidObjectId(medicineId)) return res.status(400).json({ success: false, message: 'Invalid ids' });

    const pharmacy = await Pharmacy.findById(pharmacyId);
    const medicine = await Medicine.findById(medicineId);
    if (!pharmacy || !medicine) return res.status(404).json({ success: false, message: 'Pharmacy or Medicine not found' });

    // upsert behavior: prevent duplicates per schema unique index
    let stock = await PharmacyStock.findOne({ pharmacy: pharmacyId, medicine: medicineId });
    if (stock) return res.status(400).json({ success: false, message: 'Stock entry already exists, use PUT to update' });

    stock = await PharmacyStock.create({ pharmacy: pharmacyId, medicine: medicineId, quantity, price, available });
    res.status(201).json({ success: true, data: { stock } });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Duplicate stock entry' });
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid stock id' });

    const stock = await PharmacyStock.findByIdAndUpdate(id, req.body, { new: true });
    if (!stock) return res.status(404).json({ success: false, message: 'Stock not found' });

    res.json({ success: true, data: { stock } });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid stock id' });

    const stock = await PharmacyStock.findByIdAndDelete(id);
    if (!stock) return res.status(404).json({ success: false, message: 'Stock not found' });

    res.json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};
