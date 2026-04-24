
const STORAGE_KEY = 'timesheet_entries';

// DOM Elements
const totalHoursEl = document.getElementById('total-hours');
const totalBillEl = document.getElementById('total-bill');
const entryListEl = document.getElementById('entry-list');
const entryCountEl = document.getElementById('entry-count');
const btnAddEntry = document.getElementById('btn-add-entry');
const addModal = document.getElementById('add-modal');
const closeModalBtn = document.getElementById('close-modal');
const entryForm = document.getElementById('entry-form');

// State
let entries = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let settings = JSON.parse(localStorage.getItem('timesheet_settings')) || {
  name: 'Joey Cruz',
  title: 'Contractor',
  client: 'Madden Media',
  project: 'Nez Perce Tourism',
  rate: 130.00
};

// Initialize
function init() {
  // Set default date to today in the form
  document.getElementById('entry-date').valueAsDate = new Date();
  
  // Sort entries by date descending
  entries.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  renderHeader();
  renderDashboard();
  renderEntries();
}

function renderHeader() {
  document.getElementById('header-name').textContent = settings.name;
  document.getElementById('header-title').textContent = settings.title;
  document.getElementById('header-client').textContent = settings.client;
  document.getElementById('header-project').textContent = settings.project;
  
  // Set avatar initials
  const initials = settings.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  document.getElementById('header-avatar').textContent = initials;
}

// Logic: Calculate hours difference
function calculateHours(timeIn, timeOut, lunchOut, lunchIn) {
  const getMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };
  
  let totalMinutes = getMinutes(timeOut) - getMinutes(timeIn);
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  
  if (lunchOut && lunchIn) {
    let lunchMinutes = getMinutes(lunchIn) - getMinutes(lunchOut);
    if (lunchMinutes < 0) lunchMinutes += 24 * 60;
    totalMinutes -= lunchMinutes;
  }
  
  return Math.max(0, totalMinutes / 60);
}

function formatHourString(decimalHours) {
  const h = Math.floor(decimalHours);
  const m = Math.round((decimalHours - h) * 60);
  return `${h}:${m.toString().padStart(2, '0')}`;
}

function formatDateDisplay(dateStr) {
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  const d = new Date(dateStr);
  // Adjust for timezone offset to avoid showing previous day
  const userTimezoneOffset = d.getTimezoneOffset() * 60000;
  const localDate = new Date(d.getTime() + userTimezoneOffset);
  return localDate.toLocaleDateString('en-US', options);
}

function formatTimeDisplay(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const d = new Date();
  d.setHours(h, m);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// Render Dashboard
function renderDashboard() {
  const totalHours = entries.reduce((acc, entry) => acc + entry.hours, 0);
  const totalBill = totalHours * settings.rate;
  
  totalHoursEl.textContent = totalHours.toFixed(2);
  document.getElementById('header-rate').textContent = `At $${settings.rate.toFixed(2)} / hr`;
  
  // Format currency
  totalBillEl.textContent = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(totalBill);
  
  entryCountEl.textContent = `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`;
}

// Render Entries List
function renderEntries() {
  entryListEl.innerHTML = '';
  
  if (entries.length === 0) {
    entryListEl.innerHTML = '<div class="empty-state">No time entries yet. Clock in to get started!</div>';
    return;
  }
  
  entries.forEach((entry, index) => {
    const item = document.createElement('div');
    item.className = 'entry-item';
    
    const timeInDisplay = formatTimeDisplay(entry.timeIn);
    const timeOutDisplay = formatTimeDisplay(entry.timeOut);
    
    let lunchDisplay = '';
    if (entry.lunchOut && entry.lunchIn) {
      const lunchMinutes = Math.round((new Date(`1970-01-01T${entry.lunchIn}:00Z`) - new Date(`1970-01-01T${entry.lunchOut}:00Z`)) / 60000);
      const adjustedMins = lunchMinutes < 0 ? lunchMinutes + 24*60 : lunchMinutes;
      lunchDisplay = ` (Lunch time: ${adjustedMins}m)`;
    } else if (entry.lunch) {
      lunchDisplay = ` (Lunch time: ${entry.lunch}m)`; // backward compatibility
    }
    
    item.innerHTML = `
      <div class="entry-date-group">
        <span class="entry-date">${formatDateDisplay(entry.date)}</span>
        <span class="entry-times">${timeInDisplay} - ${timeOutDisplay}${lunchDisplay}</span>
        <div class="entry-actions">
          <button class="action-btn edit" data-id="${entry.id}" aria-label="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="action-btn delete" data-id="${entry.id}" aria-label="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
      <div class="entry-hours">${entry.hours.toFixed(2)} hrs</div>
    `;
    
    entryListEl.appendChild(item);
  });
  
  // Attach Event Listeners
  document.querySelectorAll('.action-btn.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      promptDelete(e.currentTarget.dataset.id);
    });
  });
  
  document.querySelectorAll('.action-btn.edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      editEntry(e.currentTarget.dataset.id);
    });
  });
}

