const { MongoClient } = require("mongodb");

const DB_NAME = process.env.MONGODB_DB_NAME || "rawtee";
const ORDERS_COLLECTION = "orders";

let client;
let dbPromise;

function getDb() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set in environment variables");
  }

  if (!dbPromise) {
    client = new MongoClient(process.env.MONGODB_URI);
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

async function ordersCollection() {
  const db = await getDb();
  const collection = db.collection(ORDERS_COLLECTION);
  await collection.createIndex({ orderId: 1 }, { unique: true });
  await collection.createIndex({ tracker: 1 });
  await collection.createIndex({ createdAt: -1 });
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
