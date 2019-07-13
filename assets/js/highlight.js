symbols = document.getElementsByClassName('n');
for(i = 0; i<symbols.length; i++){
    if(symbols[i].nextElementSibling.innerHTML == '('){
        symbols[i].style.color = 'greenyellow';
    }
}
