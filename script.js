// ============================================================
// Dungeon Loot Splitter — script.js  (Phase 2)
// ============================================================
// ARCHITECTURAL PRINCIPLE: The loot array and partySize are the
// single source of truth. Buttons change state, then call
// updateUI(). updateUI() does ALL calculations and ALL rendering.
// No calculation logic lives anywhere else.
// ============================================================


// ------------------------------------------------------------
// APPLICATION STATE — declared at top so it persists across
// every button click and input change during the session.
// ------------------------------------------------------------

// Every loot item is a plain object literal: { name, value, quantity }
const loot = [];


// ------------------------------------------------------------
// DOM REFERENCES — grabbed once at startup using getElementById
// (no querySelector, no querySelectorAll, no inline handlers)
// ------------------------------------------------------------

const partySizeInput    = document.getElementById("party-size");
const lootNameInput     = document.getElementById("loot-name");
const lootValueInput    = document.getElementById("loot-value");
const lootQuantityInput = document.getElementById("loot-quantity");
const addLootBtn        = document.getElementById("add-loot-btn");
const splitLootBtn      = document.getElementById("split-loot-btn");

const partyError        = document.getElementById("party-error");
const lootError         = document.getElementById("loot-error");
const splitError        = document.getElementById("split-error");

const noLootMessage     = document.getElementById("noLootMessage");
const lootTableWrapper  = document.getElementById("loot-table-wrapper");
const lootRows          = document.getElementById("lootRows");
const totalLootSpan     = document.getElementById("totalLoot");

const splitResults      = document.getElementById("split-results");
const resultTotal       = document.getElementById("result-total");
const resultPerMember   = document.getElementById("result-per-member");


// ------------------------------------------------------------
// updateUI()
// THE single function responsible for:
//   1. Calculating the grand total from the loot array
//   2. Rendering the loot table rows
//   3. Showing or hiding the "no loot" message
//   4. Enabling or disabling the Split Loot button
//   5. Showing or hiding the split results
//   6. Calculating loot per party member (when state is valid)
//
// This is called after EVERY state change so the UI is always
// in sync with the data, not with the last button click.
// ------------------------------------------------------------

function updateUI() {

  // --- 1. CALCULATE GRAND TOTAL (value × quantity per item) ---
  // Using a traditional for loop as required by the spec.
  // Total is always recalculated fresh from the array —
  // we never cache or reuse a stale number.
  let grandTotal = 0;

  for (let i = 0; i < loot.length; i++) {
    grandTotal += loot[i].value * loot[i].quantity;
  }


  // --- 2. RENDER THE LOOT TABLE ---
  // Clear the container first so we're not appending duplicates.
  lootRows.innerHTML = "";

  if (loot.length === 0) {
    // Empty state: show message, hide the table grid, hide total row
    noLootMessage.classList.remove("hidden");
    lootTableWrapper.classList.add("hidden");
  } else {
    // Items exist: hide message, show the table grid
    noLootMessage.classList.add("hidden");
    lootTableWrapper.classList.remove("hidden");

    // Build one grid row per loot item using createElement so we can
    // attach event listeners without any inline onclick attributes.
    for (let i = 0; i < loot.length; i++) {

      // Outer wrapper uses display:contents so its children slot
      // directly into the parent grid (required by the spec CSS).
      let row = document.createElement("div");
      row.className = "loot-row";

      // Name cell
      let nameCell = document.createElement("div");
      nameCell.className = "loot-cell";
      nameCell.innerText = loot[i].name;

      // Value cell — toFixed(2) gives consistent currency display
      let valueCell = document.createElement("div");
      valueCell.className = "loot-cell";
      valueCell.innerText = "$" + loot[i].value.toFixed(2);

      // Quantity cell
      let quantityCell = document.createElement("div");
      quantityCell.className = "loot-cell";
      quantityCell.innerText = loot[i].quantity;

      // Remove button cell — listener captures index i via closure
      let actionCell = document.createElement("div");
      actionCell.className = "loot-cell loot-actions";

      let removeBtn = document.createElement("button");
      removeBtn.innerText = "Remove";
      removeBtn.className = "btn btn-remove";

      // The IIFE captures the current value of i so that clicks on
      // different rows always remove the right item from the array.
      removeBtn.addEventListener("click", (function (index) {
        return function () {
          removeLoot(index);
        };
      })(i));

      actionCell.appendChild(removeBtn);

      row.appendChild(nameCell);
      row.appendChild(valueCell);
      row.appendChild(quantityCell);
      row.appendChild(actionCell);

      lootRows.appendChild(row);
    }
  }

  // Always update the running total display from the calculated value
  totalLootSpan.innerText = grandTotal.toFixed(2);


  // --- 3. READ AND VALIDATE PARTY SIZE ---
  // We validate here (not in splitLoot) so the button gate and
  // results visibility are both driven by the same check.
  const rawParty  = partySizeInput.value;
  const partySize = parseInt(rawParty);
  const partyValid = rawParty !== "" && !isNaN(partySize) && partySize >= 1;


  // --- 4. ACTION GATING: enable / disable the Split button ---
  // Both conditions must be true for the button to be usable.
  // Using the disabled attribute as required — not hiding the button.
  if (loot.length > 0 && partyValid) {
    splitLootBtn.disabled = false;
  } else {
    splitLootBtn.disabled = true;
  }


  // --- 5. SHOW / HIDE SPLIT RESULTS ---
  // Results are only visible when both conditions are met AND
  // the user has clicked Split (splitResults does not auto-show
  // just because state is valid — the button triggers the reveal).
  // However, if state becomes invalid we must immediately hide them
  // so stale numbers are never on screen.
  if (!partyValid || loot.length === 0) {
    splitResults.classList.add("hidden");
    // Also clear the per-member display so stale data can't linger
    resultTotal.innerText     = "$0.00";
    resultPerMember.innerText = "$0.00";
  }


  // --- 6. CALCULATE SPLIT (only when both conditions are valid) ---
  // grandTotal was already computed in step 1, so no second loop needed.
  if (partyValid && loot.length > 0) {
    const perMember = grandTotal / partySize;
    resultTotal.innerText     = "$" + grandTotal.toFixed(2);
    resultPerMember.innerText = "$" + perMember.toFixed(2);
  }
}


