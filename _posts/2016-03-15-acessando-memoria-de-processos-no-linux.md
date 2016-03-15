---
layout: post
comments: true
title: "Acessando a memória de processos no linux"
---

Lendo a manpage do proc (**man 5 proc**) cheguei em uma parte interessante: **/proc/[pid]/maps**, esse arquivo contêm as regiões mapeadas na memoria e fornece informações como
endereço inicial e final, as permissões (**leitura**, **escrita**, **execução**, **[shared ou private]**),
o arquivo ou região que esta sendo mapeada (**[stack]**, **[heap]**, **/usr/lib64/libc-2.20.so**, etc),
e outras informações, pra ter um exemplo, vc pode executar:  
**cat /proc/self/maps**, lembrando que self é
um symlink para o pid atual:

{% highlight text %}
$ cat /proc/self/maps
00400000-0040b000 r-xp 00000000 fd:01 2097644                            /usr/bin/cat
0060b000-0060c000 r--p 0000b000 fd:01 2097644                            /usr/bin/cat
0060c000-0060d000 rw-p 0000c000 fd:01 2097644                            /usr/bin/cat
00c47000-00c68000 rw-p 00000000 00:00 0                                  [heap]
7f28a8ce5000-7f28af258000 r--p 00000000 fd:01 2107176                    /usr/lib/locale/locale-archive
7f28af258000-7f28af40b000 r-xp 00000000 fd:01 2104056                    /usr/lib64/libc-2.20.so
7f28af40b000-7f28af60b000 ---p 001b3000 fd:01 2104056                    /usr/lib64/libc-2.20.so
7f28af60b000-7f28af60f000 r--p 001b3000 fd:01 2104056                    /usr/lib64/libc-2.20.so
7f28af60f000-7f28af611000 rw-p 001b7000 fd:01 2104056                    /usr/lib64/libc-2.20.so
7f28af611000-7f28af615000 rw-p 00000000 00:00 0
7f28af615000-7f28af636000 r-xp 00000000 fd:01 2107170                    /usr/lib64/ld-2.20.so
7f28af805000-7f28af808000 rw-p 00000000 00:00 0
7f28af835000-7f28af836000 rw-p 00000000 00:00 0
7f28af836000-7f28af837000 r--p 00021000 fd:01 2107170                    /usr/lib64/ld-2.20.so
7f28af837000-7f28af838000 rw-p 00022000 fd:01 2107170                    /usr/lib64/ld-2.20.so
7f28af838000-7f28af839000 rw-p 00000000 00:00 0
7ffe5e03e000-7ffe5e05f000 rw-p 00000000 00:00 0                          [stack]
7ffe5e12b000-7ffe5e12d000 r--p 00000000 00:00 0                          [vvar]
7ffe5e12d000-7ffe5e12f000 r-xp 00000000 00:00 0                          [vdso]
ffffffffff600000-ffffffffff601000 r-xp 00000000 00:00 0                  [vsyscall]
{% endhighlight %}

com os ranges de endereços de memória podemos acessar a memória através do arquivo **/proc/[pid]/mem**, usando lseek ou fseek
para setar a posição do arquivo, que precisa ser um valor dentro do range dos endereços de memória obtido via **/proc/[pid]/maps**:  

Exemplo: 0040-0050, o offset deve ser um valor entre 0x40 e 0x50, suponhamos que você escolha o valor 0x45, então voce poderia ler, no máximo, 11 bytes (0x50 - 0x45).

## PoC Hour
<br/>
Para ler a memória de processos diferentes do seu processo principal é necessario usar **ptrace**.

Como exemplo fiz um código que é um loop infinito, a unica coisa que ele faz é chamar a syscall nanosleep:

{% highlight nasm %}
sys_nanosleep equ 35

section .text
    global _start
_start:
    mov rbp, rsp
    sub rsp, 32

    mov qword [rbp-32], 1
    mov qword [rbp-24], 0

    sleep:

    mov rax, sys_nanosleep
    lea rdi, [rbp-32]
    lea rsi, [rbp-16]
    syscall

    jmp sleep
{% endhighlight %}

