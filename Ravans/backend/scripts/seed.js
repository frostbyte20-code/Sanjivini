const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('../config/db');
const Medicine = require('../models/Medicine');
const Pharmacy = require('../models/Pharmacy');
const PharmacyStock = require('../models/PharmacyStock');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const run = async () => {
  try {
    await connectDB();

    // Clear
    await Medicine.deleteMany({});
    await Pharmacy.deleteMany({});
    await PharmacyStock.deleteMany({});
    await User.deleteMany({});

    // Create medicines
    const meds = await Medicine.insertMany([
      { name: 'Paracetamol', genericName: 'Acetaminophen', category: 'Analgesic', description: 'Pain reliever and fever reducer' },
      { name: 'Ibuprofen', genericName: 'Ibuprofen', category: 'NSAID', description: 'Anti-inflammatory pain reliever' },
      { name: 'Azithromycin', genericName: 'Azithromycin', category: 'Antibiotic', description: 'Antibiotic for bacterial infections' },
      { name: 'Cetirizine', genericName: 'Cetirizine', category: 'Antihistamine', description: 'Allergy relief' },
      { name: 'Metformin', genericName: 'Metformin', category: 'Antidiabetic', description: 'Used for type 2 diabetes' },
    ]);

    // Create pharmacies with example coordinates
    const pharmacies = await Pharmacy.insertMany([
      { name: 'City Pharmacy', address: '123 Market St', city: 'Durgapur', state: 'WB', pincode: '713201', phone: '+911234567890', email: 'city@pharmacy.example', location: { type: 'Point', coordinates: [87.3119, 23.5204] } },
      { name: 'HealthPlus', address: '45 Health Ave', city: 'Durgapur', state: 'WB', pincode: '713202', phone: '+911234567891', email: 'contact@healthplus.example', location: { type: 'Point', coordinates: [87.3200, 23.5250] } },
      { name: 'GoodCare Pharmacy', address: '78 Main Road', city: 'Asansol', state: 'WB', pincode: '713301', phone: '+911234567892', email: 'info@goodcare.example', location: { type: 'Point', coordinates: [87.3000, 23.5100] } },
      { name: 'MediStore', address: '9 Cross St', city: 'Bardhaman', state: 'WB', pincode: '713101', phone: '+911234567893', email: 'medistore@example', location: { type: 'Point', coordinates: [87.2800, 23.5000] } },
      { name: 'Neighborhood Pharmacy', address: '200 Lake View', city: 'Durgapur', state: 'WB', pincode: '713203', phone: '+911234567894', email: 'neigh@pharm.example', location: { type: 'Point', coordinates: [87.3150, 23.5220] } },
    ]);

    // Create stock records
    const stocks = [
      { pharmacy: pharmacies[0]._id, medicine: meds[0]._id, quantity: 20, price: 25, available: true },
      { pharmacy: pharmacies[0]._id, medicine: meds[1]._id, quantity: 0, price: 40, available: false },
      { pharmacy: pharmacies[1]._id, medicine: meds[0]._id, quantity: 5, price: 27, available: true },
      { pharmacy: pharmacies[2]._id, medicine: meds[2]._id, quantity: 10, price: 120, available: true },
      { pharmacy: pharmacies[3]._id, medicine: meds[3]._id, quantity: 15, price: 10, available: true },
      { pharmacy: pharmacies[4]._id, medicine: meds[0]._id, quantity: 2, price: 30, available: true },
    ];

    await PharmacyStock.insertMany(stocks);

    // Create admin user
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash('adminpass', salt);
    await User.create({ name: 'Admin', email: 'admin@example.com', password: hashed, role: 'admin' });

    console.log('Seed complete');
    process.exit(0);
  } catch (err) {
    console.error('Seed error', err);
    process.exit(1);
  }
};

run();
