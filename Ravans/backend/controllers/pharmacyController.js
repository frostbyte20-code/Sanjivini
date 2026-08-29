const Pharmacy = require('../models/Pharmacy');
const Medicine = require('../models/Medicine');
const PharmacyStock = require('../models/PharmacyStock');
const mongoose = require('mongoose');

function escapeRegex(text) { return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// GET /api/pharmacies/:id
exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid pharmacy id' });

    const pharmacy = await Pharmacy.findById(id);
    if (!pharmacy) return res.status(404).json({ success: false, message: 'Pharmacy not found' });

    res.json({ success: true, data: { pharmacy } });
  } catch (err) {
    next(err);
  }
};

// GET /api/pharmacies/:id/stock
exports.getStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid pharmacy id' });

    const stock = await PharmacyStock.find({ pharmacy: id }).populate('medicine');
    res.json({ success: true, data: { stock } });
  } catch (err) {
    next(err);
  }
};

// POST /api/pharmacies
exports.create = async (req, res, next) => {
  try {
    const { name, address, city, state, pincode, phone, email, latitude, longitude, openingHours } = req.body;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return res.status(400).json({ success: false, message: 'Invalid coordinates' });

    const pharmacy = await Pharmacy.create({
      name,
      address,
      city,
      state,
      pincode,
      phone,
      email,
      location: { type: 'Point', coordinates: [longitude, latitude] },
      openingHours,
    });

    res.status(201).json({ success: true, data: { pharmacy } });
  } catch (err) {
    next(err);
  }
};

// PUT /api/pharmacies/:id
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid pharmacy id' });

    const update = { ...req.body };
    if (update.latitude !== undefined && update.longitude !== undefined) {
      if (typeof update.latitude !== 'number' || typeof update.longitude !== 'number') return res.status(400).json({ success: false, message: 'Invalid coordinates' });
      update.location = { type: 'Point', coordinates: [update.longitude, update.latitude] };
      delete update.latitude; delete update.longitude;
    }

    const pharmacy = await Pharmacy.findByIdAndUpdate(id, update, { new: true });
    if (!pharmacy) return res.status(404).json({ success: false, message: 'Pharmacy not found' });

    res.json({ success: true, data: { pharmacy } });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/pharmacies/:id
exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ success: false, message: 'Invalid pharmacy id' });

    const pharmacy = await Pharmacy.findByIdAndDelete(id);
    if (!pharmacy) return res.status(404).json({ success: false, message: 'Pharmacy not found' });

    // Also remove stock entries
    await PharmacyStock.deleteMany({ pharmacy: id });

    res.json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};

// GET /api/pharmacies/nearby?medicine=...&lat=..&lng=..&radius=10
exports.nearby = async (req, res, next) => {
  try {
    const { medicine: medicineQuery, lat, lng } = req.query;
    let radius = parseFloat(req.query.radius);
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    if (!medicineQuery) return res.status(400).json({ success: false, message: 'medicine is required' });
    if (lat === undefined || lng === undefined) return res.status(400).json({ success: false, message: 'lat and lng are required' });

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) return res.status(400).json({ success: false, message: 'Invalid latitude' });
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) return res.status(400).json({ success: false, message: 'Invalid longitude' });

    if (!radius || isNaN(radius)) radius = 10;
    if (radius <= 0) return res.status(400).json({ success: false, message: 'radius must be positive' });
    if (radius > 200) radius = 200; // sensible max

    // Resolve medicine by name or genericName
    const escaped = escapeRegex(medicineQuery);
    const medicine = await Medicine.findOne({ $or: [ { name: new RegExp(`^${escaped}$`, 'i') }, { genericName: new RegExp(`^${escaped}$`, 'i') }, { name: new RegExp(escaped, 'i') }, { genericName: new RegExp(escaped, 'i') } ] });
    if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });

    // Convert radius km to meters
    const radiusMeters = radius * 1000;

    // Use aggregation: geoNear requires being first stage
    const agg = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lngNum, latNum] },
          distanceField: 'distance',
          spherical: true,
          maxDistance: radiusMeters,
        },
      },
      // Join with PharmacyStock
      {
        $lookup: {
          from: 'pharmacystocks',
          let: { pharmacyId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [ { $eq: ['$pharmacy', '$$pharmacyId'] }, { $eq: ['$medicine', medicine._id] }, { $gt: ['$quantity', 0] }, { $eq: ['$available', true] } ] } } },
            { $project: { quantity: 1, price: 1 } },
          ],
          as: 'stock'
        }
      },
      { $unwind: '$stock' },
      { $sort: { distance: 1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          pharmacyId: '$_id',
          name: 1,
          address: 1,
          city: 1,
          phone: 1,
          'medicine': medicine.name,
          'quantity': '$stock.quantity',
          'price': '$stock.price',
          distanceKm: { $divide: ['$distance', 1000] }
        }
      }
    ];

    const results = await Pharmacy.aggregate(agg);

    // count total matches (without pagination)
    const countAgg = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lngNum, latNum] },
          distanceField: 'distance',
          spherical: true,
          maxDistance: radiusMeters,
        },
      },
      {
        $lookup: {
          from: 'pharmacystocks',
          let: { pharmacyId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [ { $eq: ['$pharmacy', '$$pharmacyId'] }, { $eq: ['$medicine', medicine._id] }, { $gt: ['$quantity', 0] }, { $eq: ['$available', true] } ] } } },
          ],
          as: 'stock'
        }
      },
      { $match: { stock: { $ne: [] } } },
      { $count: 'total' }
    ];

    const countRes = await Pharmacy.aggregate(countAgg);
    const total = (countRes[0] && countRes[0].total) ? countRes[0].total : 0;

    res.json({ success: true, data: { total, page, limit, pharmacies: results } });
  } catch (err) {
    next(err);
  }
};