// Delete Modal Logic
let entryToDelete = null;
const deleteModal = document.getElementById('delete-modal');

function promptDelete(id) {
  entryToDelete = id;
  deleteModal.classList.add('active');
}

function cancelDelete() {
  entryToDelete = null;
  deleteModal.classList.remove('active');
}

function executeDelete() {
  if (entryToDelete) {
    entries = entries.filter(e => e.id !== entryToDelete);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    renderDashboard();
    renderEntries();
  }
  cancelDelete();
}

function setCustomTime(prefix, timeStr) {
  if (!timeStr) {
    document.getElementById(`${prefix}-h`).value = '';
    document.getElementById(`${prefix}-m`).value = '';
    document.getElementById(`${prefix}-ampm`).value = 'AM';
    return;
  }
  
  let [hours, min] = timeStr.split(':').map(Number);
  let ampm = 'AM';
  
  if (hours >= 12) {
    ampm = 'PM';
    if (hours > 12) hours -= 12;
  }
  if (hours === 0) hours = 12;
  
  document.getElementById(`${prefix}-h`).value = hours;
  document.getElementById(`${prefix}-m`).value = min.toString().padStart(2, '0');
  document.getElementById(`${prefix}-ampm`).value = ampm;
}

function getCustomTime(prefix) {
  const h = document.getElementById(`${prefix}-h`).value;
  const m = document.getElementById(`${prefix}-m`).value;
  const ampm = document.getElementById(`${prefix}-ampm`).value;
  
  if (!h || !m) return '';
  
  let hours = parseInt(h, 10);
  if (hours === 12 && ampm === 'AM') hours = 0;
  if (hours < 12 && ampm === 'PM') hours += 12;
  
  const min = parseInt(m, 10);
  return `${hours.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}

function editEntry(id) {
  const entry = entries.find(e => e.id === id);
  if (!entry) return;
  
  document.getElementById('entry-id').value = entry.id;
  document.getElementById('entry-date').value = entry.date;
  setCustomTime('time-in', entry.timeIn);
  setCustomTime('time-out', entry.timeOut);
  setCustomTime('lunch-out', entry.lunchOut);
  setCustomTime('lunch-in', entry.lunchIn);
  document.getElementById('entry-notes').value = entry.notes || '';
  
  addModal.classList.add('active');
}

// Save Entry
function saveEntry(e) {
  e.preventDefault();
  
  const idField = document.getElementById('entry-id').value;
  const date = document.getElementById('entry-date').value;
  const timeIn = getCustomTime('time-in');
  const timeOut = getCustomTime('time-out');
  const lunchOut = getCustomTime('lunch-out');
  const lunchIn = getCustomTime('lunch-in');
  const notes = document.getElementById('entry-notes').value;
  
  let hours = calculateHours(timeIn, timeOut, lunchOut, lunchIn);
  
  if (idField) {
    // Edit existing
    const index = entries.findIndex(e => e.id === idField);
    if (index > -1) {
      entries[index] = { ...entries[index], date, timeIn, timeOut, lunchOut, lunchIn, notes, hours };
    }
  } else {
    // Add new
    const newEntry = {
      id: Date.now().toString(),
      date,
      timeIn,
      timeOut,
      lunchOut,
      lunchIn,
      notes,
      hours
    };
    entries.unshift(newEntry);
  }
  
  entries.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  
  renderDashboard();
  renderEntries();
  closeModal();
}

// Export CSV
function exportCSV() {
  let csvContent = "data:text/csv;charset=utf-8,";
  
  csvContent += `${settings.title},${settings.name},,,,,,,\r\n`;
  csvContent += `Client:,${settings.client},,,,,,,\r\n`;
  csvContent += `Project,${settings.project},,,,,,,\r\n`;
  csvContent += `,,,,,,,,\r\n`;
  
  csvContent += "Day,Date,Time In,Lunch Out,Lunch In,Time Out,Hour Total, Integer,Notes\r\n";
  
  let totalHours = 0;
  const exportEntries = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  exportEntries.forEach(entry => {
    const d = new Date(entry.date);
    const userTimezoneOffset = d.getTimezoneOffset() * 60000;
    const localDate = new Date(d.getTime() + userTimezoneOffset);
    const dayName = localDate.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = localDate.toLocaleDateString('en-US');
    
    totalHours += entry.hours;
    
    const row = [
      dayName,
      formattedDate,
      entry.timeIn || '',
      entry.lunchOut || '',
      entry.lunchIn || '',
      entry.timeOut || '',
      formatHourString(entry.hours),
      entry.hours.toFixed(2),
      `"${(entry.notes || '').replace(/"/g, '""')}"`
    ];
    csvContent += row.join(",") + "\r\n";
  });
  
  csvContent += `,,,,,,Total Hrs,${totalHours.toFixed(2)},\r\n`;
  csvContent += `,,,,,,,,\r\n`;
  csvContent += `,,,,,,Hourly Rate,$${settings.rate.toFixed(2)},\r\n`;
  csvContent += `,,,,,,Total Hours,${totalHours.toFixed(2)},\r\n`;
  csvContent += `,,,,,,Total Bill,$${(totalHours * settings.rate).toFixed(2)},\r\n`;

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "timesheet_export.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Modal Logic
function openModal() {
  entryForm.reset();
  document.getElementById('entry-id').value = '';
  document.getElementById('entry-date').valueAsDate = new Date();
  setCustomTime('time-in', '');
  setCustomTime('time-out', '');
  setCustomTime('lunch-out', '');
  setCustomTime('lunch-in', '');
  addModal.classList.add('active');
}

