"use strict";

// Nama penyimpanan data di browser.
const STORAGE_KEYS = {
  products: "hitunguntung.products.v1",
  sales: "hitunguntung.sales.v1"
};

const $ = (selector) => document.querySelector(selector);

const productForm = $("#product-form");
const costRows = $("#cost-rows");
const saleForm = $("#sale-form");
const saleProduct = $("#sale-product");
const saleQuantity = $("#sale-quantity");
const salePrice = $("#sale-price");
const formMessage = $("#form-message");

let products = loadData(STORAGE_KEYS.products);
let sales = loadData(STORAGE_KEYS.sales);

// Membaca data yang sebelumnya disimpan.
function loadData(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    console.warn("Data tidak bisa dibaca:", error);
    return [];
  }
}

// Menyimpan produk dan penjualan ke browser.
function saveData() {
  try {
    localStorage.setItem(
      STORAGE_KEYS.products,
      JSON.stringify(products)
    );

    localStorage.setItem(
      STORAGE_KEYS.sales,
      JSON.stringify(sales)
    );

    return true;
  } catch (error) {
    console.error("Gagal menyimpan data:", error);

    alert(
      "Data tidak dapat disimpan. Periksa penyimpanan browser."
    );

    return false;
  }
}

// Mengubah angka menjadi format Rupiah.
function money(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);
}

// Membaca nilai angka dari input.
function numberFrom(input, fallback = 0) {
  const value = Number(input.value);

  return Number.isFinite(value) ? value : fallback;
}

// Membuat ID unik.
function createId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Mencegah teks pengguna diperlakukan sebagai HTML.
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));
}

// Membuat baris biaya baru.
function addCostRow(name = "", cost = "") {
  const row = document.createElement("div");
  row.className = "cost-row";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "cost-name";
  nameInput.maxLength = 60;
  nameInput.placeholder = "Contoh: Bahan utama";
  nameInput.setAttribute("aria-label", "Nama komponen biaya");
  nameInput.value = name;

  const amountWrap = document.createElement("div");
  amountWrap.className = "cost-input-wrap";

  const amountInput = document.createElement("input");
  amountInput.type = "number";
  amountInput.className = "cost-amount";
  amountInput.min = "0";
  amountInput.step = "100";
  amountInput.placeholder = "0";
  amountInput.setAttribute(
    "aria-label",
    "Biaya komponen untuk satu batch"
  );
  amountInput.value = cost;

  amountWrap.appendChild(amountInput);

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "remove-cost";
  removeButton.textContent = "×";
  removeButton.title = "Hapus biaya";

  removeButton.addEventListener("click", () => {
    row.remove();
    updatePreview();
  });

  row.append(nameInput, amountWrap, removeButton);
  costRows.appendChild(row);
}

// Mengambil semua biaya dari formulir.
function getCostsFromForm() {
  return [...costRows.querySelectorAll(".cost-row")]
    .map((row) => ({
      name: row.querySelector(".cost-name").value.trim(),
      amount: Math.max(
        0,
        Number(row.querySelector(".cost-amount").value) || 0
      )
    }))
    .filter((cost) => cost.name || cost.amount > 0);
}

// Menghitung biaya, harga jual, dan estimasi keuntungan.
function getCalculation() {
  const yieldQty = Math.floor(
    Math.max(1, numberFrom($("#yield-qty"), 1))
  );

  const marginPct = Math.min(
    80,
    Math.max(0, numberFrom($("#target-margin"), 30))
  );

  const costs = getCostsFromForm();

  const totalCost = costs.reduce(
    (sum, cost) => sum + cost.amount,
    0
  );

  const unitCost = totalCost / yieldQty;

  // Rumus harga jual untuk target margin:
  // Harga jual = Biaya per unit / (1 - margin).
  const rawPrice = unitCost / (1 - marginPct / 100);

  // Membulatkan harga jual ke atas ke kelipatan Rp500.
  const suggestedPrice = rawPrice > 0
    ? Math.ceil(rawPrice / 500) * 500
    : 0;

  const unitDifference = suggestedPrice - unitCost;

  return {
    yieldQty,
    marginPct,
    costs,
    totalCost,
    unitCost,
    suggestedPrice,
    unitDifference
  };
}

