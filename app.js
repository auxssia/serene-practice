// --- 1. CONFIGURATION ---
// REPLACE THESE WITH YOUR ACTUAL SUPABASE KEYS
const SUPABASE_URL = 'https://cpecdifwbumqoupvicsg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwZWNkaWZ3YnVtcW91cHZpY3NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMzQxMzIsImV4cCI6MjA3OTgxMDEzMn0.eOgWTr5X1L6nhS5TJoeqx3hfgV6DrA1qusVP0lUUAZE';

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 2. STATE MANAGEMENT ---
let currentUser = null;
let isSignUpMode = false;
let selectedDate = new Date();
let appointments = [];
let notes = [];
let pinnedNoteId = null;

// --- 3. DOM ELEMENTS ---
const elements = {
    // Auth
    authView: document.getElementById('auth-view'),
    appView: document.getElementById('app-view'),
    authForm: document.getElementById('auth-form'),
    authBtn: document.getElementById('auth-btn'),
    toggleAuth: document.getElementById('toggle-auth'),
    authError: document.getElementById('auth-error'),
    nameGroup: document.getElementById('name-group'),
    
    // Header & Profile
    greeting: document.getElementById('greeting-text'),
    profileBtn: document.getElementById('profile-btn'),
    profileMenu: document.getElementById('profile-menu'),
    menuEmail: document.getElementById('menu-email'),
    
    // Date
    displayDate: document.getElementById('display-date'),
    datePicker: document.getElementById('date-picker'),
    
    // Lists
    appList: document.getElementById('appointment-list'),
    notesGrid: document.getElementById('notes-grid'),
    todoList: document.getElementById('todo-list'),
    
    // Modals
    modal: document.getElementById('modal'), // Appointment Modal
    noteModal: document.getElementById('note-modal'), // Note Modal
    profileModal: document.getElementById('profile-modal'), // Profile Modal
    
    // Forms
    sessionForm: document.getElementById('session-form'),
    saveBtn: document.getElementById('save-btn')
};

// --- 4. AUTHENTICATION LOGIC ---

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
    
    elements.authBtn.textContent = 'Please wait...';
    elements.authBtn.disabled = true;
    elements.authError.textContent = '';

    let error = null;

    if (isSignUpMode) {
        // Sign Up with Meta Data (Name)
        const { data, error: signUpError } = await supabase.auth.signUp({
            email, 
            password,
            options: {
                data: { full_name: fullName }
            }
        });
        error = signUpError;
        if (!error) {
            alert("Account created! Logging you in...");
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

// Toggle Auth Mode
elements.toggleAuth.addEventListener('click', () => {
    isSignUpMode = !isSignUpMode;
    elements.authBtn.textContent = isSignUpMode ? 'Create Account' : 'Sign In';
    document.getElementById('toggle-text').textContent = isSignUpMode ? 'Already have an account? ' : 'New here? ';
    elements.toggleAuth.textContent = isSignUpMode ? 'Sign In' : 'Create an account';
    
    // Show/Hide Name Field
    elements.nameGroup.style.display = isSignUpMode ? 'block' : 'none';
    document.getElementById('full-name').required = isSignUpMode;
});

// --- 5. PROFILE & EXPORT ---

// Toggle Menu
elements.profileBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.profileMenu.classList.toggle('hidden');
});

// Close menu when clicking outside
window.addEventListener('click', () => {
    elements.profileMenu.classList.add('hidden');
});

// Logout
document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.reload();
});

// Edit Profile Modal
document.getElementById('edit-profile-btn').addEventListener('click', () => {
    document.getElementById('edit-display-name').value = currentUser.user_metadata.full_name || '';
    elements.profileModal.classList.add('active');
});

document.getElementById('save-profile').addEventListener('click', async () => {
    const newName = document.getElementById('edit-display-name').value;
    const { data, error } = await supabase.auth.updateUser({
        data: { full_name: newName }
    });
    if (!error) {
        currentUser = data.user;
        updateGreeting();
        elements.profileModal.classList.remove('active');
    }
});

