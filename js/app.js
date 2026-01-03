/**
 * ============================================
 * BTONE - Основной файл приложения
 * ============================================
 * 
 * Этот файл управляет всей логикой приложения:
 * - Авторизация пользователей (вход, регистрация, выход)
 * - Переключение экранов
 * - Работа с пространствами
 * - Навигация между вкладками
 * 
 * ============================================
 */

// ============================================
// 1. ИМПОРТ МОДУЛЕЙ FIREBASE
// ============================================

import {
    auth,
    db,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    collection,
    doc,
    addDoc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    where,
    serverTimestamp
} from './firebase-config.js';


// ============================================
// 2. СОСТОЯНИЕ ПРИЛОЖЕНИЯ
// ============================================

const state = {
    currentUser: null,
    currentWorkspace: null,
    workspaces: [],
    userRole: 1,
    activeTab: 'home',
    language: 'ru',
    theme: 'dark'
};


// ============================================
// 3. ПОЛУЧЕНИЕ ЭЛЕМЕНТОВ DOM
// ============================================

const elements = {
    loadingScreen: document.getElementById('loading-screen'),
    authScreen: document.getElementById('auth-screen'),
    workspacesScreen: document.getElementById('workspaces-screen'),
    mainScreen: document.getElementById('main-screen'),
    
    tabLogin: document.getElementById('tab-login'),
    tabRegister: document.getElementById('tab-register'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    registerName: document.getElementById('register-name'),
    registerEmail: document.getElementById('register-email'),
    registerPassword: document.getElementById('register-password'),
    registerPasswordConfirm: document.getElementById('register-password-confirm'),
    authError: document.getElementById('auth-error'),
    
    logoutBtn: document.getElementById('logout-btn'),
    workspaceInput: document.getElementById('workspace-input'),
    workspaceActionBtn: document.getElementById('workspace-action-btn'),
    workspacesList: document.getElementById('workspaces-list'),
    noWorkspaces: document.getElementById('no-workspaces'),
    
    backBtn: document.getElementById('back-btn'),
    currentWorkspaceName: document.getElementById('current-workspace-name'),
    membersCount: document.getElementById('members-count'),
    langToggle: document.getElementById('lang-toggle'),
    themeToggle: document.getElementById('theme-toggle'),
    bottomNav: document.getElementById('bottom-nav'),
    contentArea: document.getElementById('content-area'),
    toastContainer: document.getElementById('toast-container'),
    
    profileForm: document.getElementById('profile-form'),
    profileName: document.getElementById('profile-name'),
    profilePosition: document.getElementById('profile-position'),
    profileEmail: document.getElementById('profile-email'),
    profilePhone: document.getElementById('profile-phone'),
    profileTelegram: document.getElementById('profile-telegram'),
    membersList: document.getElementById('members-list')
};


// ============================================
// 4. ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ============================================

function initApp() {
    console.log('🚀 Запуск приложения BTONE');
    loadSettings();
    setupEventListeners();
    onAuthStateChanged(auth, handleAuthStateChanged);
}


// ============================================
// 5. НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
// ============================================

function setupEventListeners() {
    // Вкладки авторизации
    elements.tabLogin.addEventListener('click', () => switchAuthTab('login'));
    elements.tabRegister.addEventListener('click', () => switchAuthTab('register'));
    
    // Форма входа
    elements.loginForm.addEventListener('submit', handleLogin);
    
    // Форма регистрации
    elements.registerForm.addEventListener('submit', handleRegister);
    
    // Кнопка выхода
    elements.logoutBtn.addEventListener('click', logoutUser);
    
    // Работа с пространствами
    elements.workspaceInput.addEventListener('input', handleWorkspaceInput);
    elements.workspaceActionBtn.addEventListener('click', handleWorkspaceAction);
    
    // Кнопка "Назад"
    elements.backBtn.addEventListener('click', goBackToWorkspaces);
    
    // Переключатели
    elements.langToggle.addEventListener('click', toggleLanguage);
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Навигация
    const navButtons = elements.bottomNav.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Форма профиля
    elements.profileForm.addEventListener('submit', handleProfileSave);
}


// ============================================
// 6. АВТОРИЗАЦИЯ
// ============================================

function handleAuthStateChanged(user) {
    console.log('👤 Авторизация:', user ? 'Да' : 'Нет');
    hideElement(elements.loadingScreen);
    
    if (user) {
        state.currentUser = user;
        showScreen('workspaces');
        loadUserWorkspaces();
    } else {
        state.currentUser = null;
        showScreen('auth');
    }
}

function switchAuthTab(tab) {
    hideElement(elements.authError);
    
    if (tab === 'login') {
        elements.tabLogin.classList.add('active');
        elements.tabRegister.classList.remove('active');
        showElement(elements.loginForm);
        hideElement(elements.registerForm);
    } else {
        elements.tabLogin.classList.remove('active');
        elements.tabRegister.classList.add('active');
        hideElement(elements.loginForm);
        showElement(elements.registerForm);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = elements.loginEmail.value.trim();
    const password = elements.loginPassword.value;
    
    if (!email || !password) {
        showAuthError('Заполните все поля');
        return;
    }
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('Добро пожаловать!', 'success');
        elements.loginForm.reset();
    } catch (error) {
        console.error('Ошибка входа:', error);
        showAuthError(getAuthErrorMessage(error.code));
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const name = elements.registerName.value.trim();
    const email = elements.registerEmail.value.trim();
    const password = elements.registerPassword.value;
    const passwordConfirm = elements.registerPasswordConfirm.value;
    
    if (!name || !email || !password || !passwordConfirm) {
        showAuthError('Заполните все поля');
        return;
    }
    
    if (password !== passwordConfirm) {
        showAuthError('Пароли не совпадают');
        return;
    }
    
    if (password.length < 6) {
        showAuthError('Пароль должен быть минимум 6 символов');
        return;
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            name: name,
            email: email,
            createdAt: serverTimestamp()
        });
        
        showToast('Регистрация успешна!', 'success');
        elements.registerForm.reset();
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        showAuthError(getAuthErrorMessage(error.code));
    }
}

