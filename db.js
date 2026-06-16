const { MongoClient } = require("mongodb");

const DB_NAME = process.env.MONGODB_DB_NAME || "rawtee";
const ORDERS_COLLECTION = "orders";

let client;
let dbPromise;
let indexesReady = false;

function getDb() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set in environment variables");
  }

  if (!dbPromise) {
    client = new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 0,
      maxIdleTimeMS: 10000,
      serverSelectionTimeoutMS: 5000,
    });
    dbPromise = client
      .connect()
      .then(() => client.db(DB_NAME))
      .catch((err) => {
        dbPromise = null;
        throw err;
      });
  }

  return dbPromise;
}

async function ensureIndexes(collection) {
  if (indexesReady) return;
  await Promise.all([
    collection.createIndex({ orderId: 1 }, { unique: true }),
    collection.createIndex({ tracker: 1 }),
    collection.createIndex({ createdAt: -1 }),
  ]);
  indexesReady = true;
}

async function ordersCollection() {
  const db = await getDb();
  const collection = db.collection(ORDERS_COLLECTION);
  await ensureIndexes(collection);
  return collection;
}

async function getOrders() {
  const collection = await ordersCollection();
  return collection.find({}).sort({ createdAt: -1 }).toArray();
}

async function getOrderByOrderId(orderId) {
  const collection = await ordersCollection();
  return collection.findOne({ orderId });
}

async function createOrder(order) {
  const collection = await ordersCollection();
  await collection.insertOne(order);
  return order;
}

async function updateOrderByOrderId(orderId, patch) {
  const collection = await ordersCollection();
  const result = await collection.findOneAndUpdate(
    { orderId },
    { $set: patch },
    { returnDocument: "after" }
  );
  return result;
}

module.exports = {
  getOrders,
  getOrderByOrderId,
  createOrder,
  updateOrderByOrderId,
};