// Memperbarui tampilan kalkulator secara langsung.
function updatePreview() {
  const result = getCalculation();

  $("#total-cost").textContent = money(result.totalCost);
  $("#unit-cost").textContent = money(result.unitCost);
  $("#result-margin").textContent = `${result.marginPct}%`;
  $("#suggested-price").textContent = money(result.suggestedPrice);
  $("#unit-profit").textContent = money(result.unitDifference);
}

// Menampilkan pesan.
function showMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle("error", isError);
}

// Memperbarui kartu ringkasan.
function renderMetrics() {
  const revenue = sales.reduce(
    (sum, sale) => sum + sale.revenue,
    0
  );

  const profit = sales.reduce(
    (sum, sale) => sum + sale.estimatedProfit,
    0
  );

  $("#metric-revenue").textContent = money(revenue);
  $("#metric-profit").textContent = money(profit);
  $("#metric-products").textContent = String(products.length);

  $("#product-count-pill").textContent =
    `${products.length} produk`;
}

// Menampilkan daftar produk.
function renderProducts() {
  const list = $("#products-list");

  if (products.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span>▧</span>
        <strong>Belum ada produk</strong>
        <p>Simpan produk pertama melalui formulir di atas.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = products.map((product) => `
    <article class="product-card">
      <div class="product-card-top">
        <h3>${escapeHtml(product.name)}</h3>

        <button
          type="button"
          class="delete-product"
          data-delete-product="${escapeHtml(product.id)}"
          title="Hapus produk"
        >×</button>
      </div>

      <p class="product-sub">
        ${product.yieldQty} unit per batch ·
        Biaya batch ${money(product.totalCost)}
      </p>

      <div class="product-values">
        <div class="product-value">
          <span>Biaya per unit</span>
          <strong>${money(product.unitCost)}</strong>
        </div>

        <div class="product-value price">
          <span>Harga jual saran</span>
          <strong>${money(product.suggestedPrice)}</strong>
        </div>
      </div>
    </article>
  `).join("");
}

// Mengisi pilihan produk untuk formulir penjualan.
function renderSaleOptions(selectedId = "") {
  if (products.length === 0) {
    saleProduct.innerHTML = `
      <option value="">Simpan produk terlebih dahulu</option>
    `;

    saleProduct.disabled = true;
    salePrice.value = "";
    salePrice.disabled = true;
    return;
  }

  saleProduct.disabled = false;
  salePrice.disabled = false;

  saleProduct.innerHTML =
    '<option value="">Pilih produk</option>' +
    products.map((product) => `
      <option value="${escapeHtml(product.id)}">
        ${escapeHtml(product.name)}
      </option>
    `).join("");

  if (selectedId && products.some(
    (product) => product.id === selectedId
  )) {
    saleProduct.value = selectedId;
  }

  updateSalePriceFromProduct();
}

// Mengisi harga saran ketika produk dipilih.
function updateSalePriceFromProduct() {
  const product = products.find(
    (item) => item.id === saleProduct.value
  );

  if (product) {
    salePrice.value = String(product.suggestedPrice);
  } else {
    salePrice.value = "";
  }
}

// Menampilkan tabel penjualan.
function renderSales() {
  const body = $("#sales-table-body");

  if (sales.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="6" class="table-empty">
          Belum ada penjualan yang dicatat.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML = [...sales].reverse().map((sale) => `
    <tr>
      <td>${escapeHtml(sale.dateLabel)}</td>
      <td><strong>${escapeHtml(sale.productName)}</strong></td>
      <td>${sale.quantity}</td>
      <td>${money(sale.revenue)}</td>
      <td><strong>${money(sale.estimatedProfit)}</strong></td>
      <td>
        <button
          class="delete-sale"
          type="button"
          data-delete-sale="${escapeHtml(sale.id)}"
          title="Hapus catatan"
        >×</button>
      </td>
    </tr>
  `).join("");
}

// Memperbarui semua komponen tampilan.
function renderAll(selectedProductId = "") {
  renderMetrics();
  renderProducts();
  renderSaleOptions(selectedProductId);
  renderSales();
}

// Tombol menambahkan baris biaya.
$("#add-cost").addEventListener("click", () => {
  addCostRow();
  updatePreview();
});

// Memperbarui kalkulasi saat pengguna mengubah input.
productForm.addEventListener("input", updatePreview);
costRows.addEventListener("input", updatePreview);

// Menyimpan produk baru.
productForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = $("#product-name").value.trim();
  const calculation = getCalculation();

  if (!name) {
    showMessage("Masukkan nama produk terlebih dahulu.", true);
    $("#product-name").focus();
    return;
  }

  if (calculation.totalCost <= 0) {
    showMessage(
      "Masukkan setidaknya satu biaya produksi lebih dari Rp0.",
      true
    );
    return;
  }

  const product = {
    id: createId(),
    name,
    yieldQty: calculation.yieldQty,
    marginPct: calculation.marginPct,
    costs: calculation.costs,
    totalCost: calculation.totalCost,
    unitCost: calculation.unitCost,
    suggestedPrice: calculation.suggestedPrice,
    createdAt: new Date().toISOString()
  };

  products.push(product);

  if (!saveData()) {
    products = products.filter(
      (item) => item.id !== product.id
    );
    return;
  }

  renderAll(product.id);

  showMessage(`Produk "${name}" berhasil disimpan.`);

  productForm.reset();

  $("#yield-qty").value = "20";
  $("#target-margin").value = "30";

  costRows.innerHTML = "";

  addCostRow("Bahan utama", "");
  addCostRow("Kemasan", "");

  updatePreview();
});

