const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.json()); // для парсинга JSON тела запросов
app.use(express.static('public'));

// Хранилище пользователей (в памяти)
const users = {}; // { username: { passwordHash, salt } }

// Хранилище сообщений
let messages = [];

// Вспомогательная функция для хеширования пароля
function hashPassword(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

// Регистрация
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  if (users[username]) {
    return res.status(400).json({ error: 'User already exists' });
  }
  // Генерируем соль и хеш
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  users[username] = { passwordHash, salt };
  console.log(`User registered: ${username}`);
  res.json({ success: true });
});

// Вход
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const user = users[username];
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const hash = hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  console.log(`User logged in: ${username}`);
  res.json({ success: true });
});

// Socket.IO с аутентификацией
io.use((socket, next) => {
  // Здесь можно получить данные из handshake query, но мы будем делать отдельное событие
  // Поэтому пропускаем всех, а потом при событии authenticate будем проверять
  next();
});

io.on('connection', (socket) => {
  console.log('New client connected, waiting for authentication');

  let authenticated = false;
  let username = null;

  // Событие аутентификации
  socket.on('authenticate', (data) => {
    const { username: attemptUsername, password } = data;
    if (!attemptUsername || !password) {
      socket.emit('auth_error', 'Username and password required');
      return;
    }
    const user = users[attemptUsername];
    if (!user) {
      socket.emit('auth_error', 'Invalid credentials');
      return;
    }
    const hash = hashPassword(password, user.salt);
    if (hash !== user.passwordHash) {
      socket.emit('auth_error', 'Invalid credentials');
      return;
    }
    // Аутентификация успешна
    authenticated = true;
    username = attemptUsername;
    socket.username = username; // сохраняем для дальнейшего использования
    socket.emit('auth_success');

    // Отправляем историю сообщений
    socket.emit('message history', messages);

    // Уведомляем других о новом участнике
    socket.broadcast.emit('user joined', username);

    console.log(`User authenticated: ${username}`);
  });

  // Обработка входящего сообщения (только если аутентифицирован)
  socket.on('chat message', (msg) => {
    if (!authenticated) {
      socket.emit('error', 'You must authenticate first');
      return;
    }
    const messageData = {
      username: socket.username,
      text: msg,
      timestamp: new Date().toLocaleTimeString()
    };
    messages.push(messageData);
    if (messages.length > 100) messages.shift();
    io.emit('chat message', messageData);
  });

  // Обработка отключения
  socket.on('disconnect', () => {
    if (authenticated) {
      console.log(`User disconnected: ${username}`);
      io.emit('user left', username);
    }
  });

  // Если клиент не аутентифицировался в течение некоторого времени, разрываем соединение
  setTimeout(() => {
    if (!authenticated) {
      console.log('Client disconnected due to authentication timeout');
      socket.disconnect(true);
    }
  }, 10000); // 10 секунд
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
