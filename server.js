require('dotenv').config()
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();

const PORT = process.env.PORT;
const mongodb = process.env.MONGODB
const JWT_SECRET=processs.env.JWT_SECRET

mongoose.connect(mongodb, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Подключение к MongoDB установлено'))
  .catch((err) => console.error('Ошибка подключения к MongoDB:', err));


const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model('User', UserSchema);


app.use(cors());
app.use(bodyParser.json());


app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Введите имя пользователя и пароль' });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Имя пользователя уже занято' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username: username, password: hashedPassword });

    await newUser.save();

    res.status(201).json({ message: 'Пользователь успешно зарегистрирован' });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка регистрации', error: error.message });
  }
});


app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Введите имя пользователя и пароль' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Неверное имя пользователя или пароль' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Неверное имя пользователя или пароль' });
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ message: 'Вход выполнен', token });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера', error: error.message });
  }
});


app.get('/profile', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Требуется токен авторизации' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(401).json({ message: 'Неверный или истёкший токен', error: error.message });
  }
});

// Запуск сервера
app.listen(PORT, () => console.log(`Сервер запущен на http://localhost:${PORT}`));