async function logoutUser() {
    try {
        await signOut(auth);
        state.currentUser = null;
        state.currentWorkspace = null;
        state.workspaces = [];
        showToast('До свидания!', 'info');
    } catch (error) {
        console.error('Ошибка выхода:', error);
        showToast('Ошибка при выходе', 'error');
    }
}

function getAuthErrorMessage(errorCode) {
    const errors = {
        'auth/email-already-in-use': 'Этот email уже зарегистрирован',
        'auth/invalid-email': 'Неверный формат email',
        'auth/weak-password': 'Пароль слишком простой',
        'auth/user-not-found': 'Пользователь не найден',
        'auth/wrong-password': 'Неверный пароль',
        'auth/invalid-credential': 'Неверный email или пароль',
        'auth/too-many-requests': 'Много попыток. Подождите'
    };
    return errors[errorCode] || 'Произошла ошибка';
}


// ============================================
// 7. ПРОСТРАНСТВА
// ============================================

async function loadUserWorkspaces() {
    if (!state.currentUser) return;
    
    try {
        const membersQuery = query(
            collection(db, 'members'),
            where('userId', '==', state.currentUser.uid)
        );
        
        const membersSnapshot = await getDocs(membersQuery);
        const workspaces = [];
        
        for (const memberDoc of membersSnapshot.docs) {
            const workspaceId = memberDoc.data().workspaceId;
            const workspaceDoc = await getDoc(doc(db, 'workspaces', workspaceId));
            
            if (workspaceDoc.exists()) {
                workspaces.push({
                    id: workspaceId,
                    role: memberDoc.data().role,
                    ...workspaceDoc.data()
                });
            }
        }
        
        state.workspaces = workspaces;
        renderWorkspacesList();
        
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        showToast('Ошибка загрузки', 'error');
    }
}