// Mengubah harga otomatis ketika produk dipilih.
saleProduct.addEventListener(
  "change",
  updateSalePriceFromProduct
);

// Menyimpan catatan penjualan.
saleForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const product = products.find(
    (item) => item.id === saleProduct.value
  );

  const quantity = Math.floor(
    numberFrom(saleQuantity, 0)
  );

  const price = numberFrom(salePrice, -1);

  if (!product) {
    alert("Pilih produk terlebih dahulu.");
    return;
  }

  if (quantity < 1) {
    alert("Jumlah terjual minimal 1.");
    return;
  }

  if (price < 0) {
    alert("Masukkan harga jual yang valid.");
    return;
  }

  const revenue = price * quantity;

  // Estimasi laba kotor berdasarkan biaya per unit.
  const estimatedProfit =
    (price - product.unitCost) * quantity;

  const date = new Date();

  const sale = {
    id: createId(),
    productId: product.id,
    productName: product.name,
    quantity,
    sellingPrice: price,
    unitCost: product.unitCost,
    revenue,
    estimatedProfit,
    date: date.toISOString(),
    dateLabel: new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(date)
  };

  sales.push(sale);

  if (!saveData()) {
    sales = sales.filter(
      (item) => item.id !== sale.id
    );
    return;
  }

  renderAll(product.id);
  saleQuantity.value = "1";
});

// Menghapus produk.
$("#products-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-product]");

  if (!button) return;

  const product = products.find(
    (item) => item.id === button.dataset.deleteProduct
  );

  if (!product) return;

  const confirmed = confirm(
    `Hapus produk "${product.name}"? Catatan penjualan lama tidak ikut dihapus.`
  );

  if (!confirmed) return;

  products = products.filter(
    (item) => item.id !== product.id
  );

  saveData();
  renderAll();
});

// Menghapus catatan penjualan.
$("#sales-table-body").addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-sale]");

  if (!button) return;

  const sale = sales.find(
    (item) => item.id === button.dataset.deleteSale
  );

  if (!sale) return;

  if (!confirm(`Hapus catatan penjualan ${sale.productName}?`)) {
    return;
  }

  sales = sales.filter(
    (item) => item.id !== sale.id
  );

  saveData();
  renderAll(sale.productId);
});

// Menyiapkan formulir pertama kali.
addCostRow("Bahan utama", "");
addCostRow("Kemasan", "");

updatePreview();
renderAll();