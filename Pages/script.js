const itemList = document.getElementById("itemList");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const addItemBtn = document.getElementById("addItemBtn");
const searchBy = document.getElementById("searchBy");

const itemModal = document.getElementById("itemModal");
const modalTitle = document.getElementById("modalTitle");

const itemName = document.getElementById("itemName");
const itemAmount = document.getElementById("itemAmount");
const itemPrice = document.getElementById("itemPrice");
const itemCategory = document.getElementById("itemCategory");
const itemDescription = document.getElementById("itemDescription");
const itemImage = document.getElementById("itemImage");

const saveItemBtn = document.getElementById("saveItemBtn");
const cancelItemBtn = document.getElementById("cancelItemBtn");

let itemsData = [];
let editingId = null;
let uploadedImageUrl = null;

async function loadItems() {
  const res = await fetch("/api/items");
  itemsData = await res.json();
  applyFiltersAndSort();
}

function renderItems(items) {
  itemList.innerHTML = "";

  items.forEach(item => {
    const li = document.createElement("li");

    li.innerHTML = `
      <span>
        ${item.name} | ${item.category} |
        Amount: ${item.amount} |
        Price: ${item.price}
      </span>
      <div>
        <button onclick="editItem(${item.id})">✏️</button>
        <button onclick="deleteItem(${item.id})">🗑️</button>
      </div>
    `;

    itemList.appendChild(li);
  });
}

function applyFiltersAndSort() {
  let filtered = [...itemsData];

  const searchTerm = searchInput.value.toLowerCase();
  const searchField = searchBy.value;

  if (searchTerm) {
  filtered = filtered.filter(item => {

    if (searchField === "all") {
      return Object.values(item).some(val =>
        String(val).toLowerCase().includes(searchTerm)
      );
    }

    return String(item[searchField] || "")
      .toLowerCase()
      .includes(searchTerm);
  });
}

  const sortValue = sortSelect.value;

  switch (sortValue) {
    case "name_asc":
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "price_asc":
      filtered.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      filtered.sort((a, b) => b.price - a.price);
      break;
    case "amount_asc":
      filtered.sort((a, b) => a.amount - b.amount);
      break;
    case "amount_desc":
      filtered.sort((a, b) => b.amount - a.amount);
      break;
  }

  renderItems(filtered);
}

/* ---------- Modal Controls ---------- */

addItemBtn.addEventListener("click", () => {
  editingId = null;
  uploadedImageUrl = null;
  modalTitle.textContent = "Add Item";
  itemModal.style.display = "flex";
});

cancelItemBtn.addEventListener("click", () => {
  itemModal.style.display = "none";
});

/* ---------- Save Item ---------- */

saveItemBtn.addEventListener("click", async () => {
  let imageUrl = uploadedImageUrl;

  if (itemImage.files.length > 0) {
    const formData = new FormData();
    formData.append("image", itemImage.files[0]);

    const uploadRes = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });

    const uploadData = await uploadRes.json();
    imageUrl = uploadData.url || "test";
  }

  const payload = {
    name: itemName.value,
    amount: parseInt(itemAmount.value, 10) || 0,
    price: parseInt(itemPrice.value, 10) || 0,
    category: itemCategory.value,
    description: itemDescription.value,
    image: imageUrl
  };

  if (editingId) {
    await fetch(`/api/items/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } else {
    await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  itemModal.style.display = "none";
  loadItems();
});

/* ---------- Edit ---------- */

window.editItem = (id) => {
  const item = itemsData.find(i => String(i.id) === String(id));
  if (!item) {
    console.log("Item not found for ID:", id);
    return;
  }

  editingId = id;
  uploadedImageUrl = item.image;

  modalTitle.textContent = "Edit Item";

  itemName.value = item.name;
  itemAmount.value = item.amount;
  itemPrice.value = item.price;
  itemCategory.value = item.category;
  itemDescription.value = item.description;

  itemModal.style.display = "flex";
};

/* ---------- Delete ---------- */

window.deleteItem = async (id) => {
  await fetch(`/api/items/${id}`, { method: "DELETE" });
  loadItems();
};

/* ---------- Search + Sort ---------- */

searchInput.addEventListener("input", applyFiltersAndSort);
sortSelect.addEventListener("change", applyFiltersAndSort);
searchBy.addEventListener("change", applyFiltersAndSort);

/* ---------- Init ---------- */

loadItems();