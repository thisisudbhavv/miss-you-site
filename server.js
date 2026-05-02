const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Initialize SQLite database
const db = new sqlite3.Database('./thoughts.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    // Create thoughts table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS thoughts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      emoji TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating table:', err.message);
      } else {
        console.log('Thoughts table ready');
        // Insert initial thoughts if table is empty
        insertInitialThoughts();
      }
    });
  }
});

// Insert initial thoughts if database is empty
function insertInitialThoughts() {
  const initialThoughts = [
    { emoji: "🥺", text: "You're cute\\n(just saying)" },
    { emoji: "📞", text: "I miss your voice" },
    { emoji: "🤗", text: "You owe me a hug btw" },
    { emoji: "😤", text: "I was gonna text you but... here we are" },
    { emoji: "🌙", text: "You randomly pop into my head at 2 am" },
    { emoji: "🎵", text: "That one song reminded me of you again" },
    { emoji: "😭", text: "Why do you have to be so... you" },
    { emoji: "🍕", text: "I wanna eat pizza with you" }
  ];

  db.get("SELECT COUNT(*) as count FROM thoughts", (err, row) => {
    if (!err && row.count === 0) {
      const stmt = db.prepare("INSERT INTO thoughts (emoji, text) VALUES (?, ?)");
      initialThoughts.forEach(thought => {
        stmt.run(thought.emoji, thought.text);
      });
      stmt.finalize();
      console.log('Initial thoughts inserted');
    }
  });
}

// API Routes

// Get all thoughts
app.get('/api/thoughts', (req, res) => {
  db.all("SELECT * FROM thoughts ORDER BY created_at DESC", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Add a new thought
app.post('/api/thoughts', (req, res) => {
  const { emoji, text } = req.body;
  
  if (!emoji || !text) {
    return res.status(400).json({ error: 'Emoji and text are required' });
  }

  db.run(
    "INSERT INTO thoughts (emoji, text) VALUES (?, ?)",
    [emoji, text],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ 
        id: this.lastID, 
        emoji, 
        text,
        created_at: new Date().toISOString()
      });
    }
  );
});

// Delete a thought (optional, for future use)
app.delete('/api/thoughts/:id', (req, res) => {
  const id = req.params.id;
  
  db.run("DELETE FROM thoughts WHERE id = ?", id, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: 'Thought deleted successfully' });
  });
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'random-thoughts-about-you.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Close database connection on server shutdown
process.on('SIGINT', () => {
  console.log('\\nShutting down server...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});
