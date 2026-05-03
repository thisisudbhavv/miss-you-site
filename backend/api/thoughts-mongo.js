const { MongoClient } = require('mongodb');

// MongoDB connection - you'll need to set these environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://memories-user:memories123@memories-cluster.jhf435a.mongodb.net/?appName=memories-cluster';
const DB_NAME = process.env.DB_NAME || 'random-thoughts';
const COLLECTION_NAME = 'thoughts';

let client;
let db;
let collection;

// Initialize MongoDB connection
async function connectToDatabase() {
  if (client && client.isConnected()) {
    return db;
  }

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    collection = db.collection(COLLECTION_NAME);
    
    console.log('Connected to MongoDB');
    
    // Create indexes for better performance
    await collection.createIndex({ created_at: -1 });
    
    // Insert initial thoughts if collection is empty
    await insertInitialThoughts();
    
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Insert initial thoughts if database is empty
async function insertInitialThoughts() {
  try {
    const count = await collection.countDocuments();
    if (count === 0) {
      const initialThoughts = [
        { 
          emoji: "🥺", 
          text: "You're my cutie patotie",
          created_at: new Date()
        },
        { 
          emoji: "🤗", 
          text: "I want to hug you so tightly right now",
          created_at: new Date()
        },
        { 
          emoji: "💕", 
          text: "Jb khali baithate to hme apni cute memories yaad aati, remember jb hmlog holi ke time sath the aur bruno gye the and we played jenga there. Kitna pyara din tha vo.",
          created_at: new Date()
        },
        { 
          emoji: "💋", 
          text: "Labubu my bebu",
          created_at: new Date()
        }
      ];

      await collection.insertMany(initialThoughts);
      console.log('Initial thoughts inserted into MongoDB');
    }
  } catch (error) {
    console.error('Error inserting initial thoughts:', error);
  }
}

// Main handler function for Vercel
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Connect to database
    await connectToDatabase();
    
    const method = req.method;
    const { query } = req;

    if (method === 'GET') {
      // Get all thoughts
      const thoughts = await collection
        .find({})
        .sort({ created_at: -1 })
        .toArray();
      
      res.status(200).json(thoughts);
    }
    else if (method === 'POST') {
      // Add a new thought
      const { emoji, text } = req.body;
      
      if (!emoji || !text) {
        return res.status(400).json({ error: 'Emoji and text are required' });
      }

      const newThought = {
        emoji,
        text,
        created_at: new Date()
      };

      const result = await collection.insertOne(newThought);
      const insertedThought = await collection.findOne({ _id: result.insertedId });
      
      res.status(201).json(insertedThought);
    }
    else if (method === 'DELETE') {
      // Delete all thoughts (database cleanup)
      const { confirm } = query;
      
      if (confirm !== 'yes') {
        return res.status(400).json({ error: 'Add ?confirm=yes to delete all thoughts' });
      }

      const result = await collection.deleteMany({});
      res.status(200).json({ 
        message: 'All thoughts deleted successfully',
        deletedCount: result.deletedCount 
      });
    }
    else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