function closeModal() {
  addModal.classList.remove('active');
}

// Settings Modal Logic
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-modal');
const settingsForm = document.getElementById('settings-form');
const btnSettings = document.getElementById('btn-settings');

function openSettings() {
  document.getElementById('set-name').value = settings.name;
  document.getElementById('set-title').value = settings.title;
  document.getElementById('set-client').value = settings.client;
  document.getElementById('set-project').value = settings.project;
  document.getElementById('set-rate').value = settings.rate;
  settingsModal.classList.add('active');
}

function closeSettings() {
  settingsModal.classList.remove('active');
}

function saveSettings(e) {
  e.preventDefault();
  settings.name = document.getElementById('set-name').value;
  settings.title = document.getElementById('set-title').value;
  settings.client = document.getElementById('set-client').value;
  settings.project = document.getElementById('set-project').value;
  settings.rate = parseFloat(document.getElementById('set-rate').value);
  
  localStorage.setItem('timesheet_settings', JSON.stringify(settings));
  
  renderHeader();
  renderDashboard();
  closeSettings();
}

// Event Listeners
btnAddEntry.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
entryForm.addEventListener('submit', saveEntry);
document.getElementById('export-csv')?.addEventListener('click', exportCSV);

btnSettings.addEventListener('click', openSettings);
closeSettingsBtn.addEventListener('click', closeSettings);
settingsForm.addEventListener('submit', saveSettings);

document.getElementById('confirm-delete').addEventListener('click', executeDelete);
document.getElementById('cancel-delete').addEventListener('click', cancelDelete);

// Close modals when clicking outside
addModal.addEventListener('click', (e) => {
  if (e.target === addModal) closeModal();
});
settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) closeSettings();
});
deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) cancelDelete();
});

// Run Init
init();
