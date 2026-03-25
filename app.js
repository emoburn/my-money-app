document.addEventListener('DOMContentLoaded', () => {
    // ---- DOM Elements ----
    const totalBalanceEl = document.getElementById('total-balance');
    const totalIncomeEl = document.getElementById('total-income');
    const totalExpenseEl = document.getElementById('total-expense');
    const dateEl = document.getElementById('current-date');
    const transactionsListEl = document.getElementById('transactions-list');
    const emptyStateEl = document.getElementById('empty-state');
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
    const filterDateInput = document.getElementById('filter-date');
    const btnClearFilter = document.getElementById('btn-clear-filter');
    
    // Forms
    const formTx = document.getElementById('form-transaction');
    const formCat = document.getElementById('form-category');
    
    // Form Inputs
    const inputAmount = document.getElementById('input-amount');
    const inputTitle = document.getElementById('input-title');
    const inputNewCat = document.getElementById('input-new-category');
    const inputDate = document.getElementById('input-date');
    
    // ---- State & Data ----
    const defaultCategories = ['ทั่วไป', 'อาหาร', 'สิ้นเปลือง', 'อื่นๆ'];
    let categories = JSON.parse(localStorage.getItem('mt_categories')) || defaultCategories;
    let transactions = JSON.parse(localStorage.getItem('mt_transactions')) || [];

    // Data migration line for old data without 'date' or 'isStarred' formatting
    transactions = transactions.map(tx => {
        if (!tx.date) {
            tx.date = new Date(tx.timestamp).toISOString().split('T')[0];
        }
        if (typeof tx.isStarred === 'undefined') {
            tx.isStarred = false;
        }
        return tx;
    });
    
    // ---- Initialization ----
    initApp();
    
    function initApp() {
        setDate();
        populateCategories();
        
        // Default today's date
        inputDate.value = new Date().toISOString().split('T')[0];
        
        updateUI();
        registerServiceWorker();
    }
    
    function setDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('th-TH', options);
    }
    
    function saveCategories() {
        localStorage.setItem('mt_categories', JSON.stringify(categories));
    }
    
    function saveTransactions() {
        localStorage.setItem('mt_transactions', JSON.stringify(transactions));
    }
    
    // ---- UI Logic ----
    function formatMoney(amount) {
        return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(amount);
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
        // Calculate totals across ALL items based on the user's intent. 
        // We will show total income/expense/balance for the whole app.
        const amounts = transactions.map(tx => tx.type === 'income' ? tx.amount : -tx.amount);
        const total = amounts.reduce((acc, item) => (acc += item), 0).toFixed(2);
        
        const income = transactions
            .filter(tx => tx.type === 'income')
            .map(tx => tx.amount)
            .reduce((acc, item) => (acc += item), 0)
            .toFixed(2);
            
        const expense = transactions
            .filter(tx => tx.type === 'expense')
            .map(tx => tx.amount)
            .reduce((acc, item) => (acc += item), 0)
            .toFixed(2);
            
        // Update DOM totals
        totalBalanceEl.textContent = formatMoney(total);
        totalIncomeEl.textContent = formatMoney(income);
        totalExpenseEl.textContent = formatMoney(expense);
        
        // Render List
        transactionsListEl.innerHTML = '';
        const tableResponsive = document.querySelector('.table-responsive');
        
        if (transactions.length === 0) {
            emptyStateEl.classList.remove('hidden');
            if(tableResponsive) tableResponsive.style.display = 'none';
        } else {
            // Sort to calculate running balance (oldest to newest)
            transactions.sort((a, b) => {
                if (a.date !== b.date) {
                    return new Date(a.date) - new Date(b.date);
                }
                return a.timestamp - b.timestamp;
            });
            
            let currentBalance = 0;
            transactions.forEach(tx => {
                if (tx.type === 'income') {
                    currentBalance += tx.amount;
                } else {
                    currentBalance -= tx.amount;
                }
                tx.runningBalance = currentBalance; // attach calculated balance
            });

            // Filtering based on date selected
            let filteredTx = [...transactions];
            if (filterDateInput.value) {
                filteredTx = filteredTx.filter(tx => tx.date === filterDateInput.value);
                btnClearFilter.classList.remove('hidden');
            } else {
                btnClearFilter.classList.add('hidden');
            }

            if(filteredTx.length === 0) {
                emptyStateEl.classList.remove('hidden');
                document.querySelector('.empty-state p').textContent = 'ไม่มีรายการในวันที่เลือก';
                if(tableResponsive) tableResponsive.style.display = 'none';
            } else {
                emptyStateEl.classList.add('hidden');
                document.querySelector('.empty-state p').textContent = 'ยังไม่มีรายการ เริ่มต้นบันทึกเลย!';
                if(tableResponsive) tableResponsive.style.display = 'block';
                
                // Show newest at the top
                filteredTx.reverse().forEach(tx => addTransactionDOM(tx));
            }
        }
    }
    
    function addTransactionDOM(tx) {
        const isIncome = tx.type === 'income';
        const incomeStr = isIncome ? `${formatMoney(tx.amount)}` : '-';
        const expenseStr = !isIncome ? `${formatMoney(tx.amount)}` : '-';
        const dateStr = new Date(tx.date).toLocaleDateString('th-TH');
        
        const starIcon = tx.isStarred 
            ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="gold" stroke="gold" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>'
            : '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';
            
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <button class="btn-icon-custom btn-star" data-id="${tx.id}" title="ทำเครื่องหมายสำคัญ">${starIcon}</button>
            </td>
            <td>
                <div style="font-weight: 500;">${tx.title}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">${dateStr}</div>
            </td>
            <td class="text-right ${isIncome ? 'tx-amount income' : ''}">${incomeStr}</td>
            <td class="text-right ${!isIncome ? 'tx-amount expense' : ''}">${expenseStr}</td>
            <td class="text-right tx-amount neutral" style="font-weight: bold;">${formatMoney(tx.runningBalance)}</td>
            <td><span class="tag-category">${tx.category}</span></td>
            <td>
                <button class="btn-icon-custom btn-delete" data-id="${tx.id}" title="ลบรายการ">
                    <svg viewBox="0 0 24 24" width="18" height="18" stroke="#F44336" fill="none" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
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
                updateUI();
            }
        }
    });
    
    // ---- Event Listeners ----
    
    // Date Filtering
    filterDateInput.addEventListener('change', () => {
        updateUI();
    });
    
    btnClearFilter.addEventListener('click', () => {
        filterDateInput.value = '';
        updateUI();
    });
    
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
            timestamp: Date.now(), // Actual creation timestamp for tie-breaking
            isStarred: false
        };
        
        transactions.push(newTx);
        saveTransactions();
        
        // Only clear selected filter if the user adds an entry for a different date
        // Just for UX, let's keep the filter as is, updateUI will either show it or hide it
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
        if (confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลทั้งหมด?')) {
            transactions = [];
            categories = defaultCategories;
            saveTransactions();
            saveCategories();
            populateCategories();
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
                navigator.serviceWorker.register('sw.js').then(reg => {
                    console.log('ServiceWorker registered');
                }).catch(err => {
                    console.log('ServiceWorker error', err);
                });
            });
        }
    }
});
