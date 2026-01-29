const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const mqtt = require('mqtt');
const path = require('path');

const monitoringRoutes = require('./routes/monitoringRoutes');
const alsintanRoutes = require('./routes/alsintanRoutes');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/monitoring', require('./routes/monitoringRoutes'));
app.use('/api/alsintan', require('./routes/alsintanRoutes'));

app.get('/', (req, res) => {
    res.send('Server Backend Alsintan Berjalan');
});

app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});