const SUPABASE_URL = 'https://cpecdifwbumqoupvicsg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwZWNkaWZ3YnVtcW91cHZpY3NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMzQxMzIsImV4cCI6MjA3OTgxMDEzMn0.eOgWTr5X1L6nhS5TJoeqx3hfgV6DrA1qusVP0lUUAZE';

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 2. STATE ---
let currentUser = null;
let isSignUpMode = false;
let selectedDate = new Date();
let appointments = [];
let notes = [];
let pinnedNoteId = null;

// --- 3. DOM ELEMENTS ---
const elements = {
    authView: document.getElementById('auth-view'),
    appView: document.getElementById('app-view'),
    authForm: document.getElementById('auth-form'),
    authBtn: document.getElementById('auth-btn'),
    toggleAuth: document.getElementById('toggle-auth'),
    authError: document.getElementById('auth-error'),
    nameGroup: document.getElementById('name-group'),
    
    // Header
    greeting: document.getElementById('greeting-text'),
    profileAvatar: document.getElementById('profile-avatar'),
    profileMenu: document.getElementById('profile-menu'),
    menuName: document.getElementById('menu-name'),
    menuEmail: document.getElementById('menu-email'),
    
    // Date
    displayDate: document.getElementById('display-date'),
    datePicker: document.getElementById('date-picker'),
    jumpToday: document.getElementById('jump-today'),
    
    // Lists
    appList: document.getElementById('appointment-list'),
    notesList: document.getElementById('notes-list'),
    
    // Modals
    modal: document.getElementById('modal'), // Appt Modal
    noteModal: document.getElementById('note-modal'), // Canvas Modal
    newTitleModal: document.getElementById('new-title-modal'),
    profileModal: document.getElementById('profile-modal'),
    
    // Note Canvas
    noteTitle: document.getElementById('note-title'),
    noteContent: document.getElementById('note-content'),
    checklistContainer: document.getElementById('checklist-container'),
    todoList: document.getElementById('todo-list'),
    
    // Forms
    sessionForm: document.getElementById('session-form'),
    saveBtn: document.getElementById('save-btn')
};

// --- 4. AUTH ---

async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        showApp();
    } else {
        showAuth();
    }
}

elements.authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const fullName = document.getElementById('full-name').value;
    
    elements.authBtn.textContent = 'Wait...';
    elements.authBtn.disabled = true;
    elements.authError.textContent = '';

    let error = null;

    if (isSignUpMode) {
        const { error: signUpError } = await supabase.auth.signUp({
            email, password,
            options: { data: { full_name: fullName } }
        });
        error = signUpError;
        if (!error) {
            alert("Account created! Logging in...");
            const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
            if(!signInError) window.location.reload();
        }
    } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        error = signInError;
        if (data.user) {
            currentUser = data.user;
            showApp();
        }
    }

    if (error) {
        elements.authError.textContent = error.message;
        elements.authBtn.textContent = isSignUpMode ? 'Create Account' : 'Sign In';
        elements.authBtn.disabled = false;
    }
});

elements.toggleAuth.addEventListener('click', () => {
    isSignUpMode = !isSignUpMode;
    elements.authBtn.textContent = isSignUpMode ? 'Create Account' : 'Sign In';
    document.getElementById('toggle-text').textContent = isSignUpMode ? 'Already have an account? ' : 'New here? ';
    elements.toggleAuth.textContent = isSignUpMode ? 'Sign In' : 'Create an account';
    elements.nameGroup.style.display = isSignUpMode ? 'block' : 'none';
    document.getElementById('full-name').required = isSignUpMode;
});

// --- 5. PROFILE & UI ---

elements.profileAvatar.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.profileMenu.classList.toggle('hidden');
});

window.addEventListener('click', () => elements.profileMenu.classList.add('hidden'));

document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.reload();
});

function showAuth() {
    elements.authView.style.display = 'flex';
    elements.appView.style.display = 'none';
}

function showApp() {
    elements.authView.style.display = 'none';
    elements.appView.style.display = 'block';
    
    updateGreeting();
    
    // Set Profile Info
    elements.menuEmail.textContent = currentUser.email;
    const name = currentUser.user_metadata.full_name || "Dr";
    elements.profileAvatar.textContent = name.substring(0, 2).toUpperCase();
    elements.menuName.textContent = name;

    renderDate();
    fetchAppointments();
    fetchNotes();
}

