const itemList = document.getElementById("itemList");
const searchInput = document.getElementById("searchInput");
const addItemBtn = document.getElementById("addItemBtn");

const editModal = document.getElementById("editModal");
const editName = document.getElementById("editName");
const editAmount = document.getElementById("editAmount");
const saveEditBtn = document.getElementById("saveEditBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

let currentEditId = null;

// Fetch and render items
async function loadItems() {
  const res = await fetch("/api/items");
  const items = await res.json();
  renderItems(items);
}

function renderItems(items) {
  itemList.innerHTML = "";
  items.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${item.name} (${item.amount})</span>
      <div>
        <button onclick="editItem(${item.id}, '${item.name}', ${item.amount})">✏️ Edit</button>
        <button onclick="deleteItem(${item.id})">🗑️ Delete</button>
      </div>
    `;
    itemList.appendChild(li);
  });
}

// Add item
addItemBtn.addEventListener("click", async () => {
  const name = prompt("Enter item name:");
  const amount = parseInt(prompt("Enter amount:"), 10) || 0;

  if (name) {
    await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, amount })
    });
    loadItems();
  }
});

// Edit item
window.editItem = (id, name, amount) => {
  currentEditId = id;
  editName.value = name;
  editAmount.value = amount;
  editModal.style.display = "flex";
};

saveEditBtn.addEventListener("click", async () => {
  await fetch(`/api/items/${currentEditId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: editName.value,
      amount: parseInt(editAmount.value, 10) || 0
    })
  });
  editModal.style.display = "none";
  loadItems();
});

cancelEditBtn.addEventListener("click", () => {
  editModal.style.display = "none";
});

// Delete item
window.deleteItem = async (id) => {
  await fetch(`/api/items/${id}`, { method: "DELETE" });
  loadItems();
};

// Search filter
searchInput.addEventListener("keyup", async () => {
  const res = await fetch("/api/items");
  let items = await res.json();
  const filter = searchInput.value.toLowerCase();
  items = items.filter(i => i.name.toLowerCase().includes(filter));
  renderItems(items);
});

// Initial load
loadItems();
