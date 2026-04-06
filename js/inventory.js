const form = document.getElementById('addItemForm');
const editItemForm = document.getElementById('editItemForm');
const table = document.getElementById('items-table');
const editRowTooltip = document.getElementById('edit-row-tooltip');

let editingRowIndex = null;

const ALLERGEN_ORDER = ['nuts', 'dairy', 'gluten', 'shellfish', 'fish', 'eggs', 'soybeans'];
const DIET_ORDER = ['vegetarian', 'vegan', 'kosher', 'halal'];
const STORAGE_LOCATION_ALLOWED = new Set(['pantry', 'fridge', 'freezer', 'other']);

/** Filter modal: "nut-free" etc. → stored allergen token on items. */
const FREE_FROM_TO_ALLERGEN = {
    'nut-free': 'nuts',
    'dairy-free': 'dairy',
    'gluten-free': 'gluten',
    'shellfish-free': 'shellfish',
    'fish-free': 'fish',
    'egg-free': 'eggs',
    'soy-free': 'soybeans'
};

/** In-memory only; reset on full page reload. */
let appliedInventoryFilters = {
    excludeAllergens: [],
    requireDiets: [],
    storageMode: 'all'
};

/** Value for `<input type="number">` when editing; non-numeric legacy amounts show empty. */
function amountStringForNumberInput(stored) {
    if (stored === undefined || stored === null) return '';
    const s = String(stored).trim();
    if (s === '') return '';
    const n = Number(s);
    return Number.isFinite(n) ? s : '';
}

function formatInventoryAmountCell(item) {
    const a = item.amount != null && String(item.amount).trim() !== '' ? String(item.amount).trim() : '';
    const u = item.units != null && String(item.units).trim() !== '' ? String(item.units).trim() : '';
    if (a && u) return `${a} ${u}`;
    return a || u || '';
}

/** @returns {'' | 'pantry' | 'fridge' | 'freezer' | 'other'} */
function normalizeStorageLocation(val) {
    if (val === undefined || val === null) return '';
    const s = String(val).trim().toLowerCase();
    if (s === '') return '';
    return STORAGE_LOCATION_ALLOWED.has(s) ? s : '';
}

function getOrderedChecklistSelection(containerId, orderList) {
    const el = document.getElementById(containerId);
    if (!el) return [];
    const selected = new Set(
        Array.from(el.querySelectorAll('input[type="checkbox"]:checked')).map((cb) => cb.value)
    );
    return orderList.filter((v) => selected.has(v));
}

function getItemAllergenTokens(item) {
    const val = item.allergens;
    let arr = [];
    if (Array.isArray(val)) {
        arr = val.map(String).map((s) => s.trim().toLowerCase()).filter(Boolean);
    } else if (typeof val === 'string' && val.trim()) {
        arr = val.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    }
    const expanded = [];
    arr.forEach((x) => {
        if (x === 'dairygluten') {
            expanded.push('dairy', 'gluten');
        } else {
            expanded.push(x);
        }
    });
    return expanded;
}

function getItemDietTokens(item) {
    const val = item.diets;
    if (Array.isArray(val)) {
        return val.map(String).map((s) => s.trim().toLowerCase()).filter(Boolean);
    }
    if (typeof val === 'string' && val.trim()) {
        return val.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    }
    return [];
}

function passesExcludeAllergenFilter(item, excludeAllergens) {
    if (!excludeAllergens.length) return true;
    const tokens = new Set(getItemAllergenTokens(item));
    return !excludeAllergens.some((a) => tokens.has(a));
}

function passesDietRequireFilter(item, requireDiets) {
    if (!requireDiets.length) return true;
    const set = new Set(getItemDietTokens(item));
    return requireDiets.every((d) => set.has(d));
}

function passesStorageFilterForInventory(item, storageMode) {
    if (storageMode === 'all') return true;
    const loc = normalizeStorageLocation(item.storageLocation);
    if (storageMode === '') {
        return loc === '';
    }
    if (storageMode === 'misc') {
        return loc === 'other' || loc === 'misc';
    }
    return loc === storageMode;
}

