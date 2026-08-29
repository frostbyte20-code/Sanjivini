/**
 * seedDiagnosis.js
 * Seeds the Symptom and Condition collections with realistic data.
 * Run with: node scripts/seedDiagnosis.js
 *
 * Prerequisites: npm run seed must already have been run so that
 * Medicine documents exist in the database.
 */

const mongoose = require('mongoose');
const dotenv   = require('dotenv');
dotenv.config();

const connectDB   = require('../config/db');
const Symptom     = require('../models/Symptom');
const Condition   = require('../models/Condition');
const DiagnosisLog = require('../models/DiagnosisLog');
const Medicine    = require('../models/Medicine');

// ─────────────────────────────────────────────────────────────────
// Symptom definitions
// ─────────────────────────────────────────────────────────────────
const SYMPTOMS = [
  { name: 'fever',            aliases: ['high temperature', 'pyrexia', 'febrile', 'chills with heat'] },
  { name: 'headache',         aliases: ['head pain', 'migraine', 'throbbing head'] },
  { name: 'cough',            aliases: ['dry cough', 'wet cough', 'coughing', 'persistent cough'] },
  { name: 'sore throat',      aliases: ['throat pain', 'throat irritation', 'painful swallowing'] },
  { name: 'runny nose',       aliases: ['nasal discharge', 'rhinorrhoea', 'nose running'] },
  { name: 'body ache',        aliases: ['muscle pain', 'myalgia', 'body pain', 'aching muscles'] },
  { name: 'fatigue',          aliases: ['tiredness', 'weakness', 'lethargy', 'exhaustion', 'low energy'] },
  { name: 'sneezing',         aliases: ['frequent sneezing', 'nasal irritation'] },
  { name: 'nasal congestion', aliases: ['blocked nose', 'stuffy nose', 'sinus blockage'] },
  { name: 'nausea',           aliases: ['feeling sick', 'queasiness', 'upset stomach', 'urge to vomit'] },
  { name: 'vomiting',         aliases: ['throwing up', 'emesis', 'puking'] },
  { name: 'diarrhoea',        aliases: ['diarrhea', 'loose stools', 'watery stools', 'stomach runs'] },
  { name: 'stomach pain',     aliases: ['abdominal pain', 'belly pain', 'stomach cramps', 'tummy ache'] },
  { name: 'bloating',         aliases: ['gas', 'flatulence', 'stomach gas', 'abdominal bloating'] },
  { name: 'chest pain',       aliases: ['chest tightness', 'chest pressure', 'chest discomfort'] },
  { name: 'shortness of breath', aliases: ['difficulty breathing', 'breathlessness', 'dyspnoea'] },
  { name: 'skin rash',        aliases: ['rash', 'skin eruption', 'hives', 'urticaria', 'itchy skin'] },
  { name: 'itching',          aliases: ['pruritus', 'skin itch', 'itchy'] },
  { name: 'watery eyes',      aliases: ['eye discharge', 'tearing', 'lacrimation'] },
  { name: 'loss of appetite', aliases: ['no appetite', 'anorexia', 'not hungry'] },
  { name: 'dizziness',        aliases: ['vertigo', 'lightheadedness', 'feeling faint'] },
  { name: 'joint pain',       aliases: ['arthralgia', 'joint ache', 'joint swelling'] },
  { name: 'sweating',         aliases: ['excessive sweating', 'night sweats', 'profuse sweating'] },
  { name: 'chills',           aliases: ['shivering', 'rigors', 'feeling cold'] },
  { name: 'swollen lymph nodes', aliases: ['lymphadenopathy', 'swollen glands', 'neck swelling'] },
  { name: 'ear pain',         aliases: ['earache', 'ear ache', 'pain in ear'] },
  { name: 'eye redness',      aliases: ['red eyes', 'conjunctival redness', 'bloodshot eyes'] },
  { name: 'frequent urination', aliases: ['polyuria', 'urinating often', 'increased urination'] },
  { name: 'excessive thirst', aliases: ['polydipsia', 'increased thirst', 'always thirsty'] },
  { name: 'blurred vision',   aliases: ['vision problems', 'unclear vision', 'hazy vision'] },
  { name: 'back pain',        aliases: ['lower back pain', 'lumbar pain', 'backache'] },
  { name: 'dark urine',       aliases: ['brown urine', 'tea-coloured urine', 'cola urine'] },
  { name: 'yellowing of skin', aliases: ['jaundice', 'yellow skin', 'yellow eyes', 'icterus'] },
  { name: 'wheezing',         aliases: ['whistling breath', 'noisy breathing'] },
  { name: 'anxiety',          aliases: ['nervousness', 'restlessness', 'panic attacks'] },
  { name: 'insomnia',         aliases: ['sleeplessness', 'difficulty sleeping', 'poor sleep'] },
];

