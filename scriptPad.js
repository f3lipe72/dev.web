const tbody = document.querySelector("tbody");
const descItem = document.querySelector("#desc");
const amount = document.querySelector("#amount");
const type = document.querySelector("#type");
const btnNew = document.querySelector("#btnNew");

const incomes = document.querySelector(".incomes");
const expenses = document.querySelector(".expenses");
const total = document.querySelector(".total");

let items;

btnNew.onclick = () => {
  if (descItem.value === "" || amount.value === "" || type.value === "") {
    return alert("Preencha todos os campos!");
  }

  items.push({
    desc: descItem.value,
    amount: Math.abs(amount.value).toFixed(2),
    type: type.value,
  });

  setItensBD();

  loadItens();

  descItem.value = "";
  amount.value = "";
};

function deleteItem(index) {
  items.splice(index, 1);
  setItensBD();
  loadItens();
}

function insertItem(item, index) {
  const tr = document.createElement("tr");
  const desc = document.createElement("td");
  const value = document.createElement("td");
  const itemType = document.createElement("td");
  const action = document.createElement("td");
  const typeIcon = document.createElement("i");
  const deleteButton = document.createElement("button");
  const deleteIcon = document.createElement("i");

  desc.textContent = item.desc;
  value.textContent = `R$ ${item.amount}`;

  itemType.className = "columnType";
  typeIcon.className =
    item.type === "Entrada"
      ? "bx bxs-chevron-up-circle"
      : "bx bxs-chevron-down-circle";
  itemType.appendChild(typeIcon);

  action.className = "columnAction";
  deleteIcon.className = "bx bx-trash";
  deleteButton.addEventListener("click", () => deleteItem(index));
  deleteButton.appendChild(deleteIcon);
  action.appendChild(deleteButton);

  tr.appendChild(desc);
  tr.appendChild(value);
  tr.appendChild(itemType);
  tr.appendChild(action);

  tbody.appendChild(tr);
}

function loadItens() {
  items = getItensBD();
  tbody.textContent = "";
  items.forEach((item, index) => {
    insertItem(item, index);
  });

  getTotals();
}

function getTotals() {
  const amountIncomes = items
    .filter((item) => item.type === "Entrada")
    .map((transaction) => Number(transaction.amount));

  const amountExpenses = items
    .filter((item) => item.type === "Saída")
    .map((transaction) => Number(transaction.amount));

  const totalIncomes = amountIncomes
    .reduce((acc, cur) => acc + cur, 0)
    .toFixed(2);

  const totalExpenses = Math.abs(
    amountExpenses.reduce((acc, cur) => acc + cur, 0)
  ).toFixed(2);

  const totalItems = (totalIncomes - totalExpenses).toFixed(2);

  incomes.textContent = totalIncomes;
  expenses.textContent = totalExpenses;
  total.textContent = totalItems;
}

const getItensBD = () => JSON.parse(localStorage.getItem("db_items")) ?? [];
const setItensBD = () =>
  localStorage.setItem("db_items", JSON.stringify(items));

loadItens();