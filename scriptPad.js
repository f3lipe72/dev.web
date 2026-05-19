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
  const descTd = document.createElement("td");
  const amountTd = document.createElement("td");
  const typeTd = document.createElement("td");
  const actionTd = document.createElement("td");
  const typeIcon = document.createElement("i");
  const button = document.createElement("button");
  const deleteIcon = document.createElement("i");

  descTd.textContent = item.desc;
  amountTd.textContent = `R$ ${item.amount}`;

  typeTd.className = "columnType";
  typeIcon.className =
    item.type === "Entrada"
      ? "bx bxs-chevron-up-circle"
      : "bx bxs-chevron-down-circle";
  typeTd.appendChild(typeIcon);

  actionTd.className = "columnAction";
  deleteIcon.className = "bx bx-trash";
  button.addEventListener("click", () => deleteItem(index));
  button.appendChild(deleteIcon);
  actionTd.appendChild(button);

  tr.appendChild(descTd);
  tr.appendChild(amountTd);
  tr.appendChild(typeTd);
  tr.appendChild(actionTd);

  tbody.appendChild(tr);
}

function loadItens() {
  items = getItensBD();
  tbody.innerHTML = "";
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

  incomes.innerHTML = totalIncomes;
  expenses.innerHTML = totalExpenses;
  total.innerHTML = totalItems;
}

const getItensBD = () => JSON.parse(localStorage.getItem("db_items")) ?? [];
const setItensBD = () =>
  localStorage.setItem("db_items", JSON.stringify(items));

loadItens();