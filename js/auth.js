// ========================================
// CloudSmartSpend — Authentication Module
// Handles login, signup, demo mode
// ========================================

const Auth = (() => {
  let currentUser = null;

  function init() {
    // Check if user is already logged in
    currentUser = DataStore.getUser();
    if (currentUser) {
      onLoginSuccess(currentUser);
    }
    setupEventListeners();
  }

  function setupEventListeners() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleEmailLogin();
      });
    }

    if (signupForm) {
      signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSignup();
      });
    }
  }

  function handleEmailLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      Utils.showToast('Please fill in all fields', 'warning');
      return;
    }

    // Demo mode: accept any credentials
    const user = {
      uid: 'user_' + btoa(email).substring(0, 10),
      displayName: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      email: email,
      photoURL: null
    };

    DataStore.setUser(user);
    currentUser = user;
    onLoginSuccess(user);
    Utils.showToast('Welcome back! 👋', 'success');
  }

  function handleSignup() {
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;

    if (!name || !email || !password) {
      Utils.showToast('Please fill in all fields', 'warning');
      return;
    }

    if (password.length < 6) {
      Utils.showToast('Password must be at least 6 characters', 'warning');
      return;
    }

    const user = {
      uid: 'user_' + btoa(email).substring(0, 10),
      displayName: name,
      email: email,
      photoURL: null
    };

    DataStore.setUser(user);
    currentUser = user;

    // Initialize demo data for new user
    DataStore.generateDemoData();

    onLoginSuccess(user);
    Utils.showToast('Account created! Welcome! 🎉', 'success');
  }

  function demoLogin() {
    const user = DataStore.DEMO_USER;
    DataStore.setUser(user);
    currentUser = user;
    onLoginSuccess(user);
    Utils.showToast('Welcome to the demo! 🎉', 'success');
  }

  function onLoginSuccess(user) {
    currentUser = user;

    // Hide login, show app
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-shell').classList.add('active');

    // Update UI with user info
    updateUserUI(user);

    // Initialize data and views
    DataStore.init();

    // Small delay to ensure DOM is ready
    setTimeout(() => {
      if (typeof Dashboard !== 'undefined') Dashboard.init();
      if (typeof Transactions !== 'undefined') Transactions.init();
      if (typeof Analytics !== 'undefined') Analytics.init();
      if (typeof Settings !== 'undefined') Settings.init();
    }, 100);
  }

  function updateUserUI(user) {
    const initial = (user.displayName || user.email || 'U').charAt(0).toUpperCase();

    // Top bar avatar
    const topbarAvatar = document.getElementById('topbar-avatar');
    if (topbarAvatar) topbarAvatar.textContent = initial;

    // Settings profile
    const settingsAvatar = document.getElementById('settings-avatar');
    const settingsName = document.getElementById('settings-name');
    const settingsEmail = document.getElementById('settings-email');

    if (settingsAvatar) settingsAvatar.textContent = initial;
    if (settingsName) settingsName.textContent = user.displayName || 'User';
    if (settingsEmail) settingsEmail.textContent = user.email;

    // Dashboard greeting
    const greeting = document.getElementById('dashboard-greeting');
    if (greeting) {
      const hour = new Date().getHours();
      let greetText = 'Good evening';
      if (hour < 12) greetText = 'Good morning';
      else if (hour < 17) greetText = 'Good afternoon';
      greeting.textContent = `${greetText}, ${(user.displayName || 'there').split(' ')[0]}`;
    }
  }

  function logout() {
    currentUser = null;
    DataStore.clearUser();

    // Show login, hide app
    document.getElementById('login-screen').style.display = '';
    document.getElementById('app-shell').classList.remove('active');

    // Reset forms
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    if (loginForm) loginForm.reset();
    if (signupForm) signupForm.reset();

    showLogin();
    Utils.showToast('Signed out successfully', 'info');
  }

  function showLogin() {
    document.getElementById('login-form-container').style.display = '';
    document.getElementById('signup-form-container').style.display = 'none';
  }

  function showSignup() {
    document.getElementById('login-form-container').style.display = 'none';
    document.getElementById('signup-form-container').style.display = '';
  }

  function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
      input.type = input.type === 'password' ? 'text' : 'password';
    }
  }

  function getUser() {
    return currentUser;
  }

  return {
    init,
    handleEmailLogin,
    handleSignup,
    demoLogin,
    logout,
    showLogin,
    showSignup,
    togglePassword,
    getUser
  };
})();
