let allUsers = [];
let errorCount = 0;

// --- Clock ---
function updateClock() {
    const now = new Date();
    document.getElementById('clock').textContent = now.toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();

// --- API Calls ---
async function api(url, method, body) {
    const start = Date.now();
    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined
        });
        
        const duration = Date.now() - start;
        const data = await res.json().catch(() => ({}));
        
        // Log locally for the "Monitor" area
        addLocalLog(method, url, res.status, duration, data.error);
        
        if (!res.ok) {
            errorCount++;
            document.getElementById('count-errors').textContent = errorCount;
            throw new Error(data.error || 'API Error');
        }
        
        return { data, request_id: data.request_id || 'unknown' };
    } catch (err) {
        showToast(err.message, 'error');
        throw err;
    }
}

// --- Event Handlers ---

// Register
document.getElementById('reg-form').onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-pass').value;

    try {
        await api('/api/register', 'POST', { name, email, password });
        showToast('Usuário registrado com sucesso', 'success');
        e.target.reset();
        loadUsers();
    } catch (e) {}
};

// Login
document.getElementById('log-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('log-email').value;
    const password = document.getElementById('log-pass').value;

    try {
        await api('/api/login', 'POST', { email, password });
        showToast('Login efetuado com sucesso', 'success');
    } catch (e) {}
};

// Force 500
document.getElementById('btn-force-error').onclick = async () => {
    try {
        // Trigger a non-existent API route or a known fail point
        await api('/api/force-500-error-sim', 'GET');
    } catch (e) {
        // Error count already updated in api()
    }
};

// --- CRUD Operations ---
async function loadUsers() {
    try {
        const { data } = await api('/api/users', 'GET');
        allUsers = data;
        renderTable(allUsers);
        document.getElementById('count-users').textContent = allUsers.length;
    } catch (e) {}
}

function renderTable(users) {
    const list = document.getElementById('user-list');
    list.innerHTML = users.map(u => `
        <tr>
            <td><code style="font-size:11px; color:var(--text-secondary)">${u.id.substring(0,8)}...</code></td>
            <td><strong>${u.name}</strong></td>
            <td>${u.email}</td>
            <td><span class="status-pill">Ativo</span></td>
            <td class="text-right">
                <button class="icon-btn" onclick="openEditModal('${u.id}', '${u.name}', '${u.email}')"><i data-lucide="edit-3"></i></button>
                <button class="icon-btn" onclick="deleteUser('${u.id}')" style="color:var(--red)"><i data-lucide="trash-2"></i></button>
            </td>
        </tr>
    `).join('');
    lucide.createIcons();
}

async function deleteUser(id) {
    if (!confirm('Excluir este usuário permanentemente?')) return;
    try {
        await api(`/api/users/${id}`, 'DELETE');
        showToast('Usuário removido', 'success');
        loadUsers();
    } catch (e) {}
}

async function saveUser(event) {
    event.preventDefault();
    const id = document.getElementById('edit-id').value;
    const name = document.getElementById('edit-name').value;
    const email = document.getElementById('edit-email').value;

    try {
        await api(`/api/users/${id}`, 'PUT', { name, email });
        showToast('Dados atualizados', 'success');
        closeModal();
        loadUsers();
    } catch (e) {}
}

document.getElementById('edit-form').onsubmit = saveUser;

// --- Monitor Functions ---
function addLocalLog(method, route, status, duration, error) {
    const feed = document.getElementById('log-feed');
    const time = new Date().toLocaleTimeString();
    const type = status >= 500 ? 'error' : (status >= 400 ? 'warn' : 'info');
    const level = type.toUpperCase();
    
    // Attempt to match the event names from backend for visual consistency
    let event = 'API_REQUEST';
    if (route.includes('login')) event = status < 400 ? 'USER_LOGIN' : 'USER_LOGIN_FAILED';
    if (route.includes('register')) event = status < 400 ? 'USER_REGISTER' : 'USER_REGISTER_FAILED';
    if (status === 404) event = 'ROUTE_NOT_FOUND';
    if (status >= 500) event = 'INTERNAL_SERVER_ERROR';

    const entry = document.createElement('div');
    entry.className = `log-item ${type}`;
    entry.textContent = `[${time}] ${level} ${event} (${method} ${status}) - ${duration}ms`;
    
    feed.prepend(entry);
    if (feed.children.length > 20) feed.lastElementChild.remove();
}

// --- Search ---
document.getElementById('user-search').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = allUsers.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    renderTable(filtered);
};

// --- Modal ---
function openEditModal(id, name, email) {
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-name').value = name;
    document.getElementById('edit-email').value = email;
}

function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
}

// --- Toasts ---
function showToast(msg, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Initial Load
loadUsers();
