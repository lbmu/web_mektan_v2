const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const mqtt = require('mqtt');

const monitoringRoutes = require('./routes/monitoringRoutes');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.use('/api/monitoring', require('./routes/monitoringRoutes'));

app.get('/', (req, res) => {
    res.send('Server Backend Alsintan Berjalan');
});

app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});