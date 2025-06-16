const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const PORT = 4000;

app.use(cors());
app.use(bodyParser.json());

const DATA_FILE = './workers.json';

// Load workers from file
let workers = [];
let nextId = 1;
if (fs.existsSync(DATA_FILE)) {
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  workers = data.workers || [];
  nextId = data.nextId || 1;
}

// Save workers to file
function saveWorkers() {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ workers, nextId }, null, 2));
}

// Worker self-registration
app.post('/api/register', (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) return res.status(400).json({ error: "Name and password required" });
  if (workers.find(w => w.name === name)) return res.status(409).json({ error: "Username already exists" });
  workers.push({ id: nextId++, name, password, attendance: [] });
  saveWorkers();
  res.json({ success: true });
});

// Worker login
app.post('/api/login', (req, res) => {
  const { name, password } = req.body;
  const worker = workers.find(w => w.name === name && w.password === password);
  if (!worker) return res.status(401).json({ error: "Invalid credentials" });
  res.json({ id: worker.id, name: worker.name });
});

// List all workers (for admin)
app.get('/api/workers', (req, res) => {
  res.json(workers.map(({ password, ...rest }) => rest));
});

// Edit worker info (admin)
app.put('/api/workers/:id', (req, res) => {
  const w = workers.find(w => w.id == req.params.id);
  if (!w) return res.status(404).json({ error: "Not found" });
  w.name = req.body.name ?? w.name;
  w.pf = req.body.pf ?? w.pf;
  w.income = req.body.income ?? w.income;
  if (req.body.password !== undefined) w.password = req.body.password;
  saveWorkers();
  res.json({ success: true });
});

// Remove worker (admin)
app.delete('/api/workers/:id', (req, res) => {
  workers = workers.filter(w => w.id != req.params.id);
  saveWorkers();
  res.json({ success: true });
});

// Mark attendance (entry/exit)
app.post('/api/attendance/:id', (req, res) => {
  const w = workers.find(w => w.id == req.params.id);
  if (!w) return res.status(404).json({ error: "Not found" });
  const { type } = req.body; // "entry" or "exit"
  if (!["entry", "exit"].includes(type)) return res.status(400).json({ error: "Invalid type" });
  w.attendance.push({ type, time: new Date().toISOString() });
  saveWorkers();
  res.json({ success: true });
});

// Reports
app.get('/api/reports', (req, res) => {
  const attendanceReport = workers.map(w => ({
    name: w.name,
    totalEntries: w.attendance.filter(a => a.type === 'entry').length,
    totalExits: w.attendance.filter(a => a.type === 'exit').length,
    pf: w.pf,
    income: w.income
  }));
  res.json({ attendanceReport });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
