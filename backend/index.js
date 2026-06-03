require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');
const path = require('path');

const monitoringRoutes = require('./routes/monitoringRoutes');
const alsintanRoutes = require('./routes/alsintanRoutes');
const userRoutes = require('./routes/userRoutes');
const settingRoutes = require('./routes/settingRoutes');

require('./services/mqttServices');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/monitoring', monitoringRoutes);
app.use('/api/alsintan', alsintanRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingRoutes);

app.get('/', (req, res) => {
    res.send('Server Backend Alsintan Berjalan');
});

app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});