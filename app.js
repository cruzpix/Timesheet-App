const RATE_PER_HOUR = 130.00;
const STORAGE_KEY = 'timesheet_entries';

// DOM Elements
const totalHoursEl = document.getElementById('total-hours');
const totalBillEl = document.getElementById('total-bill');
const entryListEl = document.getElementById('entry-list');
const entryCountEl = document.getElementById('entry-count');
const fabAdd = document.getElementById('fab-add');
const addModal = document.getElementById('add-modal');
const closeModalBtn = document.getElementById('close-modal');
const entryForm = document.getElementById('entry-form');

// State
let entries = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

// Initialize
function init() {
  // Set default date to today in the form
  document.getElementById('entry-date').valueAsDate = new Date();
  
  // Sort entries by date descending
  entries.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  renderDashboard();
  renderEntries();
}

// Logic: Calculate hours difference
function calculateHours(timeIn, timeOut, lunchMinutes) {
  const [inH, inM] = timeIn.split(':').map(Number);
  const [outH, outM] = timeOut.split(':').map(Number);
  
  let totalMinutes = (outH * 60 + outM) - (inH * 60 + inM);
  
  // Handle cross-midnight (e.g., 22:00 to 02:00)
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }
  
  // Subtract lunch
  totalMinutes -= (lunchMinutes || 0);
  
  return Math.max(0, totalMinutes / 60);
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
  const totalBill = totalHours * RATE_PER_HOUR;
  
  totalHoursEl.textContent = totalHours.toFixed(2);
  
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
    
    item.innerHTML = `
      <div class="entry-date-group">
        <span class="entry-date">${formatDateDisplay(entry.date)}</span>
        <span class="entry-times">${timeInDisplay} - ${timeOutDisplay} ${entry.lunch ? `(-${entry.lunch}m)` : ''}</span>
      </div>
      <div class="entry-hours">${entry.hours.toFixed(2)} hrs</div>
    `;
    
    entryListEl.appendChild(item);
  });
}

// Save Entry
function saveEntry(e) {
  e.preventDefault();
  
  const date = document.getElementById('entry-date').value;
  const timeIn = document.getElementById('time-in').value;
  const timeOut = document.getElementById('time-out').value;
  const lunch = parseInt(document.getElementById('lunch-duration').value) || 0;
  
  const hours = calculateHours(timeIn, timeOut, lunch);
  
  const newEntry = {
    id: Date.now().toString(),
    date,
    timeIn,
    timeOut,
    lunch,
    hours
  };
  
  entries.unshift(newEntry);
  entries.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  
  renderDashboard();
  renderEntries();
  closeModal();
  
  // Reset form
  entryForm.reset();
  document.getElementById('entry-date').valueAsDate = new Date();
  document.getElementById('lunch-duration').value = "0";
}

// Modal Logic
function openModal() {
  addModal.classList.add('active');
}

function closeModal() {
  addModal.classList.remove('active');
}

// Event Listeners
fabAdd.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
entryForm.addEventListener('submit', saveEntry);

// Close modal when clicking outside
addModal.addEventListener('click', (e) => {
  if (e.target === addModal) {
    closeModal();
  }
});

// Run Init
init();
