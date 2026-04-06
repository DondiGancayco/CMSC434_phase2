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
        if (Array.isArray(parsed)) return parsed;
        if (parsed !== null && typeof parsed === 'object') return [parsed];
        return [];
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
        ingredients: document.getElementById('toAddIngredients').value,
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
        ingredients: document.getElementById('toEditIngredients').value,
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
    document.getElementById('toEditIngredients').value = item.ingredients ?? '';
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
