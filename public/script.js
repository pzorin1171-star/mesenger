// Элементы DOM для аутентификации
const authContainer = document.getElementById('auth-container');
const chatContainer = document.getElementById('chat-container');
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');

// Элементы чата
const messagesDiv = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');

// Состояние
let socket = null;
let currentUser = null;
let currentPassword = null;

// Переключение вкладок
loginTab.addEventListener('click', () => {
  loginTab.classList.add('active');
  registerTab.classList.remove('active');
  loginForm.classList.add('active');
  registerForm.classList.remove('active');
  loginError.textContent = '';
});

registerTab.addEventListener('click', () => {
  registerTab.classList.add('active');
  loginTab.classList.remove('active');
  registerForm.classList.add('active');
  loginForm.classList.remove('active');
  registerError.textContent = '';
});

// Регистрация
registerBtn.addEventListener('click', async () => {
  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value.trim();
  if (!username || !password) {
    registerError.textContent = 'Заполните все поля';
    return;
  }

  try {
    const response = await fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (response.ok) {
      registerError.style.color = 'green';
      registerError.textContent = 'Регистрация успешна! Теперь войдите.';
      // Переключаем на вкладку логина
      loginTab.click();
    } else {
      registerError.textContent = data.error || 'Ошибка регистрации';
    }
  } catch (err) {
    registerError.textContent = 'Ошибка сети';
  }
});

// Вход
loginBtn.addEventListener('click', async () => {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  if (!username || !password) {
    loginError.textContent = 'Заполните все поля';
    return;
  }

  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (response.ok) {
      // Успешный вход
      currentUser = username;
      currentPassword = password;
      authContainer.style.display = 'none';
      chatContainer.style.display = 'flex';
      connectSocket();
    } else {
      loginError.textContent = data.error || 'Ошибка входа';
    }
  } catch (err) {
    loginError.textContent = 'Ошибка сети';
  }
});

// Подключение сокета с аутентификацией
function connectSocket() {
  socket = io();

  // После подключения отправляем данные для аутентификации
  socket.on('connect', () => {
    socket.emit('authenticate', { username: currentUser, password: currentPassword });
  });

  socket.on('auth_success', () => {
    console.log('Authenticated successfully');
    // Можно показать уведомление
  });

  socket.on('auth_error', (msg) => {
    alert('Ошибка аутентификации: ' + msg);
    // Возвращаемся на экран входа
    disconnectAndShowAuth();
  });

  socket.on('message history', (history) => {
    history.forEach(msg => addMessage(msg));
  });

  socket.on('chat message', (msg) => {
    addMessage(msg);
  });

  socket.on('user joined', (username) => {
    addSystemMessage(`${username} присоединился к чату`);
  });

  socket.on('user left', (username) => {
    addSystemMessage(`${username} покинул чат`);
  });

  socket.on('disconnect', () => {
    addSystemMessage('Отключено от сервера. Попытка переподключения...');
  });

  socket.on('error', (msg) => {
    alert('Ошибка: ' + msg);
  });
}

// Отключение и возврат к форме входа
function disconnectAndShowAuth() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  currentUser = null;
  currentPassword = null;
  authContainer.style.display = 'block';
  chatContainer.style.display = 'none';
  // Очищаем сообщения
  messagesDiv.innerHTML = '';
}

function addMessage(data) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message';
  messageDiv.innerHTML = `
    <span class="username">${data.username}</span>
    <span class="timestamp">${data.timestamp}</span>
    <div class="text">${data.text}</div>
  `;
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addSystemMessage(text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'system-message';
  messageDiv.textContent = text;
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Отправка сообщения
messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (messageInput.value.trim() !== '' && socket) {
    socket.emit('chat message', messageInput.value);
    messageInput.value = '';
  }
});

// Если пользователь закрывает вкладку, ничего особенного не делаем