function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = "Good Morning";
    if (hour >= 12) greeting = "Good Afternoon";
    if (hour >= 17) greeting = "Good Evening";
    const name = currentUser.user_metadata.full_name || "Dr. Pallavi";
    elements.greeting.textContent = `${greeting}, ${name} 🌼`;
}

// Edit Profile
document.getElementById('edit-profile-btn').addEventListener('click', () => {
    document.getElementById('edit-display-name').value = currentUser.user_metadata.full_name || '';
    elements.profileModal.classList.add('active');
});

document.getElementById('save-profile').addEventListener('click', async () => {
    const newName = document.getElementById('edit-display-name').value;
    const { data, error } = await supabase.auth.updateUser({ data: { full_name: newName } });
    if (!error) {
        currentUser = data.user;
        updateGreeting();
        elements.profileAvatar.textContent = newName.substring(0, 2).toUpperCase();
        elements.menuName.textContent = newName;
        elements.profileModal.classList.remove('active');
    }
});

document.getElementById('cancel-profile').addEventListener('click', () => elements.profileModal.classList.remove('active'));

// Export CSV
document.getElementById('export-btn').addEventListener('click', async () => {
    const { data, error } = await supabase.from('appointments').select('*').eq('user_id', currentUser.id);
    if (data && data.length > 0) {
        const headers = ['Client Name', 'Date', 'Time', 'Type', 'Mode', 'Notes'];
        const csvRows = [headers.join(',')];
        data.forEach(row => {
            const values = [
                `"${row.client_name}"`, row.date, row.time, row.session_type, row.mode,
                `"${(row.notes || '').replace(/"/g, '""')}"`
            ];
            csvRows.push(values.join(','));
        });
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'appointments.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } else {
        alert("No data to export.");
    }
});

// --- 6. DATE LOGIC ---

function renderDate() {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    elements.displayDate.textContent = selectedDate.toLocaleDateString('en-US', options);
    elements.datePicker.value = selectedDate.toISOString().split('T')[0];
    
    // Show/Hide "Jump to Today"
    const todayStr = new Date().toISOString().split('T')[0];
    const selStr = selectedDate.toISOString().split('T')[0];
    if(todayStr !== selStr) elements.jumpToday.classList.remove('hidden');
    else elements.jumpToday.classList.add('hidden');
}

document.getElementById('prev-day').addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() - 1);
    updateDateView();
});
document.getElementById('next-day').addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() + 1);
    updateDateView();
});
elements.jumpToday.addEventListener('click', () => {
    selectedDate = new Date();
    updateDateView();
});
elements.datePicker.addEventListener('change', (e) => {
    if(e.target.value) {
        selectedDate = new Date(e.target.value);
        updateDateView();
    }
});
function updateDateView() { renderDate(); fetchAppointments(); }

// --- 7. APPOINTMENTS ---

async function fetchAppointments() {
    elements.appList.innerHTML = '<div class="empty-state">Loading...</div>';
    const dateStr = selectedDate.toISOString().split('T')[0];
    const { data } = await supabase.from('appointments').select('*')
        .eq('user_id', currentUser.id).eq('date', dateStr).order('time', { ascending: true });
    appointments = data || [];
    renderAppointments();
}

function renderAppointments() {
    elements.appList.innerHTML = '';
    if (appointments.length === 0) {
        elements.appList.innerHTML = `<div class="empty-state"><span class="empty-icon">☕</span><p>No sessions on this day.<br>Time for a gentle break?</p></div>`;
        return;
    }
    appointments.forEach(appt => {
        const timeClean = appt.time.substring(0, 5);
        const div = document.createElement('div');
        div.className = 'appointment-item';
        div.innerHTML = `
            <div class="time-col">${timeClean}</div>
            <div class="info-col type-${appt.session_type}">
                <span class="client-name">${appt.client_name}</span>
                <div class="client-details">${appt.session_type} · ${appt.mode}</div>
            </div>
            <div class="action-col">
                <button class="icon-btn" onclick="openEditModal(${appt.id})">✎</button>
                <button class="icon-btn" onclick="deleteSession(${appt.id})">🗑</button>
            </div>
        `;
        elements.appList.appendChild(div);
    });
}

