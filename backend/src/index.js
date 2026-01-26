require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testConnection } = require('./config/db');
const studentRoutes = require('./routes/students');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/students', studentRoutes);

const startServer = async () => {
  let retries = 10;

  while (retries > 0) {
    const connected = await testConnection();
    if (connected) {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
      return;
    }

    console.log(`Database not ready, retrying... (${retries} attempts left)`);
    retries--;
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  console.error('Could not connect to database after multiple attempts');
  process.exit(1);
};

startServer();
