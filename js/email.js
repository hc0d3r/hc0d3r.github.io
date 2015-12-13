document.getElementById("show_email").onclick = function(e){
    var email='rrjijnwtx9:5Elrfnq3htr';
    var decrypt='';

    for(var i=0; i<email.length; i++){
        decrypt += String.fromCharCode( email.charCodeAt(i) - 5);
    }

    document.getElementById("protect-email").innerHTML = decrypt;


    return false;
}