function setChecklistFromStoredArray(containerId, val, orderList) {
    const el = document.getElementById(containerId);
    if (!el) return;
    let arr = [];
    if (Array.isArray(val)) {
        arr = val.map(String).map((s) => s.trim().toLowerCase()).filter(Boolean);
    } else if (typeof val === 'string' && val.trim()) {
        arr = val.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    }
    const expanded = [];
    arr.forEach((x) => {
        if (x === 'dairygluten') {
            expanded.push('dairy', 'gluten');
        } else {
            expanded.push(x);
        }
    });
    const allowed = new Set(orderList);
    const on = new Set(expanded.filter((x) => allowed.has(x)));
    el.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        cb.checked = on.has(cb.value);
    });
}

function positionEditRowTooltip(e) {
    editRowTooltip.style.left = `${e.clientX + 12}px`;
    editRowTooltip.style.top = `${e.clientY + 12}px`;
}

/** Pairs items with their index in localStorage order (for edit/delete after sort/filter). */
function getFilteredSortedRows(inv, prefix, sortMode, invFilters) {
    const filters = invFilters ?? appliedInventoryFilters;
    const withIdx = inv.map((item, index) => ({ item, index }));
    const filtered = withIdx.filter(({ item }) => {
        const nameLower = String(item.name ?? '').toLowerCase();
        if (prefix && !nameLower.startsWith(prefix)) return false;
        if (!passesExcludeAllergenFilter(item, filters.excludeAllergens)) return false;
        if (!passesDietRequireFilter(item, filters.requireDiets)) return false;
        if (!passesStorageFilterForInventory(item, filters.storageMode)) return false;
        return true;
    });

    const time = (item) => (typeof item.addedAt === 'number' && Number.isFinite(item.addedAt) ? item.addedAt : 0);

    filtered.sort((a, b) => {
        const A = a.item;
        const B = b.item;
        switch (sortMode) {
            case 'older first':
                return time(A) - time(B);
            case 'Name A-Z':
                return String(A.name ?? '').localeCompare(String(B.name ?? ''), undefined, { sensitivity: 'base' });
            case 'Name Z-A':
                return String(B.name ?? '').localeCompare(String(A.name ?? ''), undefined, { sensitivity: 'base' });
            case 'newer first':
            default:
                return time(B) - time(A);
        }
    });

    return filtered;
}

/** Always returns an array (handles legacy localStorage that stored one object instead of an array). */
function getInventoryArray() {
    const raw = localStorage.getItem('inventory');
    if (raw == null || raw === '') return [];
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        if (parsed !== null && typeof parsed === 'object') return [parsed];
        return [];
    } catch {
        return [];
    }
}

