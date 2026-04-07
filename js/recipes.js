const form = document.getElementById('addItemForm');
const editItemForm = document.getElementById('editItemForm');
const table = document.getElementById('items-table');
const editRowTooltip = document.getElementById('edit-row-tooltip');

let editingRowIndex = null;

const LS_KEY = 'recipes';

const ALLERGEN_ORDER = ['nuts', 'dairy', 'gluten', 'shellfish', 'fish', 'eggs', 'soybeans'];
const DIET_ORDER = ['vegetarian', 'vegan', 'kosher', 'halal'];

const FREE_FROM_TO_ALLERGEN = {
    'nut-free': 'nuts',
    'dairy-free': 'dairy',
    'gluten-free': 'gluten',
    'shellfish-free': 'shellfish',
    'fish-free': 'fish',
    'egg-free': 'eggs',
    'soy-free': 'soybeans'
};

/**
 * Canonical ingredient: { name, quantity, unit }.
 * quantity is a finite number (defaults to 1). unit defaults to "count".
 */
function coalesceIngredientEntry(raw) {
    if (raw == null) return null;
    if (typeof raw === 'string') {
        const t = raw.trim();
        if (!t) return null;
        return { name: t, quantity: 1, unit: 'count' };
    }
    if (typeof raw === 'object') {
        const name = String(raw.name ?? '').trim();
        if (!name) return null;
        let q = raw.quantity;
        if (q === undefined || q === '') q = 1;
        const n = Number(q);
        const quantity = Number.isFinite(n) ? n : 1;
        const unit = String(raw.unit ?? 'count').trim() || 'count';
        return { name, quantity, unit };
    }
    return null;
}

/** Normalize persisted `ingredients`: array of objects, legacy string, or missing → array. */
function normalizeStoredIngredients(val) {
    if (val == null || val === '') return [];
    if (Array.isArray(val)) {
        return val.map(coalesceIngredientEntry).filter(Boolean);
    }
    if (typeof val === 'string') {
        return val
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)
            .map(coalesceIngredientEntry)
            .filter(Boolean);
    }
    return [];
}

/** Match [grocery_list.html](pages/grocery_list.html) unit values for interoperability. */
const INGREDIENT_UNITS = [
    { value: 'count', label: 'count' },
    { value: 'lbs', label: 'lbs.' },
    { value: 'fl. oz.', label: 'fl. oz.' }
];

function createIngredientDisplayItem(ing) {
    const entry = coalesceIngredientEntry(ing);
    if (!entry) return null;
    const { name, quantity, unit } = entry;
    const unitLabel = INGREDIENT_UNITS.find((u) => u.value === unit)?.label ?? unit;

    const item = document.createElement('div');
    item.className = 'recipe-ingredient-item';
    item.dataset.name = name;
    item.dataset.qty = String(quantity);
    item.dataset.unit = unit;

    const textSpan = document.createElement('span');
    textSpan.className = 'recipe-ingredient-text';
    const bold = document.createElement('b');
    bold.textContent = name;
    textSpan.appendChild(bold);
    textSpan.appendChild(document.createTextNode(` (${quantity} ${unitLabel})`));

    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'recipe-ingredient-remove';
    rm.setAttribute('aria-label', 'Remove ingredient');
    rm.textContent = '\u00d7';

    item.appendChild(textSpan);
    item.appendChild(rm);

    item.addEventListener('click', (e) => {
        if (e.target.closest('.recipe-ingredient-remove')) return;
        item.classList.toggle('recipe-ingredient-selected');
    });

    return item;
}

function mergeOrAppendItem(listName, name, qty, unit) {
    const lists = JSON.parse(localStorage.getItem('groceryLists') || '{}');
    if (!lists[listName]) lists[listName] = [];
    const existing = lists[listName].find((pair) => pair[0] === name && pair[2] === unit);
    if (existing) {
        existing[1] = Number(existing[1]) + Number(qty);
    } else {
        lists[listName].push([name, qty, unit, false]);
    }
    localStorage.setItem('groceryLists', JSON.stringify(lists));
}

function populateGroceryListSelects() {
    const lists = JSON.parse(localStorage.getItem('groceryLists') || '{}');
    const keys = Object.keys(lists);
    document.querySelectorAll('.recipe-grocery-list-select').forEach((sel) => {
        sel.innerHTML = '<option value="">Select list\u2026</option>';
        keys.forEach((k) => {
            const opt = document.createElement('option');
            opt.value = k;
            opt.textContent = k;
            sel.appendChild(opt);
        });
    });
}

function renderIngredientsList(containerId, ingredients) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    const list = normalizeStoredIngredients(ingredients);
    list.forEach((item) => {
        const el2 = createIngredientDisplayItem(item);
        if (el2) el.appendChild(el2);
    });
}

function ingredientsListFromContainer(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return [];
    const out = [];
    el.querySelectorAll('.recipe-ingredient-item').forEach((item) => {
        const name = item.dataset.name ?? '';
        if (!name) return;
        const quantity = Number(item.dataset.qty) || 1;
        const unit = item.dataset.unit ?? 'count';
        const entry = coalesceIngredientEntry({ name, quantity, unit });
        if (entry) out.push(entry);
    });
    return out;
}