function renderWorkspacesList() {
    elements.workspacesList.innerHTML = '';
    
    if (state.workspaces.length === 0) {
        showElement(elements.noWorkspaces);
        return;
    }
    
    hideElement(elements.noWorkspaces);
    
    state.workspaces.forEach(workspace => {
        const card = document.createElement('div');
        card.className = 'workspace-card';
        card.innerHTML = `
            <div class="workspace-info">
                <h3 class="workspace-name">${escapeHtml(workspace.name)}</h3>
                <p class="workspace-members">${workspace.membersCount || 1} участн.</p>
            </div>
            <button class="btn-icon workspace-leave" title="Покинуть">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
            </button>
        `;
        
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.workspace-leave')) {
                openWorkspace(workspace);
            }
        });
        
        card.querySelector('.workspace-leave').addEventListener('click', (e) => {
            e.stopPropagation();
            leaveWorkspace(workspace.id);
        });
        
        elements.workspacesList.appendChild(card);
    });
}

function handleWorkspaceInput() {
    const value = elements.workspaceInput.value.trim();
    
    if (value.startsWith('BT-')) {
        elements.workspaceActionBtn.textContent = 'Присоединиться';
    } else {
        elements.workspaceActionBtn.textContent = 'Создать';
    }
}

async function handleWorkspaceAction() {
    const value = elements.workspaceInput.value.trim();
    
    if (!value) {
        showToast('Введите название или код', 'error');
        return;
    }
    
    if (value.startsWith('BT-')) {
        await joinWorkspace(value);
    } else {
        await createWorkspace(value);
    }
}

async function createWorkspace(name) {
    if (!state.currentUser) return;
    
    try {
        const inviteCode = 'BT-' + generateRandomString(8);
        
        const workspaceRef = await addDoc(collection(db, 'workspaces'), {
            name: name,
            ownerId: state.currentUser.uid,
            inviteCode: inviteCode,
            membersCount: 1,
            createdAt: serverTimestamp()
        });
        
        await addDoc(collection(db, 'members'), {
            userId: state.currentUser.uid,
            workspaceId: workspaceRef.id,
            role: 3,
            joinedAt: serverTimestamp()
        });
        
        await setDoc(doc(db, 'workspaces', workspaceRef.id, 'profiles', state.currentUser.uid), {
            name: state.currentUser.displayName || 'Без имени',
            email: state.currentUser.email,
            position: '',
            phone: '',
            telegram: ''
        });
        
        showToast('Пространство создано!', 'success');
        elements.workspaceInput.value = '';
        await loadUserWorkspaces();
        
    } catch (error) {
        console.error('Ошибка создания:', error);
        showToast('Ошибка создания', 'error');
    }
}

async function joinWorkspace(code) {
    if (!state.currentUser) return;
    
    try {
        const workspacesQuery = query(
            collection(db, 'workspaces'),
            where('inviteCode', '==', code)
        );
        
        const snapshot = await getDocs(workspacesQuery);
        
        if (snapshot.empty) {
            showToast('Код не найден', 'error');
            return;
        }
        
        const workspaceDoc = snapshot.docs[0];
        const workspaceId = workspaceDoc.id;
        
        const memberQuery = query(
            collection(db, 'members'),
            where('userId', '==', state.currentUser.uid),
            where('workspaceId', '==', workspaceId)
        );
        
        const memberSnapshot = await getDocs(memberQuery);
        
        if (!memberSnapshot.empty) {
            showToast('Вы уже участник', 'info');
            return;
        }
        
        await addDoc(collection(db, 'members'), {
            userId: state.currentUser.uid,
            workspaceId: workspaceId,
            role: 1,
            joinedAt: serverTimestamp()
        });
        
        await setDoc(doc(db, 'workspaces', workspaceId, 'profiles', state.currentUser.uid), {
            name: state.currentUser.displayName || 'Без имени',
            email: state.currentUser.email,
            position: '',
            phone: '',
            telegram: ''
        });
        
        const workspaceData = workspaceDoc.data();
        await updateDoc(doc(db, 'workspaces', workspaceId), {
            membersCount: (workspaceData.membersCount || 1) + 1
        });
        
        showToast('Вы присоединились!', 'success');
        elements.workspaceInput.value = '';
        await loadUserWorkspaces();
        
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка присоединения', 'error');
    }
}

