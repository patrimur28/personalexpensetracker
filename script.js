const STORAGE_KEY = 'ledgerTransactions_v1';
const seedTransactions = [
  { id: '1', description: 'Salary deposit', category: 'Income', date: 'Sep 01, 2026', amount: 5240, type: 'income' },
  { id: '2', description: 'Whole Foods Market', category: 'Food & Dining', date: 'Sep 01, 2026', amount: 86.42, type: 'expense' },
  { id: '3', description: 'Monthly rent', category: 'Home', date: 'Aug 30, 2026', amount: 1200, type: 'expense' },
  { id: '4', description: 'Citymapper pass', category: 'Transport', date: 'Aug 29, 2026', amount: 42.5, type: 'expense' },
  { id: '5', description: 'Kinfolk Market', category: 'Shopping', date: 'Aug 27, 2026', amount: 118.75, type: 'expense' }
];
let transactions = loadTransactions();
let activeFilter = 'all';
let activeCategory = 'all';
let activeSort = 'date-desc';
let editingId = null;
let spendingChart;
const $ = (selector) => document.querySelector(selector);
const money = (amount) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
function loadTransactions() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || seedTransactions; } catch { return seedTransactions; } }
function saveTransactions() { localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); }
function formatDate(date) { return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }); }
function renderCategories() {
  const expenses = transactions.filter((item) => item.type === 'expense');
  const categories = expenses.reduce((result, item) => { result[item.category] = (result[item.category] || 0) + item.amount; return result; }, {});
  const sorted = Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const max = sorted[0]?.[1] || 1;
  $('#category-list').innerHTML = sorted.map(([name, total]) => `<div class="category-row"><span class="category-icon">${name[0]}</span><div><span class="category-name">${name}</span><div class="category-bar"><i style="width:${Math.round(total / max * 100)}%"></i></div></div><span class="category-amount">${money(total)}</span></div>`).join('');
  const categoryFilter = $('#category-filter');
  const selectedCategory = categoryFilter.value || 'all';
  categoryFilter.innerHTML = '<option value="all">All categories</option>' + [...new Set(expenses.map((item) => item.category))].sort().map((category) => `<option value="${category}">${category}</option>`).join('');
  categoryFilter.value = [...categoryFilter.options].some((option) => option.value === selectedCategory) ? selectedCategory : 'all';
}
function renderChart() {
  const container = $('#spending-chart');
  if (spendingChart) spendingChart.destroy();
  container.innerHTML = '<canvas aria-label="Expenses and income by week"></canvas>';
  container.style.cssText = 'height:145px;display:block;padding:0;border:0;background:none';
  const totals = transactions.filter((item) => item.type === 'expense').reduce((result, item) => { result[item.category] = (result[item.category] || 0) + item.amount; return result; }, {});
  const categories = Object.entries(totals).sort((first, second) => second[1] - first[1]);
  $('#chart-total').innerHTML = `${money(categories.reduce((sum, [, total]) => sum + total, 0))} <small>total spent</small>`;
  spendingChart = new Chart(container.querySelector('canvas'), { type: 'bar', data: { labels: categories.map(([category]) => category), datasets: [{ label: 'Category spending', data: categories.map(([, total]) => total), backgroundColor: '#7259e8', borderRadius: 4, barPercentage: .65 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f0f0ed' }, ticks: { display: false } }, x: { grid: { display: false }, ticks: { color: '#777', font: { size: 9 } } } } } });
}
function visibleTransactions() {
  const query = $('#search-input').value.trim().toLowerCase();
  return transactions.filter((item) => (activeFilter === 'all' || item.type === activeFilter) && (activeCategory === 'all' || item.category === activeCategory) && `${item.description} ${item.category}`.toLowerCase().includes(query)).sort((first, second) => {
    if (activeSort === 'amount-desc') return second.amount - first.amount;
    if (activeSort === 'amount-asc') return first.amount - second.amount;
    const firstDate = new Date(first.date).getTime();
    const secondDate = new Date(second.date).getTime();
    return activeSort === 'date-asc' ? firstDate - secondDate : secondDate - firstDate;
  });
}
function renderTransactions() {
  const visible = visibleTransactions();
  $('#transaction-count').textContent = `${visible.length} entries`;
  $('#empty-state').hidden = visible.length > 0;
  $('#transaction-list').innerHTML = visible.map((item) => `<tr><td>${item.description}</td><td><span class="transaction-category"><i class="category-tiny ${item.type}"></i>${item.category}</span></td><td>${item.date}</td><td class="amount ${item.type}">${item.type === 'income' ? '+' : '-'}${money(item.amount)}</td><td class="row-actions">${item.type === 'expense' ? `<button class="edit-transaction" data-id="${item.id}" aria-label="Edit ${item.description}">Edit</button>` : ''}<button class="delete-transaction" data-id="${item.id}" aria-label="Delete ${item.description}">x</button></td></tr>`).join('');
  document.querySelectorAll('.delete-transaction').forEach((button) => button.addEventListener('click', () => { transactions = transactions.filter((item) => item.id !== button.dataset.id); saveTransactions(); render(); }));
  document.querySelectorAll('.edit-transaction').forEach((button) => button.addEventListener('click', () => openEditDialog(button.dataset.id)));
}
function renderSummary() {
  const income = transactions.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
  const expenses = transactions.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
  $('#income-value').textContent = money(income); $('#expense-value').textContent = money(expenses); $('#balance-value').textContent = money(income - expenses);
  const expenseItems = transactions.filter((item) => item.type === 'expense');
  $('#summary-total').textContent = money(expenses);
  $('#summary-count').textContent = expenseItems.length;
  $('#summary-average').textContent = money(expenseItems.length ? expenses / expenseItems.length : 0);
}
function render() { renderSummary(); renderCategories(); renderChart(); renderTransactions(); }
document.querySelectorAll('.filter-chip').forEach((button) => button.addEventListener('click', () => { activeFilter = button.dataset.filter; document.querySelectorAll('.filter-chip').forEach((chip) => chip.classList.toggle('active', chip === button)); renderTransactions(); }));
$('#search-input').addEventListener('input', renderTransactions);
$('#category-filter').addEventListener('change', (event) => { activeCategory = event.target.value; renderTransactions(); });
$('#sort-filter').addEventListener('change', (event) => { activeSort = event.target.value; renderTransactions(); });
function openAddDialog() { editingId = null; $('#dialog-title').textContent = 'Add expense'; $('#expense-form').reset(); $('#expense-form [name="date"]').value = '2026-09-02'; $('#expense-dialog').showModal(); }
function openEditDialog(id) { const item = transactions.find((transaction) => transaction.id === id); if (!item) return; editingId = id; $('#dialog-title').textContent = 'Edit expense'; $('#expense-form [name="description"]').value = item.description; $('#expense-form [name="amount"]').value = item.amount; $('#expense-form [name="category"]').value = item.category; $('#expense-form [name="date"]').value = new Date(item.date).toISOString().slice(0, 10); $('#expense-dialog').showModal(); }
$('#add-expense-button').addEventListener('click', openAddDialog);
$('#expense-form').addEventListener('submit', (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const entry = { description: data.get('description'), category: data.get('category'), date: formatDate(data.get('date')), amount: Number(data.get('amount')), type: 'expense' }; if (editingId) { transactions = transactions.map((item) => item.id === editingId ? { ...item, ...entry } : item); } else { transactions.unshift({ id: Date.now().toString(), ...entry }); } saveTransactions(); editingId = null; $('#expense-dialog').close(); render(); });
$('.mobile-menu').addEventListener('click', () => $('.sidebar').classList.toggle('open'));
document.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', () => document.querySelectorAll('.nav-item').forEach((link) => link.classList.toggle('active', link === item))));
render();
