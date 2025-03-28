require('module-alias/register')

const express = require('express');
const cors = require('cors');
const { sequelize } = require('@app/models');
const routes = require('@app/routes');

const app = express();
const port = process.env.PORT || 3000;

const corsOptions = {
  // origin: "http://172.19.44.133"
  origin: "http://localhost:5173"
};

app.use(cors(corsOptions));
app.use(express.json());

// Используем все маршруты
app.use('/api/', routes);

// Проверка подключения к БД и запуск сервера
sequelize.authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
    app.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });