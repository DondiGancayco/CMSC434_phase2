const form = document.getElementById('addItemForm');
const table = document.getElementById('items-table');

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
const clearInventoryBtn = document.getElementById('clearInventoryBtn');
const addItemBtn = document.getElementById('addItemBtn');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const toAddNameInput = document.getElementById('toAddName');
const requireNameError = document.getElementById('require-name-error');

const hideRequireNameError = () => requireNameError.classList.add('hidden');
const showRequireNameError = () => requireNameError.classList.remove('hidden');

clearInventoryBtn.addEventListener('click', () => {
    localStorage.removeItem('inventory');
    displayData();
});
addItemBtn.addEventListener('click', () => {
    fadeAndAddItem.classList.remove('hidden');
    // Focus after the overlay is visible (hidden inputs may not take focus synchronously)
    requestAnimationFrame(() => toAddNameInput.focus());
});

const closeAddItem = () => {
    fadeAndAddItem.classList.add('hidden');
};

cancelBtn.addEventListener('click', closeAddItem);

form.addEventListener('submit', (e) => e.preventDefault());

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

submitBtn.addEventListener('click', addItem);

toAddNameInput.addEventListener('input', hideRequireNameError);

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
        diets: document.getElementById('toAddDiets').value
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
    const storedData = getInventoryArray();
    table.innerHTML = `
        <tr>
          <th class="name">Name</th>
          <th class="amount">Amount</th>
          <th class="expiration">Expiration</th>
          <th></th>
        </tr>
    `;

    storedData.forEach((item, index) => {
        const row = `
        <tr data-row-index="${index}">
          <td class="name-cell">${item.name}</td>
          <td>${item.amount}</td>
          <td>${item.expiration}</td>
          <td class="no-border-table"><button type="button" class="delete-btn"><img class="delete-icon" src="../assets/images/trash.svg"
                alt="Delete"></button></td>
        </tr>        
        `;
        table.innerHTML += row;
    });
}

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

displayData();