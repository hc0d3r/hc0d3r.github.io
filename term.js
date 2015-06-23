// burn it

var sh = document.getElementById("sh");
sh.innerHTML = ps1();

function ps1(){
 var ps = "mmxm<font color='yellow'>@</font><font color='white'>hc0d3r</font> % ";
 return ps;
}

function check_key(x){
 if(x.keyCode == 13)
  command();
 return true;
}

function dir_exist(dir_name){
 for(var i=0; i < dirs.length; i++)
  if(dirs[i] == dir_name)
    return true;

 return false;
}

function cat(y, filename){
 for(var i = 0; i < file_list.length; i++){
  if(file_list[i][0] == pwd && !file_list[i][1] && file_list[i][2] == filename){
   y.innerHTML += file_list[i][4];
    if(file_list[i][5] != ""){
     window.open(file_list[i][5], '_blank');
    }
  }
 }
}

function cd(y, path){
 if(path == "~"){
  pwd = '/home/mmxm';
  return;
 } else if(path == "/"){
                y.innerHTML += "permission denied<br/>";
                return;
        } else if(path == ".."){
                if(pwd == "/home/mmxm"){
                        y.innerHTML += "permission denied<br/>";
                } else {
                        var arr = pwd.split("/");
                        arr.splice(-1, 1);
                        pwd = arr.join("/");
                }
                return;
        }

        path = path.replace(/\/$/, "");

        var patt = /^\//;

        if(!patt.test(path)){
                path = pwd + '/'+path;
        }

        if(dir_exist(path)){
                pwd = path;
        }

}

function ls(y){
        for(var i = 0; i < file_list.length; i++) {
                if(file_list[i][0] == pwd){
                        if(file_list[i][1] == 1)
                                y.innerHTML += "d";
                        else
                                y.innerHTML += "-";

                        y.innerHTML += "r--r--r--   ";
                        y.innerHTML += "mmxm mmxm ";
                        y.innerHTML += file_list[i][3]+" ";
                        y.innerHTML += file_list[i][2]+"<br/>";
                }
        }

}

function command(){
        var x = document.getElementsByName("term")[0].value;
        var y = document.getElementById("xterm");

        x = x.replace(/</g, "&#60;");
        x = x.replace(/>/g, "&#62;");

        var cmd = x.split(" ");

        y.innerHTML += x + "<br/>";

        if(x == "whoami"){
                y.innerHTML += "Name: MMxM<br/>Age: 540y<br/>profissão: ...<br/>Twitter: @hc0d3r<br/>";
        }

	else if(x == "clear"){
                y.innerHTML = "";
        }

	else if(x == "tree"){
		y.innerHTML += "oi<br/>";
	}

        else if(x == "help"){
                y.innerHTML += "available commands: ls, tree, cat, pwd, cd, whoami, id, exit<br/>";
        }

        else if(x == "pwd"){
                y.innerHTML += pwd+"<br/>";
        }

        else if(x == "id"){
                y.innerHTML += "uid=1000(mmxm) gid=1000(mmxm) groups=1000(mmxm)<br/>";
        }

        else if(x == "exit"){
                window.location='http://thatsthefinger.com/';
        }

        else if(cmd[0] == "ls"){
                ls(y);
        }

        else if(cmd[0] == "cd"){
                if(cmd[1] !== undefined)
                        cd(y, cmd[1]);
        }

        else if(cmd[0] == "cat"){
                if(cmd[1] !== undefined)
                        cat(y, cmd[1]);
        }

        else if(x == ""){

        }

        else {
                y.innerHTML += "unknown command: "+x+"<br/>";
        }

        y.innerHTML += "<div id=\"sh\">"+ps1()+"</div>";
        document.getElementsByName("term")[0].value = '';

        window.scrollTo(0,document.body.scrollHeight);

 return true;
}


