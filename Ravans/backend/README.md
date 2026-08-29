# Medicine Locator Backend

Backend API for searching medicines and finding nearby pharmacies that have them in stock.

Requirements:
- Node.js 18+
- MongoDB

Installation:

1. Clone the repo
2. cd backend
3. cp .env.example .env and configure
4. npm install

Scripts:
- npm run dev (development with nodemon)
- npm start (production)
- npm run seed (seed database)

Environment variables (.env):
- PORT=5000
- MONGO_URI=mongodb://localhost:27017/medicine_locator
- JWT_SECRET=change_this_secret
- JWT_EXPIRES_IN=7d
- NODE_ENV=development
- RATE_LIMIT_WINDOW_MS=60000
- RATE_LIMIT_MAX=100

API Endpoints:

Authentication:
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me (protected)

Medicines:
- GET /api/medicines/search?q=paracetamol&page=1&limit=20
- GET /api/medicines/:id
- Admin: POST /api/medicines, PUT /api/medicines/:id, DELETE /api/medicines/:id

Pharmacies:
- GET /api/pharmacies/nearby?medicine=paracetamol&lat=23.5204&lng=87.3119&radius=10
- GET /api/pharmacies/:id
- GET /api/pharmacies/:id/stock
- Admin: POST /api/pharmacies, PUT /api/pharmacies/:id, DELETE /api/pharmacies/:id

Stock:
- GET /api/stock (admin)
- POST /api/stock (admin)
- PUT /api/stock/:id (admin)
- DELETE /api/stock/:id (admin)

Example requests:

Registration:
curl -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" -d '{"name":"Test","email":"test@example.com","password":"password"}'

Login:
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"adminpass"}'

Nearby pharmacies:
curl "http://localhost:5000/api/pharmacies/nearby?medicine=Paracetamol&lat=23.5204&lng=87.3119&radius=10"

Seed data:
- npm run seed

Geolocation search:
- Uses MongoDB's $geoNear aggregation to find pharmacies within the radius (in meters).
- Joins PharmacyStock to filter only pharmacies that have the requested medicine with quantity > 0 and available=true.
- Returns distance in kilometers and sorts by nearest.