document.getElementById('cancel-profile').addEventListener('click', () => {
    elements.profileModal.classList.remove('active');
});

// Export Data (CSV)
document.getElementById('export-btn').addEventListener('click', async () => {
    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', currentUser.id);

    if (data && data.length > 0) {
        // Convert to CSV
        const headers = ['Client Name', 'Date', 'Time', 'Type', 'Mode', 'Notes'];
        const csvRows = [headers.join(',')];
        
        data.forEach(row => {
            const values = [
                `"${row.client_name}"`,
                row.date,
                row.time,
                row.session_type,
                row.mode,
                `"${(row.notes || '').replace(/"/g, '""')}"` // Escape quotes
            ];
            csvRows.push(values.join(','));
        });
        
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', 'appointments_export.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } else {
        alert("No data to export.");
    }
});


// --- 6. APP LOGIC (MAIN) ---

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
    elements.profileBtn.textContent = name.substring(0, 2).toUpperCase();

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

// --- 7. DATE NAVIGATION & PICKER ---

function renderDate() {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    elements.displayDate.textContent = selectedDate.toLocaleDateString('en-US', options);
    // Sync hidden date picker
    elements.datePicker.value = selectedDate.toISOString().split('T')[0];
}

document.getElementById('prev-day').addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() - 1);
    updateDateView();
});

document.getElementById('next-day').addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() + 1);
    updateDateView();
});

// Jump to Today
document.getElementById('jump-today').addEventListener('click', () => {
    selectedDate = new Date();
    updateDateView();
});

// Calendar Picker Logic
elements.displayDate.addEventListener('click', () => {
    elements.datePicker.showPicker(); // Opens browser date picker
});

elements.datePicker.addEventListener('change', (e) => {
    if(e.target.value) {
        selectedDate = new Date(e.target.value);
        updateDateView();
    }
});

function updateDateView() {
    renderDate();
    fetchAppointments();
}

// --- 8. APPOINTMENTS (CRUD) ---

async function fetchAppointments() {
    elements.appList.innerHTML = '<div class="empty-state">Loading...</div>';
    const dateStr = selectedDate.toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('date', dateStr)
        .order('time', { ascending: true });

    appointments = data || [];
    renderAppointments();
}

