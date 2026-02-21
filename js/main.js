import { state, elements } from './core/state.js';
import { supabaseClient } from './core/supabaseClient.js';
import { authService } from './auth/authService.js';
import { appointmentService } from './appointments/appointmentService.js';
import { noteService } from './notes/noteService.js';
import { clientService } from './clients/clientService.js';
import { blockedDateService } from './blockedDates/blockedDateService.js';
import { generateWeeklyOccurrences } from './appointments/recurrenceService.js';

// --- INITIALIZATION ---

async function init() {
    if (!supabaseClient) {
        console.error("Supabase not initialized. Check internet connection.");
        return;
    }

    const { data: { session } } = await authService.getSession();
    if (session) {
        state.currentUser = session.user;
        showApp();
    } else {
        showAuth();
    }

    attachEventListeners();
}

// --- AUTH UI ---

function showAuth() {
    elements.authView.style.display = 'flex';
    elements.appView.style.display = 'none';
}

function showApp() {
    elements.authView.style.display = 'none';
    elements.appView.style.display = 'block';

    updateGreeting();

    // Set Profile Info
    elements.menuEmail.textContent = state.currentUser.email;
    const name = state.currentUser.user_metadata?.full_name || "Dr";
    elements.profileAvatar.textContent = name.substring(0, 2).toUpperCase();
    elements.menuName.textContent = name;

    async function loadInitialData() {
        await checkBlockedStatus();
        await renderDate();
        fetchAppointments();
        fetchNotes();
    }
    loadInitialData();
}

function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = "Good Morning";
    if (hour >= 12) greeting = "Good Afternoon";
    if (hour >= 17) greeting = "Good Evening";
    const name = state.currentUser.user_metadata?.full_name || "Doctor";
    elements.greeting.textContent = `${greeting}, ${name} 🌼`;
}

// --- DATE LOGIC ---

