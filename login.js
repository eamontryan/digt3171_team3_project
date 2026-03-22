let isLoginMode = true;

const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const submitBtn = document.getElementById('submit-btn');
const switchModeBtn = document.getElementById('switch-mode');
const switchText = document.getElementById('switch-text');
const authMessage = document.getElementById('auth-message');

switchModeBtn.addEventListener('click', () => {
  isLoginMode = !isLoginMode;
  authMessage.textContent = '';
  authMessage.className = 'error-msg';
  
  if (isLoginMode) {
    authTitle.textContent = 'Login';
    submitBtn.textContent = 'Login';
    switchText.textContent = "Don't have an account? ";
    switchModeBtn.textContent = 'Register';
  } else {
    authTitle.textContent = 'Register';
    submitBtn.textContent = 'Register';
    switchText.textContent = 'Already have an account? ';
    switchModeBtn.textContent = 'Login';
  }
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  authMessage.textContent = '';
  authMessage.className = 'error-msg';
  
  const endpoint = isLoginMode ? '/api/login' : '/api/register';
  
  try {
    const response = await fetch(`http://localhost:3000${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      if (isLoginMode) {
        localStorage.setItem('token', data.token);
        window.location.href = 'index.html';
      } else {
        authMessage.className = 'success-msg';
        authMessage.textContent = 'Registration successful! Please login.';
        isLoginMode = true;
        authTitle.textContent = 'Login';
        submitBtn.textContent = 'Login';
        switchText.textContent = "Don't have an account? ";
        switchModeBtn.textContent = 'Register';
        document.getElementById('password').value = '';
      }
    } else {
      authMessage.textContent = data.error || 'Authentication failed';
    }
  } catch (err) {
    console.error(err);
    authMessage.textContent = 'Server error. Is the backend running?';
  }
});