// ------------------------------------------------------------
// addLoot()
// Validates inputs, creates a plain object literal, pushes it
// into the loot array, then calls updateUI() to reflect the change.
// Invalid data never reaches the array.
// ------------------------------------------------------------

function addLoot() {
  // Clear any previous error before re-validating
  lootError.textContent = "";

  const name     = lootNameInput.value.trim();
  const value    = parseFloat(lootValueInput.value);
  const quantity = parseInt(lootQuantityInput.value);

  // Guard: name must not be blank
  if (name === "") {
    lootError.textContent = "Please enter a loot name.";
    lootNameInput.focus();
    return;
  }

  // Guard: value must parse to a real number
  if (lootValueInput.value === "" || isNaN(value)) {
    lootError.textContent = "Please enter a valid loot value.";
    lootValueInput.focus();
    return;
  }

  // Guard: no negative gold
  if (value < 0) {
    lootError.textContent = "Loot value cannot be negative.";
    lootValueInput.focus();
    return;
  }

  // Guard: quantity must be at least 1
  if (lootQuantityInput.value === "" || isNaN(quantity) || quantity < 1) {
    lootError.textContent = "Quantity must be 1 or greater.";
    lootQuantityInput.focus();
    return;
  }

  // All checks passed — create the object literal (Phase 2 requires quantity)
  const lootItem = {
    name:     name,
    value:    value,
    quantity: quantity
  };

  // Mutate state: add item to the array
  loot.push(lootItem);

  // Sync the UI to the new state immediately
  updateUI();

  // Reset the form so the user can add another item quickly
  lootNameInput.value     = "";
  lootValueInput.value    = "";
  lootQuantityInput.value = "";
  lootNameInput.focus();
}


// ------------------------------------------------------------
// removeLoot(index)
// Removes the item at the given position using splice(), then
// calls updateUI() to reflect the change.
// splice(index, 1) removes exactly 1 element at that position.
// ------------------------------------------------------------

function removeLoot(index) {
  // Mutate state: delete the item at position index
  loot.splice(index, 1);

  // Sync the UI to the updated state
  updateUI();
}


// ------------------------------------------------------------
// splitLoot()
// The Split button remains for instructional purposes per spec,
// but it does NOT contain any calculation logic of its own.
// All it does is make the results visible (if state is valid)
// and delegate everything else to updateUI().
// ------------------------------------------------------------

function splitLoot() {
  // Clear any lingering split-panel errors
  splitError.textContent = "";

  // Validate party size again here to show a helpful inline error
  // if the user somehow clicks Split with a bad party size.
  const rawParty  = partySizeInput.value;
  const partySize = parseInt(rawParty);

  if (rawParty === "" || isNaN(partySize) || partySize < 1) {
    splitError.textContent = "Please enter a party size of at least 1.";
    partyError.textContent = "Party size must be 1 or greater.";
    return;
  } else {
    partyError.textContent = "";
  }

  // Can't split nothing (belt-and-suspenders; button should be disabled anyway)
  if (loot.length === 0) {
    splitError.textContent = "No loot to split! Add some loot first.";
    return;
  }

  // State is valid — reveal the results section and let updateUI() populate it
  splitResults.classList.remove("hidden");
  updateUI();
}


// ------------------------------------------------------------
// EVENT LISTENERS
// All listeners registered here in script.js — no inline handlers.
// Party size change triggers updateUI() directly because changing
// party size is a state change that must immediately update the UI.
// ------------------------------------------------------------

addLootBtn.addEventListener("click", addLoot);
splitLootBtn.addEventListener("click", splitLoot);

// Reactive: changing party size immediately updates split totals
partySizeInput.addEventListener("input", function () {
  // Clear the party error so it doesn't linger after the user corrects input
  partyError.textContent = "";
  updateUI();
});

// Let the user press Enter instead of clicking Add Loot
lootNameInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    addLoot();
  }
});

lootValueInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    addLoot();
  }
});

lootQuantityInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    addLoot();
  }
});


// ------------------------------------------------------------
// INITIAL RENDER
// Run once on page load so the UI reflects the (empty) state
// correctly from the start — button disabled, message visible.
// ------------------------------------------------------------
updateUI();
