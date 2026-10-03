import mongoose from 'mongoose';

mongoose.set('strictQuery', true);

export async function connectDatabase(uri) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  // Build declared indexes (unique orderId, clientRequestId, mobileNumber) before taking traffic.
  await Promise.all(Object.values(mongoose.models).map((model) => model.createIndexes()));
  return mongoose.connection;
}

export function disconnectDatabase() {
  return mongoose.disconnect();
}
