const express = require('express');

const app = express();

// Global Middleware
app.use(express.json());

// Auth Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/debtors', require('./routes/debtor.routes'));
app.use('/api/charges', require('./routes/charge.routes'));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
  });
});

module.exports = app;