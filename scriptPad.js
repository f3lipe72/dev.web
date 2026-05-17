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
  let tr = document.createElement("tr");

  const tdDesc = document.createElement("td");
  tdDesc.textContent = item.desc;

  const tdAmount = document.createElement("td");
  tdAmount.textContent = `R$ ${item.amount}`;

  const tdType = document.createElement("td");
  tdType.classList.add("columnType");

  const typeIcon = document.createElement("i");
  typeIcon.classList.add(
    "bx",
    item.type === "Entrada"
      ? "bxs-chevron-up-circle"
      : "bxs-chevron-down-circle"
  );
  tdType.appendChild(typeIcon);

  const tdAction = document.createElement("td");
  tdAction.classList.add("columnAction");

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.onclick = () => deleteItem(index);

  const deleteIcon = document.createElement("i");
  deleteIcon.classList.add("bx", "bx-trash");
  deleteButton.appendChild(deleteIcon);
  tdAction.appendChild(deleteButton);

  tr.append(tdDesc, tdAmount, tdType, tdAction);

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

  incomes.textContent = totalIncomes;
  expenses.textContent = totalExpenses;
  total.textContent = totalItems;
}

const getItensBD = () => JSON.parse(localStorage.getItem("db_items")) ?? [];
const setItensBD = () =>
  localStorage.setItem("db_items", JSON.stringify(items));

loadItens();