document.getElementById('fab-add').addEventListener('click', () => {
    elements.sessionForm.reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('session-date').value = selectedDate.toISOString().split('T')[0];
    document.getElementById('modal-title').textContent = "New Session";
    elements.modal.classList.add('active');
});

window.openEditModal = (id) => {
    const appt = appointments.find(a => a.id === id);
    if (!appt) return;
    document.getElementById('edit-id').value = appt.id;
    document.getElementById('client-name').value = appt.client_name;
    document.getElementById('session-date').value = appt.date;
    document.getElementById('session-time').value = appt.time;
    document.getElementById('session-type').value = appt.session_type;
    document.getElementById('session-mode').value = appt.mode;
    document.getElementById('session-notes').value = appt.notes || '';
    document.getElementById('modal-title').textContent = "Edit Session";
    elements.modal.classList.add('active');
};

document.getElementById('cancel-btn').addEventListener('click', () => elements.modal.classList.remove('active'));

elements.sessionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    elements.saveBtn.textContent = "Saving...";
    const formData = {
        user_id: currentUser.id,
        client_name: document.getElementById('client-name').value,
        date: document.getElementById('session-date').value,
        time: document.getElementById('session-time').value,
        session_type: document.getElementById('session-type').value,
        mode: document.getElementById('session-mode').value,
        notes: document.getElementById('session-notes').value
    };
    const editId = document.getElementById('edit-id').value;
    if (editId) await supabase.from('appointments').update(formData).eq('id', editId);
    else await supabase.from('appointments').insert([formData]);

    elements.modal.classList.remove('active');
    elements.saveBtn.textContent = "Save";
    if (new Date(formData.date).getDate() !== selectedDate.getDate()) {
        selectedDate = new Date(formData.date);
        renderDate();
    }
    fetchAppointments();
});

window.deleteSession = async (id) => {
    if(!confirm("Remove this session?")) return;
    await supabase.from('appointments').delete().eq('id', id);
    fetchAppointments();
};

// --- 8. NOTES SYSTEM ---

async function fetchNotes() {
    const { data } = await supabase.from('notes').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    notes = data || [];
    renderNotesList();
}

function renderNotesList() {
    elements.notesList.innerHTML = '';
    
    // 1. Render Pinned "Daily Intentions"
    let pinned = notes.find(n => n.is_pinned);
    if (!pinned) {
        // Create local placeholder if not exists (saves on interaction)
        pinned = { id: 'temp-pin', title: 'Daily Intentions', is_pinned: true, type: 'checklist' };
    }
    const pinDiv = document.createElement('div');
    pinDiv.className = 'note-item';
    pinDiv.innerHTML = `<span class="note-icon">📌</span> <span>${pinned.title}</span> <span class="note-arrow">›</span>`;
    pinDiv.onclick = () => openCanvas(pinned);
    elements.notesList.appendChild(pinDiv);
    
    // 2. Render Regular Notes
    notes.filter(n => !n.is_pinned).forEach(note => {
        const div = document.createElement('div');
        div.className = 'note-item';
        div.innerHTML = `<span class="note-icon">📝</span> <span>${note.title}</span> <span class="note-arrow">›</span>`;
        div.onclick = () => openCanvas(note);
        elements.notesList.appendChild(div);
    });
}

// Open "Add Title" Modal
document.getElementById('add-note-title-btn').addEventListener('click', () => {
    document.getElementById('new-note-title-input').value = '';
    elements.newTitleModal.classList.add('active');
});
document.getElementById('cancel-new-title').addEventListener('click', () => elements.newTitleModal.classList.remove('active'));

document.getElementById('create-note-btn').addEventListener('click', async () => {
    const title = document.getElementById('new-note-title-input').value;
    if(!title) return;
    
    const { data, error } = await supabase.from('notes').insert([
        { user_id: currentUser.id, title: title, content: '', type: 'text' }
    ]).select();
    
    if(!error) {
        elements.newTitleModal.classList.remove('active');
        await fetchNotes(); // Refresh list
        openCanvas(data[0]); // Open the new note immediately
    }
});

