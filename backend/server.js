const app = require('./src/app');
const connectDB = require('./src/config/db');
const dns = require('dns');

dns.setServers(['1.1.1.1', '8.8.8.8']);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();