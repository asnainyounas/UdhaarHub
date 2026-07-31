const mongoose = require('mongoose');
const config = require('./config');
const dns = require('dns');

dns.setServers(['1.1.1.1', '8.8.8.8']);
async function coonectDB() {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log('db connected');
  } catch (err) {
    console.log(err);
      throw err; 
  }
}

module.exports = coonectDB;