function setupIngredientListControls(formEl, listId, addBtnId) {
    document.getElementById(addBtnId)?.addEventListener('click', () => {
        const list = document.getElementById(listId);
        if (!list) return;
        const wrap = list.closest('.recipe-ingredients-wrap');
        const inputArea = wrap?.querySelector('.recipe-ingredient-input-area');
        if (!inputArea) return;
        const nameIn = inputArea.querySelector('.recipe-ingredient-name');
        const qtyIn = inputArea.querySelector('.recipe-ingredient-qty');
        const sel = inputArea.querySelector('.recipe-ingredient-unit');
        const name = nameIn?.value.trim() ?? '';
        if (!name) return;
        const n = Number(qtyIn?.value);
        const quantity = Number.isFinite(n) && n >= 0 ? n : 1;
        const unit = sel?.value ?? 'count';
        const entry = coalesceIngredientEntry({ name, quantity, unit });
        if (entry) {
            const el = createIngredientDisplayItem(entry);
            if (el) list.appendChild(el);
        }
        if (nameIn) nameIn.value = '';
        if (qtyIn) qtyIn.value = '1';
        if (sel) sel.selectedIndex = 0;
        nameIn?.focus();
    });

    formEl?.addEventListener('click', (e) => {
        const rmBtn = e.target.closest('.recipe-ingredient-remove');
        if (rmBtn) {
            rmBtn.closest('.recipe-ingredient-item')?.remove();
            return;
        }
        const groceryBtn = e.target.closest('.recipe-add-to-grocery-btn');
        if (groceryBtn) {
            const wrap = groceryBtn.closest('.recipe-ingredients-wrap');
            const listEl = document.getElementById(listId);
            const selectEl = wrap?.querySelector('.recipe-grocery-list-select');
            const listName = selectEl?.value;
            if (!listName) return;
            const selected = listEl?.querySelectorAll('.recipe-ingredient-item.recipe-ingredient-selected') ?? [];
            if (!selected.length) return;
            selected.forEach((item) => {
                mergeOrAppendItem(listName, item.dataset.name, Number(item.dataset.qty) || 1, item.dataset.unit || 'count');
                item.classList.remove('recipe-ingredient-selected');
            });
        }
    });
}

function mapRecipeForRead(raw) {
    if (!raw || typeof raw !== 'object') return raw;
    return {
        ...raw,
        ingredients: normalizeStoredIngredients(raw.ingredients)
    };
}

/** In-memory only; reset on full page reload. */
let appliedRecipeFilters = {
    excludeAllergens: [],
    requireDiets: []
};

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

function getOrderedChecklistSelection(containerId, orderList) {
    const el = document.getElementById(containerId);
    if (!el) return [];
    const selected = new Set(
        Array.from(el.querySelectorAll('input[type="checkbox"]:checked')).map((cb) => cb.value)
    );
    return orderList.filter((v) => selected.has(v));
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
function getFilteredSortedRows(list, prefix, sortMode, recipeFilters) {
    const filters = recipeFilters ?? appliedRecipeFilters;
    const withIdx = list.map((item, index) => ({ item, index }));
    const filtered = withIdx.filter(({ item }) => {
        const nameLower = String(item.name ?? '').toLowerCase();
        if (prefix && !nameLower.startsWith(prefix)) return false;
        if (!passesExcludeAllergenFilter(item, filters.excludeAllergens)) return false;
        if (!passesDietRequireFilter(item, filters.requireDiets)) return false;
        return true;
    });

    const time = (item) => (typeof item.addedAt === 'number' && Number.isFinite(item.addedAt) ? item.addedAt : 0);

    const ratingForSort = (item) => {
        const raw = item.rating;
        if (raw === undefined || raw === null) return -1;
        const s = String(raw).trim();
        if (s === '') return -1;
        const n = Number(s);
        return Number.isFinite(n) ? n : -1;
    };

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
            case 'Highest Rated':
                return ratingForSort(B) - ratingForSort(A);
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
        let list = [];
        if (Array.isArray(parsed)) list = parsed;
        else if (parsed !== null && typeof parsed === 'object') list = [parsed];
        return list.map((item) => mapRecipeForRead(item));
    } catch {
        return [];
    }
}

const fadeAndAddItem = document.getElementById('fadeAndAddItem');
const fadeAndEditItem = document.getElementById('fadeAndEditItem');
const fadeAndFilterRecipes = document.getElementById('fadeAndFilterRecipes');
const filterRecipeForm = document.getElementById('filterRecipeForm');
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
    closeFilterRecipesModal();
    renderIngredientsList('toAddIngredientsList', []);
    populateGroceryListSelects();
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

function closeFilterRecipesModal() {
    if (fadeAndFilterRecipes) fadeAndFilterRecipes.classList.add('hidden');
}

