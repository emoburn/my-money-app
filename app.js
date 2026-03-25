document.addEventListener('DOMContentLoaded', () => {
    // ---- DOM Elements ----
    const totalBalanceEl = document.getElementById('total-balance');
    const totalIncomeEl = document.getElementById('total-income');
    const totalExpenseEl = document.getElementById('total-expense');
    const labelIncomeEl = document.getElementById('label-income');
    const labelExpenseEl = document.getElementById('label-expense');
    
    const transactionsListEl = document.getElementById('transactions-list');
    const emptyStateEl = document.getElementById('empty-state');
    const emptyStateText = document.getElementById('empty-text');
    const selectCategoryEl = document.getElementById('select-category');
    
    // Modals
    const modalTx = document.getElementById('modal-transaction');
    const modalCat = document.getElementById('modal-category');
    
    // Buttons & Filters
    const btnFab = document.getElementById('btn-fab');
    const btnCloseTx = document.getElementById('btn-close-transaction');
    const btnAddCatModal = document.getElementById('btn-add-category-modal');
    const btnCloseCat = document.getElementById('btn-close-category');
    const btnClearData = document.getElementById('btn-clear-data');
    
    const filterType = document.getElementById('filter-type');
    const filterDaily = document.getElementById('filter-daily');
    const filterMonthly = document.getElementById('filter-monthly');
    const filterYearly = document.getElementById('filter-yearly');
    
    // Forms
    const formTx = document.getElementById('form-transaction');
    const formCat = document.getElementById('form-category');
    
    // Form Inputs
    const inputAmount = document.getElementById('input-amount');
    const inputTitle = document.getElementById('input-title');
    const inputNewCat = document.getElementById('input-new-category');
    const inputDate = document.getElementById('input-date');
    const typeIncomeRad = document.getElementById('type-income');
    const typeExpenseRad = document.getElementById('type-expense');
    
    // ---- State & Data ----
    const defaultCategories = ['ทั่วไป', 'อาหาร', 'เดินทาง', 'ช้อปปิ้ง', 'เงินเดือน'];
    let categories = JSON.parse(localStorage.getItem('mt_categories')) || defaultCategories;
    let transactions = JSON.parse(localStorage.getItem('mt_transactions')) || [];

    // Migrate simple fields
    transactions = transactions.map(tx => {
        if (!tx.date) tx.date = new Date(tx.timestamp).toISOString().split('T')[0];
        if (typeof tx.isStarred === 'undefined') tx.isStarred = false;
        return tx;
    });
    
    // ---- Initialization ----
    initApp();
    
    function initApp() {
        populateCategories();
        
        // Setup initial default dates
        const now = new Date();
        const yyyy = now.getFullYear();
        let mm = now.getMonth() + 1;
        let dd = now.getDate();
        if(mm < 10) mm = '0' + mm;
        if(dd < 10) dd = '0' + dd;
        
        const todayStr = `${yyyy}-${mm}-${dd}`;
        const monthStr = `${yyyy}-${mm}`;
        
        inputDate.value = todayStr;
        filterDaily.value = todayStr;
        filterMonthly.value = monthStr;
        
        populateYears();
        filterYearly.value = yyyy.toString();
        
        handleFilterTypeChange(); // Hide/show correct inputs
        updateUI();
        registerServiceWorker();
    }
    
    function saveCategories() {
        localStorage.setItem('mt_categories', JSON.stringify(categories));
    }
    
    function saveTransactions() {
        localStorage.setItem('mt_transactions', JSON.stringify(transactions));
    }
    
    function populateYears() {
        filterYearly.innerHTML = '';
        const currentYear = new Date().getFullYear();
        const startYear = Math.min(currentYear - 2, ...transactions.map(t => parseInt(t.date.substring(0,4)) || currentYear));
        const endYear = currentYear + 1;
        
        for(let y = endYear; y >= startYear; y--) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = `ปี ${y + 543}`; // Thai year
            filterYearly.appendChild(opt);
        }
    }
    
    // ---- UI Logic ----
    function formatMoney(amount) {
        return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    }
    
    function populateCategories() {
        selectCategoryEl.innerHTML = '';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            selectCategoryEl.appendChild(option);
        });
    }
    
    function updateUI() {
        // 1. Calculate Global Running Balance for all items (oldest to newest)
        transactions.sort((a, b) => {
            if (a.date !== b.date) return new Date(a.date) - new Date(b.date);
            return a.timestamp - b.timestamp;
        });
        
        let globalBalance = 0;
        transactions.forEach(tx => {
            if (tx.type === 'income') globalBalance += tx.amount;
            else globalBalance -= tx.amount;
            tx.runningBalance = globalBalance;
        });
        
        totalBalanceEl.textContent = '฿' + formatMoney(globalBalance);

        // 2. Filter Transactions based on UI
        let filteredTx = [...transactions];
        const mode = filterType.value;
        let labelSuffix = '(ทั้งหมด)';
        
        if (mode === 'daily') {
            const d = filterDaily.value;
            filteredTx = filteredTx.filter(tx => tx.date === d);
            const dateObj = new Date(d);
            labelSuffix = isNaN(dateObj) ? '' : `(${dateObj.toLocaleDateString('th-TH')})`;
        } else if (mode === 'monthly') {
            const m = filterMonthly.value; // YYYY-MM
            filteredTx = filteredTx.filter(tx => tx.date.startsWith(m));
            const parts = m.split('-');
            const dateObj = new Date(parts[0], parseInt(parts[1])-1, 1);
            labelSuffix = isNaN(dateObj) ? '' : `(${dateObj.toLocaleDateString('th-TH', {month: 'short', year:'numeric'})})`;
        } else if (mode === 'yearly') {
            const y = filterYearly.value;
            filteredTx = filteredTx.filter(tx => tx.date.startsWith(y));
            labelSuffix = `(ปี ${parseInt(y) + 543})`;
        }
        
        // 3. Calculate Period Summaries (Income/Expense for filtered items)
        const periodIncome = filteredTx.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const periodExpense = filteredTx.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        
        labelIncomeEl.textContent = `รายรับ ${labelSuffix}`;
        labelExpenseEl.textContent = `รายจ่าย ${labelSuffix}`;
        totalIncomeEl.textContent = '฿' + formatMoney(periodIncome);
        totalExpenseEl.textContent = '฿' + formatMoney(periodExpense);
        
        // 4. Render Table
        transactionsListEl.innerHTML = '';
        const tableResponsive = document.querySelector('.table-responsive');
        
        if (transactions.length === 0) {
            emptyStateEl.classList.remove('hidden');
            emptyStateText.textContent = 'ยังไม่มีรายการ เริ่มต้นบันทึกเลย!';
            if(tableResponsive) tableResponsive.style.display = 'none';
        } else if (filteredTx.length === 0) {
            emptyStateEl.classList.remove('hidden');
            emptyStateText.textContent = 'ไม่มีรายการในระยะเวลาที่เลือก';
            if(tableResponsive) tableResponsive.style.display = 'none';
        } else {
            emptyStateEl.classList.add('hidden');
            if(tableResponsive) tableResponsive.style.display = 'block';
            
            // Newest at top
            filteredTx.reverse().forEach(tx => addTransactionDOM(tx));
        }
    }
    
    function addTransactionDOM(tx) {
        const isIncome = tx.type === 'income';
        const incomeStr = isIncome ? `${formatMoney(tx.amount)}` : '-';
        const expenseStr = !isIncome ? `${formatMoney(tx.amount)}` : '-';
        const dateStr = new Date(tx.date).toLocaleDateString('th-TH', {day: 'numeric', month: 'short', year: '2-digit'}); // Shorter date
        
        const starIcon = tx.isStarred 
            ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="gold" stroke="gold" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>'
            : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
            
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <button class="btn-icon-custom btn-star ${tx.isStarred ? 'active' : ''}" data-id="${tx.id}">${starIcon}</button>
            </td>
            <td>
                <div class="tx-title">${tx.title}</div>
                <div class="tx-date">${dateStr}</div>
            </td>
            <td class="text-right ${isIncome ? 'tx-amount income' : 'tx-amount'}">${incomeStr}</td>
            <td class="text-right ${!isIncome ? 'tx-amount expense' : 'tx-amount'}">${expenseStr}</td>
            <td class="text-right tx-amount neutral">${formatMoney(tx.runningBalance)}</td>
            <td class="text-center"><span class="tag-category">${tx.category}</span></td>
            <td>
                <button class="btn-icon-custom btn-delete" data-id="${tx.id}">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </td>
        `;
        
        transactionsListEl.appendChild(tr);
    }
    
    // ---- Event Delegation for Table Actions ----
    transactionsListEl.addEventListener('click', (e) => {
        // Toggle Star
        const starBtn = e.target.closest('.btn-star');
        if (starBtn) {
            const txId = starBtn.getAttribute('data-id');
            const txIndex = transactions.findIndex(t => t.id === txId);
            if(txIndex !== -1) {
                transactions[txIndex].isStarred = !transactions[txIndex].isStarred;
                saveTransactions();
                updateUI();
            }
            return;
        }

        // Delete Row
        const deleteBtn = e.target.closest('.btn-delete');
        if (deleteBtn) {
            const txId = deleteBtn.getAttribute('data-id');
            if (confirm('ยืนยันการลบรายการนี้?')) {
                transactions = transactions.filter(t => t.id !== txId);
                saveTransactions();
                populateYears();
                updateUI();
            }
        }
    });
    
    // ---- Event Listeners ----
    function handleFilterTypeChange() {
        filterDaily.classList.add('hidden');
        filterMonthly.classList.add('hidden');
        filterYearly.classList.add('hidden');
        
        const mode = filterType.value;
        if(mode === 'daily') filterDaily.classList.remove('hidden');
        if(mode === 'monthly') filterMonthly.classList.remove('hidden');
        if(mode === 'yearly') filterYearly.classList.remove('hidden');
        updateUI();
    }
    
    filterType.addEventListener('change', handleFilterTypeChange);
    filterDaily.addEventListener('change', updateUI);
    filterMonthly.addEventListener('change', updateUI);
    filterYearly.addEventListener('change', updateUI);
    
    // Open Tx Modal
    btnFab.addEventListener('click', () => {
        modalTx.classList.add('active');
        inputAmount.focus();
    });
    
    // Close Tx Modal
    btnCloseTx.addEventListener('click', () => {
        modalTx.classList.remove('active');
    });
    
    // Open Cat Modal
    btnAddCatModal.addEventListener('click', () => {
        modalCat.classList.add('active');
        inputNewCat.focus();
    });
    
    // Close Cat Modal
    btnCloseCat.addEventListener('click', () => {
        modalCat.classList.remove('active');
    });
    
    // Close on overlay click
    window.addEventListener('click', (e) => {
        if (e.target === modalTx) modalTx.classList.remove('active');
        if (e.target === modalCat) modalCat.classList.remove('active');
    });
    
    // Toggle color on amount based on income/expense selection
    typeIncomeRad.addEventListener('change', () => { inputAmount.style.color = "var(--income)"; });
    typeExpenseRad.addEventListener('change', () => { inputAmount.style.color = "var(--expense)"; });
    
    // Form Submit: Transaction
    formTx.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const type = document.querySelector('input[name="tx-type"]:checked').value;
        const amount = parseFloat(inputAmount.value);
        const title = inputTitle.value.trim();
        const category = selectCategoryEl.value;
        const dateStr = inputDate.value;
        
        if (!title || isNaN(amount) || !dateStr) {
            alert('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }
        
        const newTx = {
            id: generateID(),
            type,
            amount,
            title,
            category,
            date: dateStr,
            timestamp: Date.now(),
            isStarred: false
        };
        
        transactions.push(newTx);
        saveTransactions();
        populateYears();
        updateUI();
        
        // Reset form & close
        inputAmount.value = '';
        inputTitle.value = '';
        modalTx.classList.remove('active');
    });
    
    // Form Submit: Category
    formCat.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newCat = inputNewCat.value.trim();
        if (newCat && !categories.includes(newCat)) {
            categories.push(newCat);
            saveCategories();
            populateCategories();
            selectCategoryEl.value = newCat; // Select the newly added
        }
        
        inputNewCat.value = '';
        modalCat.classList.remove('active');
    });
    
    // Clear Data
    btnClearData.addEventListener('click', () => {
        if (confirm('🚨 คำเตือน! คุณแน่ใจหรือไม่ว่าต้องการ "ล้างข้อมูลรายการทั้งหมด" ย้อนกลับเป็นศูนย์? (ข้อมูลจะหายไปถาวร)')) {
            transactions = [];
            // Optional: reset categories to default? No, usually users want to keep their custom categories.
            saveTransactions();
            populateYears();
            updateUI();
        }
    });
    
    // ---- Utilities ----
    function generateID() {
        return Math.floor(Math.random() * 1000000000).toString(16);
    }
    
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js').catch(err => console.log('SW err', err));
            });
        }
    }
});
