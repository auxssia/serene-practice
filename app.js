// --- 1. CONFIGURATION ---
// REPLACE THESE WITH YOUR ACTUAL SUPABASE KEYS
const SUPABASE_URL = 'https://cpecdifwbumqoupvicsg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwZWNkaWZ3YnVtcW91cHZpY3NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMzQxMzIsImV4cCI6MjA3OTgxMDEzMn0.eOgWTr5X1L6nhS5TJoeqx3hfgV6DrA1qusVP0lUUAZE';

// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 2. STATE MANAGEMENT ---
let currentUser = null;
let isSignUpMode = false;
let selectedDate = new Date(); // Tracks the date currently being viewed
let appointments = []; // Stores the fetched appointments list

// --- 3. DOM ELEMENTS ---
const views = {
    auth: document.getElementById('auth-view'),
    app: document.getElementById('app-view')
};
const elements = {
    authForm: document.getElementById('auth-form'),
    authBtn: document.getElementById('auth-btn'),
    toggleAuth: document.getElementById('toggle-auth'),
    authError: document.getElementById('auth-error'),
    greeting: document.getElementById('greeting-text'),
    displayDate: document.getElementById('display-date'),
    list: document.getElementById('appointment-list'),
    modal: document.getElementById('modal'),
    modalTitle: document.getElementById('modal-title'),
    sessionForm: document.getElementById('session-form'),
    saveBtn: document.getElementById('save-btn')
};

// --- 4. AUTHENTICATION LOGIC ---

// Check if user is already logged in when the page loads
async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        showApp();
    } else {
        showAuth();
    }
}

// Handle Login / Sign Up Form Submit
elements.authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Set loading state
    elements.authBtn.textContent = 'Please wait...';
    elements.authBtn.disabled = true;
    elements.authError.textContent = '';

    let error = null;

    if (isSignUpMode) {
        // Create new account
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        error = signUpError;
        if (!error) {
            alert("Account created! Logging you in...");
            // Automatically sign them in after creation
            const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
            if(!signInError) window.location.reload();
        }
    } else {
        // Sign in existing user
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        error = signInError;
        if (data.user) {
            currentUser = data.user;
            showApp();
        }
    }

    // Handle errors if any
    if (error) {
        elements.authError.textContent = error.message;
        elements.authBtn.textContent = isSignUpMode ? 'Create Account' : 'Sign In';
        elements.authBtn.disabled = false;
    }
});

// Logout Button
document.getElementById('logout-btn').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.reload();
});

// Toggle between Login and Sign Up
elements.toggleAuth.addEventListener('click', () => {
    isSignUpMode = !isSignUpMode;
    elements.authBtn.textContent = isSignUpMode ? 'Create Account' : 'Sign In';
    document.getElementById('toggle-text').textContent = isSignUpMode ? 'Already have an account? ' : 'New here? ';
    elements.toggleAuth.textContent = isSignUpMode ? 'Sign In' : 'Create an account';
    elements.authError.textContent = '';
});

// --- 5. APPLICATION LOGIC (UI) ---

function showAuth() {
    views.auth.style.display = 'flex';
    views.app.style.display = 'none';
}

function showApp() {
    views.auth.style.display = 'none';
    views.app.style.display = 'block';
    
    // Set Dynamic Greeting based on time
    const hour = new Date().getHours();
    let greeting = "Good Morning";
    if (hour >= 12) greeting = "Good Afternoon";
    if (hour >= 17) greeting = "Good Evening";
    elements.greeting.textContent = `${greeting}, Dr. Pallavi 🌼`;

    renderDate();
    fetchAppointments();
}

// --- 6. DATE NAVIGATION ---

function renderDate() {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    elements.displayDate.textContent = selectedDate.toLocaleDateString('en-US', options);
}

document.getElementById('prev-day').addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() - 1);
    renderDate();
    fetchAppointments();
});

document.getElementById('next-day').addEventListener('click', () => {
    selectedDate.setDate(selectedDate.getDate() + 1);
    renderDate();
    fetchAppointments();
});

// --- 7. DATABASE OPERATIONS (CRUD) ---

async function fetchAppointments() {
    elements.list.innerHTML = '<div class="empty-state">Loading...</div>';
    
    // Format date to YYYY-MM-DD for database query
    const dateStr = selectedDate.toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('date', dateStr)
        .order('time', { ascending: true });

    if (error) console.error('Error fetching data:', error);
    
    appointments = data || [];
    renderAppointments();
}

function renderAppointments() {
    elements.list.innerHTML = '';

    if (appointments.length === 0) {
        elements.list.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">☕</span>
                <p>No sessions on this day.<br>Time for a gentle break?</p>
            </div>`;
        return;
    }

    appointments.forEach(appt => {
        // Remove seconds from time (11:00:00 -> 11:00)
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
        elements.list.appendChild(div);
    });
}

async function deleteSession(id) {
    if(!confirm("Remove this session?")) return;
    await supabase.from('appointments').delete().eq('id', id);
    fetchAppointments(); // Refresh list
}

// --- 8. MODAL & SAVING LOGIC ---

// Open Modal (Add Mode)
document.getElementById('fab-add').addEventListener('click', () => {
    elements.sessionForm.reset();
    document.getElementById('edit-id').value = '';
    // Default form date to the date currently being viewed
    document.getElementById('session-date').value = selectedDate.toISOString().split('T')[0];
    elements.modalTitle.textContent = "New Session";
    elements.modal.classList.add('active');
});

// Open Modal (Edit Mode) - Helper function attached to window so HTML can call it
window.openEditModal = (id) => {
    const appt = appointments.find(a => a.id === id);
    if (!appt) return;

    // Fill form with existing data
    document.getElementById('edit-id').value = appt.id;
    document.getElementById('client-name').value = appt.client_name;
    document.getElementById('session-date').value = appt.date;
    document.getElementById('session-time').value = appt.time;
    document.getElementById('session-type').value = appt.session_type;
    document.getElementById('session-mode').value = appt.mode;
    document.getElementById('session-notes').value = appt.notes || '';
    
    elements.modalTitle.textContent = "Edit Session";
    elements.modal.classList.add('active');
};

// Close Modal
document.getElementById('cancel-btn').addEventListener('click', () => {
    elements.modal.classList.remove('active');
});

// Save (Create or Update)
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

    if (editId) {
        // Update existing record
        await supabase.from('appointments').update(formData).eq('id', editId);
    } else {
        // Create new record
        await supabase.from('appointments').insert([formData]);
    }

    elements.modal.classList.remove('active');
    elements.saveBtn.textContent = "Save Session";
    
    // If the date of the appointment is different from the view, switch view
    const formDate = new Date(formData.date);
    if (formDate.getDate() !== selectedDate.getDate()) {
        selectedDate = formDate;
        renderDate();
    }
    
    fetchAppointments();
});

// Initialize App
checkSession();