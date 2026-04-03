let pairList = {
    "My List" : [["Apples", 1, "count", false], ["Siracha Sauce", 8, "fl. oz.", false], ["Flour", 2, "lbs.", false]],
    "Spring Harvest" : [["Apples", 1, "count", false], ["Juice", 2, "fl. oz.", false],],

};



let currList = "My List";
reDisplay();

function addItemFromUserInput() {
    const text = document.getElementById("item-name-input").value;
    const qty = document.getElementById("item-qty-input").value;
    const units = document.getElementById("item-units-input").value;

    if (!text || text == "" || !qty) {
        return;
    }

    addItem(currList,text, qty, units);
    reDisplay();

    document.getElementById("item-name-input").value = "";
    document.getElementById("item-qty-input").value = "";
    document.getElementById("item-units-input").value = "";
    
}

function addItem(listname, text, qty, units){
    pairList[listname].push([text, qty, units, false]);
    console.log(`added: ${text} ${qty} ${units}`)
}

function reDisplay() {
    const itemsDiv = document.getElementById("items");
    itemsNewHtml = "";

    pairList[currList].forEach(function (pair) {
        text = pair[0];
        qty = pair[1];
        units = pair[2];
        isChecked = pair[3];
        check = isChecked ? ` value="yes" checked` : "";
        itemsNewHtml +=
            `<div class = "item">
                        <label id="left">
                            <input type="checkbox" ${check} onclick="setCheckTrue(this)">
                            <span><b>${text}</b> (${qty} ${units})</span>
                        </label> 
                        <span id="delete" onclick="deleteItem(this)" class="close">&times;</span>
                    </div>`
            ;
    });
    itemsDiv.innerHTML = itemsNewHtml;
}

function deleteItem(button) {
    const textToDelete = button.parentElement.querySelector("span").textContent;
    pairList[currList] = pairList[currList].filter(pair => pair[0] + " (" + pair[1] + " " + pair[2] + ")" !== textToDelete);
    reDisplay();
}
function setCheckTrue(checkbox) {
    const textToKeepChecked = checkbox.parentElement.querySelector("span").textContent;
    console.log(`checked: ${textToKeepChecked}`)
    pairList[currList].forEach(tuple => {
        if (tuple[0] + " (" + tuple[1] + " " + tuple[2] + ")" === textToKeepChecked) {
            tuple[3] = !tuple[3];
        }
    });
}

function switchList(listname){
    currList = listname;
    document.getElementById("list-title").innerHTML = listname;
    reDisplay();
}

// Button code based off of https://www.w3schools.com/howto/howto_js_tab_header.asp

function openTab(tabname, elmnt, marker) {

  // Remove the background color of all tablinks/buttons
  tablinks = document.getElementsByClassName("listlink");
  marks = document.getElementsByClassName("current-tab-marker");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].style.color = "";
    marks[i].style.backgroundColor = "";
  }

  // Change the font colors and the color of the bar at the bottom 
  marker = document.getElementById(marker);
  elmnt.style.color = "#342066ff";
  marker.style.backgroundColor = "blue";

  switchList(tabname);
}

// When the user clicks on the button, open the modal
function newListMenu(){
    // Change the font colors and the color of the bar at the bottom 
    marker = document.getElementById("new-list-marker");
    text = document.getElementById("newlist-button");
    text.style.color = "lightblue";
    marker.style.backgroundColor = "lightblue";

    modal = document.getElementById("new-list-menu");
    modal.style.display = "block";
}

function createNewList(){
    const text = document.getElementById("list-name-input").value;

    if (!text) {
        return;
    }
    pairList[text] = [];

    const listTabsDiv = document.getElementsByClassName("list-tabs")[0];
    listTabsNewHTML = "";

    Object.keys(pairList).forEach(key =>
        listTabsNewHTML += `<button class="listlink" onclick="openTab('${key}', this, '${key}-marker')">
                <span class="tab-label">${key}</span>
                <div id='${key}-marker' class="current-tab-marker"></div>
            </button>`
    );

    listTabsNewHTML += `<button class="listlink" id="newlist-button" onclick="newListMenu()">
                <span class="tab-label">+ New List</span>
                <div id="new-list-marker" class="current-tab-marker"></div>
            </button>`

    listTabsDiv.innerHTML = listTabsNewHTML;
    currList = text;
    reDisplay();
    document.getElementById("list-name-input").value = "";
    console.log(`added new list: ${text}`);

    closeNewListMenu();

    alltabs = document.getElementsByClassName("listlink");
    openTab(text, alltabs[alltabs.length -2], `${text}-marker`);
}

// When the user clicks on <span> (x), close the modal
function closeNewListMenu() {
    marker = document.getElementById("new-list-marker");
    text = document.getElementById("newlist-button");
    text.style.color = "";
    marker.style.backgroundColor = "";

    modal = document.getElementById("new-list-menu");
    modal.style.display = "none";
}

window.onclick = function(event){
    modal = document.getElementById("new-list-menu");
    if (event.target == modal) {
        closeNewListMenu();
    }
};

// Get the element with id="defaultOpen" and click on it
document.getElementById("defaultOpen").click(); 