const fadeAndAddItem = document.getElementById('fadeAndAddItem');
const fadeAndEditItem = document.getElementById('fadeAndEditItem');
const fadeAndFilterInventory = document.getElementById('fadeAndFilterInventory');
const filterInventoryForm = document.getElementById('filterInventoryForm');
const clearInventoryBtn = document.getElementById('clearInventoryBtn');
const addItemBtn = document.getElementById('addItemBtn');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const submitEditBtn = document.getElementById('submitEditBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const toAddNameInput = document.getElementById('toAddName');
const toEditNameInput = document.getElementById('toEditName');
const requireNameError = document.getElementById('require-name-error');
const requireNameErrorEdit = document.getElementById('require-name-error-edit');

const hideRequireNameError = () => requireNameError.classList.add('hidden');
const showRequireNameError = () => requireNameError.classList.remove('hidden');
const hideRequireNameErrorEdit = () => requireNameErrorEdit.classList.add('hidden');
const showRequireNameErrorEdit = () => requireNameErrorEdit.classList.remove('hidden');

clearInventoryBtn.addEventListener('click', () => {
    localStorage.removeItem('inventory');
    displayData();
});
addItemBtn.addEventListener('click', () => {
    closeEditItem();
    closeFilterInventoryModal();
    fadeAndAddItem.classList.remove('hidden');
    hideRequireNameError();
    requestAnimationFrame(() => toAddNameInput.focus());
});

const closeAddItem = () => {
    fadeAndAddItem.classList.add('hidden');
    hideRequireNameError();
};

const closeEditItem = () => {
    fadeAndEditItem.classList.add('hidden');
    editingRowIndex = null;
    hideRequireNameErrorEdit();
};

function closeFilterInventoryModal() {
    if (fadeAndFilterInventory) fadeAndFilterInventory.classList.add('hidden');
}

function readExcludeAllergensFromFilterModal() {
    const el = document.getElementById('filterAllergensChecklist');
    if (!el) return [];
    const out = [];
    el.querySelectorAll('input[type="checkbox"]:checked').forEach((cb) => {
        const token = FREE_FROM_TO_ALLERGEN[cb.value];
        if (token) out.push(token);
    });
    return out;
}

function readStorageModeFromFilterModal() {
    const r = document.querySelector('#filterInventoryForm input[name="filterStorage"]:checked');
    if (!r || r.value === 'all') return 'all';
    if (r.value === 'no_selection') return '';
    return r.value;
}

function syncFilterModalFromApplied() {
    const allergenEl = document.getElementById('filterAllergensChecklist');
    if (allergenEl) {
        const exclude = new Set(appliedInventoryFilters.excludeAllergens);
        allergenEl.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
            const token = FREE_FROM_TO_ALLERGEN[cb.value];
            cb.checked = Boolean(token && exclude.has(token));
        });
    }
    setChecklistFromStoredArray('filterDietsChecklist', appliedInventoryFilters.requireDiets, DIET_ORDER);
    const mode = appliedInventoryFilters.storageMode;
    const radioValue = mode === 'all' ? 'all' : mode === '' ? 'no_selection' : mode;
    const radio = document.querySelector(
        `#filterInventoryForm input[name="filterStorage"][value="${radioValue}"]`
    );
    if (radio) radio.checked = true;
}

function updateInventoryFilterSummary() {
    const el = document.getElementById('inventoryFilterSummary');
    if (!el) return;
    const parts = [];
    if (appliedInventoryFilters.excludeAllergens.length) {
        parts.push(`<b>Free From:</b> ${appliedInventoryFilters.excludeAllergens.join(', ')}<br>`);
    }
    if (appliedInventoryFilters.requireDiets.length) {
        parts.push(`<b>Diets:</b> ${appliedInventoryFilters.requireDiets.join(', ')}<br>`);
    }
    if (appliedInventoryFilters.storageMode !== 'all') {
        const locLabel =
            appliedInventoryFilters.storageMode === ''
                ? 'no selection'
                : appliedInventoryFilters.storageMode === 'misc'
                  ? 'misc'
                  : appliedInventoryFilters.storageMode;
        parts.push(`<b>Location:</b> ${locLabel}`);
    }
    if (parts.length === 0) {
        el.textContent = '';
        el.classList.add('hidden');
    } else {
        el.innerHTML = parts.join('');
        el.classList.remove('hidden');
    }
}

function applyInventoryFiltersFromModal() {
    appliedInventoryFilters = {
        excludeAllergens: readExcludeAllergensFromFilterModal(),
        requireDiets: getOrderedChecklistSelection('filterDietsChecklist', DIET_ORDER),
        storageMode: readStorageModeFromFilterModal()
    };
    displayData();
    closeFilterInventoryModal();
}

function clearAllInventoryFilters() {
    appliedInventoryFilters = {
        excludeAllergens: [],
        requireDiets: [],
        storageMode: 'all'
    };
    syncFilterModalFromApplied();
    displayData();
}

cancelBtn.addEventListener('click', closeAddItem);
cancelEditBtn.addEventListener('click', closeEditItem);

