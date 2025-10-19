const itemList = document.getElementById("itemList");
const searchInput = document.getElementById("searchInput");
const toggleFilledBtn = document.createElement("button");
toggleFilledBtn.textContent = "Show Filled Orders";
document.querySelector(".content").insertBefore(toggleFilledBtn, itemList);

const editModal = document.getElementById("editModal");
const editCustomerName = document.getElementById("editCustomerName");
const editDrug = document.getElementById("editDrug");
const editAmount = document.getElementById("editAmount");
const editLocation = document.getElementById("editLocation");
const editPhone = document.getElementById("editPhone");
const saveEditBtn = document.getElementById("saveEditBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

let currentEditId = null;
let showFilled = false; // toggle state

let stockCache = [];

async function loadStock() {
  const res = await fetch("/api/items"); // stock.json
  stockCache = await res.json();
}

// Fetch and render orders
async function loadOrders() {
  const res = await fetch("/api/orders");
  let orders = await res.json();

  // filter by filled/unfilled toggle
  orders = orders.filter(o => o.orderFilled === showFilled);

  // attach stock details
  const enrichedOrders = orders.map(order => {
    const product = stockCache.find(p => Number(p.id) === Number(order.drug));
    return {
      ...order,
      productName: product ? product.name : "Unknown",
      productPrice: product ? product.price : 0
    };
  });

  renderOrders(enrichedOrders);
}


function renderOrders(orders) {
  itemList.innerHTML = "";
  orders.forEach(o => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div>
        <strong>${o.customerName}</strong> ordered 
        <strong>${o.amount}</strong> of 
        <strong>${o.productName}</strong> (💰 ${o.productPrice})<br>
        📍 Location: ${o.location} | 📞 Phone: ${o.phoneNumber}<br>
        Status: ${o.orderFilled ? "✅ Filled" : "❌ Not filled"}
      </div>
      <div>
        <button onclick="editOrder(${o.id})">✏️ Edit</button>
        <button onclick="deleteOrder(${o.id})">🗑️ Delete</button>
        ${!o.orderFilled ? `<button onclick="fillOrder(${o.id})">✔️ Fill</button>` : ""}
      </div>
    `;
    itemList.appendChild(li);
  });
}

// Edit order
window.editOrder = async (id) => {
  const res = await fetch("/api/orders");
  const orders = await res.json();
  const order = orders.find(o => o.id === id);
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
      customerName: editCustomerName.value,
      drug: editDrug.value,
      amount: parseInt(editAmount.value, 10) || 0,
      location: editLocation.value,
      phoneNumber: editPhone.value,
    }),
  });
  editModal.style.display = "none";
  loadOrders();
});

cancelEditBtn.addEventListener("click", () => {
  editModal.style.display = "none";
});

// Delete order
window.deleteOrder = async (id) => {
  await fetch(`/api/orders/${id}`, { method: "DELETE" });
  loadOrders();
};

// Fill order
window.fillOrder = async (id) => {
  await fetch(`/api/orders/${id}/fill`, { method: "PUT" });
  loadOrders();
};

// Toggle filled/unfilled
toggleFilledBtn.addEventListener("click", () => {
  showFilled = !showFilled;
  toggleFilledBtn.textContent = showFilled ? "Show Unfilled Orders" : "Show Filled Orders";
  loadOrders();
});

// Search filter
searchInput.addEventListener("keyup", async () => {
  const res = await fetch("/api/orders");
  let orders = await res.json();
  const filter = searchInput.value.toLowerCase();

const enrichedOrders = orders.map(order => {
  const product = stockCache.find(p => Number(p.id) === Number(order.drug));
  return {
    ...order,
    productName: product ? product.name : "Unknown"
  };
});

  const filtered = enrichedOrders.filter(o =>
    (o.customerName && o.customerName.toLowerCase().includes(filter)) ||
    (o.productName && o.productName.toLowerCase().includes(filter))
  );

  renderOrders(filtered);
});


// Initial load
(async function init() {
  await loadStock();
  loadOrders();
  setInterval(() => {
  loadOrders();
}, 5000);
})();
