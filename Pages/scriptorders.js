const itemList = document.getElementById("itemList");
const searchInput = document.getElementById("searchInput");
const searchBy = document.getElementById("searchBy");
const sortSelect = document.getElementById("sortSelect");
const toggleFilledBtn = document.getElementById("toggleFilledBtn");
const messageBox = document.getElementById("messageBox");

const editModal = document.getElementById("editModal");
const editCustomerName = document.getElementById("editCustomerName");
const editDrug = document.getElementById("editDrug");
const editAmount = document.getElementById("editAmount");
const editLocation = document.getElementById("editLocation");
const editPhone = document.getElementById("editPhone");
const saveEditBtn = document.getElementById("saveEditBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

let ordersCache = [];
let stockCache = [];
let currentEditId = null;
let showFilled = false;

/* ---------------- LOAD DATA ---------------- */

async function loadStock() {
  const res = await fetch("/api/items");
  stockCache = await res.json();
}

async function loadOrders() {
  const res = await fetch("/api/orders");
  ordersCache = await res.json();
  applyFiltersAndSort();
}

/* ---------------- RENDER ---------------- */

function renderOrders(orders) {
  itemList.innerHTML = "";

  orders.forEach(o => {
    const li = document.createElement("li");

    li.innerHTML = `
      <div>
        <strong>${o.customerName}</strong> ordered 
        <strong>${o.amount}</strong> of 
        <strong>${o.productName}</strong> (💰 ${o.productPrice})<br>
        📍 ${o.location} | 📞 ${o.phoneNumber}<br>
        Status: ${o.orderFilled ? "✅ Filled" : "❌ Not Filled"}
      </div>
      <div>
        <button onclick="editOrder('${o.id}')">✏️</button>
        <button onclick="deleteOrder('${o.id}')">🗑️</button>
        ${!o.orderFilled ? `<button onclick="fillOrder('${o.id}')">✔️</button>` : ""}
      </div>
    `;

    itemList.appendChild(li);
  });
}

/* ---------------- FILTER + SORT ---------------- */

function applyFiltersAndSort() {
  let filtered = [...ordersCache];

  // Attach stock info
  filtered = filtered.map(order => {
    const product = stockCache.find(p => String(p.id) === String(order.drug));
    return {
      ...order,
      productName: product ? product.name : "Unknown",
      productPrice: product ? product.price : 0
    };
  });

  // Filled toggle
  filtered = filtered.filter(o => o.orderFilled === showFilled);

  const searchTerm = searchInput.value.toLowerCase();
  const field = searchBy.value;

  if (searchTerm) {
    filtered = filtered.filter(o => {
      if (field === "all") {
        return Object.values(o).some(val =>
          String(val).toLowerCase().includes(searchTerm)
        );
      }
      return String(o[field] || "")
        .toLowerCase()
        .includes(searchTerm);
    });
  }

  switch (sortSelect.value) {
    case "name_asc":
      filtered.sort((a, b) => a.customerName.localeCompare(b.customerName));
      break;
    case "amount_asc":
      filtered.sort((a, b) => a.amount - b.amount);
      break;
    case "amount_desc":
      filtered.sort((a, b) => b.amount - a.amount);
      break;
    case "status":
      filtered.sort((a, b) => a.orderFilled - b.orderFilled);
      break;
  }

  renderOrders(filtered);
}

/* ---------------- EDIT ---------------- */

window.editOrder = (id) => {
  const order = ordersCache.find(o => String(o.id) === String(id));
  if (!order) return;

  currentEditId = id;

  editCustomerName.value = order.customerName;
  editDrug.value = order.drug;
  editAmount.value = order.amount;
  editLocation.value = order.location;
  editPhone.value = order.phoneNumber;

  editModal.style.display = "flex";
};

saveEditBtn.addEventListener("click", async () => {
  await fetch(`/api/orders/${currentEditId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: currentEditId,
      customerName: editCustomerName.value,
      drug: editDrug.value,
      amount: parseInt(editAmount.value, 10) || 0,
      location: editLocation.value,
      phoneNumber: editPhone.value
    })
  });

  editModal.style.display = "none";
  loadOrders();
});

cancelEditBtn.addEventListener("click", () => {
  editModal.style.display = "none";
});

/* ---------------- ACTIONS ---------------- */

window.deleteOrder = async (id) => {
  if (!confirm("Delete this order?")) return;
  await fetch(`/api/orders/${id}`, { method: "DELETE" });
  loadOrders();
};

window.fillOrder = async (id) => {
  const res = await fetch(`/api/orders/${id}/fill`, {
    method: "PUT"
  });

  if (!res.ok) {
    const errorData = await res.json();
    messageBox.textContent = errorData.error || "Failed to fill order.";
    messageBox.style.display = "block";
    return;
  }

  messageBox.style.display = "none";
  loadOrders();
};

toggleFilledBtn.addEventListener("click", () => {
  showFilled = !showFilled;
  toggleFilledBtn.textContent = showFilled
    ? "Show Unfilled Orders"
    : "Show Filled Orders";
  applyFiltersAndSort();
});

/* ---------------- LISTENERS ---------------- */

searchInput.addEventListener("input", applyFiltersAndSort);
searchBy.addEventListener("change", applyFiltersAndSort);
sortSelect.addEventListener("change", applyFiltersAndSort);

/* ---------------- INIT ---------------- */

(async function init() {
  await loadStock();
  await loadOrders();
})();