async function renderDate() {
    const day = state.selectedDate.getDate();
    const month = state.selectedDate.toLocaleString('default', { month: 'long' });
    const year = state.selectedDate.getFullYear();
    const weekday = state.selectedDate.toLocaleString('default', { weekday: 'long' });

    elements.displayDate.textContent = `${day}, ${month}, ${year} (${weekday})`;
    elements.datePicker.value = state.selectedDate.toISOString().split('T')[0];

    // Visual indicator for blocked date
    if (state.currentBlockedDate) {
        elements.displayDate.style.color = '#e57373'; // Soft red
        elements.toggleBlockBtn.textContent = '🔓';
        elements.toggleBlockBtn.title = `Blocked: ${state.currentBlockedDate.reason || 'No reason'}`;
    } else {
        elements.displayDate.style.color = 'inherit';
        elements.toggleBlockBtn.textContent = '🔒';
        elements.toggleBlockBtn.title = 'Block this date';
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const selStr = state.selectedDate.toISOString().split('T')[0];
    if (todayStr !== selStr) elements.jumpToday.classList.remove('hidden');
    else elements.jumpToday.classList.add('hidden');
}

async function checkBlockedStatus() {
    const dateStr = state.selectedDate.toISOString().split('T')[0];
    const { data, error } = await blockedDateService.getBlockedDate(state.currentUser.id, dateStr);

    if (error) console.error("Error checking blocked status:", error);
    state.currentBlockedDate = data || null;
}

async function updateDateView() {
    await checkBlockedStatus();
    await renderDate();
    fetchAppointments();
}

// --- APPOINTMENTS ---

async function fetchAppointments() {
    elements.appList.innerHTML = '<div class="empty-state">Loading...</div>';
    const dateStr = state.selectedDate.toISOString().split('T')[0];

    const { data, error } = await appointmentService.fetchAppointments(state.currentUser.id, dateStr);

    if (error) console.error("Appt Error:", error);
    state.appointments = data || [];
    renderAppointments();
}

function renderAppointments() {
    elements.appList.innerHTML = '';
    if (state.appointments.length === 0) {
        elements.appList.innerHTML = `<div class="empty-state"><span class="empty-icon">☕</span><p>No sessions on this day.<br>Time for a gentle break?</p></div>`;
        return;
    }
    state.appointments.forEach(appt => {
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

function openEditModal(id) {
    const appt = state.appointments.find(a => a.id === id);
    if (!appt) return;
    document.getElementById('edit-id').value = appt.id;
    document.getElementById('client-name').value = appt.client_name;
    document.getElementById('session-date').value = appt.date;
    document.getElementById('session-time').value = appt.time;
    document.getElementById('session-type').value = appt.session_type;
    document.getElementById('session-mode').value = appt.mode;
    document.getElementById('session-notes').value = appt.notes || '';
    elements.phoneInput.value = appt.phone || '';
    elements.reminderCheckbox.checked = appt.send_reminder || false;
    document.getElementById('modal-title').textContent = "Edit Session";

    // Hide recurrence for edits
    if (elements.repeatGroup) elements.repeatGroup.classList.add('hidden');

    elements.modal.classList.add('active');
}

async function deleteSession(id) {
    if (!confirm("Remove this session?")) return;
    await appointmentService.deleteAppointment(id);
    fetchAppointments();
}

// --- NOTES ---

async function fetchNotes() {
    const { data, error } = await noteService.fetchNotes(state.currentUser.id);
    if (error) console.error("Notes Error:", error);
    state.notes = data || [];
    renderNotesList();
}

function renderNotesList() {
    elements.notesList.innerHTML = '';

    let pinned = state.notes.find(n => n.is_pinned);

    if (!pinned) {
        createPinnedNote();
        return;
    }

    const pinDiv = document.createElement('div');
    pinDiv.className = 'note-item';
    pinDiv.innerHTML = `<span class="note-icon">📌</span> <span>${pinned.title}</span> <span class="note-arrow">›</span>`;
    pinDiv.onclick = () => openCanvas(pinned);
    elements.notesList.appendChild(pinDiv);

    state.notes.filter(n => !n.is_pinned).forEach(note => {
        const div = document.createElement('div');
        div.className = 'note-item';
        div.innerHTML = `<span class="note-icon">📝</span> <span>${note.title}</span> <span class="note-arrow">›</span>`;
        div.onclick = () => openCanvas(note);
        elements.notesList.appendChild(div);
    });
}

async function createPinnedNote() {
    const { data } = await noteService.createPinnedNote(state.currentUser.id);
    if (data) {
        state.notes.push(data[0]);
        renderNotesList();
    }
}

function openCanvas(note) {
    if (!note) return;
    document.getElementById('note-id').value = note.id;
    elements.noteTitle.value = note.title;

    if (note.is_pinned || note.type === 'checklist') {
        elements.noteContent.classList.add('hidden');
        elements.checklistContainer.classList.remove('hidden');
        state.pinnedNoteId = note.id;
        try {
            state.currentChecklist = JSON.parse(note.content || '[]');
        } catch (e) {
            state.currentChecklist = [];
        }
        renderChecklist();
    } else {
        elements.noteContent.classList.remove('hidden');
        elements.checklistContainer.classList.add('hidden');
        elements.noteContent.value = note.content || '';
        state.pinnedNoteId = null;
        state.currentChecklist = [];
    }

    elements.noteModal.classList.add('active');
}

async function saveCurrentNote() {
    const id = document.getElementById('note-id').value;
    const title = elements.noteTitle.value;

    if (!id) return;

    const isChecklist = (state.pinnedNoteId && String(state.pinnedNoteId) === String(id));
    let content;

    if (isChecklist) {
        content = JSON.stringify(state.currentChecklist || []);
    } else {
        content = elements.noteContent.value;
    }

    await noteService.updateNote(id, { title, content });

    // Sync state.notes
    const noteIndex = state.notes.findIndex(n => String(n.id) === String(id));
    if (noteIndex !== -1) {
        state.notes[noteIndex].title = title;
        state.notes[noteIndex].content = content;
    }
}

function renderChecklist() {
    elements.todoList.innerHTML = '';
    const items = state.currentChecklist || [];

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

    if (items.length > 0 && items.some(i => i.done)) {
        const clearBtn = document.createElement('div');
        clearBtn.style.marginTop = '10px';
        clearBtn.style.textAlign = 'right';
        clearBtn.innerHTML = `<button onclick="uncheckAll()" style="font-size:0.8rem; color:#AFA2C3; background:none; border:none; cursor:pointer;">Uncheck All (New Day)</button>`;
        elements.todoList.appendChild(clearBtn);
    }
}

async function updateChecklist(modifyFn) {
    const id = document.getElementById('note-id').value;
    if (!id) return;

    if (state.currentChecklist) {
        modifyFn(state.currentChecklist);
        const content = JSON.stringify(state.currentChecklist);
        const title = elements.noteTitle.value;

        // Optimistic UI update
        renderChecklist();

        // Background save
        await noteService.updateNote(id, { title, content });

        // Update state.notes to keep everything in sync
        const noteIndex = state.notes.findIndex(n => String(n.id) === String(id));
        if (noteIndex !== -1) {
            state.notes[noteIndex].content = content;
            state.notes[noteIndex].title = title;
        }
    }
}

async function toggleTodo(index) {
    await updateChecklist(items => items[index].done = !items[index].done);
}

async function deleteTodo(index) {
    await updateChecklist(items => items.splice(index, 1));
}

async function uncheckAll() {
    if (confirm("Uncheck all items for a new day?")) {
        await updateChecklist(items => items.forEach(i => i.done = false));
    }
}

// --- EVENT LISTENERS ---

function attachEventListeners() {
    // Auth Form
    elements.authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const fullName = document.getElementById('full-name').value;

        elements.authBtn.textContent = 'Connecting...';
        elements.authBtn.disabled = true;
        elements.authError.textContent = '';

        try {
            let error;

            if (state.isSignUpMode) {
                const signUpResponse = await authService.signUp(email, password, fullName);
                error = signUpResponse.error;
                if (!error) {
                    alert("Account created! Logging you in...");
                    const signInResponse = await authService.signIn(email, password);
                    if (!signInResponse.error) window.location.reload();
                }
            } else {
                const signInResponse = await authService.signIn(email, password);
                error = signInResponse.error;
                if (signInResponse.data.user) {
                    state.currentUser = signInResponse.data.user;
                    showApp();
                }
            }

            if (error) throw error;

        } catch (err) {
            elements.authError.textContent = err.message;
            elements.authBtn.textContent = state.isSignUpMode ? 'Create Account' : 'Sign In';
            elements.authBtn.disabled = false;
        }
    });

    // Toggle Auth Mode
    elements.toggleAuth.addEventListener('click', () => {
        state.isSignUpMode = !state.isSignUpMode;
        elements.authBtn.textContent = state.isSignUpMode ? 'Create Account' : 'Sign In';
        document.getElementById('toggle-text').textContent = state.isSignUpMode ? 'Already have an account? ' : 'New here? ';
        elements.toggleAuth.textContent = state.isSignUpMode ? 'Sign In' : 'Create an account';
        elements.nameGroup.style.display = state.isSignUpMode ? 'block' : 'none';
        document.getElementById('full-name').required = state.isSignUpMode;
    });

    // Profile menu toggle
    elements.profileAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.profileMenu.classList.toggle('hidden');
    });

    window.addEventListener('click', () => elements.profileMenu.classList.add('hidden'));

    // Logout
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await authService.signOut();
        window.location.reload();
    });

    // Edit Profile
    document.getElementById('edit-profile-btn').addEventListener('click', () => {
        document.getElementById('edit-display-name').value = state.currentUser.user_metadata?.full_name || '';
        elements.profileModal.classList.add('active');
    });

    document.getElementById('save-profile').addEventListener('click', async () => {
        const newName = document.getElementById('edit-display-name').value;
        const { data, error } = await authService.updateProfile(newName);
        if (!error) {
            state.currentUser = data.user;
            updateGreeting();
            elements.profileAvatar.textContent = newName.substring(0, 2).toUpperCase();
            elements.menuName.textContent = newName;
            elements.profileModal.classList.remove('active');
        }
    });

    document.getElementById('cancel-profile').addEventListener('click', () => elements.profileModal.classList.remove('active'));

    // Export CSV
    document.getElementById('export-btn').addEventListener('click', async () => {
        const { data } = await appointmentService.fetchAllAppointments(state.currentUser.id);
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

    // Date navigation
    elements.dateNav.addEventListener('click', (e) => {
        if (e.target.closest('.nav-btn')) return;
        elements.datePicker.showPicker();
    });

    document.getElementById('prev-day').addEventListener('click', () => {
        state.selectedDate.setDate(state.selectedDate.getDate() - 1);
        updateDateView();
    });
    document.getElementById('next-day').addEventListener('click', () => {
        state.selectedDate.setDate(state.selectedDate.getDate() + 1);
        updateDateView();
    });
    elements.jumpToday.addEventListener('click', () => {
        state.selectedDate = new Date();
        updateDateView();
    });
    elements.datePicker.addEventListener('change', (e) => {
        if (e.target.value) {
            state.selectedDate = new Date(e.target.value);
            updateDateView();
        }
    });

    elements.toggleBlockBtn.addEventListener('click', async () => {
        const userId = state.currentUser.id;
        const dateStr = state.selectedDate.toISOString().split('T')[0];

        if (state.currentBlockedDate) {
            // Unblock
            if (confirm("Unblock this date?")) {
                await blockedDateService.unblockDate(state.currentBlockedDate.id);
                updateDateView();
            }
        } else {
            // Block
            const reason = prompt("Enter a reason for blocking this date (optional):");
            if (reason !== null) {
                await blockedDateService.blockDate(userId, dateStr, reason);
                updateDateView();
            }
        }
    });

    // Appointment Form
    document.getElementById('fab-add').addEventListener('click', () => {
        elements.sessionForm.reset();
        document.getElementById('edit-id').value = '';
        document.getElementById('session-date').value = state.selectedDate.toISOString().split('T')[0];
        document.getElementById('modal-title').textContent = "New Session";

        // Show/reset recurrence for new appts
        if (elements.repeatGroup) elements.repeatGroup.classList.remove('hidden');
        if (elements.repeatWeekly) elements.repeatWeekly.checked = false;

        // Reset reminder fields
        if (elements.phoneInput) elements.phoneInput.value = '+91';
        if (elements.reminderCheckbox) elements.reminderCheckbox.checked = false;

        elements.modal.classList.add('active');
    });

    document.getElementById('cancel-btn').addEventListener('click', () => elements.modal.classList.remove('active'));

    elements.sessionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        elements.saveBtn.textContent = "Saving...";

        const client_name = document.getElementById('client-name').value;
        const userId = state.currentUser.id;
        let clientId = null;

        try {
            // Find or create client
            const { data: existingClient, error: findError } = await clientService.findClientByName(userId, client_name);

            if (findError) {
                console.error("Error finding client:", findError);
            }

            if (existingClient) {
                clientId = existingClient.id;
            } else {
                const { data: newClient, error: createError } = await clientService.createClient(userId, client_name);
                if (createError) {
                    console.error("Error creating client:", createError);
                } else if (newClient) {
                    clientId = newClient.id;
                }
            }
        } catch (err) {
            console.error("Client resolution failed:", err);
        }

        let phone = elements.phoneInput.value.replace(/\s+/g, '');
        const send_reminder = elements.reminderCheckbox.checked;

        // Validation & Normalization
        if (phone && phone !== '+91') {
            // Strip any character that isn't a digit or leading +
            phone = (phone.startsWith('+') ? '+' : '') + phone.replace(/\D/g, '');

            if (phone.startsWith('+91')) {
                const digits = phone.substring(3);
                if (digits.length !== 10) {
                    alert("After +91, exactly 10 digits are required.");
                    elements.saveBtn.textContent = "Save";
                    return;
                }
            }
        }

        if (send_reminder) {
            if (!phone || phone === '+91') {
                alert("Please enter a WhatsApp number to send a reminder.");
                elements.saveBtn.textContent = "Save";
                return;
            }
            if (!phone.startsWith('+91') || phone.length !== 13) {
                alert("Please enter a valid +91 number (10 digits after +91).");
                elements.saveBtn.textContent = "Save";
                return;
            }
        }

        const formData = {
            user_id: userId,
            client_id: clientId,
            client_name: client_name, // Backward compatibility
            phone: phone,
            send_reminder: send_reminder,
            date: document.getElementById('session-date').value,
            time: document.getElementById('session-time').value,
            session_type: document.getElementById('session-type').value,
            mode: document.getElementById('session-mode').value,
            notes: document.getElementById('session-notes').value
        };
        const editId = document.getElementById('edit-id').value;
        const repeatWeekly = document.getElementById('repeat-weekly').checked;

        // Check if date is blocked before saving
        const targetDate = document.getElementById('session-date').value;
        const { data: blockedData } = await blockedDateService.getBlockedDate(userId, targetDate);
        if (blockedData) {
            if (!confirm(`This date is blocked (Reason: ${blockedData.reason || 'None provided'}). Continue?`)) {
                elements.saveBtn.textContent = "Save";
                return;
            }
        }

        let saveResult;
        if (repeatWeekly && !editId) {
            const recurringGroupId = crypto.randomUUID();
            const futureDates = generateWeeklyOccurrences(formData.date, 8);

            const appointmentsToSave = [
                { ...formData, recurring_group_id: recurringGroupId },
                ...futureDates.map(date => ({
                    ...formData,
                    date: date,
                    recurring_group_id: recurringGroupId
                }))
            ];

            saveResult = await appointmentService.bulkSaveAppointments(appointmentsToSave);
        } else {
            saveResult = await appointmentService.saveAppointment(formData, editId);
        }

        const { error } = saveResult;

        if (error) {
            console.error("Save Error:", error);
            alert("Error saving: " + error.message);
            elements.saveBtn.textContent = "Save";
            return;
        }

        elements.modal.classList.remove('active');
        elements.saveBtn.textContent = "Save";

        // If the date changed, jump to that date
        if (new Date(formData.date).getDate() !== state.selectedDate.getDate()) {
            state.selectedDate = new Date(formData.date);
            renderDate();
        }
        fetchAppointments();
    });

    // Notes
    document.getElementById('add-note-title-btn').addEventListener('click', () => {
        document.getElementById('new-note-title-input').value = '';
        elements.newTitleModal.classList.add('active');
    });
    document.getElementById('cancel-new-title').addEventListener('click', () => elements.newTitleModal.classList.remove('active'));

    document.getElementById('create-note-btn').addEventListener('click', async () => {
        const title = document.getElementById('new-note-title-input').value;
        if (!title) return;

        const { data, error } = await noteService.createNote(state.currentUser.id, title);

        if (!error) {
            elements.newTitleModal.classList.remove('active');
            await fetchNotes();
            openCanvas(data[0]);
        }
    });

    document.getElementById('close-note').addEventListener('click', async () => {
        await saveCurrentNote();
        elements.noteModal.classList.remove('active');
        fetchNotes();
    });

    document.getElementById('add-todo-item').addEventListener('click', async () => {
        const text = prompt("New Item:");
        if (!text) return;
        await updateChecklist(items => items.push({ text, done: false }));
    });

    document.getElementById('delete-note').addEventListener('click', async () => {
        const id = document.getElementById('note-id').value;
        if (state.pinnedNoteId && String(state.pinnedNoteId) === String(id)) {
            alert("Daily Intentions cannot be deleted.");
            return;
        }
        if (confirm("Delete this note?")) {
            await noteService.deleteNote(id);
            elements.noteModal.classList.remove('active');
            fetchNotes();
        }
    });
}

// --- EXPOSE GLOBALS FOR INLINE ONCLICK ---
// (Required since the HTML structure is not modified)
window.openEditModal = openEditModal;
window.deleteSession = deleteSession;
window.toggleTodo = toggleTodo;
window.deleteTodo = deleteTodo;
window.uncheckAll = uncheckAll;

// Phone input normalization (preventing spaces/alphabets)
if (elements.phoneInput) {
    elements.phoneInput.addEventListener('input', (e) => {
        let val = e.target.value;
        if (!val.startsWith('+91')) {
            val = '+91' + val.replace(/\D/g, '');
        } else {
            const prefix = '+91';
            const rest = val.substring(3).replace(/\D/g, '');
            val = prefix + rest;
        }
        e.target.value = val;
    });
}

// Start the app
init();
