function logar() {
    let usuario = document.getElementById("usuario").value;
    let senha = document.getElementById("senha").value;

    if (usuario == "admin" && senha == "moises123") {
        alert('certo');
        location.href = "padaria.html";
    } else if (usuario == "moises" && senha == "matheus") {
        location.href = "padaria.html";
    } else {
        alert('LOGIN INVALIDO!!');
    }
}
