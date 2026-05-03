# 🗄️ MongoDB Atlas Setup Guide

## 🚀 Why MongoDB?
- **Persistent storage** - Your memories will never disappear
- **Free tier** - 512MB storage (plenty for your thoughts)
- **NoSQL** - Perfect for simple thought objects
- **Global CDN** - Fast access from anywhere

## 📋 Step-by-Step Setup

### **1. Create MongoDB Atlas Account**
1. Go to: https://www.mongodb.com/atlas
2. Click **"Try Free"**
3. Sign up with Google/GitHub or email

### **2. Create Your First Cluster**
1. Click **"Create a Cluster"**
2. Choose **"M0 Sandbox"** (FREE)
3. Select a cloud provider (AWS recommended)
4. Choose a region close to you (e.g., Mumbai, Singapore)
5. Leave cluster name as default or change to "memories-cluster"
6. Click **"Create Cluster"**

### **3. Create Database User**
1. Go to **"Database Access"** (left sidebar)
2. Click **"Add New Database User"**
3. Username: `memories-user` (or your choice)
4. Password: Create a strong password (save it!) (memories123)
5. Click **"Add User"**

### **4. Configure Network Access**
1. Go to **"Network Access"** (left sidebar)
2. Click **"Add IP Address"**
3. Select **"Allow Access from Anywhere"** (0.0.0.0/0)
4. Click **"Confirm"**

### **5. Get Connection String**
1. Go to **"Database"** → **"Connect"**
2. Select **"Drivers"**
3. Copy the connection string
4. It looks like: `mongodb+srv://<username>:<password>@cluster.mongodb.net/`
mongodb+srv://memories-user:memories123@memories-cluster.jhf435a.mongodb.net/?appName=memories-cluster

### **6. Update Your Code**
Replace the connection string in your backend:
```javascript
// In backend/api/thoughts-mongo.js
const MONGODB_URI = 'mongodb+srv://memories-user:memories123@memories-cluster.jhf435a.mongodb.net/random-thoughts';
```

## 🔧 Environment Variables Setup

### **For Vercel:**
1. Go to your Vercel project dashboard
2. Click **"Settings"** → **"Environment Variables"**
3. Add these variables:
   - `MONGODB_URI`: Your full connection string
   - `DB_NAME`: `random-thoughts` (or your choice)

### **For Local Development:**
Create a `.env` file in the backend folder:
```env
MONGODB_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/random-thoughts
DB_NAME=random-thoughts
```

## 🚀 Deploy to Vercel

### **1. Update vercel.json**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "backend/api/thoughts-mongo.js",
      "use": "@vercel/node"
    },
    {
      "src": "frontend/index.html",
      "use": "@vercel/static"
    },
    {
      "src": "frontend/*.jpeg",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/thoughts",
      "dest": "/backend/api/thoughts-mongo.js"
    },
    {
      "src": "/(.*)",
      "dest": "/frontend/index.html"
    }
  ]
}
```

### **2. Update Dependencies**
```bash
cd backend
npm install mongodb
```

### **3. Push and Deploy**
```bash
git add .
git commit -m "Switch to MongoDB for persistent storage"
git push origin main
```

## 🎯 Testing Your Setup

### **1. Local Testing:**
```bash
cd backend
node -e "
const { MongoClient } = require('mongodb');
MongoClient.connect('your-connection-string')
  .then(() => console.log('✅ MongoDB connected!'))
  .catch(err => console.error('❌ Connection failed:', err));
"
```

### **2. API Testing:**
```bash
# Test GET thoughts
curl https://your-app.vercel.app/api/thoughts

# Test POST thought
curl -X POST https://your-app.vercel.app/api/thoughts \
  -H "Content-Type: application/json" \
  -d '{"emoji":"💕","text":"Test memory"}'
```

## 💡 Important Notes

### **Security:**
- Never commit your connection string to Git
- Use environment variables always
- Keep your database user permissions minimal

### **Performance:**
- MongoDB Atlas free tier has connection limits
- Your app will work fine for personal use
- Consider upgrading if you get high traffic

### **Backup:**
- MongoDB Atlas automatically backs up your data
- You can export data anytime from the Atlas dashboard

## 🛠️ Troubleshooting

**"Connection failed"**
- Check IP whitelist (0.0.0.0/0)
- Verify username/password
- Check connection string format

**"Authentication failed"**
- Ensure database user has correct permissions
- Double-check password
- Make sure user is created in the right cluster

**"Network timeout"**
- Check if cluster is running
- Verify region selection
- Try different connection method (SRV vs standard)

Your memories will now persist forever! 💕
Both you and your partner can add thoughts that will never disappear.