if (filterInventoryForm) {
    filterInventoryForm.addEventListener('submit', (e) => e.preventDefault());
}
document.getElementById('filterModalCancelBtn')?.addEventListener('click', closeFilterInventoryModal);
document.getElementById('filterModalApplyBtn')?.addEventListener('click', applyInventoryFiltersFromModal);
document.getElementById('filterModalClearAllBtn')?.addEventListener('click', clearAllInventoryFilters);
document.getElementById('filter-btn')?.addEventListener('click', () => {
    closeAddItem();
    closeEditItem();
    syncFilterModalFromApplied();
    if (fadeAndFilterInventory) fadeAndFilterInventory.classList.remove('hidden');
});

form.addEventListener('submit', (e) => e.preventDefault());
editItemForm.addEventListener('submit', (e) => e.preventDefault());

const addItemFieldOrder = [
    'toAddName',
    'toAddAmount',
    'toAddUnits',
    'toAddOwner',
    'toAddExpiration',
    'toAddStorageLocation'
];

form.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const id = e.target.id;
    const idx = addItemFieldOrder.indexOf(id);
    if (idx === -1) return;
    e.preventDefault();
    if (idx < addItemFieldOrder.length - 1) {
        document.getElementById(addItemFieldOrder[idx + 1]).focus();
    }
});

const editItemFieldOrder = [
    'toEditName',
    'toEditAmount',
    'toEditUnits',
    'toEditOwner',
    'toEditExpiration',
    'toEditStorageLocation'
];

editItemForm.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const id = e.target.id;
    const idx = editItemFieldOrder.indexOf(id);
    if (idx === -1) return;
    e.preventDefault();
    if (idx < editItemFieldOrder.length - 1) {
        document.getElementById(editItemFieldOrder[idx + 1]).focus();
    }
});

submitBtn.addEventListener('click', addItem);
submitEditBtn.addEventListener('click', saveEditItem);

toAddNameInput.addEventListener('input', hideRequireNameError);
toEditNameInput.addEventListener('input', hideRequireNameErrorEdit);

function openEditModal(rowIndex) {
    const inv = getInventoryArray();
    const item = inv[rowIndex];
    if (item === undefined) return;
    editingRowIndex = rowIndex;
    document.getElementById('toEditName').value = item.name ?? '';
    document.getElementById('toEditAmount').value = amountStringForNumberInput(item.amount);
    document.getElementById('toEditUnits').value = item.units ?? '';
    document.getElementById('toEditOwner').value = item.owner ?? '';
    document.getElementById('toEditExpiration').value = item.expiration ?? '';
    setChecklistFromStoredArray('toEditAllergensChecklist', item.allergens, ALLERGEN_ORDER);
    setChecklistFromStoredArray('toEditDietsChecklist', item.diets, DIET_ORDER);
    document.getElementById('toEditStorageLocation').value = normalizeStorageLocation(item.storageLocation);
    hideRequireNameErrorEdit();
    closeAddItem();
    closeFilterInventoryModal();
    fadeAndEditItem.classList.remove('hidden');
    requestAnimationFrame(() => toEditNameInput.focus());
}

function saveEditItem() {
    if (editingRowIndex === null) return;
    const nameValue = document.getElementById('toEditName').value.trim();
    if (nameValue === '') {
        showRequireNameErrorEdit();
        return;
    }
    const inv = getInventoryArray();
    if (inv[editingRowIndex] === undefined) return;
    const prev = inv[editingRowIndex];
    const updated = {
        name: nameValue,
        amount: document.getElementById('toEditAmount').value,
        units: document.getElementById('toEditUnits').value,
        owner: document.getElementById('toEditOwner').value,
        expiration: document.getElementById('toEditExpiration').value,
        allergens: getOrderedChecklistSelection('toEditAllergensChecklist', ALLERGEN_ORDER),
        diets: getOrderedChecklistSelection('toEditDietsChecklist', DIET_ORDER),
        storageLocation: normalizeStorageLocation(document.getElementById('toEditStorageLocation').value)
    };
    if (typeof prev.addedAt === 'number' && Number.isFinite(prev.addedAt)) {
        updated.addedAt = prev.addedAt;
    }
    inv[editingRowIndex] = updated;
    localStorage.setItem('inventory', JSON.stringify(inv));
    displayData();
    closeEditItem();
}

