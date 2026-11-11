const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

let sqlite3;
try {
  sqlite3 = require('sqlite3').verbose();
} catch (e) {
  console.warn('sqlite3 native addon not available, using in-memory store:', e.message);
}

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

// Middleware
app.use(cors());
app.use(express.json());

// In-memory fallback and seed thoughts
const initialThoughts = [
  { emoji: "🥺", text: "You're my cutie patotie" },
  { emoji: "🤗", text: "I want to hug you so tightly right now" },
  { emoji: "💕", text: "Jb khali baithate to hme apni cute memories yaad aati, remember jb hmlog holi ke time sath the aur bruno gye the and we played jenga there. Kitna pyara din tha vo." },
  { emoji: "💋", text: "Labubu my bebu" },
  { emoji: "🥺", text: "You're cute\n(just saying)" },
  { emoji: "📞", text: "I miss your voice" },
  { emoji: "🤗", text: "You owe me a hug btw" },
  { emoji: "😤", text: "I was gonna text you but... here we are" },
  { emoji: "🌙", text: "You randomly pop into my head at 2 am" },
  { emoji: "🎵", text: "That one song reminded me of you again" },
  { emoji: "😭", text: "Why do you have to be so... you" },
  { emoji: "🍕", text: "I wanna eat pizza with you" }
];

let inMemoryThoughts = initialThoughts.map((t, idx) => ({
  id: idx + 1,
  emoji: t.emoji,
  text: t.text,
  created_at: new Date(Date.now() - (initialThoughts.length - idx) * 60000).toISOString()
}));

let nextId = inMemoryThoughts.length + 1;
let db = null;
let dbReady = false;

if (sqlite3) {
  try {
    const dbPath = path.join(__dirname, 'thoughts.db');
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.warn('Could not open SQLite database, falling back to in-memory store:', err.message);
        db = null;
      } else {
        console.log('Connected to SQLite database at', dbPath);
        db.run(`CREATE TABLE IF NOT EXISTS thoughts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          emoji TEXT NOT NULL,
          text TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (createErr) => {
          if (createErr) {
            console.error('Error creating thoughts table:', createErr.message);
          } else {
            db.get("SELECT COUNT(*) as count FROM thoughts", (countErr, row) => {
              if (!countErr && row && row.count === 0) {
                const stmt = db.prepare("INSERT INTO thoughts (emoji, text) VALUES (?, ?)");
                initialThoughts.forEach((t) => {
                  stmt.run(t.emoji, t.text);
                });
                stmt.finalize(() => {
                  console.log('Initial thoughts seeded into SQLite database');
                  dbReady = true;
                });
              } else {
                dbReady = true;
              }
            });
          }
        });
      }
    });
  } catch (err) {
    console.warn('SQLite initialization error, falling back to in-memory store:', err.message);
    db = null;
  }
}

// Serve static assets from root and frontend folder
app.use(express.static(path.join(__dirname, 'frontend')));
app.use(express.static(path.join(__dirname)));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', db: dbReady ? 'sqlite' : 'memory' });
});

// GET all thoughts
app.get('/api/thoughts', (req, res) => {
  if (db && dbReady) {
    db.all("SELECT * FROM thoughts ORDER BY created_at DESC, id DESC", (err, rows) => {
      if (err) {
        console.warn('SQLite query error, falling back to memory:', err.message);
        res.json(inMemoryThoughts);
      } else {
        res.json(rows);
      }
    });
  } else {
    res.json(inMemoryThoughts);
  }
});

// POST a new thought
app.post('/api/thoughts', (req, res) => {
  const { emoji, text } = req.body;
  if (!emoji || !text) {
    return res.status(400).json({ error: 'Emoji and text are required' });
  }

  const created_at = new Date().toISOString();

  if (db && dbReady) {
    db.run(
      "INSERT INTO thoughts (emoji, text) VALUES (?, ?)",
      [emoji, text],
      function (err) {
        if (err) {
          console.warn('SQLite insert error, falling back to memory:', err.message);
          const newThought = { id: nextId++, emoji, text, created_at };
          inMemoryThoughts.unshift(newThought);
          return res.status(201).json(newThought);
        }
        const insertedThought = { id: this.lastID, emoji, text, created_at };
        inMemoryThoughts.unshift(insertedThought);
        res.status(201).json(insertedThought);
      }
    );
  } else {
    const newThought = { id: nextId++, emoji, text, created_at };
    inMemoryThoughts.unshift(newThought);
    res.status(201).json(newThought);
  }
});

// DELETE a single thought
app.delete('/api/thoughts/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  inMemoryThoughts = inMemoryThoughts.filter(t => t.id !== id);

  if (db && dbReady) {
    db.run("DELETE FROM thoughts WHERE id = ?", [id], (err) => {
      if (err) {
        console.warn('SQLite delete error:', err.message);
      }
      res.json({ message: 'Thought deleted successfully' });
    });
  } else {
    res.json({ message: 'Thought deleted successfully' });
  }
});

// DELETE all thoughts (optional cleanup)
app.delete('/api/thoughts', (req, res) => {
  if (req.query.confirm !== 'yes') {
    return res.status(400).json({ error: 'Add ?confirm=yes to delete all thoughts' });
  }

  inMemoryThoughts = [];
  if (db && dbReady) {
    db.run("DELETE FROM thoughts", function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'All thoughts deleted successfully', deletedCount: this.changes });
    });
  } else {
    res.json({ message: 'All thoughts deleted successfully' });
  }
});

// Serve main page
app.get('/', (req, res) => {
  const frontendIndex = path.join(__dirname, 'frontend', 'index.html');
  const rootIndex = path.join(__dirname, 'index.html');
  const fallback = path.join(__dirname, 'random-thoughts-about-you.html');

  if (fs.existsSync(frontendIndex)) {
    res.sendFile(frontendIndex);
  } else if (fs.existsSync(rootIndex)) {
    res.sendFile(rootIndex);
  } else {
    res.sendFile(fallback);
  }
});

// Serve alternate HTML if requested explicitly
app.get('/random-thoughts-about-you.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'random-thoughts-about-you.html'));
});

// Start server on 0.0.0.0:3000
const server = app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  if (db) {
    db.close(() => {
      console.log('Database connection closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
