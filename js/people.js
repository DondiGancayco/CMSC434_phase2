document.addEventListener('DOMContentLoaded', function() {
    // UI Elements
    const listView = document.getElementById('listView');
    const formView = document.getElementById('formView');
    const detailsView = document.getElementById('detailsView');
    
    // Buttons and Forms
    const showFormBtn = document.getElementById('showFormBtn');
    const backToListBtn = document.getElementById('backToListBtn');
    const backFromDetailsBtn = document.getElementById('backFromDetailsBtn');
    const profileForm = document.getElementById('profileForm');
    const formTitle = document.getElementById('formTitle');

    // Custom Diet Elements
    const customDietInput = document.getElementById('customDietInput');
    const addCustomDietBtn = document.getElementById('addCustomDietBtn');
    const customDietTagsContainer = document.getElementById('customDietTagsContainer');

    // Initial render using localStorage
    renderList();

    // --- NAVIGATION ---
    showFormBtn.addEventListener('click', function() { openForm(); });
    backToListBtn.addEventListener('click', function() { formView.classList.add('hidden'); listView.classList.remove('hidden'); });
    backFromDetailsBtn.addEventListener('click', function() { detailsView.classList.add('hidden'); listView.classList.remove('hidden'); });

    // --- CUSTOM DIET TAG LOGIC ---
    addCustomDietBtn.addEventListener('click', function() {
        const val = customDietInput.value.trim();
        if (val !== '') {
            addCustomTagToForm(val);
            customDietInput.value = '';
        }
    });

    function addCustomTagToForm(tagText) {
        const existingTags = Array.from(customDietTagsContainer.children).map(span => span.dataset.val);
        if (existingTags.includes(tagText)) return;

        const span = document.createElement('span');
        span.className = 'diet-tag removable-tag';
        span.innerText = tagText;
        span.dataset.val = tagText; 
        span.title = "Click to remove";
        
        span.onclick = function() {
            customDietTagsContainer.removeChild(span);
        };
        
        customDietTagsContainer.appendChild(span);
    }

    // --- SAVE DATA (ADD OR EDIT) ---
    profileForm.addEventListener('submit', function(event) {
        event.preventDefault(); 
        
        const userName = document.getElementById('userName').value;
        const skillLevel = document.getElementById('skillLevel').value;
        const household = document.querySelector('input[name="household"]:checked').value;
        
        const dietaryElements = document.querySelectorAll('input[name="diet"]:checked');
        const standardTags = Array.from(dietaryElements).map(el => el.value);

        const customTags = Array.from(customDietTagsContainer.children).map(span => span.dataset.val);
        
        const finalDietaryTags = standardTags.concat(customTags);

        const personData = { name: userName, skill: skillLevel, diet: finalDietaryTags, household: household };
        
        // Per professor's instructions: saving to localStorage database
        let currentList = JSON.parse(localStorage.getItem('kitchenApp_PeopleList')) || [];
        const editIndex = parseInt(document.getElementById('editIndex').value);

        if (editIndex >= 0) { 
            currentList[editIndex] = personData; 
        } else { 
            currentList.push(personData); 
        }

        // Save back to LocalStorage
        localStorage.setItem('kitchenApp_PeopleList', JSON.stringify(currentList));
        
        formView.classList.add('hidden');
        listView.classList.remove('hidden');
        renderList();
    });

    // --- RENDER MAIN LIST ---
    function renderList() {
        const listElement = document.getElementById('peopleList');
        const emptyMessage = document.getElementById('emptyMessage');
        const peopleData = JSON.parse(localStorage.getItem('kitchenApp_PeopleList')) || [];

        listElement.innerHTML = ''; 

        if (peopleData.length === 0) {
            emptyMessage.style.display = 'block';
        } else {
            emptyMessage.style.display = 'none';
            
            peopleData.forEach(function(person, index) {
                const li = document.createElement('li');
                li.className = 'person-item';
                
                let dietHtml = '';
                if (person.diet && person.diet.length > 0) {
                    person.diet.forEach(tag => {
                        dietHtml += `<span class="diet-tag list-diet-tag">${tag}</span>`;
                    });
                }

                const infoDiv = document.createElement('div');
                infoDiv.className = 'person-info-clickable';
                infoDiv.innerHTML = `
                    <span class="person-name">${person.name}</span>
                    <div class="list-tags">${dietHtml}</div>
                `;
                infoDiv.onclick = function() { showDetails(index); };

                const editBtn = document.createElement('button');
                editBtn.className = 'edit-btn';
                editBtn.innerText = 'Edit';
                editBtn.onclick = function(e) { 
                    e.stopPropagation(); 
                    openForm(index); 
                };

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-btn';
                deleteBtn.innerHTML = '✖';
                deleteBtn.onclick = function(e) {
                    e.stopPropagation(); 
                    if (confirm(`Are you sure you want to delete ${person.name}?`)) {
                        let currentList = JSON.parse(localStorage.getItem('kitchenApp_PeopleList')) || [];
                        currentList.splice(index, 1);
                        localStorage.setItem('kitchenApp_PeopleList', JSON.stringify(currentList));
                        renderList(); 
                    }
                };

                li.appendChild(infoDiv);
                li.appendChild(editBtn);
                li.appendChild(deleteBtn);
                listElement.appendChild(li);
            });
        }
    }

    // --- SHOW PROFILE DETAILS ---
    function showDetails(index) {
        const peopleData = JSON.parse(localStorage.getItem('kitchenApp_PeopleList')) || [];
        const person = peopleData[index];

        document.getElementById('detailName').innerText = person.name;
        
        if(person.household === "Roommates") {
            document.getElementById('detailHousehold').innerText = "Roommates (Keeps inventory separate)";
        } else {
            document.getElementById('detailHousehold').innerText = "Family (Shares inventory groceries)";
        }
        
        document.getElementById('detailSkill').innerText = person.skill;

        const dietContainer = document.getElementById('detailDietTags');
        dietContainer.innerHTML = '';
        
        if (person.diet && person.diet.length > 0) {
            person.diet.forEach(tag => {
                const span = document.createElement('span');
                span.className = 'diet-tag';
                span.innerText = tag;
                dietContainer.appendChild(span);
            });
        } else {
            dietContainer.innerHTML = '<span style="color:#757575; font-size: 18px; font-weight: normal;">None</span>';
        }

        listView.classList.add('hidden');
        detailsView.classList.remove('hidden');
    }

    // --- OPEN FORM (ADD OR EDIT) ---
    function openForm(index = -1) {
        profileForm.reset(); 
        customDietTagsContainer.innerHTML = ''; 
        customDietInput.value = ''; 
        const editIndexInput = document.getElementById('editIndex');
        
        if (index >= 0) {
            formTitle.innerText = "Edit Member";
            editIndexInput.value = index;
            
            const peopleData = JSON.parse(localStorage.getItem('kitchenApp_PeopleList')) || [];
            const person = peopleData[index];

            document.getElementById('userName').value = person.name;
            document.getElementById('skillLevel').value = person.skill;
            
            if (person.diet) {
                person.diet.forEach(dietVal => {
                    const checkbox = document.querySelector(`input[name="diet"][value="${dietVal}"]`);
                    if (checkbox) {
                        checkbox.checked = true; 
                    } else {
                        addCustomTagToForm(dietVal); 
                    }
                });
            }
            
            const radioBtn = document.querySelector(`input[name="household"][value="${person.household}"]`);
            if (radioBtn) radioBtn.checked = true;

        } else {
            formTitle.innerText = "Add Member";
            editIndexInput.value = "-1";
        }

        listView.classList.add('hidden');
        formView.classList.remove('hidden');
    }
});