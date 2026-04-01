
const fadeAndAddItem = document.getElementById('fadeAndAddItem');
const addItemBtn = document.getElementById('addItemBtn');

const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
addItemBtn.addEventListener('click', () => fadeAndAddItem.classList.remove('hidden'));
const closeAddItem = () => {
    fadeAndAddItem.classList.add('hidden');
};
cancelBtn.addEventListener('click', closeAddItem);