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
  if (client && client.topology && client.topology.isConnected()) {
    return db;
  }

  try {
    console.log('Connecting to MongoDB...');
    console.log('URI:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
    
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    
    await client.connect();
    db = client.db(DB_NAME);
    collection = db.collection(COLLECTION_NAME);
    
    console.log('✅ Connected to MongoDB successfully');
    console.log('Database:', DB_NAME);
    console.log('Collection:', COLLECTION_NAME);
    
    // Test connection
    await db.admin().ping();
    console.log('✅ MongoDB ping successful');
    
    // Create indexes for better performance
    await collection.createIndex({ created_at: -1 });
    console.log('✅ Index created on created_at');
    
    // Insert initial thoughts if collection is empty
    await insertInitialThoughts();
    
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    console.error('Error details:', error.message);
    throw error;
  }
}

// Insert initial thoughts if database is empty
async function insertInitialThoughts() {
  try {
    console.log('Checking if collection is empty...');
    const count = await collection.countDocuments();
    console.log('Current document count:', count);
    
    if (count === 0) {
      console.log('Collection is empty, inserting initial thoughts...');
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

      const result = await collection.insertMany(initialThoughts);
      console.log('✅ Initial thoughts inserted into MongoDB:', result.insertedCount, 'documents');
    } else {
      console.log('✅ Collection already has', count, 'documents');
    }
  } catch (error) {
    console.error('❌ Error inserting initial thoughts:', error);
    console.error('Error details:', error.message);
    throw error;
  }
}

// Main handler function for Vercel
module.exports = async (req, res) => {
  console.log('🚀 API Request:', req.method, req.url);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight handled');
    return res.status(200).end();
  }

  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    await connectToDatabase();
    console.log('✅ Database connected');
    
    const method = req.method;
    const { query } = req;

    if (method === 'GET') {
      console.log('📖 Getting all thoughts...');
      // Get all thoughts
      const thoughts = await collection
        .find({})
        .sort({ created_at: -1 })
        .toArray();
      
      console.log('✅ Retrieved', thoughts.length, 'thoughts');
      res.status(200).json(thoughts);
    }
    else if (method === 'POST') {
      console.log('➕ Adding new thought...');
      // Add a new thought
      const { emoji, text } = req.body;
      
      if (!emoji || !text) {
        console.log('❌ Missing emoji or text');
        return res.status(400).json({ error: 'Emoji and text are required' });
      }

      const newThought = {
        emoji,
        text,
        created_at: new Date()
      };

      console.log('📝 Inserting thought:', { emoji, text: text.substring(0, 50) + '...' });

      const result = await collection.insertOne(newThought);
      const insertedThought = await collection.findOne({ _id: result.insertedId });
      
      console.log('✅ Thought inserted successfully:', result.insertedId);
      res.status(201).json(insertedThought);
    }
    else if (method === 'DELETE') {
      console.log('🗑️ Deleting all thoughts...');
      // Delete all thoughts (database cleanup)
      const { confirm } = query;
      
      if (confirm !== 'yes') {
        return res.status(400).json({ error: 'Add ?confirm=yes to delete all thoughts' });
      }

      const result = await collection.deleteMany({});
      console.log('✅ Deleted', result.deletedCount, 'thoughts');
      res.status(200).json({ 
        message: 'All thoughts deleted successfully',
        deletedCount: result.deletedCount 
      });
    }
    else {
      console.log('❌ Method not allowed:', method);
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('❌ API Error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};
