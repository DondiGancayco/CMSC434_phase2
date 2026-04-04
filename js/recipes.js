const form = document.getElementById('addItemForm');
const editItemForm = document.getElementById('editItemForm');
const table = document.getElementById('items-table');
const editRowTooltip = document.getElementById('edit-row-tooltip');

let editingRowIndex = null;

const LS_KEY = 'recipes';

function positionEditRowTooltip(e) {
    editRowTooltip.style.left = `${e.clientX + 12}px`;
    editRowTooltip.style.top = `${e.clientY + 12}px`;
}

/** Pairs items with their index in localStorage order (for edit/delete after sort/filter). */
function getFilteredSortedRows(list, prefix, sortMode) {
    const withIdx = list.map((item, index) => ({ item, index }));
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
function getRecipesArray() {
    const raw = localStorage.getItem(LS_KEY);
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
const clearRecipesBtn = document.getElementById('clearRecipesBtn');
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

clearRecipesBtn.addEventListener('click', () => {
    localStorage.removeItem(LS_KEY);
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

/** Enter moves focus for single-line fields only (textareas keep Enter for newlines). */
const addEnterNext = {
    toAddName: 'toAddDescription',
    toAddAllergens: 'toAddDiets',
    toAddDiets: 'toAddRating'
};

form.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (e.target.tagName === 'TEXTAREA') return;
    const nextId = addEnterNext[e.target.id];
    if (!nextId) return;
    e.preventDefault();
    document.getElementById(nextId).focus();
});

const editEnterNext = {
    toEditName: 'toEditDescription',
    toEditAllergens: 'toEditDiets',
    toEditDiets: 'toEditRating'
};

editItemForm.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (e.target.tagName === 'TEXTAREA') return;
    const nextId = editEnterNext[e.target.id];
    if (!nextId) return;
    e.preventDefault();
    document.getElementById(nextId).focus();
});

submitBtn.addEventListener('click', addRecipe);
submitEditBtn.addEventListener('click', saveEditRecipe);

toAddNameInput.addEventListener('input', hideRequireNameError);
toEditNameInput.addEventListener('input', hideRequireNameErrorEdit);

function readRecipeFromAddForm() {
    return {
        name: document.getElementById('toAddName').value.trim(),
        description: document.getElementById('toAddDescription').value,
        ingredients: document.getElementById('toAddIngredients').value,
        steps: document.getElementById('toAddSteps').value,
        allergens: document.getElementById('toAddAllergens').value,
        diets: document.getElementById('toAddDiets').value,
        rating: document.getElementById('toAddRating').value
    };
}

function readRecipeFromEditForm() {
    return {
        name: document.getElementById('toEditName').value.trim(),
        description: document.getElementById('toEditDescription').value,
        ingredients: document.getElementById('toEditIngredients').value,
        steps: document.getElementById('toEditSteps').value,
        allergens: document.getElementById('toEditAllergens').value,
        diets: document.getElementById('toEditDiets').value,
        rating: document.getElementById('toEditRating').value
    };
}

function openEditModal(rowIndex) {
    const list = getRecipesArray();
    const item = list[rowIndex];
    if (item === undefined) return;
    editingRowIndex = rowIndex;
    document.getElementById('toEditName').value = item.name ?? '';
    document.getElementById('toEditDescription').value = item.description ?? '';
    document.getElementById('toEditIngredients').value = item.ingredients ?? '';
    document.getElementById('toEditSteps').value = item.steps ?? '';
    document.getElementById('toEditAllergens').value = item.allergens ?? '';
    document.getElementById('toEditDiets').value = item.diets ?? '';
    document.getElementById('toEditRating').value = item.rating ?? '';
    hideRequireNameErrorEdit();
    closeAddItem();
    fadeAndEditItem.classList.remove('hidden');
    requestAnimationFrame(() => toEditNameInput.focus());
}

function saveEditRecipe() {
    if (editingRowIndex === null) return;
    const fields = readRecipeFromEditForm();
    if (fields.name === '') {
        showRequireNameErrorEdit();
        return;
    }
    const list = getRecipesArray();
    if (list[editingRowIndex] === undefined) return;
    const prev = list[editingRowIndex];
    const updated = {
        name: fields.name,
        description: fields.description,
        ingredients: fields.ingredients,
        steps: fields.steps,
        allergens: fields.allergens,
        diets: fields.diets,
        rating: fields.rating
    };
    if (typeof prev.addedAt === 'number' && Number.isFinite(prev.addedAt)) {
        updated.addedAt = prev.addedAt;
    }
    list[editingRowIndex] = updated;
    localStorage.setItem(LS_KEY, JSON.stringify(list));
    displayData();
    closeEditItem();
}

function addRecipe() {
    const fields = readRecipeFromAddForm();
    if (fields.name === '') {
        showRequireNameError();
        return;
    }

    const newRecipe = {
        name: fields.name,
        description: fields.description,
        ingredients: fields.ingredients,
        steps: fields.steps,
        allergens: fields.allergens,
        diets: fields.diets,
        rating: fields.rating,
        addedAt: Date.now()
    };

    const list = getRecipesArray();
    list.push(newRecipe);
    localStorage.setItem(LS_KEY, JSON.stringify(list));

    displayData();
    form.reset();
    closeAddItem();
}

function displayData() {
    const list = getRecipesArray();
    const searchEl = document.getElementById('to-search');
    const prefix = (searchEl && searchEl.value.trim().toLowerCase()) || '';
    const sortEl = document.getElementById('recipe-sort');
    const sortMode = (sortEl && sortEl.value) || 'newer first';

    const rows = getFilteredSortedRows(list, prefix, sortMode);

    table.innerHTML = `
        <tr>
          <th class="name-cell">Name</th>
          <th class="rating-col">Rating</th>
          <th></th>
        </tr>
    `;

    rows.forEach(({ item, index }) => {
        const row = `
        <tr data-row-index="${index}">
          <td class="name-cell hover-to-edit">${item.name}</td>
          <td class="hover-to-edit rating-cell">${item.rating ?? ''}</td>
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
document.getElementById('recipe-sort').addEventListener('change', displayData);

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

table.addEventListener('click', (e) => {
    const btn = e.target.closest('.delete-btn');
    if (!btn) return;
    const tr = btn.closest('tr');
    if (!tr || tr.dataset.rowIndex === undefined) return;
    const list = getRecipesArray();
    const idx = Number(tr.dataset.rowIndex);
    const target = list[idx];
    if (target === undefined) return;
    const signature = JSON.stringify(target);
    const next = list.filter((item) => JSON.stringify(item) !== signature);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
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
