document.addEventListener('DOMContentLoaded', () => {

    // ---- DOM ----
    const totalBalanceEl = document.getElementById('total-balance');
    const totalIncomeEl = document.getElementById('total-income');
    const totalExpenseEl = document.getElementById('total-expense');
    const labelIncomeEl = document.getElementById('label-income');
    const labelExpenseEl = document.getElementById('label-expense');
    const labelIncomePropEl = document.getElementById('label-income-prop');
    const labelIncomeNonpropEl = document.getElementById('label-income-nonprop');
    const txListEl = document.getElementById('tx-list');
    const emptyStateEl = document.getElementById('empty-state');
    const emptyTextEl = document.getElementById('empty-text');
    const selectCatEl = document.getElementById('select-category');
    const budgetPanelEl = document.getElementById('budget-panel');

    const modalTx = document.getElementById('modal-transaction');
    const modalCat = document.getElementById('modal-category');
    const modalEditCatBudget = document.getElementById('modal-edit-cat-budget');

    const btnFab = document.getElementById('btn-fab');
    const btnAddTop = document.getElementById('btn-add');
    const btnCloseTx = document.getElementById('btn-close-transaction');
    const btnAddCatMod = document.getElementById('btn-add-category-modal');
    const btnCloseCat = document.getElementById('btn-close-category');
    const btnCloseEditCat = document.getElementById('btn-close-edit-cat-budget');

    const formTx = document.getElementById('form-transaction');
    const formCat = document.getElementById('form-category');
    const formEditCatBudget = document.getElementById('form-edit-cat-budget');

    const inputAmount = document.getElementById('input-amount');
    const inputTitle = document.getElementById('input-title');
    const inputDate = document.getElementById('input-date');
    const inputNewCat = document.getElementById('input-new-category');
    const btnSubmitTx = document.getElementById('btn-submit-tx');

    const filterTabs = document.querySelectorAll('.filter-tab');
    const filterDailyEl = document.getElementById('filter-daily');
    const filterMonthEl = document.getElementById('filter-monthly');
    const filterYearEl = document.getElementById('filter-yearly');

    const typeIncome = document.getElementById('type-income');
    const typeExpense = document.getElementById('type-expense');
    const incomeSubtypeRow = document.getElementById('income-subtype-row');
    const categoryRow = document.getElementById('category-row');

    // Category modal alloc
    const allocPctRadio = document.getElementById('alloc-pct');
    const allocBahtRadio = document.getElementById('alloc-baht');
    const inputAllocValue = document.getElementById('input-alloc-value');
    const allocHint = document.getElementById('alloc-hint');

    // Edit cat budget modal
    const editCatName = document.getElementById('edit-cat-name');
    const editCatTitle = document.getElementById('edit-cat-budget-title');
    const editCatDisplayName = document.getElementById('edit-cat-display-name');
    const editAllocPct = document.getElementById('edit-alloc-pct');
    const editAllocBaht = document.getElementById('edit-alloc-baht');
    const editAllocValue = document.getElementById('edit-alloc-value');
    const editAllocHint = document.getElementById('edit-alloc-hint');
    const btnDeleteCategory = document.getElementById('btn-delete-category');

    // Edit transaction modal
    const modalEditTx = document.getElementById('modal-edit-tx');
    const btnCloseEditTx = document.getElementById('btn-close-edit-tx');
    const formEditTx = document.getElementById('form-edit-tx');
    const editTxId = document.getElementById('edit-tx-id');
    const editInputAmount = document.getElementById('edit-input-amount');
    const editInputTitle = document.getElementById('edit-input-title');
    const editInputDate = document.getElementById('edit-input-date');
    const editInputNote = document.getElementById('edit-input-note');
    const editSelectCat = document.getElementById('edit-select-category');
    const editCategoryRow = document.getElementById('edit-category-row');
    const editIncomeSubRow = document.getElementById('edit-income-subtype-row');
    const editIncomeProp = document.getElementById('edit-income-prop');
    const editIncomeNonprop = document.getElementById('edit-income-nonprop');
    const btnDeleteFromEdit = document.getElementById('btn-delete-from-edit');

    // Search
    const searchInput = document.getElementById('search-input');
    const btnClearSearch = document.getElementById('btn-clear-search');

    // Export / Import
    const btnExport = document.getElementById('btn-export');
    const btnImport = document.getElementById('btn-import');
    const importFileInput = document.getElementById('import-file-input');

    // ---- Data ----
    const DEFAULT_CATS = []; // ผู้ใช้กำหนดเองทั้งหมด
    const CAT_ICONS = {};
    function getCatIcon(cat) { return CAT_ICONS[cat] || '📝'; }

    // categories: array of { name: string, allocType: 'pct'|'baht'|null, allocValue: number|null }
    let rawCats = JSON.parse(localStorage.getItem('mt_categories')) || DEFAULT_CATS;
    let categories = rawCats.map(c => {
        if (typeof c === 'string') return { name: c, allocType: null, allocValue: null };
        return c;
    });

    // transactions: { id, type, amount, title, category, date, timestamp, isStarred, incomeSubtype? }
    let transactions = JSON.parse(localStorage.getItem('mt_transactions')) || [];

    // Migrate old data
    transactions = transactions.map(tx => {
        if (!tx.date) tx.date = new Date(tx.timestamp).toISOString().split('T')[0];
        if (typeof tx.isStarred === 'undefined') tx.isStarred = false;
        if (tx.type === 'income' && !tx.incomeSubtype) tx.incomeSubtype = 'proportional';
        return tx;
    });

    // Migrate existing categories: baht → pct using all-time propIncome
    (function migrateCatsToPct() {
        const propInc = transactions
            .filter(t => t.type === 'income' && t.incomeSubtype === 'proportional')
            .reduce((s, t) => s + t.amount, 0);
        if (propInc <= 0) return;
        let changed = false;
        categories.forEach(c => {
            if (c.allocType === 'baht' && c.allocValue > 0) {
                c.allocValue = (c.allocValue / propInc) * 100;
                c.allocType = 'pct';
                changed = true;
            }
        });
        if (changed) localStorage.setItem('mt_categories', JSON.stringify(categories));
    })();

    let activeMode = 'monthly';
    let searchQuery = '';

    // ---- Init ----
    function init() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');

        inputDate.value = `${yyyy}-${mm}-${dd}`;
        filterDailyEl.value = `${yyyy}-${mm}-${dd}`;
        filterMonthEl.value = `${yyyy}-${mm}`;

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
    function formatPct(n) {
        return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
    }

    function populateCats(targetSelect) {
        const sel = targetSelect || selectCatEl;
        const prev = sel.value;
        sel.innerHTML = '';
        categories.forEach(c => {
            const o = document.createElement('option');
            o.value = c.name; o.textContent = c.name;
            sel.appendChild(o);
        });
        if (prev) sel.value = prev;
    }


    // Quick-add category button on main page
    const btnAddCatQuick = document.getElementById('btn-add-cat-quick');
    if (btnAddCatQuick) {
        btnAddCatQuick.addEventListener('click', openCat);
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
            o.textContent = `ปี ${y + 543}`;
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

    // ---- Compute category budget given proportional income ----
    function getCatBudgetBaht(cat, propIncome) {
        if (!cat.allocType || cat.allocValue == null || cat.allocValue <= 0) return null;
        if (cat.allocType === 'pct') return (cat.allocValue / 100) * propIncome;
        if (cat.allocType === 'baht') return cat.allocValue;
        return null;
    }
    function getCatBudgetPct(cat, propIncome) {
        if (!cat.allocType || cat.allocValue == null || cat.allocValue <= 0) return null;
        if (cat.allocType === 'pct') return cat.allocValue;
        if (cat.allocType === 'baht' && propIncome > 0) return (cat.allocValue / propIncome) * 100;
        return null;
    }

    // ---- Render ----
    function updateUI() {
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
            labelSuffix = d ? new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '';
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

        // Apply search filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(tx =>
                tx.title.toLowerCase().includes(q) ||
                (tx.category && tx.category.toLowerCase().includes(q)) ||
                (tx.note && tx.note.toLowerCase().includes(q))
            );
        }

        const periodInc = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const periodPropInc = filtered.filter(t => t.type === 'income' && t.incomeSubtype === 'proportional').reduce((s, t) => s + t.amount, 0);
        const periodNonpropInc = filtered.filter(t => t.type === 'income' && t.incomeSubtype !== 'proportional').reduce((s, t) => s + t.amount, 0);
        const periodExp = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

        // ALL-TIME figures for budget panel (never filtered by period)
        const allTimePropInc = transactions.filter(t => t.type === 'income' && t.incomeSubtype === 'proportional').reduce((s, t) => s + t.amount, 0);
        const allTimeCatSpent = {};
        transactions.filter(t => t.type === 'expense').forEach(t => {
            allTimeCatSpent[t.category] = (allTimeCatSpent[t.category] || 0) + t.amount;
        });

        labelIncomeEl.textContent = labelSuffix ? `\u0e23\u0e32\u0e22\u0e23\u0e31\u0e1a (${labelSuffix})` : '\u0e23\u0e32\u0e22\u0e23\u0e31\u0e1a';
        labelExpenseEl.textContent = labelSuffix ? `\u0e23\u0e32\u0e22\u0e08\u0e48\u0e32\u0e22 (${labelSuffix})` : '\u0e23\u0e32\u0e22\u0e08\u0e48\u0e32\u0e22';
        totalIncomeEl.textContent = '\u0e3f' + formatMoney(periodInc);
        totalExpenseEl.textContent = '\u0e3f' + formatMoney(periodExp);

        // Income breakdown sub-labels: always match the same period as the main income number
        if (periodInc > 0) {
            if (periodPropInc > 0 && periodNonpropInc > 0) {
                labelIncomePropEl.textContent = `\u0e2a\u0e31\u0e14\u0e2a\u0e48\u0e27\u0e19 \u0e3f${formatMoney(periodPropInc)}`;
                labelIncomeNonpropEl.textContent = `\u0e17\u0e31\u0e48\u0e27\u0e44\u0e1b \u0e3f${formatMoney(periodNonpropInc)}`;
                labelIncomePropEl.classList.remove('hidden');
                labelIncomeNonpropEl.classList.remove('hidden');
            } else if (periodPropInc > 0) {
                labelIncomePropEl.textContent = `\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14\u0e40\u0e1b\u0e47\u0e19\u0e40\u0e07\u0e34\u0e19\u0e04\u0e34\u0e14\u0e2a\u0e31\u0e14\u0e2a\u0e48\u0e27\u0e19`;
                labelIncomePropEl.classList.remove('hidden');
                labelIncomeNonpropEl.classList.add('hidden');
            } else if (periodNonpropInc > 0) {
                labelIncomePropEl.textContent = `\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14\u0e40\u0e1b\u0e47\u0e19\u0e40\u0e07\u0e34\u0e19\u0e17\u0e31\u0e48\u0e27\u0e44\u0e1b`;
                labelIncomePropEl.classList.remove('hidden');
                labelIncomeNonpropEl.classList.add('hidden');
            }
        } else {
            labelIncomePropEl.classList.add('hidden');
            labelIncomeNonpropEl.classList.add('hidden');
        }

        // Budget panel — always uses all-time figures
        renderBudgetPanel(allTimeCatSpent, allTimePropInc);

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

        // Compute all-time category spent for badge display in cards
        const catSpentAllTime = {};
        transactions.filter(t => t.type === 'expense').forEach(t => {
            catSpentAllTime[t.category] = (catSpentAllTime[t.category] || 0) + t.amount;
        });

        Object.keys(grouped).sort((a, b) => b.localeCompare(a)).forEach(date => {
            const header = document.createElement('div');
            header.className = 'date-group-header';
            const dateObj = new Date(date + 'T00:00:00');
            header.textContent = dateObj.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' });
            txListEl.appendChild(header);

            grouped[date].forEach(tx => txListEl.appendChild(buildCard(tx, allTimePropInc, catSpentAllTime)));
        });
    }

    // ---- Budget Panel ----
    // catSpentMap: { catName: totalSpent } สะสมตลอดเวลา
    // propIncome: รายรับที่คิดสัดส่วนสะสมตลอดเวลา
    function renderBudgetPanel(catSpentMap, propIncome) {
        // Only show if there are categories with allocations OR if propIncome > 0
        const catsWithAlloc = categories.filter(c => c.allocType && c.allocValue > 0);
        if (catsWithAlloc.length === 0 && propIncome === 0) {
            budgetPanelEl.classList.add('hidden');
            budgetPanelEl.innerHTML = '';
            return;
        }

        // Compute % used across all allocated categories
        const totalAllocPct = catsWithAlloc.reduce((s, c) => {
            const p = getCatBudgetPct(c, propIncome > 0 ? propIncome : 1);
            return s + (p || 0);
        }, 0);

        budgetPanelEl.classList.remove('hidden');

        // Compute total allocated baht & remaining unallocated
        const totalAllocBaht = catsWithAlloc.reduce((s, c) => s + (getCatBudgetBaht(c, propIncome) || 0), 0);
        const unallocated = propIncome - totalAllocBaht;

        let html = `<div class="bp-header">
            <div class="bp-title">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
                สัดส่วนงบประมาณ (สะสมทั้งหมด)
            </div>
            <div class="bp-prop-income">รายรับคิดสัดส่วนรวม <strong>฿${formatMoney(propIncome)}</strong></div>
            ${propIncome > 0 ? `<div class="bp-unalloc-summary ${unallocated < 0 ? 'over' : ''}">
                <span>ยังไม่ได้จัดสรรหมวด</span>
                <strong class="${unallocated >= 0 ? 'income-color' : 'expense-color'}">฿${formatMoney(Math.abs(unallocated))}${unallocated < 0 ? ' (เกิน)' : ''}</strong>
            </div>` : ''}
        </div>`;

        // Warning if over-allocated
        if (totalAllocPct > 100.01) {
            html += `<div class="bp-warning">⚠️ ยอดรวมวงเงินทุกหมวด <strong>${formatPct(totalAllocPct)}%</strong> เกิน 100% แล้ว</div>`;
        }

        html += `<div class="bp-cats">`;

        catsWithAlloc.forEach(cat => {
            const budgetBaht = getCatBudgetBaht(cat, propIncome);
            const budgetPct = getCatBudgetPct(cat, propIncome);
            const spent = catSpentMap[cat.name] || 0;
            const remaining = (budgetBaht || 0) - spent;
            const usedPctOfBudget = budgetBaht > 0 ? (spent / budgetBaht) * 100 : 0;
            const barPct = Math.min(usedPctOfBudget, 100);
            const isOver = spent > (budgetBaht || 0) && budgetBaht > 0;
            const noIncome = propIncome === 0;

            html += `
            <div class="bp-cat-card" data-cat="${cat.name}">
                <div class="bp-cat-header">
                    <div class="bp-cat-name">
                        <span class="bp-cat-icon">${getCatIcon(cat.name)}</span>
                        <span>${cat.name}</span>
                        ${isOver ? '<span class="bp-over-badge">เกิน</span>' : ''}
                    </div>
                    <button class="bp-edit-btn" data-cat="${cat.name}" title="แก้ไขวงเงิน">
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                </div>
                <div class="bp-alloc-line">
                    <span class="bp-alloc-badge">${formatPct(budgetPct || 0)}% = ฿${formatMoney(budgetBaht || 0)}</span>
                    ${noIncome ? '<span class="bp-no-income-note">ยังไม่มีรายรับที่คิดสัดส่วน</span>' : ''}
                </div>
                <div class="bp-bar-wrap">
                    <div class="bp-bar-track">
                        <div class="bp-bar-fill ${isOver ? 'over' : ''}" style="width:${barPct}%"></div>
                    </div>
                    <span class="bp-bar-pct ${isOver ? 'over' : ''}">${formatPct(usedPctOfBudget)}%</span>
                </div>
                <div class="bp-stats-row">
                    <div class="bp-stat">
                        <span class="bp-stat-label">ใช้แล้ว</span>
                        <span class="bp-stat-val expense-color">฿${formatMoney(spent)}</span>
                    </div>
                    <div class="bp-stat">
                        <span class="bp-stat-label">คงเหลือ</span>
                        <span class="bp-stat-val ${remaining >= 0 ? 'income-color' : 'expense-color'}">฿${formatMoney(Math.abs(remaining))}${remaining < 0 ? ' (เกิน)' : ''}</span>
                    </div>
                </div>
            </div>`;
        });

        html += `</div>`;

        // Unallocated categories with expenses
        const unallocCatsWithExp = categories
            .filter(c => (!c.allocType || !c.allocValue) && (catSpentMap[c.name] || 0) > 0);
        if (unallocCatsWithExp.length > 0) {
            html += `<div class="bp-unalloc-section">
                <p class="bp-unalloc-title">หมวดที่ยังไม่กำหนดวงเงิน</p>
                <div class="bp-unalloc-list">`;
            unallocCatsWithExp.forEach(cat => {
                html += `<div class="bp-unalloc-item">
                    <span>${getCatIcon(cat.name)} ${cat.name}</span>
                    <span class="expense-color">฿${formatMoney(catSpentMap[cat.name] || 0)}</span>
                </div>`;
            });
            html += `</div></div>`;
        }

        budgetPanelEl.innerHTML = html;

        // Attach edit button listeners
        budgetPanelEl.querySelectorAll('.bp-edit-btn').forEach(btn => {
            btn.addEventListener('click', () => openEditCatBudget(btn.dataset.cat));
        });
    }

    // ---- Build transaction card ----
    function buildCard(tx, propIncome, catSpent) {
        const isIncome = tx.type === 'income';
        const sign = isIncome ? '+' : '-';
        const card = document.createElement('div');
        card.className = `tx-card ${tx.type}`;

        // For expense: find cat allocation to show % used of category budget
        let pctInfo = '';
        if (!isIncome && propIncome > 0) {
            const catObj = categories.find(c => c.name === tx.category);
            if (catObj && catObj.allocType && catObj.allocValue > 0) {
                const budgetBaht = getCatBudgetBaht(catObj, propIncome);
                if (budgetBaht > 0) {
                    const txPct = (tx.amount / budgetBaht) * 100;
                    const spentTotal = catSpent[tx.category] || 0;
                    const spentPct = (spentTotal / budgetBaht) * 100;
                    pctInfo = `<span class="tx-pct-badge">${formatPct(txPct)}% ของ${tx.category}</span>`;
                }
            }
        }

        // Income subtype badge
        let incomeBadge = '';
        if (isIncome && tx.incomeSubtype === 'proportional') {
            incomeBadge = `<span class="tx-prop-badge">คิดสัดส่วน</span>`;
        } else if (isIncome && tx.incomeSubtype === 'non-proportional') {
            incomeBadge = `<span class="tx-nonprop-badge">ไม่คิดสัดส่วน</span>`;
        }

        card.innerHTML = `
            <div class="tx-icon">${getCatIcon(tx.category)}</div>
            <div class="tx-info" data-id="${tx.id}" style="cursor:pointer;">
                <div class="tx-title">${escHtml(tx.title)}</div>
                <div class="tx-meta">
                    <span class="tx-date-label">${new Date(tx.date + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</span>
                    <span class="tx-cat-badge">${escHtml(tx.category)}</span>
                    ${incomeBadge}
                    ${pctInfo}
                </div>
                ${tx.note ? `<div class="tx-note">${escHtml(tx.note)}</div>` : ''}
            </div>
            <div class="tx-right">
                <div class="tx-amount ${tx.type}">${sign}฿${formatMoney(tx.amount)}</div>
                <div class="tx-balance-chip">คงเหลือ ฿${formatMoney(tx.runningBalance)}</div>
                <div class="tx-actions">
                    <button class="icon-btn btn-edit" data-id="${tx.id}" title="แก้ไข">
                        <svg viewBox="0 0 24 24" width="15" height="15" stroke-width="2" fill="none" stroke="currentColor"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
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
        const edit = e.target.closest('.btn-edit');
        if (edit) { openEditTx(edit.dataset.id); return; }

        // Tap on tx-info (title/meta area) also opens edit
        const info = e.target.closest('.tx-info[data-id]');
        if (info) { openEditTx(info.dataset.id); return; }

        const star = e.target.closest('.btn-star');
        if (star) {
            const tx = transactions.find(t => t.id === star.dataset.id);
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
    filterTabs.forEach(tab => tab.addEventListener('click', () => setActiveTab(tab.dataset.mode)));
    filterDailyEl.addEventListener('change', updateUI);
    filterMonthEl.addEventListener('change', updateUI);
    filterYearEl.addEventListener('change', updateUI);

    // ---- Type Toggle Colors ----
    function updateTypeUI() {
        const isIncome = typeIncome.checked;
        inputAmount.style.color = isIncome ? 'var(--income)' : 'var(--expense)';
        btnSubmitTx.textContent = isIncome ? 'บันทึกรายรับ' : 'บันทึกรายจ่าย';
        btnSubmitTx.className = `btn-save ${isIncome ? 'income-btn' : 'expense-btn'}`;

        if (isIncome) {
            incomeSubtypeRow.classList.remove('hidden');
            categoryRow.classList.add('hidden');  // income has no category for budget
        } else {
            incomeSubtypeRow.classList.add('hidden');
            categoryRow.classList.remove('hidden');
        }
    }

    typeIncome.addEventListener('change', updateTypeUI);
    typeExpense.addEventListener('change', updateTypeUI);

    // ---- Alloc type hint ----
    function updateAllocHint(pctRadio, bahtRadio, hintEl) {
        if (pctRadio.checked) {
            hintEl.textContent = 'ระบุเป็น % จากรายรับที่คิดสัดส่วน (ระบบแปลงเป็นบาทให้อัตโนมัติ)';
        } else {
            hintEl.textContent = 'ระบุเป็นจำนวนบาท (ระบบแปลงเป็น % ให้อัตโนมัติ)';
        }
    }

    [allocPctRadio, allocBahtRadio].forEach(r =>
        r.addEventListener('change', () => updateAllocHint(allocPctRadio, allocBahtRadio, allocHint))
    );
    [editAllocPct, editAllocBaht].forEach(r =>
        r.addEventListener('change', () => updateAllocHint(editAllocPct, editAllocBaht, editAllocHint))
    );

    // ---- Modals ----
    function openTx() { updateTypeUI(); modalTx.classList.add('active'); setTimeout(() => inputAmount.focus(), 400); }
    function closeTx() { modalTx.classList.remove('active'); }
    function openCat() {
        inputAllocValue.value = '';
        allocPctRadio.checked = true;
        updateAllocHint(allocPctRadio, allocBahtRadio, allocHint);
        modalCat.classList.add('active');
        setTimeout(() => inputNewCat.focus(), 350);
    }
    function closeCat() { modalCat.classList.remove('active'); }
    function closeEditCat() { modalEditCatBudget.classList.remove('active'); }

    function openEditCatBudget(catName) {
        const cat = categories.find(c => c.name === catName);
        if (!cat) return;
        editCatName.value = catName;
        editCatDisplayName.value = catName;
        editCatTitle.textContent = `แก้ไขหมวดหมู่ "${catName}"`;
        editAllocValue.value = cat.allocValue || '';
        if (cat.allocType === 'baht') {
            editAllocBaht.checked = true;
        } else {
            editAllocPct.checked = true;
        }
        updateAllocHint(editAllocPct, editAllocBaht, editAllocHint);
        modalEditCatBudget.classList.add('active');
        setTimeout(() => editCatDisplayName.focus(), 300);
    }

    btnFab.addEventListener('click', openTx);
    btnAddTop.addEventListener('click', openTx);
    btnCloseTx.addEventListener('click', closeTx);
    btnAddCatMod.addEventListener('click', openCat);
    btnCloseCat.addEventListener('click', closeCat);
    btnCloseEditCat.addEventListener('click', closeEditCat);

    window.addEventListener('click', e => {
        if (e.target === modalTx) closeTx();
        if (e.target === modalCat) closeCat();
        if (e.target === modalEditCatBudget) closeEditCat();
    });

    // ---- Form Submissions ----
    formTx.addEventListener('submit', e => {
        e.preventDefault();
        const type = document.querySelector('input[name="tx-type"]:checked').value;
        const amount = parseFloat(inputAmount.value);
        const title = inputTitle.value.trim();
        const cat = type === 'expense' ? selectCatEl.value : 'รายรับ';
        const date = inputDate.value;

        if (!title || isNaN(amount) || amount <= 0 || !date) {
            alert('กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        const tx = { id: genId(), type, amount, title, category: cat, date, timestamp: Date.now(), isStarred: false, note: document.getElementById('input-note').value.trim() };
        if (type === 'income') {
            tx.incomeSubtype = document.querySelector('input[name="income-subtype"]:checked').value;
        }

        transactions.push(tx);
        save(); populateYears(); updateUI();
        inputAmount.value = '';
        inputTitle.value = '';
        document.getElementById('input-note').value = '';
        closeTx();
    });

    formCat.addEventListener('submit', e => {
        e.preventDefault();
        const name = inputNewCat.value.trim();
        if (!name) return;
        if (categories.find(c => c.name === name)) {
            alert('มีหมวดหมู่นี้อยู่แล้ว');
            return;
        }

        const allocVal = parseFloat(inputAllocValue.value);
        let allocType = allocPctRadio.checked ? 'pct' : 'baht';
        let finalAllocValue = (!isNaN(allocVal) && allocVal > 0) ? allocVal : null;
        let finalAllocType = finalAllocValue ? allocType : null;

        // Auto-convert baht → pct so budget scales with future income
        if (finalAllocType === 'baht' && finalAllocValue) {
            const propInc = getCurrentPropIncome();
            if (propInc > 0) {
                finalAllocValue = (finalAllocValue / propInc) * 100;
                finalAllocType = 'pct';
            }
        }

        const newCat = { name, allocType: finalAllocType, allocValue: finalAllocValue };

        // Validate: total alloc should not exceed 100%
        if (newCat.allocType) {
            const propInc = getCurrentPropIncome();
            const check = validateTotalAlloc(newCat, null, propInc);
            if (!check.ok) {
                alert(`วงเงินรวมทุกหมวดจะเกิน 100% (${formatPct(check.total)}%) กรุณาลดค่าลง`);
                return;
            }
        }

        categories.push(newCat);
        saveCats();
        populateCats();
        selectCatEl.value = name;
        inputNewCat.value = '';
        inputAllocValue.value = '';
        closeCat();
        updateUI();
    });

    formEditCatBudget.addEventListener('submit', e => {
        e.preventDefault();
        const oldName = editCatName.value;
        const newName = editCatDisplayName.value.trim();
        const cat = categories.find(c => c.name === oldName);
        if (!cat) return;

        if (!newName) { alert('กรุณากรอกชื่อหมวดหมู่'); return; }

        // Check duplicate name (only if name actually changed)
        if (newName !== oldName && categories.find(c => c.name === newName)) {
            alert('มีหมวดหมู่ชื่อนี้อยู่แล้ว');
            return;
        }

        const allocVal = parseFloat(editAllocValue.value);
        let allocType = editAllocPct.checked ? 'pct' : 'baht';

        let newAllocType = (!isNaN(allocVal) && allocVal > 0) ? allocType : null;
        let newAllocValue = (!isNaN(allocVal) && allocVal > 0) ? allocVal : null;

        // Auto-convert baht → pct so budget scales with future income
        if (newAllocType === 'baht' && newAllocValue) {
            const propInc = getCurrentPropIncome();
            if (propInc > 0) {
                newAllocValue = (newAllocValue / propInc) * 100;
                newAllocType = 'pct';
            }
        }

        // Validate total alloc
        if (newAllocType) {
            const propInc = getCurrentPropIncome();
            const tempCat = { name: newName, allocType: newAllocType, allocValue: newAllocValue };
            const check = validateTotalAlloc(tempCat, oldName, propInc);
            if (!check.ok) {
                alert(`วงเงินรวมทุกหมวดจะเกิน 100% (${formatPct(check.total)}%) กรุณาลดค่าลง`);
                return;
            }
        }

        // Apply changes
        cat.name = newName;
        cat.allocType = newAllocType;
        cat.allocValue = newAllocValue;

        // Rename category in all existing transactions
        if (newName !== oldName) {
            transactions.forEach(tx => {
                if (tx.category === oldName) tx.category = newName;
            });
            save();
        }

        saveCats();
        populateCats();
        closeEditCat();
        updateUI();
    });

    // Delete category
    if (btnDeleteCategory) {
        btnDeleteCategory.addEventListener('click', () => {
            const catName = editCatName.value;
            const txCount = transactions.filter(t => t.category === catName).length;
            const msg = txCount > 0
                ? `ลบหมวดหมู่ "${catName}"?\n(มีรายการ${txCount}รายการในหมวดนี้ จะยังคงอยู่แต่ไม่มีหมวด)`
                : `ลบหมวดหมู่ "${catName}"?`;
            if (!confirm(msg)) return;
            categories = categories.filter(c => c.name !== catName);
            saveCats();
            populateCats();
            closeEditCat();
            updateUI();
        });
    }

    // ---- Helpers ----
    function getCurrentPropIncome() {
        // Always use ALL-TIME proportional income for budget calculations
        return transactions.filter(t => t.type === 'income' && t.incomeSubtype === 'proportional').reduce((s, t) => s + t.amount, 0);
    }

    function validateTotalAlloc(newCat, replacingCatName, propIncome) {
        const ref = propIncome > 0 ? propIncome : 1000000; // fallback ref for pct calc
        let total = 0;
        categories.forEach(c => {
            if (c.name === replacingCatName) return; // skip the one being replaced
            const p = getCatBudgetPct(c, ref);
            if (p) total += p;
        });
        const newP = getCatBudgetPct(newCat, ref);
        if (newP) total += newP;
        return { ok: total <= 100.005, total };
    }

    // Rollover feature removed — budget tracking is now continuous across all months

    // ---- Edit Transaction ----
    function openEditTx(txId) {
        const tx = transactions.find(t => t.id === txId);
        if (!tx) return;
        editTxId.value = txId;
        editInputAmount.value = tx.amount;
        editInputTitle.value = tx.title;
        editInputDate.value = tx.date;
        editInputNote.value = tx.note || '';
        editInputAmount.style.color = tx.type === 'income' ? 'var(--income)' : 'var(--expense)';
        populateCats(editSelectCat);
        if (tx.type === 'expense') {
            editCategoryRow.classList.remove('hidden');
            editSelectCat.value = tx.category;
            editIncomeSubRow.classList.add('hidden');
        } else {
            editCategoryRow.classList.add('hidden');
            editIncomeSubRow.classList.remove('hidden');
            if (tx.incomeSubtype === 'non-proportional') editIncomeNonprop.checked = true;
            else editIncomeProp.checked = true;
        }
        modalEditTx.classList.add('active');
        setTimeout(() => editInputAmount.focus(), 400);
    }
    function closeEditTx() { modalEditTx.classList.remove('active'); }
    btnCloseEditTx.addEventListener('click', closeEditTx);
    window.addEventListener('click', e => { if (e.target === modalEditTx) closeEditTx(); });

    formEditTx.addEventListener('submit', e => {
        e.preventDefault();
        const tx = transactions.find(t => t.id === editTxId.value);
        if (!tx) return;
        const amount = parseFloat(editInputAmount.value);
        const title = editInputTitle.value.trim();
        const date = editInputDate.value;
        if (!title || isNaN(amount) || amount <= 0 || !date) { alert('กรุณากรอกข้อมูลให้ครบถ้วน'); return; }
        tx.amount = amount; tx.title = title; tx.date = date;
        tx.note = editInputNote.value.trim();
        if (tx.type === 'expense') tx.category = editSelectCat.value;
        else tx.incomeSubtype = document.querySelector('input[name="edit-income-subtype"]:checked').value;
        save(); populateYears(); updateUI(); closeEditTx();
    });

    btnDeleteFromEdit.addEventListener('click', () => {
        if (confirm('ยืนยันลบรายการนี้?')) {
            transactions = transactions.filter(t => t.id !== editTxId.value);
            save(); populateYears(); updateUI(); closeEditTx();
        }
    });

    // ---- Search ----
    searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value.trim();
        btnClearSearch.classList.toggle('hidden', !searchQuery);
        updateUI();
    });
    btnClearSearch.addEventListener('click', () => {
        searchInput.value = ''; searchQuery = '';
        btnClearSearch.classList.add('hidden');
        searchInput.focus(); updateUI();
    });

    // ---- Export ----
    btnExport.addEventListener('click', () => {
        const data = { version: 2, exported: new Date().toISOString(), transactions, categories };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mymoney-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click(); URL.revokeObjectURL(url);
    });

    // ---- Import ----
    btnImport.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', async () => {
        const file = importFileInput.files[0];
        if (!file) return;
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            let importedTx = [], importedCats = [];
            if (Array.isArray(data)) { importedTx = data; }
            else if (data.transactions) { importedTx = data.transactions || []; importedCats = data.categories || []; }
            else { throw new Error('รูปแบบไฟล์ไม่ถูกต้อง'); }
            if (!importedTx.length) { alert('ไม่พบรายการในไฟล์นี้'); return; }
            if (!confirm(`พบข้อมูล ${importedTx.length} รายการ\nกด OK เพื่อนำเข้าและรวมกับข้อมูลปัจจุบัน`)) return;
            const existingIds = new Set(transactions.map(t => t.id));
            const newTx = importedTx.filter(t => !existingIds.has(t.id)).map(tx => {
                if (!tx.date) tx.date = new Date(tx.timestamp).toISOString().split('T')[0];
                if (typeof tx.isStarred === 'undefined') tx.isStarred = false;
                if (tx.type === 'income' && !tx.incomeSubtype) tx.incomeSubtype = 'proportional';
                return tx;
            });
            transactions = [...transactions, ...newTx];
            if (importedCats.length) {
                const existingNames = new Set(categories.map(c => c.name));
                importedCats.forEach(c => {
                    const cat = typeof c === 'string' ? { name: c, allocType: null, allocValue: null } : c;
                    if (!existingNames.has(cat.name)) { categories.push(cat); existingNames.add(cat.name); }
                });
                saveCats(); populateCats();
            }
            save(); populateYears(); updateUI();
            alert(`✅ นำเข้าสำเร็จ ${newTx.length} รายการใหม่`);
        } catch (err) { alert('❌ ไม่สามารถอ่านไฟล์ได้: ' + err.message); }
        importFileInput.value = '';
    });

    // ---- Escape HTML ----
    function escHtml(s) { return s ? s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : ''; }

    // ---- Clear Data Easter Egg ----
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
            navigator.serviceWorker.register('sw.js').catch(() => { });
        }
    }

    init();
});