// ─────────────────────────────────────────────────────────────────
// Condition definitions (references symptoms by name)
// ─────────────────────────────────────────────────────────────────
const CONDITION_DEFS = [
  {
    name: 'Common Cold',
    description:
      'A viral infection of the upper respiratory tract. Usually mild and self-limiting, lasting 7–10 days.',
    severity: 'mild',
    icdCode: 'J00',
    symptomWeights: {
      'runny nose': 5, 'nasal congestion': 4, 'sneezing': 4,
      'sore throat': 3, 'cough': 3, 'fatigue': 2, 'headache': 2, 'fever': 1,
    },
    medicineNames: ['Cetirizine', 'Paracetamol'],
    medicineNotes: {
      'Cetirizine': 'Reduces sneezing and runny nose',
      'Paracetamol': 'Relieves fever and sore throat pain',
    },
    selfCare: [
      'Rest and drink plenty of fluids',
      'Use saline nasal spray for congestion',
      'Gargle warm saltwater for sore throat',
      'Avoid cold beverages',
    ],
    warningSignsToSeeDoctor: [
      'Fever above 39.4°C (103°F)',
      'Symptoms lasting more than 10 days',
      'Difficulty breathing',
      'Severe headache or sinus pain',
    ],
  },
  {
    name: 'Influenza (Flu)',
    description:
      'A contagious respiratory illness caused by influenza viruses. More severe than a common cold.',
    severity: 'moderate',
    icdCode: 'J11',
    symptomWeights: {
      'fever': 5, 'body ache': 5, 'fatigue': 5, 'cough': 4,
      'headache': 4, 'chills': 4, 'sore throat': 3, 'runny nose': 2, 'loss of appetite': 2,
    },
    medicineNames: ['Paracetamol', 'Ibuprofen'],
    medicineNotes: {
      'Paracetamol': 'Reduces fever and relieves aches',
      'Ibuprofen': 'Anti-inflammatory for body pain and fever',
    },
    selfCare: [
      'Rest and isolate to prevent spreading',
      'Stay well hydrated',
      'Use a humidifier',
      'Eat light, nutritious meals',
    ],
    warningSignsToSeeDoctor: [
      'Difficulty breathing or shortness of breath',
      'Persistent chest pain',
      'Severe vomiting',
      'Confusion or altered consciousness',
      'Symptoms that improve then return worse',
    ],
  },
  {
    name: 'Allergic Rhinitis',
    description:
      'Inflammation of the nose caused by allergens (pollen, dust, pet dander). Also known as hay fever.',
    severity: 'mild',
    icdCode: 'J30.1',
    symptomWeights: {
      'sneezing': 5, 'runny nose': 5, 'nasal congestion': 5,
      'itching': 4, 'watery eyes': 4, 'eye redness': 3, 'headache': 2,
    },
    medicineNames: ['Cetirizine'],
    medicineNotes: { 'Cetirizine': 'Antihistamine – take once daily, preferably at night' },
    selfCare: [
      'Avoid known allergens',
      'Keep windows closed during high pollen season',
      'Use air purifiers indoors',
      'Shower after outdoor activities',
    ],
    warningSignsToSeeDoctor: [
      'Severe difficulty breathing',
      'Symptoms not controlled with medication',
      'Persistent or worsening symptoms',
    ],
  },
  {
    name: 'Gastroenteritis (Stomach Flu)',
    description:
      'Inflammation of the stomach and intestines, typically from a viral or bacterial infection.',
    severity: 'moderate',
    icdCode: 'K52.9',
    symptomWeights: {
      'nausea': 5, 'vomiting': 5, 'diarrhoea': 5, 'stomach pain': 4,
      'fever': 3, 'fatigue': 3, 'loss of appetite': 3,
    },
    medicineNames: ['Paracetamol'],
    medicineNotes: { 'Paracetamol': 'For fever and stomach cramps' },
    selfCare: [
      'Oral rehydration salts (ORS) to prevent dehydration',
      'Eat bland foods: rice, bananas, toast',
      'Avoid dairy, fatty, or spicy foods',
      'Rest and avoid strenuous activity',
    ],
    warningSignsToSeeDoctor: [
      'Signs of severe dehydration (no urination, dry mouth, confusion)',
      'Blood in stools or vomit',
      'Fever above 39°C',
      'Symptoms lasting more than 3 days',
    ],
  },
  {
    name: 'Bacterial Throat Infection (Strep Throat)',
    description:
      'A bacterial infection of the throat and tonsils caused by Streptococcus bacteria.',
    severity: 'moderate',
    icdCode: 'J02.0',
    symptomWeights: {
      'sore throat': 5, 'fever': 4, 'swollen lymph nodes': 4,
      'headache': 3, 'fatigue': 3, 'body ache': 2, 'loss of appetite': 2,
    },
    medicineNames: ['Azithromycin', 'Paracetamol'],
    medicineNotes: {
      'Azithromycin': 'Antibiotic – complete the full course even if you feel better',
      'Paracetamol': 'Pain relief for throat soreness and fever',
    },
    selfCare: [
      'Drink warm liquids (honey-lemon tea)',
      'Gargle warm saltwater',
      'Use throat lozenges',
      'Avoid irritants like smoke',
    ],
    warningSignsToSeeDoctor: [
      'Difficulty swallowing or breathing',
      'Rash developing after sore throat (scarlet fever)',
      'Throat abscess (tonsil very swollen on one side)',
      'No improvement after 48h of antibiotics',
    ],
  },
  {
    name: 'Type 2 Diabetes (Early Signs)',
    description:
      'A metabolic disorder characterized by high blood sugar. Early symptoms are often subtle.',
    severity: 'severe',
    icdCode: 'E11',
    symptomWeights: {
      'frequent urination': 5, 'excessive thirst': 5, 'fatigue': 4,
      'blurred vision': 4, 'loss of appetite': 2, 'sweating': 2, 'dizziness': 2,
    },
    medicineNames: ['Metformin'],
    medicineNotes: {
      'Metformin': 'First-line medication – take with food to reduce GI side effects',
    },
    selfCare: [
      'Maintain a healthy diet low in refined sugars',
      'Exercise regularly (150 min/week)',
      'Monitor blood sugar levels',
      'Maintain healthy body weight',
    ],
    warningSignsToSeeDoctor: [
      'Extreme fatigue or weakness',
      'Sudden vision changes',
      'Sores that heal very slowly',
      'Tingling or numbness in hands/feet',
      'Any suspicion of high blood sugar – see a doctor immediately',
    ],
  },
  {
    name: 'Migraine',
    description:
      'A neurological condition causing intense, often one-sided headaches, sometimes with aura.',
    severity: 'moderate',
    icdCode: 'G43.9',
    symptomWeights: {
      'headache': 5, 'nausea': 4, 'vomiting': 3, 'dizziness': 3,
      'blurred vision': 3, 'fatigue': 2, 'sweating': 1,
    },
    medicineNames: ['Paracetamol', 'Ibuprofen'],
    medicineNotes: {
      'Paracetamol': 'First-line for mild to moderate migraines',
      'Ibuprofen': 'Effective for pain and inflammation',
    },
    selfCare: [
      'Rest in a dark, quiet room',
      'Apply a cold or warm compress to your head',
      'Stay hydrated',
      'Avoid known migraine triggers (bright lights, certain foods)',
    ],
    warningSignsToSeeDoctor: [
      'Worst headache of your life (thunderclap)',
      'Headache with fever and stiff neck',
      'Neurological symptoms (weakness, speech problems)',
      'Headaches becoming more frequent',
    ],
  },
  {
    name: 'Asthma',
    description:
      'A chronic respiratory condition causing airway inflammation and narrowing, leading to breathing difficulty.',
    severity: 'severe',
    icdCode: 'J45.9',
    symptomWeights: {
      'wheezing': 5, 'shortness of breath': 5, 'cough': 4, 'chest pain': 4, 'fatigue': 2,
    },
    medicineNames: ['Ibuprofen'],
    medicineNotes: {
      'Ibuprofen': 'Note: NSAIDs can worsen asthma – consult your doctor before use',
    },
    selfCare: [
      'Identify and avoid triggers (dust, smoke, pets)',
      'Use a prescribed inhaler as directed',
      'Monitor peak flow readings',
      'Keep indoor air clean',
    ],
    warningSignsToSeeDoctor: [
      'Severe breathing difficulty',
      'Blue lips or fingernails (cyanosis)',
      'Inhaler not providing relief',
      'Rapid worsening of symptoms',
    ],
  },
  {
    name: 'Viral Conjunctivitis (Pink Eye)',
    description:
      'Inflammation of the clear membrane covering the eye, caused by viruses. Highly contagious.',
    severity: 'mild',
    icdCode: 'H10.30',
    symptomWeights: {
      'eye redness': 5, 'watery eyes': 5, 'itching': 4, 'fever': 1, 'runny nose': 2,
    },
    medicineNames: ['Cetirizine'],
    medicineNotes: { 'Cetirizine': 'May help with allergic component; antiviral drops prescribed by doctor' },
    selfCare: [
      'Clean discharge with clean warm cloth',
      'Avoid touching or rubbing your eyes',
      'Wash hands frequently',
      'Avoid sharing towels or pillowcases',
    ],
    warningSignsToSeeDoctor: [
      'Vision changes or loss',
      'Intense eye pain',
      'Symptoms lasting more than 1 week',
      'Sensitivity to light',
    ],
  },
  {
    name: 'Urinary Tract Infection (UTI)',
    description:
      'A bacterial infection affecting the urinary system. More common in women.',
    severity: 'moderate',
    icdCode: 'N39.0',
    symptomWeights: {
      'frequent urination': 5, 'stomach pain': 3, 'fever': 3,
      'fatigue': 2, 'nausea': 2,
    },
    medicineNames: ['Azithromycin'],
    medicineNotes: { 'Azithromycin': 'Antibiotic – specific antibiotic chosen by doctor based on culture' },
    selfCare: [
      'Drink plenty of water (8+ glasses/day)',
      'Urinate frequently; do not hold urine',
      'Avoid caffeine and alcohol',
      'Use a heating pad for stomach discomfort',
    ],
    warningSignsToSeeDoctor: [
      'Fever with back/flank pain (possible kidney infection)',
      'Blood in urine',
      'Symptoms not improving in 2–3 days',
      'Recurrent UTIs',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────
// Seed function
// ─────────────────────────────────────────────────────────────────
const run = async () => {
  try {
    await connectDB();
    console.log('🌱 Connected to DB – seeding diagnosis data...\n');

    // Clear existing diagnosis data
    await Symptom.deleteMany({});
    await Condition.deleteMany({});
    await DiagnosisLog.deleteMany({});
    console.log('✓ Cleared old diagnosis data');

    // Insert symptoms
    const insertedSymptoms = await Symptom.insertMany(SYMPTOMS);
    console.log(`✓ Inserted ${insertedSymptoms.length} symptoms`);

    // Build lookup map: symptom name → ObjectId
    const symptomMap = {};
    insertedSymptoms.forEach((s) => { symptomMap[s.name] = s._id; });

    // Fetch medicine map: medicine name → ObjectId
    const medicines = await Medicine.find({}).lean();
    const medicineMap = {};
    medicines.forEach((m) => { medicineMap[m.name] = m._id; });
    console.log(`✓ Found ${medicines.length} medicines in DB`);

    // Build condition documents
    const conditionDocs = [];

    for (const def of CONDITION_DEFS) {
      const symptoms = [];
      for (const [sName, weight] of Object.entries(def.symptomWeights)) {
        if (symptomMap[sName]) {
          symptoms.push({ symptom: symptomMap[sName], weight });
        } else {
          console.warn(`  ⚠ Symptom not found: "${sName}" (skipping)`);
        }
      }

      const recommendedMedicines = [];
      for (const mName of def.medicineNames) {
        if (medicineMap[mName]) {
          recommendedMedicines.push({
            medicine: medicineMap[mName],
            note: def.medicineNotes[mName] || '',
          });
        } else {
          console.warn(`  ⚠ Medicine not found: "${mName}" – add it via POST /api/medicines`);
        }
      }

      conditionDocs.push({
        name: def.name,
        description: def.description,
        severity: def.severity,
        icdCode: def.icdCode,
        symptoms,
        recommendedMedicines,
        selfCare: def.selfCare || [],
        warningSignsToSeeDoctor: def.warningSignsToSeeDoctor || [],
      });
    }

    const insertedConditions = await Condition.insertMany(conditionDocs);
    console.log(`✓ Inserted ${insertedConditions.length} conditions`);

    console.log('\n✅ Diagnosis seed complete!\n');
    console.log('API endpoints now available:');
    console.log('  GET  /api/diagnosis/symptoms?q=fever');
    console.log('  POST /api/diagnosis/analyze   { "symptoms": ["fever","headache"] }');
    console.log('  GET  /api/diagnosis/conditions');
    console.log('  GET  /api/diagnosis/conditions/:id');
    console.log('  GET  /api/diagnosis/history   (requires JWT token)');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
};

run();
