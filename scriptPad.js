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

  const descTd = document.createElement("td");
  descTd.textContent = item.desc;

  const amountTd = document.createElement("td");
  amountTd.textContent = `R$ ${item.amount}`;

  const typeTd = document.createElement("td");
  typeTd.classList.add("columnType");

  const typeIcon = document.createElement("i");
  typeIcon.classList.add(
    "bx",
    item.type === "Entrada"
      ? "bxs-chevron-up-circle"
      : "bxs-chevron-down-circle"
  );
  typeTd.appendChild(typeIcon);

  const actionTd = document.createElement("td");
  actionTd.classList.add("columnAction");

  const button = document.createElement("button");
  button.addEventListener("click", () => deleteItem(index));

  const trashIcon = document.createElement("i");
  trashIcon.classList.add("bx", "bx-trash");
  button.appendChild(trashIcon);
  actionTd.appendChild(button);

  tr.append(descTd, amountTd, typeTd, actionTd);

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