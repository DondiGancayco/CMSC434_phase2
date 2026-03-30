let pairList = [["Apples", 1, "count", false], ["Siracha Sauce", 8, "fl. oz.", false], , ["Flour", 2, "lbs.", false]];
reDisplay();

function addItem() {
    const text = document.getElementById("item-name-input").value;
    const qty = document.getElementById("item-qty-input").value;
    const units = document.getElementById("item-units-input").value;

    if (!text || text == "" || !qty) {
        return;
    }
    pairList.push([text, qty, units, false]);
    console.log(`added: ${text} ${qty} ${units}`)
    reDisplay();
    document.getElementById("item-name-input").value = "";
}

function reDisplay() {
    const itemsDiv = document.getElementById("items");
    itemsNewHtml = "";

    pairList.forEach(function (pair) {
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
                        <button id="delete" onclick="deleteItem(this)" class="grocery-button">-</button>
                    </div>`
            ;
    });
    itemsDiv.innerHTML = itemsNewHtml;
}

function deleteItem(button) {
    const textToDelete = button.parentElement.querySelector("span").textContent;
    pairList = pairList.filter(pair => pair[0] + " (" + pair[1] + " " + pair[2] + ")" !== textToDelete);
    reDisplay();
}
function setCheckTrue(checkbox) {
    const textToKeepChecked = checkbox.parentElement.querySelector("span").textContent;
    console.log(`checked: ${textToKeepChecked}`)
    pairList.forEach(tuple => {
        if (tuple[0] + " (" + tuple[1] + " " + tuple[2] + ")" === textToKeepChecked) {
            tuple[3] = !tuple[3];
        }
    });
}

