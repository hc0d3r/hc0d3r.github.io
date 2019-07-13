document.addEventListener("DOMContentLoaded", function(xd){
  n = document.getElementById("night");
  n.addEventListener("change", cb);

  checked = localStorage.getItem("n");
  n.checked = checked;

  if(checked){
    change(1);
  }

  symbols = document.getElementsByClassName('n');
  for(i = 0; i<symbols.length; i++){
      if(symbols[i].nextElementSibling.innerHTML == '('){
          symbols[i].style.color = 'greenyellow';
      }
  }
});

function cb(){
  n = document.getElementById("night");
  if(n.checked){
    localStorage.setItem("n", true);
    change(1);
  } else {
    localStorage.clear("n");
    change(0);
  }
}

function change(opt){
  if(opt)
    s = {bg: '#303030', color: 'white', class: 'nlink'};
  else
    s = {bg: '#fafbfc', color: 'black', class: ''};

  document.body.style.backgroundColor = s.bg;
  document.body.style.color = s.color;
  aList = document.getElementsByTagName("a");
  for(i=0; i<aList.length; i++){
    x = aList[i];
    x.className = s.class;
  }
}
