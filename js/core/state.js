export const state = {
    currentUser: null,
    isSignUpMode: false,
    selectedDate: new Date(),
    appointments: [],
    notes: [],
    pinnedNoteId: null,
    currentChecklist: [],
    currentBlockedDate: null,
    calendarMonth: new Date().getMonth(),
    calendarYear: new Date().getFullYear()
};

export const elements = {
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
    dateNav: document.querySelector('.date-nav'),
    displayDate: document.getElementById('display-date'),
    datePicker: document.getElementById('date-picker'),
    jumpToday: document.getElementById('jump-today'),
    toggleBlockBtn: document.getElementById('toggle-block-btn'),
    todayBadge: document.getElementById('today-badge'),
    sessionCount: document.getElementById('session-count'),
    calendarToggle: document.getElementById('calendar-toggle'),
    calendarSection: document.getElementById('calendar-section'),
    calendarHeader: document.querySelector('.calendar-header'),
    calMonthLabel: document.getElementById('cal-month-label'),
    calPrevMonth: document.getElementById('cal-prev-month'),
    calNextMonth: document.getElementById('cal-next-month'),
    calendarContainer: document.getElementById('calendar-container'),

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
    saveBtn: document.getElementById('save-btn'),
    phoneInput: document.getElementById('phone-number'),
    reminderCheckbox: document.getElementById('send-reminder'),
    repeatGroup: document.getElementById('repeat-group'),
    repeatWeekly: document.getElementById('repeat-weekly')
};