function addItem() {
    const nameValue = document.getElementById('toAddName').value.trim();
    if (nameValue === '') {
        showRequireNameError();
        return;
    }

    const newItem = {
        name: nameValue,
        amount: document.getElementById('toAddAmount').value,
        units: document.getElementById('toAddUnits').value,
        owner: document.getElementById('toAddOwner').value,
        expiration: document.getElementById('toAddExpiration').value,
        allergens: getOrderedChecklistSelection('toAddAllergensChecklist', ALLERGEN_ORDER),
        diets: getOrderedChecklistSelection('toAddDietsChecklist', DIET_ORDER),
        storageLocation: normalizeStorageLocation(document.getElementById('toAddStorageLocation').value),
        addedAt: Date.now()
    };

    const inventory = getInventoryArray();
    inventory.push(newItem);
    localStorage.setItem('inventory', JSON.stringify(inventory));

    displayData();
    form.reset();
    closeAddItem();
}

// Function to load and display data from localStorage
function displayData() {
    const inv = getInventoryArray();
    const searchEl = document.getElementById('to-search');
    const prefix = (searchEl && searchEl.value.trim().toLowerCase()) || '';
    const sortEl = document.getElementById('inventory-sort');
    const sortMode = (sortEl && sortEl.value) || 'newer first';

    const rows = getFilteredSortedRows(inv, prefix, sortMode);

    table.innerHTML = `
        <tr>
          <th class="name-cell">Name</th>
          <th class="amount">Amount</th>
          <th></th>
        </tr>
    `;

    rows.forEach(({ item, index }) => {
        const row = `
        <tr data-row-index="${index}">
          <td class="name-cell hover-to-edit">${item.name}</td>
          <td class="hover-to-edit">${formatInventoryAmountCell(item)}</td>
          <td class="no-border-table rightmost-cell">
            <span class="delete-btn-wrap">
              <button type="button" class="delete-btn"><img class="delete-icon" src="../assets/images/trash.svg"
                alt="Delete"></button>
            </span>
          </td>
        </tr>        
        `;
        table.innerHTML += row;
    });
    updateInventoryFilterSummary();
}

document.getElementById('to-search').addEventListener('input', displayData);
document.getElementById('inventory-sort').addEventListener('change', displayData);

table.addEventListener('mouseover', (e) => {
    if (!e.target.closest('.hover-to-edit')) return;
    editRowTooltip.classList.remove('hidden');
    positionEditRowTooltip(e);
});

table.addEventListener('mousemove', (e) => {
    if (editRowTooltip.classList.contains('hidden')) return;
    if (!e.target.closest('.hover-to-edit')) return;
    positionEditRowTooltip(e);
});

table.addEventListener('mouseout', (e) => {
    const related = e.relatedTarget;
    if (related && table.contains(related) && related.closest('.hover-to-edit')) return;
    editRowTooltip.classList.add('hidden');
});

// clicking on trash can to delete row
table.addEventListener('click', (e) => {
    const btn = e.target.closest('.delete-btn');
    if (!btn) return;
    const tr = btn.closest('tr');
    if (!tr || tr.dataset.rowIndex === undefined) return;
    const inv = getInventoryArray();
    const idx = Number(tr.dataset.rowIndex);
    const target = inv[idx];
    if (target === undefined) return;
    const signature = JSON.stringify(target);
    const next = inv.filter((item) => JSON.stringify(item) !== signature);
    localStorage.setItem('inventory', JSON.stringify(next));
    displayData();
});

table.addEventListener('click', (e) => {
    if (e.target.closest('.delete-btn')) return;
    const cell = e.target.closest('.hover-to-edit');
    if (!cell) return;
    const tr = cell.closest('tr');
    if (!tr || tr.dataset.rowIndex === undefined) return;
    openEditModal(Number(tr.dataset.rowIndex));
});

displayData();