function readExcludeAllergensFromRecipeFilterModal() {
    const el = document.getElementById('filterRecipesAllergensChecklist');
    if (!el) return [];
    const out = [];
    el.querySelectorAll('input[type="checkbox"]:checked').forEach((cb) => {
        const token = FREE_FROM_TO_ALLERGEN[cb.value];
        if (token) out.push(token);
    });
    return out;
}

function syncRecipeFilterModalFromApplied() {
    const allergenEl = document.getElementById('filterRecipesAllergensChecklist');
    if (allergenEl) {
        const exclude = new Set(appliedRecipeFilters.excludeAllergens);
        allergenEl.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
            const token = FREE_FROM_TO_ALLERGEN[cb.value];
            cb.checked = Boolean(token && exclude.has(token));
        });
    }
    setChecklistFromStoredArray('filterRecipesDietsChecklist', appliedRecipeFilters.requireDiets, DIET_ORDER);
}

function updateRecipesFilterSummary() {
    const el = document.getElementById('recipesFilterSummary');
    if (!el) return;
    const parts = [];
    if (appliedRecipeFilters.excludeAllergens.length) {
        parts.push(`<b>Free From:</b> ${appliedRecipeFilters.excludeAllergens.join(', ')}<br>`);
    }
    if (appliedRecipeFilters.requireDiets.length) {
        parts.push(`<b>Diets:</b> ${appliedRecipeFilters.requireDiets.join(', ')}`);
    }
    if (parts.length === 0) {
        el.textContent = '';
        el.classList.add('hidden');
    } else {
        el.innerHTML = parts.join('');
        el.classList.remove('hidden');
    }
}

function applyRecipeFiltersFromModal() {
    appliedRecipeFilters = {
        excludeAllergens: readExcludeAllergensFromRecipeFilterModal(),
        requireDiets: getOrderedChecklistSelection('filterRecipesDietsChecklist', DIET_ORDER)
    };
    displayData();
    closeFilterRecipesModal();
}

function clearAllRecipeFilters() {
    appliedRecipeFilters = {
        excludeAllergens: [],
        requireDiets: []
    };
    syncRecipeFilterModalFromApplied();
    displayData();
}

cancelBtn.addEventListener('click', closeAddItem);
cancelEditBtn.addEventListener('click', closeEditItem);

setupIngredientListControls(form, 'toAddIngredientsList', 'addRecipeIngredientRowBtn');
setupIngredientListControls(editItemForm, 'toEditIngredientsList', 'addEditRecipeIngredientRowBtn');

if (filterRecipeForm) {
    filterRecipeForm.addEventListener('submit', (e) => e.preventDefault());
}
document.getElementById('recipeFilterModalCancelBtn')?.addEventListener('click', closeFilterRecipesModal);
document.getElementById('recipeFilterModalApplyBtn')?.addEventListener('click', applyRecipeFiltersFromModal);
document.getElementById('recipeFilterModalClearAllBtn')?.addEventListener('click', clearAllRecipeFilters);
document.getElementById('filter-btn')?.addEventListener('click', () => {
    closeAddItem();
    closeEditItem();
    syncRecipeFilterModalFromApplied();
    if (fadeAndFilterRecipes) fadeAndFilterRecipes.classList.remove('hidden');
});

form.addEventListener('submit', (e) => e.preventDefault());
editItemForm.addEventListener('submit', (e) => e.preventDefault());

const addEnterNext = {
    toAddName: 'toAddDescription'
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
    toEditName: 'toEditDescription'
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
        ingredients: ingredientsListFromContainer('toAddIngredientsList'),
        steps: document.getElementById('toAddSteps').value,
        allergens: getOrderedChecklistSelection('toAddAllergensChecklist', ALLERGEN_ORDER),
        diets: getOrderedChecklistSelection('toAddDietsChecklist', DIET_ORDER),
        rating: document.getElementById('toAddRating').value
    };
}

function readRecipeFromEditForm() {
    return {
        name: document.getElementById('toEditName').value.trim(),
        description: document.getElementById('toEditDescription').value,
        ingredients: ingredientsListFromContainer('toEditIngredientsList'),
        steps: document.getElementById('toEditSteps').value,
        allergens: getOrderedChecklistSelection('toEditAllergensChecklist', ALLERGEN_ORDER),
        diets: getOrderedChecklistSelection('toEditDietsChecklist', DIET_ORDER),
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
    renderIngredientsList('toEditIngredientsList', item.ingredients);
    populateGroceryListSelects();
    document.getElementById('toEditSteps').value = item.steps ?? '';
    setChecklistFromStoredArray('toEditAllergensChecklist', item.allergens, ALLERGEN_ORDER);
    setChecklistFromStoredArray('toEditDietsChecklist', item.diets, DIET_ORDER);
    document.getElementById('toEditRating').value = item.rating ?? '';
    hideRequireNameErrorEdit();
    closeAddItem();
    closeFilterRecipesModal();
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
    renderIngredientsList('toAddIngredientsList', []);
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
    updateRecipesFilterSummary();
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
