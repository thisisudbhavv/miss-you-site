const sqlite3 = require('sqlite3').verbose();

// Initialize database (will be created in /tmp on Vercel)
const db = new sqlite3.Database('/tmp/thoughts.db', (err) => {
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
    { emoji: "🥺", text: "You're my cutie patotie" },
    { emoji: "🤗", text: "I want to hug you so tightly right now" },
    { emoji: "💕", text: "Jb khali baithate to hme apni cute memories yaad aati, remember jb hmlog holi ke time sath the aur bruno gye the and we played jenga there. Kitna pyara din tha vo." },
    { emoji: "💋", text: "Labubu my bebu" }
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

// API handler function for Vercel
export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { method, query } = req;

  if (method === 'GET') {
    // Get all thoughts
    db.all("SELECT * FROM thoughts ORDER BY created_at DESC", (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(200).json(rows);
    });
  } 
  else if (method === 'POST') {
    // Add a new thought
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
        res.status(201).json({ 
          id: this.lastID, 
          emoji, 
          text,
          created_at: new Date().toISOString()
        });
      }
    );
  }
  else if (method === 'DELETE') {
    // Delete all thoughts (database cleanup)
    const { confirm } = query;
    
    if (confirm !== 'yes') {
      return res.status(400).json({ error: 'Add ?confirm=yes to delete all thoughts' });
    }

    db.run("DELETE FROM thoughts", function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(200).json({ 
        message: 'All thoughts deleted successfully',
        deletedCount: this.changes 
      });
    });
  }
  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// Export for Vercel
module.exports = handler;
