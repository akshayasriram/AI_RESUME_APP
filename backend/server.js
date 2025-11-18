const express = require("express");
const cors = require("cors");
const fs = require("fs");
const multer = require("multer");
const pdfParse = require("pdf-parse");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// File to store resumes
const DATA_FILE = "resumes.json";

// ---------------- Helper functions ---------------- //
const readData = () => fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE)) : [];
const writeData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

// ---------------- Multer setup for PDF upload ---------------- //
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// ---------------- CRUD Routes ---------------- //

// Get all resumes
app.get("/getResumes", (req, res) => {
  res.json(readData());
});

// Add resume
app.post("/saveResume", (req, res) => {
  const resumes = readData();
  resumes.push(req.body);
  writeData(resumes);
  res.json({ message: "Resume saved successfully!" });
});

// Update resume
app.put("/updateResume/:index", (req, res) => {
  const index = parseInt(req.params.index);
  const resumes = readData();
  if (index >= 0 && index < resumes.length) {
    resumes[index] = req.body;
    writeData(resumes);
    res.json({ message: "Resume updated successfully!" });
  } else {
    res.status(400).json({ message: "Invalid index" });
  }
});

// Delete resume
app.delete("/deleteResume/:index", (req, res) => {
  const index = parseInt(req.params.index);
  const resumes = readData();
  if (index >= 0 && index < resumes.length) {
    resumes.splice(index, 1);
    writeData(resumes);
    res.json({ message: "Resume deleted successfully!" });
  } else {
    res.status(400).json({ message: "Invalid index" });
  }
});

// ---------------- Upload PDF and parse ---------------- //
app.post("/uploadResume", upload.single("resume"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file is uploaded" });
  }

  try {
    const buffer = fs.readFileSync(req.file.path);
    const data = await pdfParse(buffer);
    const text = data.text || "";

    // Extract email
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    const email = emailMatch ? emailMatch[0] : "";

    // Extract skills (basic example)
    const skillsList = ["JavaScript", "Python", "React", "Node", "Java", "C++", "SQL"];
    const skills = skillsList.filter(skill => text.toLowerCase().includes(skill.toLowerCase())).join(", ");

    res.json({
      name: req.body.name || "",
      email,
      skills,
    });
  } catch (err) {
    console.error("PDF parsing error:", err);
    res.status(500).json({ message: "Error parsing resume. Make sure it is a valid PDF." });
  }
});

// ---------------- Start server ---------------- //
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