async function leaveWorkspace(workspaceId) {
    if (!confirm('Покинуть пространство?')) return;
    
    try {
        const memberQuery = query(
            collection(db, 'members'),
            where('userId', '==', state.currentUser.uid),
            where('workspaceId', '==', workspaceId)
        );
        
        const snapshot = await getDocs(memberQuery);
        
        if (!snapshot.empty) {
            const memberDoc = snapshot.docs[0];
            const memberData = memberDoc.data();
            
            // Проверяем, является ли пользователь владельцем
            const workspaceDoc = await getDoc(doc(db, 'workspaces', workspaceId));
            if (workspaceDoc.exists() && workspaceDoc.data().ownerId === state.currentUser.uid) {
                showToast('Владелец не может покинуть', 'error');
                return;
            }
            
            // Удаляем из базы используя Firestore методы
            const { deleteDoc } = await import('./firebase-config.js');
            await deleteDoc(memberDoc.ref);
            
            // Уменьшаем счётчик
            const workspaceData = workspaceDoc.data();
            await updateDoc(doc(db, 'workspaces', workspaceId), {
                membersCount: Math.max(1, (workspaceData.membersCount || 1) - 1)
            });
        }
        
        showToast('Вы покинули пространство', 'info');
        await loadUserWorkspaces();
        
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка', 'error');
    }
}

async function openWorkspace(workspace) {
    state.currentWorkspace = workspace;
    state.userRole = workspace.role || 1;
    
    elements.currentWorkspaceName.textContent = workspace.name;
    elements.membersCount.textContent = (workspace.membersCount || 1) + ' чел.';
    
    // Показываем/скрываем кнопку настроек
    const settingsBtn = elements.bottomNav.querySelector('[data-tab="settings"]');
    if (state.userRole === 3) {
        settingsBtn.classList.remove('hidden');
    } else {
        settingsBtn.classList.add('hidden');
    }
    
    showScreen('main');
    switchTab('home');
    await loadProfile();
    await loadMembers();
}

function goBackToWorkspaces() {
    state.currentWorkspace = null;
    showScreen('workspaces');
}


// ============================================
// 8. ПРОФИЛЬ И УЧАСТНИКИ
// ============================================

async function loadProfile() {
    if (!state.currentUser || !state.currentWorkspace) return;
    
    try {
        const profileDoc = await getDoc(
            doc(db, 'workspaces', state.currentWorkspace.id, 'profiles', state.currentUser.uid)
        );
        
        if (profileDoc.exists()) {
            const data = profileDoc.data();
            elements.profileName.value = data.name || '';
            elements.profilePosition.value = data.position || '';
            elements.profileEmail.value = data.email || '';
            elements.profilePhone.value = data.phone || '';
            elements.profileTelegram.value = data.telegram || '';
        }
    } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
    }
}

async function handleProfileSave(event) {
    event.preventDefault();
    
    if (!state.currentUser || !state.currentWorkspace) return;
    
    try {
        await setDoc(
            doc(db, 'workspaces', state.currentWorkspace.id, 'profiles', state.currentUser.uid),
            {
                name: elements.profileName.value.trim(),
                position: elements.profilePosition.value.trim(),
                email: elements.profileEmail.value.trim(),
                phone: elements.profilePhone.value.trim(),
                telegram: elements.profileTelegram.value.trim()
            }
        );
        
        showToast('Профиль сохранён!', 'success');
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showToast('Ошибка сохранения', 'error');
    }
}

