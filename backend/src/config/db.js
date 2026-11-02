// src/config/db.js
import mongoose from 'mongoose';

mongoose.set('strictQuery', true);

export async function connectDatabase(uri) {
  const isProduction = process.env.NODE_ENV === 'production';

  await mongoose.connect(uri, { 
    serverSelectionTimeoutMS: 10_000,
    autoIndex: !isProduction 
  });
  
  await ensureAtlasSearchIndex();
  
  return mongoose.connection;
}

export function disconnectDatabase() {
  return mongoose.disconnect();
}


async function ensureAtlasSearchIndex() {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection('products');
    const cursor = collection.listSearchIndexes();
    const indexes = await cursor.toArray();
    
    const hasDefaultIndex = indexes.some(idx => idx.name === 'default');
    
    if (!hasDefaultIndex) {
      console.log(' Atlas Search Index "default" create ho raha hai products collection par...');
      
      await collection.createSearchIndex({
        name: "default",
        definition: {
          mappings: {
            dynamic: false, 
            fields: {
              name: { type: "string", analyzer: "lucene.standard" },
              category: { type: "string", analyzer: "lucene.standard" },
              description: { type: "string", analyzer: "lucene.standard" }
            }
          }
        }
      });
      
      console.log('Atlas Search Index successfully created! (Index active hone me kuch seconds lag sakte hain)');
    } else {
      console.log(' Atlas Search Index "default" already exists.');
    }
  } catch (error) {
    console.warn(' Atlas Search index creation failed (Ignore if not using MongoDB Atlas):', error.message);
  }
}