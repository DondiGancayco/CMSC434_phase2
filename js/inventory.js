const form = document.getElementById('addItemForm');
const editItemForm = document.getElementById('editItemForm');
const table = document.getElementById('items-table');
const editRowTooltip = document.getElementById('edit-row-tooltip');

let editingRowIndex = null;

function positionEditRowTooltip(e) {
    editRowTooltip.style.left = `${e.clientX + 12}px`;
    editRowTooltip.style.top = `${e.clientY + 12}px`;
}

/** Pairs items with their index in localStorage order (for edit/delete after sort/filter). */
function getFilteredSortedRows(inv, prefix, sortMode) {
    const withIdx = inv.map((item, index) => ({ item, index }));
    const filtered = withIdx.filter(({ item }) => {
        const nameLower = String(item.name ?? '').toLowerCase();
        return !prefix || nameLower.startsWith(prefix);
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

cancelBtn.addEventListener('click', closeAddItem);
cancelEditBtn.addEventListener('click', closeEditItem);

form.addEventListener('submit', (e) => e.preventDefault());
editItemForm.addEventListener('submit', (e) => e.preventDefault());

const addItemFieldOrder = [
    'toAddName',
    'toAddAmount',
    'toAddOwner',
    'toAddExpiration',
    'toAddAllergens',
    'toAddDiets'
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
    'toEditOwner',
    'toEditExpiration',
    'toEditAllergens',
    'toEditDiets'
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
    document.getElementById('toEditAmount').value = item.amount ?? '';
    document.getElementById('toEditOwner').value = item.owner ?? '';
    document.getElementById('toEditExpiration').value = item.expiration ?? '';
    document.getElementById('toEditAllergens').value = item.allergens ?? '';
    document.getElementById('toEditDiets').value = item.diets ?? '';
    hideRequireNameErrorEdit();
    closeAddItem();
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
        owner: document.getElementById('toEditOwner').value,
        expiration: document.getElementById('toEditExpiration').value,
        allergens: document.getElementById('toEditAllergens').value,
        diets: document.getElementById('toEditDiets').value
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
        owner: document.getElementById('toAddOwner').value,
        expiration: document.getElementById('toAddExpiration').value,
        allergens: document.getElementById('toAddAllergens').value,
        diets: document.getElementById('toAddDiets').value,
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
          <td class="hover-to-edit">${item.amount}</td>
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