function renderAppointments() {
    elements.appList.innerHTML = '';

    if (appointments.length === 0) {
        elements.appList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">☕</span>
                <p>No sessions on this day.<br>Time for a gentle break?</p>
            </div>`;
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

// Modal Logic for Appointments
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
    elements.saveBtn.textContent = "Save Session";
    
    const formDate = new Date(formData.date);
    if (formDate.getDate() !== selectedDate.getDate()) {
        selectedDate = formDate;
        renderDate();
    }
    fetchAppointments();
});

window.deleteSession = async (id) => {
    if(!confirm("Remove this session?")) return;
    await supabase.from('appointments').delete().eq('id', id);
    fetchAppointments();
};

// --- 9. NOTES & PINNED CHECKLIST (CRUD) ---

async function fetchNotes() {
    // We fetch all notes (Pinned and Regular)
    const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

    notes = data || [];
    renderNotes();
}

function renderNotes() {
    elements.notesGrid.innerHTML = '';
    elements.todoList.innerHTML = '';
    
    // Find or Create Pinned Note
    const pinned = notes.find(n => n.is_pinned);
    
    if (pinned) {
        pinnedNoteId = pinned.id;
        renderPinnedList(pinned.content);
    } else {
        // If no pinned note exists, create one in the UI state (will save to DB on first add)
        pinnedNoteId = null;
    }

    // Render Regular Notes
    const regularNotes = notes.filter(n => !n.is_pinned);
    regularNotes.forEach(note => {
        const div = document.createElement('div');
        div.className = 'note-card';
        div.innerHTML = `
            <div class="note-title">${note.title}</div>
            <div class="note-preview">${note.content}</div>
            <div class="note-date">${new Date(note.created_at).toLocaleDateString()}</div>
        `;
        div.onclick = () => openNoteModal(note.id);
        elements.notesGrid.appendChild(div);
    });
}

// --- Pinned List Logic ---
function renderPinnedList(content) {
    elements.todoList.innerHTML = '';
    if (!content) return;
    
    const items = JSON.parse(content); // Store checklist as JSON string
    items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'todo-item';
        div.innerHTML = `
            <input type="checkbox" class="todo-checkbox" ${item.done ? 'checked' : ''} onchange="toggleTodo(${index})">
            <span style="${item.done ? 'text-decoration:line-through; color:#aaa;' : ''}">${item.text}</span>
            <button onclick="deleteTodo(${index})" style="margin-left:auto; border:none; background:none; cursor:pointer; color:#aaa;">×</button>
        `;
        elements.todoList.appendChild(div);
    });
}

document.getElementById('add-todo').addEventListener('click', async () => {
    const text = prompt("New Task:");
    if (!text) return;
    
    let items = [];
    if (pinnedNoteId) {
        const note = notes.find(n => n.id === pinnedNoteId);
        if (note && note.content) items = JSON.parse(note.content);
    }
    
    items.push({ text, done: false });
    await savePinnedNote(items);
});

window.toggleTodo = async (index) => {
    const note = notes.find(n => n.id === pinnedNoteId);
    let items = JSON.parse(note.content);
    items[index].done = !items[index].done;
    await savePinnedNote(items);
};

window.deleteTodo = async (index) => {
    const note = notes.find(n => n.id === pinnedNoteId);
    let items = JSON.parse(note.content);
    items.splice(index, 1);
    await savePinnedNote(items);
};

async function savePinnedNote(items) {
    const content = JSON.stringify(items);
    
    if (pinnedNoteId) {
        await supabase.from('notes').update({ content }).eq('id', pinnedNoteId);
    } else {
        // Create first pinned note
        await supabase.from('notes').insert([{
            user_id: currentUser.id,
            title: 'Daily Intentions',
            content: content,
            type: 'checklist',
            is_pinned: true
        }]);
    }
    fetchNotes();
}

// --- Regular Notes Modal Logic ---
document.getElementById('add-note-btn').addEventListener('click', () => {
    document.getElementById('note-id').value = '';
    document.getElementById('note-title').value = '';
    document.getElementById('note-content').value = '';
    document.getElementById('delete-note').style.display = 'none';
    elements.noteModal.classList.add('active');
});

function openNoteModal(id) {
    const note = notes.find(n => n.id === id);
    document.getElementById('note-id').value = note.id;
    document.getElementById('note-title').value = note.title;
    document.getElementById('note-content').value = note.content;
    document.getElementById('delete-note').style.display = 'block';
    elements.noteModal.classList.add('active');
}

document.getElementById('cancel-note').addEventListener('click', () => elements.noteModal.classList.remove('active'));

document.getElementById('save-note').addEventListener('click', async () => {
    const id = document.getElementById('note-id').value;
    const title = document.getElementById('note-title').value;
    const content = document.getElementById('note-content').value;
    
    if (id) {
        await supabase.from('notes').update({ title, content }).eq('id', id);
    } else {
        await supabase.from('notes').insert([{ user_id: currentUser.id, title, content }]);
    }
    elements.noteModal.classList.remove('active');
    fetchNotes();
});

document.getElementById('delete-note').addEventListener('click', async () => {
    const id = document.getElementById('note-id').value;
    if(confirm("Delete this note?")) {
        await supabase.from('notes').delete().eq('id', id);
        elements.noteModal.classList.remove('active');
        fetchNotes();
    }
});

// Start App
checkSession();