// CANVAS LOGIC
function openCanvas(note) {
    document.getElementById('note-id').value = note.id;
    elements.noteTitle.value = note.title;
    
    // Show/Hide sections based on type
    if (note.is_pinned || note.type === 'checklist') {
        elements.noteContent.classList.add('hidden');
        elements.checklistContainer.classList.remove('hidden');
        renderChecklist(note.content || '[]');
        pinnedNoteId = note.id;
    } else {
        elements.noteContent.classList.remove('hidden');
        elements.checklistContainer.classList.add('hidden');
        elements.noteContent.value = note.content || '';
        pinnedNoteId = null;
    }
    
    elements.noteModal.classList.add('active');
}

// Saving on "Done"
document.getElementById('close-note').addEventListener('click', async () => {
    await saveCurrentNote();
    elements.noteModal.classList.remove('active');
    fetchNotes();
});

async function saveCurrentNote() {
    const id = document.getElementById('note-id').value;
    const title = elements.noteTitle.value;
    
    if (id === 'temp-pin') {
        // First time saving pinned note
        const content = JSON.stringify([]); // Empty checklist
        await supabase.from('notes').insert([{
            user_id: currentUser.id, title: title, content: content, type: 'checklist', is_pinned: true
        }]);
    } else if (id) {
        // Regular update
        let content;
        // Check if we are saving a text note or checklist
        if (pinnedNoteId === id) { 
             // Logic handled in toggleTodo/addTodo, but we update title here
             // We don't overwrite content here for checklist to avoid race conditions
             await supabase.from('notes').update({ title }).eq('id', id);
        } else {
             content = elements.noteContent.value;
             await supabase.from('notes').update({ title, content }).eq('id', id);
        }
    }
}

// Checklist Logic (Auto-saves on change)
function renderChecklist(jsonContent) {
    elements.todoList.innerHTML = '';
    let items = [];
    try { items = JSON.parse(jsonContent); } catch(e) {}
    
    items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'todo-item';
        div.innerHTML = `
            <input type="checkbox" class="todo-checkbox" ${item.done ? 'checked' : ''} onchange="toggleTodo(${index})">
            <span style="${item.done ? 'text-decoration:line-through; color:#aaa;' : ''}">${item.text}</span>
            <button onclick="deleteTodo(${index})" style="margin-left:auto;border:none;background:none;cursor:pointer;color:#ccc;">×</button>
        `;
        elements.todoList.appendChild(div);
    });
}

document.getElementById('add-todo-item').addEventListener('click', async () => {
    const text = prompt("New Item:");
    if(!text) return;
    await updateChecklist(items => items.push({ text, done: false }));
});

window.toggleTodo = async (index) => {
    await updateChecklist(items => items[index].done = !items[index].done);
};

window.deleteTodo = async (index) => {
    await updateChecklist(items => items.splice(index, 1));
};

async function updateChecklist(modifyFn) {
    // 1. Get current content
    let note;
    if (document.getElementById('note-id').value === 'temp-pin') {
        // Create it first
        const { data } = await supabase.from('notes').insert([{
            user_id: currentUser.id, title: 'Daily Intentions', content: '[]', type: 'checklist', is_pinned: true
        }]).select();
        note = data[0];
        document.getElementById('note-id').value = note.id;
    } else {
        const { data } = await supabase.from('notes').select('*').eq('id', document.getElementById('note-id').value).single();
        note = data;
    }

    let items = JSON.parse(note.content || '[]');
    modifyFn(items);
    
    const newContent = JSON.stringify(items);
    await supabase.from('notes').update({ content: newContent }).eq('id', note.id);
    renderChecklist(newContent);
}

// Delete Note
document.getElementById('delete-note').addEventListener('click', async () => {
    const id = document.getElementById('note-id').value;
    if(id === 'temp-pin') return; // Can't delete temp
    if(confirm("Delete this note?")) {
        await supabase.from('notes').delete().eq('id', id);
        elements.noteModal.classList.remove('active');
        fetchNotes();
    }
});

checkSession();