async function loadMembers() {
    if (!state.currentWorkspace) return;
    
    try {
        const membersQuery = query(
            collection(db, 'members'),
            where('workspaceId', '==', state.currentWorkspace.id)
        );
        
        const snapshot = await getDocs(membersQuery);
        elements.membersList.innerHTML = '';
        
        for (const memberDoc of snapshot.docs) {
            const memberData = memberDoc.data();
            
            const profileDoc = await getDoc(
                doc(db, 'workspaces', state.currentWorkspace.id, 'profiles', memberData.userId)
            );
            
            if (profileDoc.exists()) {
                const profile = profileDoc.data();
                const card = createMemberCard(profile, memberData.role);
                elements.membersList.appendChild(card);
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки участников:', error);
    }
}

function createMemberCard(profile, role) {
    const card = document.createElement('div');
    card.className = 'member-card';
    
    const initials = getInitials(profile.name);
    const roleText = role === 3 ? 'Админ' : role === 2 ? 'Наблюдатель' : '';
    
    card.innerHTML = `
        <div class="member-avatar">${initials}</div>
        <div class="member-info">
            <div class="member-name">${escapeHtml(profile.name)} ${roleText ? `<small>(${roleText})</small>` : ''}</div>
            <div class="member-position">${escapeHtml(profile.position || 'Не указана')}</div>
        </div>
    `;
    
    return card;
}


// ============================================
// 9. НАВИГАЦИЯ И ИНТЕРФЕЙС
// ============================================

function switchTab(tabName) {
    state.activeTab = tabName;
    
    // Обновляем кнопки навигации
    const navButtons = elements.bottomNav.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Обновляем контент
    const tabs = elements.contentArea.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        if (tab.id === 'tab-' + tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
}

function toggleTheme() {
    if (state.theme === 'dark') {
        state.theme = 'light';
        document.body.classList.add('light-theme');
    } else {
        state.theme = 'dark';
        document.body.classList.remove('light-theme');
    }
    saveSettings();
}

function toggleLanguage() {
    state.language = state.language === 'ru' ? 'en' : 'ru';
    elements.langToggle.querySelector('.lang-label').textContent = 
        state.language === 'ru' ? 'RU' : 'EN';
    saveSettings();
    // TODO: Реализовать полную смену языка
}


// ============================================
// 10. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

function showScreen(screenName) {
    hideElement(elements.authScreen);
    hideElement(elements.workspacesScreen);
    hideElement(elements.mainScreen);
    
    switch (screenName) {
        case 'auth':
            showElement(elements.authScreen);
            break;
        case 'workspaces':
            showElement(elements.workspacesScreen);
            break;
        case 'main':
            showElement(elements.mainScreen);
            break;
    }
}

function showElement(element) {
    if (element) element.classList.remove('hidden');
}

function hideElement(element) {
    if (element) element.classList.add('hidden');
}

function showAuthError(message) {
    elements.authError.textContent = message;
    showElement(elements.authError);
    setTimeout(() => hideElement(elements.authError), 5000);
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function generateRandomString(length) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function loadSettings() {
    const saved = localStorage.getItem('btone_settings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            state.theme = settings.theme || 'dark';
            state.language = settings.language || 'ru';
            
            if (state.theme === 'light') {
                document.body.classList.add('light-theme');
            }
            
            elements.langToggle.querySelector('.lang-label').textContent = 
                state.language === 'ru' ? 'RU' : 'EN';
        } catch (e) {
            console.error('Ошибка загрузки настроек:', e);
        }
    }
}

function saveSettings() {
    localStorage.setItem('btone_settings', JSON.stringify({
        theme: state.theme,
        language: state.language
    }));
}


// ============================================
// 11. ЗАПУСК ПРИЛОЖЕНИЯ
// ============================================

document.addEventListener('DOMContentLoaded', initApp);
