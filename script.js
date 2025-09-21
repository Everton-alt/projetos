// Funções de Utilitários
const getTodayDate = () => new Date().toISOString().slice(0, 10);

const calculateDays = (date) => {
    const today = new Date();
    const receiptDate = new Date(date);
    const diffTime = Math.abs(today - receiptDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const getDaysCategory = (days) => {
    if (days >= 0 && days <= 5) return '0 a 5 dias';
    if (days >= 6 && days <= 10) return '6 a 10 dias';
    if (days >= 11 && days <= 15) return '11 a 15 dias';
    if (days >= 16 && days <= 30) return '16 a 30 dias';
    if (days >= 31 && days <= 60) return '31 a 60 dias';
    if (days >= 61 && days <= 90) return '61 a 90 dias';
    if (days >= 91 && days <= 120) return '91 a 120 dias';
    return 'Maior que 120 dias';
};

const getStorage = (key) => JSON.parse(localStorage.getItem(key)) || [];
const setStorage = (key, data) => localStorage.setItem(key, JSON.stringify(data));

// Lógica de Autenticação e Usuários
const auth = {
    init: () => {
        let users = getStorage('users');
        if (users.length === 0) {
            // Cria um usuário administrador inicial se não houver nenhum
            users.push({ name: 'Admin', username: 'admin', password: 'admin', role: 'admin' });
            setStorage('users', users);
        }
    },
    login: (username, password) => {
        const users = getStorage('users');
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            return true;
        }
        return false;
    },
    logout: () => {
        sessionStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    },
    getCurrentUser: () => JSON.parse(sessionStorage.getItem('currentUser')),
    isLoggedIn: () => !!sessionStorage.getItem('currentUser'),
    isRole: (role) => {
        const user = auth.getCurrentUser();
        return user && user.role === role;
    },
    addUser: (name, username, password, role) => {
        let users = getStorage('users');
        if (users.some(u => u.username === username)) {
            return { success: false, message: 'Login de usuário já existe.' };
        }
        users.push({ name, username, password, role });
        setStorage('users', users);
        return { success: true, message: 'Usuário criado com sucesso.' };
    },
    updateUserRole: (username, newRole) => {
        let users = getStorage('users');
        const userIndex = users.findIndex(u => u.username === username);

        if (username === 'admin') {
            return { success: false, message: 'Não é possível alterar o papel do usuário "admin".' };
        }

        if (userIndex !== -1) {
            users[userIndex].role = newRole;
            setStorage('users', users);
            return { success: true, message: 'Papel do usuário atualizado.' };
        }
        return { success: false, message: 'Usuário não encontrado.' };
    },
    deleteUser: (username) => {
        if (username === 'admin') {
            return { success: false, message: 'Não é possível excluir o usuário "admin".' };
        }
        let users = getStorage('users');
        const initialLength = users.length;
        users = users.filter(u => u.username !== username);
        setStorage('users', users);
        if (users.length < initialLength) {
            return { success: true, message: 'Usuário excluído com sucesso.' };
        }
        return { success: false, message: 'Usuário não encontrado.' };
    }
};

// Lógica de Dados de Recebimento
const dataManager = {
    load: () => getStorage('recebimentos'),
    save: (data) => setStorage('recebimentos', data),
    addEntry: (entry) => {
        const data = dataManager.load();
        const newEntryWithStatus = { ...entry, status: 'Pendente' };
        data.push(newEntryWithStatus);
        dataManager.save(data);
    },
    updateEntry: (index, newData) => {
        const data = dataManager.load();
        const oldData = { ...data[index] };
        
        const existingLog = data[index].log || [];
        
        Object.assign(data[index], newData);
        
        const currentUser = auth.getCurrentUser();
        const logEntry = {
            timestamp: new Date().toLocaleString(),
            user: currentUser.name, 
            changes: {}
        };

        for (const key in newData) {
            if (newData[key] !== oldData[key]) {
                logEntry.changes[key] = {
                    old: oldData[key],
                    new: newData[key]
                };
            }
        }

        if (Object.keys(logEntry.changes).length > 0) {
            existingLog.push(logEntry);
            data[index].log = existingLog;
        }

        dataManager.save(data);
    },
    deleteEntry: (index) => {
        const data = dataManager.load();
        data.splice(index, 1);
        dataManager.save(data);
    }
};

// Lógica de Dados de Endereço (ATUALIZADO)
const addressManager = {
    load: () => getStorage('enderecos'),
    save: (data) => setStorage('enderecos', data),
    addEntry: (entry) => {
        const data = addressManager.load();
        data.push(entry);
        addressManager.save(data);
    },
    addBulkEntries: (entries) => {
        const data = addressManager.load();
        const newEntries = entries.filter(e => e.code && e.area);
        const uniqueEntries = newEntries.filter(e => !data.some(existing => existing.code === e.code));

        if(uniqueEntries.length > 0) {
            addressManager.save([...data, ...uniqueEntries]);
            return { success: true, count: uniqueEntries.length };
        }
        return { success: false, message: 'Nenhum novo endereço válido para adicionar.' };
    },
    deleteEntry: (index) => {
        const data = addressManager.load();
        data.splice(index, 1);
        addressManager.save(data);
    }
};

// Lógica de Renderização e Eventos
const render = {
    dashboard: () => {
        if (!auth.isLoggedIn()) {
            window.location.href = 'index.html';
        }
        const user = auth.getCurrentUser();
        document.getElementById('welcomeMessage').textContent = `Bem-vindo, ${user.name}!`;
        document.getElementById('receivedBy').value = user.name;
        document.getElementById('receiptDate').value = getTodayDate();
    },
    data: (data) => {
        if (!auth.isLoggedIn()) {
            window.location.href = 'index.html';
        }
        const tableBody = document.getElementById('dataTableBody');
        tableBody.innerHTML = '';
        
        if (!Array.isArray(data) || data.length === 0) {
            const emptyMessage = document.createElement('tr');
            emptyMessage.innerHTML = `<td colspan="7" style="text-align: center;">Nenhum recebimento registrado.</td>`;
            tableBody.appendChild(emptyMessage);
            return;
        }
        
        data.forEach((entry, index) => {
            const row = tableBody.insertRow();
            row.setAttribute('data-index', index);
            const daysSinceReceipt = calculateDays(entry.receiptDate);
            const daysCategory = getDaysCategory(daysSinceReceipt);
            
            const user = auth.getCurrentUser();
            const isAdmin = user && user.role === 'admin';

            let actionButtons = `
                <button class="btn btn-secondary" onclick="updateRow(${index})">Atualizar</button>
                <button class="btn btn-secondary" onclick="showLog(${index})">Ver Log</button>
            `;
            if (isAdmin) {
                actionButtons += `<button class="btn btn-danger" onclick="deleteRow(${index})">Excluir</button>`;
            }
            
            row.innerHTML = `
                <td contenteditable="true" data-field="receiptDate">${entry.receiptDate}</td>
                <td contenteditable="false">${daysSinceReceipt} dias (${daysCategory})</td>
                <td contenteditable="true" data-field="listNumber">${entry.listNumber}</td>
                <td contenteditable="true" data-field="location">${entry.location}</td>
                <td contenteditable="false">${entry.receivedBy}</td>
                <td contenteditable="true" data-field="obs">${entry.obs}</td>
                <td>${actionButtons}</td>
            `;
        });
    },
    populateUsersTable: () => {
        const userTableBody = document.getElementById('userTableBody');
        if (!userTableBody) return;
        userTableBody.innerHTML = '';
        const users = getStorage('users');
        users.forEach(user => {
            const row = userTableBody.insertRow();
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.username}</td>
                <td>${user.role}</td>
                <td>
                    <button class="btn btn-secondary" onclick="editUserRole('${user.username}')">Editar</button>
                    <button class="btn btn-danger" onclick="deleteUser('${user.username}')">Excluir</button>
                </td>
            `;
            // Desabilita os botões para o usuário admin
            if (user.username === 'admin') {
                row.querySelector('button[onclick*="editUserRole"]').disabled = true;
                row.querySelector('button[onclick*="deleteUser"]').disabled = true;
            }
        });
    },
    populateLoginUsers: () => {
        const userSelect = document.getElementById('login-username');
        if (!userSelect) return;
        const users = getStorage('users');
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.username;
            option.textContent = user.name;
            userSelect.appendChild(option);
        });
    }
};