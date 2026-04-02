const form = document.getElementById('addItemForm');
const table = document.getElementById('items-table');

// async function loadJSON() {
//   try {
//     const response = await fetch('./inventory.json');
//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }
//     inventory = await response.json();
//     console.log('Data loaded:', inventory);
//   } catch (error) {
//     console.error('Could not load JSON file:', error);
//   }
// }
// document.addEventListener("DOMContentLoaded", (event) => loadJSON());

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
clearInventoryBtn.addEventListener('click', () => {
    localStorage.removeItem('inventory');
    displayData();
});
addItemBtn.addEventListener('click', () => fadeAndAddItem.classList.remove('hidden'));

const closeAddItem = () => {
    fadeAndAddItem.classList.add('hidden');
};

cancelBtn.addEventListener('click', closeAddItem);

form.addEventListener('submit', (e) => e.preventDefault());

submitBtn.addEventListener('click', addItem);

function addItem() {
    const newItem = {
        name: document.getElementById('toAddName').value,
        area: document.getElementById('toAddArea').value,
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
          <th></th>
          <th class="name">Name</th>
          <th class="amount">Amount</th>
          <th class="expiration">Expiration</th>
          <th></th>
        </tr>
    `;

    storedData.forEach(item => {
        const row = `
        <tr>
          <td class="no-border-table"><button class="edit-btn"><img src="../assets/images/p_pencil.svg"
                height="25" alt="Edit"></button></td>
          <td>${item.name}</td>
          <td>${item.amount}</td>
          <td>${item.expiration}</td>
          <td class="no-border-table"><button class="delete-btn"><img src="../assets/images/trash.svg"
                height="30" alt="Delete"></button></td>
        </tr>        
        `;
        table.innerHTML += row;
    });
}

displayData();