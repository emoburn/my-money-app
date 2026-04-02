/* ===== budget.js — Budget Planner Logic ===== */

document.addEventListener('DOMContentLoaded', () => {

    // ---- Storage Keys ----
    const KEY_BUDGET  = 'bp_totalBudget';
    const KEY_CATS    = 'bp_categories';

    // ---- DOM ----
    const inputTotalBudget   = document.getElementById('input-total-budget');
    const btnSetBudget       = document.getElementById('btn-set-budget');
    const displayTotalBudget = document.getElementById('display-total-budget');
    const displayUsed        = document.getElementById('display-used-budget');
    const displayRemain      = document.getElementById('display-remain-budget');
    const overallFill        = document.getElementById('overall-progress-fill');
    const overallPct         = document.getElementById('overall-progress-pct');
    const catListEl          = document.getElementById('budget-categories-list');
    const emptyEl            = document.getElementById('budget-empty');
    const btnAddCatBudget    = document.getElementById('btn-add-cat-budget');
    const btnResetBudget     = document.getElementById('btn-reset-budget');

    // Modal: Add Category
    const modalAddCat    = document.getElementById('modal-add-cat');
    const btnCloseAddCat = document.getElementById('btn-close-add-cat');
    const formAddCat     = document.getElementById('form-add-cat');
    const inputCatName   = document.getElementById('input-cat-name');
    const emojiPicker    = document.getElementById('emoji-picker');
    const modalCatTitle  = document.getElementById('modal-cat-title');
    const btnSubmitCat   = document.getElementById('btn-submit-cat');

    // Modal: Add Item
    const modalAddItem      = document.getElementById('modal-add-item');
    const btnCloseAddItem   = document.getElementById('btn-close-add-item');
    const formAddItem       = document.getElementById('form-add-item');
    const inputItemAmount   = document.getElementById('input-item-amount');
    const inputItemName     = document.getElementById('input-item-name');
    const inputItemNote     = document.getElementById('input-item-note');
    const inputItemCatId    = document.getElementById('input-item-cat-id');
    const itemModalCatBadge = document.getElementById('item-modal-cat-badge');

    // Modal: Confirm
    const modalConfirm    = document.getElementById('modal-confirm');
    const confirmTitle    = document.getElementById('confirm-title');
    const confirmDesc     = document.getElementById('confirm-desc');
    const btnConfirmOk    = document.getElementById('btn-confirm-ok');
    const btnConfirmCancel = document.getElementById('btn-confirm-cancel');

    // ---- State ----
    let totalBudget = parseFloat(localStorage.getItem(KEY_BUDGET)) || 0;
    let categories  = JSON.parse(localStorage.getItem(KEY_CATS)) || [];
    let selectedEmoji = '📦';
    let editingCatId  = null;   // null = add mode, string = edit mode
    let pendingConfirmFn = null;

    // ---- Utility ----
    function genId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    function formatMoney(n) {
        return new Intl.NumberFormat('th-TH', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(n);
    }

    function saveBudget()  { localStorage.setItem(KEY_BUDGET, totalBudget); }
    function saveCats()    { localStorage.setItem(KEY_CATS, JSON.stringify(categories)); }

    function getCatTotal(cat) {
        return (cat.items || []).reduce((sum, item) => sum + item.amount, 0);
    }

    function getTotalUsed() {
        return categories.reduce((sum, cat) => sum + getCatTotal(cat), 0);
    }

    // ---- Render Summary ----
    function updateSummary() {
        const used   = getTotalUsed();
        const remain = totalBudget - used;
        const pct    = totalBudget > 0 ? Math.min((used / totalBudget) * 100, 100) : 0;
        const rawPct = totalBudget > 0 ? (used / totalBudget) * 100 : 0;

        displayTotalBudget.textContent = '฿' + formatMoney(totalBudget);
        displayUsed.textContent        = '฿' + formatMoney(used);
        displayRemain.textContent      = '฿' + formatMoney(remain);

        overallFill.style.width = pct + '%';
        overallPct.textContent  = rawPct.toFixed(1) + '%';

        overallFill.classList.remove('warn', 'over');
        if (rawPct >= 100) {
            overallFill.classList.add('over');
            overallPct.style.color = 'var(--expense)';
        } else if (rawPct >= 75) {
            overallFill.classList.add('warn');
            overallPct.style.color = '#FF9F43';
        } else {
            overallPct.style.color = '';
        }
    }

    // ---- Render Categories ----
    function renderCategories() {
        catListEl.innerHTML = '';
        updateSummary();

        if (categories.length === 0) {
            emptyEl.classList.remove('hidden');
            return;
        }
        emptyEl.classList.add('hidden');

        categories.forEach(cat => {
            catListEl.appendChild(buildCatCard(cat));
        });
    }

    function buildCatCard(cat) {
        const catTotal  = getCatTotal(cat);
        const pct       = totalBudget > 0 ? (catTotal / totalBudget) * 100 : 0;
        const barWidth  = totalBudget > 0 ? Math.min((catTotal / totalBudget) * 100, 100) : 0;
        const pctLabel  = pct.toFixed(1) + '%';

        const card = document.createElement('div');
        card.className = 'cat-card';
        card.dataset.id = cat.id;

        // Determine severity class for pct badge
        let pctClass = '';
        if (pct >= 100) pctClass = 'over';
        else if (pct >= 75) pctClass = 'warn';

        let fillClass = pctClass;

        const itemCount = (cat.items || []).length;

        card.innerHTML = `
            <div class="cat-card-header" data-id="${cat.id}">
                <div class="cat-icon-badge">${cat.icon}</div>
                <div class="cat-info">
                    <div class="cat-name">${cat.name}</div>
                    <div class="cat-amount-row">
                        <span class="cat-total">฿${formatMoney(catTotal)}</span>
                        <span class="cat-pct-badge ${pctClass}">${pctLabel} ของงบ</span>
                        <span class="cat-count-badge">${itemCount} รายการ</span>
                    </div>
                </div>
                <div class="cat-header-actions">
                    <button class="btn-cat-edit" data-id="${cat.id}" title="แก้ไขหมวดหมู่">
                        <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-cat-delete" data-id="${cat.id}" title="ลบหมวดหมู่">
                        <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                    <span class="cat-chevron">
                        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </span>
                </div>
            </div>
            <div class="cat-progress-wrap">
                <div class="cat-progress-bar">
                    <div class="cat-progress-fill ${fillClass}" style="width:${barWidth}%"></div>
                </div>
            </div>
            <div class="cat-items-section">
                <div class="cat-items-inner">
                    ${buildItemRows(cat)}
                    <button class="btn-add-item-in-cat" data-cat-id="${cat.id}">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        เพิ่มรายการ
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    function buildItemRows(cat) {
        if (!cat.items || cat.items.length === 0) {
            return `<p class="budget-not-set-hint" style="padding:12px 0 4px;">ยังไม่มีรายการ</p>`;
        }
        return cat.items.map(item => `
            <div class="cat-item-row" data-item-id="${item.id}">
                <div class="item-dot"></div>
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    ${item.note ? `<div class="item-note">${item.note}</div>` : ''}
                </div>
                <div class="item-amount">฿${formatMoney(item.amount)}</div>
                <button class="btn-item-delete" data-cat-id="${cat.id}" data-item-id="${item.id}" title="ลบรายการ">
                    <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
        `).join('');
    }

    // ---- Event Delegation on Categories List ----
    catListEl.addEventListener('click', e => {
        // Toggle card expand/collapse (header click)
        const header = e.target.closest('.cat-card-header');
        if (header && !e.target.closest('.btn-cat-delete') && !e.target.closest('.btn-cat-edit')) {
            const card = header.closest('.cat-card');
            card.classList.toggle('expanded');
            return;
        }

        // Add item inside cat
        const addItemBtn = e.target.closest('.btn-add-item-in-cat');
        if (addItemBtn) {
            openAddItemModal(addItemBtn.dataset.catId);
            return;
        }

        // Delete item
        const delItem = e.target.closest('.btn-item-delete');
        if (delItem) {
            const catId  = delItem.dataset.catId;
            const itemId = delItem.dataset.itemId;
            showConfirm('ลบรายการนี้?', 'รายการนี้จะถูกลบออกจากหมวดหมู่', () => {
                const cat = categories.find(c => c.id === catId);
                if (cat) {
                    cat.items = (cat.items || []).filter(i => i.id !== itemId);
                    saveCats();
                    renderCategories();
                    // Re-expand card
                    setTimeout(() => {
                        const card = catListEl.querySelector(`[data-id="${catId}"]`);
                        if (card) card.classList.add('expanded');
                    }, 50);
                }
            });
            return;
        }

        // Delete category
        const delCat = e.target.closest('.btn-cat-delete');
        if (delCat) {
            const catId = delCat.dataset.id;
            const cat   = categories.find(c => c.id === catId);
            if (cat) {
                showConfirm(`ลบ "${cat.name}"?`, 'รายการทั้งหมดในหมวดหมู่นี้จะถูกลบด้วย', () => {
                    categories = categories.filter(c => c.id !== catId);
                    saveCats();
                    renderCategories();
                });
            }
            return;
        }

        // Edit category
        const editCat = e.target.closest('.btn-cat-edit');
        if (editCat) {
            const catId = editCat.dataset.id;
            openEditCatModal(catId);
            return;
        }
    });

    // ---- Set Budget ----
    btnSetBudget.addEventListener('click', () => {
        const val = parseFloat(inputTotalBudget.value);
        if (isNaN(val) || val < 0) {
            shakeElement(inputTotalBudget);
            return;
        }
        totalBudget = val;
        saveBudget();
        renderCategories();
        inputTotalBudget.blur();
    });

    inputTotalBudget.addEventListener('keydown', e => {
        if (e.key === 'Enter') btnSetBudget.click();
    });

    // Pre-fill input with current budget
    if (totalBudget > 0) inputTotalBudget.value = totalBudget;

    // ---- Reset All ----
    btnResetBudget.addEventListener('click', () => {
        showConfirm('รีเซ็ตงบประมาณ?', 'งบตั้งต้นและหมวดหมู่ทั้งหมดจะถูกล้าง', () => {
            totalBudget = 0;
            categories  = [];
            saveBudget(); saveCats();
            inputTotalBudget.value = '';
            renderCategories();
        });
    });

    // ---- Add Category Modal ----
    function openAddCatModal() {
        editingCatId  = null;
        modalCatTitle.textContent  = 'เพิ่มหมวดหมู่';
        btnSubmitCat.textContent   = 'เพิ่มหมวดหมู่';
        inputCatName.value = '';
        setSelectedEmoji('📦');
        modalAddCat.classList.add('active');
        setTimeout(() => inputCatName.focus(), 300);
    }

    function openEditCatModal(catId) {
        const cat = categories.find(c => c.id === catId);
        if (!cat) return;
        editingCatId = catId;
        modalCatTitle.textContent = 'แก้ไขหมวดหมู่';
        btnSubmitCat.textContent  = 'บันทึกการแก้ไข';
        inputCatName.value = cat.name;
        setSelectedEmoji(cat.icon || '📦');
        modalAddCat.classList.add('active');
        setTimeout(() => inputCatName.focus(), 300);
    }

    function closeAddCatModal() { modalAddCat.classList.remove('active'); }

    btnAddCatBudget.addEventListener('click', openAddCatModal);
    btnCloseAddCat.addEventListener('click', closeAddCatModal);
    modalAddCat.addEventListener('click', e => { if (e.target === modalAddCat) closeAddCatModal(); });

    formAddCat.addEventListener('submit', e => {
        e.preventDefault();
        const name = inputCatName.value.trim();
        if (!name) { shakeElement(inputCatName); return; }

        if (editingCatId) {
            // Edit mode
            const cat = categories.find(c => c.id === editingCatId);
            if (cat) {
                cat.name = name;
                cat.icon = selectedEmoji;
                saveCats();
                const wasExpanded = catListEl.querySelector(`[data-id="${editingCatId}"]`)
                                            ?.classList.contains('expanded');
                renderCategories();
                if (wasExpanded) {
                    setTimeout(() => {
                        const card = catListEl.querySelector(`[data-id="${editingCatId}"]`);
                        if (card) card.classList.add('expanded');
                    }, 50);
                }
            }
        } else {
            // Add mode
            categories.push({ id: genId(), name, icon: selectedEmoji, items: [] });
            saveCats();
            renderCategories();
            // Auto-expand the newly added card
            setTimeout(() => {
                const cards = catListEl.querySelectorAll('.cat-card');
                const last  = cards[cards.length - 1];
                if (last) last.classList.add('expanded');
            }, 50);
        }

        closeAddCatModal();
    });

    // ---- Emoji Picker ----
    function setSelectedEmoji(emoji) {
        selectedEmoji = emoji;
        emojiPicker.querySelectorAll('.emoji-opt').forEach(btn => {
            btn.classList.toggle('selected', btn.dataset.emoji === emoji);
        });
    }

    emojiPicker.addEventListener('click', e => {
        const opt = e.target.closest('.emoji-opt');
        if (opt) setSelectedEmoji(opt.dataset.emoji);
    });

    // ---- Add Item Modal ----
    function openAddItemModal(catId) {
        const cat = categories.find(c => c.id === catId);
        if (!cat) return;
        inputItemCatId.value  = catId;
        inputItemAmount.value = '';
        inputItemName.value   = '';
        inputItemNote.value   = '';
        itemModalCatBadge.textContent = `${cat.icon} ${cat.name}`;
        modalAddItem.classList.add('active');
        setTimeout(() => inputItemAmount.focus(), 400);
    }

    function closeAddItemModal() { modalAddItem.classList.remove('active'); }

    btnCloseAddItem.addEventListener('click', closeAddItemModal);
    modalAddItem.addEventListener('click', e => { if (e.target === modalAddItem) closeAddItemModal(); });

    formAddItem.addEventListener('submit', e => {
        e.preventDefault();
        const catId  = inputItemCatId.value;
        const amount = parseFloat(inputItemAmount.value);
        const name   = inputItemName.value.trim();
        const note   = inputItemNote.value.trim();

        if (!name || isNaN(amount) || amount <= 0) {
            shakeElement(isNaN(amount) || amount <= 0 ? inputItemAmount : inputItemName);
            return;
        }

        const cat = categories.find(c => c.id === catId);
        if (cat) {
            if (!cat.items) cat.items = [];
            cat.items.push({ id: genId(), name, amount, note });
            saveCats();
            closeAddItemModal();
            renderCategories();
            // Re-expand the card
            setTimeout(() => {
                const card = catListEl.querySelector(`[data-id="${catId}"]`);
                if (card) card.classList.add('expanded');
            }, 50);
        }
    });

    // ---- Confirm Modal ----
    function showConfirm(title, desc, onOk) {
        confirmTitle.textContent = title;
        confirmDesc.textContent  = desc;
        pendingConfirmFn = onOk;
        modalConfirm.classList.add('active');
    }

    function closeConfirm() { modalConfirm.classList.remove('active'); pendingConfirmFn = null; }

    btnConfirmOk.addEventListener('click', () => {
        if (pendingConfirmFn) pendingConfirmFn();
        closeConfirm();
    });
    btnConfirmCancel.addEventListener('click', closeConfirm);
    modalConfirm.addEventListener('click', e => { if (e.target === modalConfirm) closeConfirm(); });

    // ---- Shake Animation ----
    function shakeElement(el) {
        el.style.transition = 'transform 0.1s';
        const frames = ['-6px','6px','-4px','4px','0px'];
        let i = 0;
        const anim = setInterval(() => {
            el.style.transform = `translateX(${frames[i]})`;
            i++;
            if (i >= frames.length) { clearInterval(anim); el.style.transform = ''; }
        }, 60);
        el.focus();
    }

    // ---- Init ----
    renderCategories();
});
