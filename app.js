document.addEventListener('DOMContentLoaded', () => {

    // ---- DOM ----
    const totalBalanceEl = document.getElementById('total-balance');
    const totalIncomeEl  = document.getElementById('total-income');
    const totalExpenseEl = document.getElementById('total-expense');
    const labelIncomeEl  = document.getElementById('label-income');
    const labelExpenseEl = document.getElementById('label-expense');
    const txListEl       = document.getElementById('tx-list');
    const emptyStateEl   = document.getElementById('empty-state');
    const emptyTextEl    = document.getElementById('empty-text');
    const selectCatEl    = document.getElementById('select-category');

    const modalTx        = document.getElementById('modal-transaction');
    const modalCat       = document.getElementById('modal-category');

    const btnFab         = document.getElementById('btn-fab');
    const btnAddTop      = document.getElementById('btn-add');
    const btnCloseTx     = document.getElementById('btn-close-transaction');
    const btnAddCatMod   = document.getElementById('btn-add-category-modal');
    const btnCloseCat    = document.getElementById('btn-close-category');

    const formTx         = document.getElementById('form-transaction');
    const formCat        = document.getElementById('form-category');

    const inputAmount    = document.getElementById('input-amount');
    const inputTitle     = document.getElementById('input-title');
    const inputDate      = document.getElementById('input-date');
    const inputNewCat    = document.getElementById('input-new-category');
    const btnSubmitTx    = document.getElementById('btn-submit-tx');

    const filterTabs     = document.querySelectorAll('.filter-tab');
    const filterDailyEl  = document.getElementById('filter-daily');
    const filterMonthEl  = document.getElementById('filter-monthly');
    const filterYearEl   = document.getElementById('filter-yearly');

    const typeIncome  = document.getElementById('type-income');
    const typeExpense = document.getElementById('type-expense');

    // ---- Data ----
    const DEFAULT_CATS = ['ทั่วไป', 'อาหาร', 'เดินทาง', 'ช้อปปิ้ง', 'เงินเดือน', 'บิล/ค่าใช้จ่าย'];
    const CAT_ICONS = {
        'อาหาร': '🍜', 'ช้อปปิ้ง': '🛍️', 'เดินทาง': '🚗',
        'เงินเดือน': '💰', 'บิล/ค่าใช้จ่าย': '📄', 'ทั่วไป': '📌'
    };
    function getCatIcon(cat) { return CAT_ICONS[cat] || '📝'; }

    let categories = JSON.parse(localStorage.getItem('mt_categories')) || DEFAULT_CATS;
    let transactions = JSON.parse(localStorage.getItem('mt_transactions')) || [];

    // Migrate old data
    transactions = transactions.map(tx => {
        if (!tx.date) tx.date = new Date(tx.timestamp).toISOString().split('T')[0];
        if (typeof tx.isStarred === 'undefined') tx.isStarred = false;
        return tx;
    });

    let activeMode = 'monthly';

    // ---- Init ----
    function init() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm   = String(now.getMonth() + 1).padStart(2, '0');
        const dd   = String(now.getDate()).padStart(2, '0');

        inputDate.value       = `${yyyy}-${mm}-${dd}`;
        filterDailyEl.value   = `${yyyy}-${mm}-${dd}`;
        filterMonthEl.value   = `${yyyy}-${mm}`;

        populateCats();
        populateYears();
        setActiveTab('monthly');
        updateUI();
        registerSW();
    }

    function save() { localStorage.setItem('mt_transactions', JSON.stringify(transactions)); }
    function saveCats() { localStorage.setItem('mt_categories', JSON.stringify(categories)); }

    function formatMoney(n) {
        return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
    }

    function populateCats() {
        selectCatEl.innerHTML = '';
        categories.forEach(c => {
            const o = document.createElement('option');
            o.value = c; o.textContent = c;
            selectCatEl.appendChild(o);
        });
    }

    function populateYears() {
        filterYearEl.innerHTML = '';
        const cur = new Date().getFullYear();
        let min = cur;
        transactions.forEach(tx => {
            const y = parseInt(tx.date);
            if (!isNaN(y) && y < min) min = y;
        });
        for (let y = cur + 1; y >= min - 1; y--) {
            const o = document.createElement('option');
            o.value = y;
            o.textContent  = `ปี ${y + 543}`;
            if (y === cur) o.selected = true;
            filterYearEl.appendChild(o);
        }
    }

    function setActiveTab(mode) {
        activeMode = mode;
        filterTabs.forEach(t => t.classList.toggle('active', t.dataset.mode === mode));

        filterDailyEl.classList.add('hidden');
        filterMonthEl.classList.add('hidden');
        filterYearEl.classList.add('hidden');

        if (mode === 'daily')   filterDailyEl.classList.remove('hidden');
        if (mode === 'monthly') filterMonthEl.classList.remove('hidden');
        if (mode === 'yearly')  filterYearEl.classList.remove('hidden');

        updateUI();
    }

    // ---- Render ----
    function updateUI() {
        // Sort oldest → newest, then compute running balance
        transactions.sort((a, b) =>
            a.date !== b.date ? a.date.localeCompare(b.date) : a.timestamp - b.timestamp
        );

        let running = 0;
        transactions.forEach(tx => {
            running += tx.type === 'income' ? tx.amount : -tx.amount;
            tx.runningBalance = running;
        });

        totalBalanceEl.textContent = '฿' + formatMoney(running);

        // Filter
        let filtered = [...transactions];
        let labelSuffix = '';

        if (activeMode === 'daily') {
            const d = filterDailyEl.value;
            filtered = filtered.filter(tx => tx.date === d);
            labelSuffix = d ? new Date(d).toLocaleDateString('th-TH', { day:'numeric', month:'short' }) : '';
        } else if (activeMode === 'monthly') {
            const m = filterMonthEl.value;
            filtered = filtered.filter(tx => tx.date.startsWith(m));
            if (m) {
                const [y, mo] = m.split('-');
                labelSuffix = new Date(y, mo - 1, 1).toLocaleDateString('th-TH', { month: 'short', year: '2-digit' });
            }
        } else if (activeMode === 'yearly') {
            const y = filterYearEl.value;
            filtered = filtered.filter(tx => tx.date.startsWith(y));
            labelSuffix = y ? `ปี ${parseInt(y) + 543}` : '';
        }

        const periodInc = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const periodExp = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

        labelIncomeEl.textContent  = labelSuffix ? `รายรับ (${labelSuffix})` : 'รายรับ';
        labelExpenseEl.textContent = labelSuffix ? `รายจ่าย (${labelSuffix})` : 'รายจ่าย';
        totalIncomeEl.textContent  = '฿' + formatMoney(periodInc);
        totalExpenseEl.textContent = '฿' + formatMoney(periodExp);

        // Render list
        txListEl.innerHTML = '';

        if (transactions.length === 0) {
            emptyStateEl.classList.remove('hidden');
            emptyTextEl.textContent = 'ยังไม่มีรายการบันทึก';
            return;
        }

        if (filtered.length === 0) {
            emptyStateEl.classList.remove('hidden');
            emptyTextEl.textContent = 'ไม่มีรายการในช่วงเวลานี้';
            return;
        }

        emptyStateEl.classList.add('hidden');

        // Group by date newest first
        const grouped = {};
        [...filtered].reverse().forEach(tx => {
            if (!grouped[tx.date]) grouped[tx.date] = [];
            grouped[tx.date].push(tx);
        });

        Object.keys(grouped).sort((a, b) => b.localeCompare(a)).forEach(date => {
            // Date header
            const header = document.createElement('div');
            header.className = 'date-group-header';
            const dateObj = new Date(date + 'T00:00:00');
            header.textContent = dateObj.toLocaleDateString('th-TH', { weekday:'short', day:'numeric', month:'short', year:'2-digit' });
            txListEl.appendChild(header);

            grouped[date].forEach(tx => txListEl.appendChild(buildCard(tx)));
        });
    }

    function buildCard(tx) {
        const isIncome = tx.type === 'income';
        const sign     = isIncome ? '+' : '-';
        const card     = document.createElement('div');
        card.className = `tx-card ${tx.type}`;

        card.innerHTML = `
            <div class="tx-icon">${getCatIcon(tx.category)}</div>
            <div class="tx-info">
                <div class="tx-title">${tx.title}</div>
                <div class="tx-meta">
                    <span class="tx-date-label">${new Date(tx.date + 'T00:00:00').toLocaleDateString('th-TH', {day:'numeric', month:'short'})}</span>
                    <span class="tx-cat-badge">${tx.category}</span>
                </div>
            </div>
            <div class="tx-right">
                <div class="tx-amount ${tx.type}">${sign}฿${formatMoney(tx.amount)}</div>
                <div class="tx-balance-chip">คงเหลือ ฿${formatMoney(tx.runningBalance)}</div>
                <div class="tx-actions">
                    <button class="icon-btn btn-star ${tx.isStarred ? 'starred' : ''}" data-id="${tx.id}" title="ติดดาว">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke-width="2" fill="${tx.isStarred ? '#FFD166' : 'none'}" stroke="${tx.isStarred ? '#FFD166' : 'currentColor'}"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    </button>
                    <button class="icon-btn del btn-delete" data-id="${tx.id}" title="ลบ">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke-width="2" fill="none" stroke="currentColor"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
        `;
        return card;
    }

    // ---- Event Delegation ----
    txListEl.addEventListener('click', e => {
        const star = e.target.closest('.btn-star');
        if (star) {
            const id = star.dataset.id;
            const tx = transactions.find(t => t.id === id);
            if (tx) { tx.isStarred = !tx.isStarred; save(); updateUI(); }
            return;
        }
        const del = e.target.closest('.btn-delete');
        if (del) {
            if (confirm('ยืนยันลบรายการนี้?')) {
                transactions = transactions.filter(t => t.id !== del.dataset.id);
                save(); populateYears(); updateUI();
            }
        }
    });

    // ---- Filter Tabs ----
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => setActiveTab(tab.dataset.mode));
    });
    filterDailyEl.addEventListener('change', updateUI);
    filterMonthEl.addEventListener('change', updateUI);
    filterYearEl.addEventListener('change', updateUI);

    // ---- Type Toggle Colors ----
    function updateTypeUI() {
        const isIncome = typeIncome.checked;
        inputAmount.style.color = isIncome ? 'var(--income)' : 'var(--expense)';
        btnSubmitTx.textContent = isIncome ? 'บันทึกรายรับ' : 'บันทึกรายจ่าย';
        btnSubmitTx.className = `btn-save ${isIncome ? 'income-btn' : 'expense-btn'}`;
    }

    typeIncome.addEventListener('change', updateTypeUI);
    typeExpense.addEventListener('change', updateTypeUI);

    // ---- Modals ----
    function openTx() {
        updateTypeUI();
        modalTx.classList.add('active');
        setTimeout(() => inputAmount.focus(), 400);
    }

    function closeTx() { modalTx.classList.remove('active'); }
    function openCat() { modalCat.classList.add('active'); setTimeout(() => inputNewCat.focus(), 350); }
    function closeCat() { modalCat.classList.remove('active'); }

    btnFab.addEventListener('click', openTx);
    btnAddTop.addEventListener('click', openTx);
    btnCloseTx.addEventListener('click', closeTx);
    btnAddCatMod.addEventListener('click', openCat);
    btnCloseCat.addEventListener('click', closeCat);

    window.addEventListener('click', e => {
        if (e.target === modalTx) closeTx();
        if (e.target === modalCat) closeCat();
    });

    // ---- Form Submissions ----
    formTx.addEventListener('submit', e => {
        e.preventDefault();
        const type   = document.querySelector('input[name="tx-type"]:checked').value;
        const amount = parseFloat(inputAmount.value);
        const title  = inputTitle.value.trim();
        const cat    = selectCatEl.value;
        const date   = inputDate.value;

        if (!title || isNaN(amount) || amount <= 0 || !date) {
            alert('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        transactions.push({ id: genId(), type, amount, title, category: cat, date, timestamp: Date.now(), isStarred: false });
        save(); populateYears(); updateUI();

        inputAmount.value = '';
        inputTitle.value  = '';
        closeTx();
    });

    formCat.addEventListener('submit', e => {
        e.preventDefault();
        const name = inputNewCat.value.trim();
        if (name && !categories.includes(name)) {
            categories.push(name);
            saveCats();
            populateCats();
            selectCatEl.value = name;
        }
        inputNewCat.value = '';
        closeCat();
    });

    // ---- Clear Data (long-press on balance or dedicated button) ----
    // No dedicated button in new design — keep safety via console or add one later
    // Add an easter egg: tap balance 5 times to clear
    let tapCount = 0;
    totalBalanceEl.addEventListener('click', () => {
        tapCount++;
        if (tapCount >= 7) {
            tapCount = 0;
            if (confirm('🚨 ล้างข้อมูลรายการทั้งหมด? (ย้อนกลับไม่ได้)')) {
                transactions = [];
                save(); populateYears(); updateUI();
            }
        }
    });

    // ---- Utility ----
    function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

    function registerSW() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(() => {});
        }
    }

    init();
});