Testando o codigo:

{% highlight nasm %}
$ nasm -f elf64 z.asm 
$ ld -o z z.o
$ strace ./z
execve("./z", ["./z"], [/* 45 vars */]) = 0
nanosleep({1, 0}, 0x7fffdf17c200)       = 0
nanosleep({1, 0}, 0x7fffdf17c200)       = 0
nanosleep({1, 0}, 0x7fffdf17c200)       = 0
nanosleep({1, 0}, 0x7fffdf17c200)       = 0
nanosleep({1, 0}, 0x7fffdf17c200)       = 0
nanosleep({1, 0}, ^CProcess 25238 detached
 <detached ...>
{% endhighlight %}

Funciona, agora como exemplo vamos rodar o programa, e dumpar o conteudo da stack.

{% highlight nasm %}
$ HELLO=WORLD ./z &
[1] 27807
$ cat /proc/27807/maps
00400000-00401000 r-xp 00000000 00:24 304561                             /tmp/z
7ffda6bd1000-7ffda6bf2000 rwxp 00000000 00:00 0                          [stack]
7ffda6bf4000-7ffda6bf6000 r--p 00000000 00:00 0                          [vvar]
7ffda6bf6000-7ffda6bf8000 r-xp 00000000 00:00 0                          [vdso]
ffffffffff600000-ffffffffff601000 r-xp 00000000 00:00 0                  [vsyscall]
{% endhighlight %}

O endereço onde a stack esta mapeada é 7ffda6bd1000-7ffda6bf2000, agora com um código estático vou dumpar o conteúdo, se tudo der certo
vai ser possível ver a variavel de ambiente 'HELLO' que passamos pela linha de comando:


{% highlight c %}
#include <sys/ptrace.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <fcntl.h>
#include <unistd.h>
#include <stdlib.h>

int main(void){
	char *buf;
	int fd, size;

	ptrace(PTRACE_ATTACH, 27807, NULL, NULL);
	waitpid(27807, NULL, 0);

	fd = open("/proc/27807/mem", O_RDONLY);
	lseek(fd, 0x7ffda6bd1000, SEEK_SET);

	buf = malloc(135168);

	size = read(fd, buf, 135168);

	ptrace(PTRACE_DETACH, 27807, NULL, NULL);

	write(1, buf, size);

	free(buf);

	return 0;	

}

{% endhighlight %}

Lembrando que o código acima é so um PoC mesmo, não verifico nada pq sou preguiço demais pra isso. 
Executando:

{% highlight text %}
$ gcc p0c.c -Wall -Wextra
$ ./a.out | hexdump -C | grep 'HELLO'
000203d0  7a 00 48 45 4c 4c 4f 3d  57 4f 52 4c 44 00 58 44  |z.HELLO=WORLD.XD|
{% endhighlight %}

E a variavel de ambiente que passei por linha de comando apareceu, consegui acessar a memoria de outro processo !!!

Pra terminar deixei a preguiça de lado e fiz um codigo pra dumpar a memoria de processos> [memdump.c](https://github.com/hc0d3r/C/blob/master/memdump.c)

Exemplo de como usar:
{% highlight text %}
$ gcc memdump.c -o memdump -Wall -Wextra -g
$ HELLO=s sleep 500 &
[2] 23153
$ ./memdump 23153 '[stack]' | hexdump -C | grep 'HELLO'
00020390  48 45 4c 4c 4f 3d 73 00  58 44 47 5f 56 54 4e 52  |HELLO=s.XDG_VTNR|
$ ./memdump self '[stack]' | strings | grep self
/proc/self/mem
self
$ ./memdump self '[stack]' | strings | grep stack
[stack]
{% endhighlight %}


## Referências
<br/>
[1] kernel - How do I read from /proc/$pid/mem under Linux? - Unix & Linux Stack Exchange (Acessado em Março/2016)<br/>
<http://unix.stackexchange.com/questions/6301/how-do-i-read-from-proc-pid-mem-under-linux>
[2] proc(5): process info pseudo-file system - Linux man page (Acessado em Março/2016)  
<http://linux.die.net/man/5/proc>  

