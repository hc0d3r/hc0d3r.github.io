---
layout: post
comments: true
title: "Usando ptrace ? Tenha cuidado"
---

se você usa ptrace em x68_64, pra verificar as system calls,
seja para restringir acesso ou simplesmente para enumerá-las, 
você deve levar em consideração que chamar uma system call por
int 0x80 ou por syscall tem efeitos diferentes, alguns programas
não levam isso em consideração e pode ser uma maneira de dar
bypass neles.

Um exemplo usando o famoso strace:

{% highlight asm %}
; test.asm

section .text
	global _start
_start:
	xor eax, eax
	xor ebx, ebx
	mov bl, 42 ; a vida, o universo, e tudo mais
	inc eax ; eax == 1 | sys_exit(32 bits) | sys_write(64 bits)

	int 0x80
{% endhighlight %}

{% highlight text %}
$ nasm -f elf64 test.asm 
$ ld -o test test.o 
$ strace ./test 
execve("./test", ["./test"], [/* 45 vars */]) = 0
write(0, NULL, 0 <unfinished ...>
+++ exited with 42 +++
{% endhighlight %}

ele verifica que o elf é x86_64, e ai cada syscall ele vai
printar como se fosse referente à 64 bits, o que não é verdade,
o programa so vai dar exit, mesmo assim ele vai printar como write.

Outro exemplo foi usando o programa maybe, envie um [issue](https://github.com/p-e-w/maybe/issues/35) pra lá,
mostrando como foi fácil dar bypass.

**Então como podemos verificar se a system call é chamada usando int 0x80 ou
syscall ?**

Depois de pensar um pouco, cheguei a conclusão que lendo a memoria, e verificando
os bytes codes:

{% highlight text %}
cd 80 == int 0x80
0f 05 == syscall
{% endhighlight %}

fiz uma implementação que verificar se
a chamada foi feita usando syscall ou int 0x80, ele pega o
rip e verifica a qual instrução os dois ultimos bytes, antes do rip, correspondem:

{% highlight c %}
/*
 fork from https://github.com/nelhage/ministrace/blob/for-blog/ministrace.c
*/

#include <sys/ptrace.h>
#include <sys/user.h>
#include <sys/reg.h>
#include <sys/types.h>
#include <sys/wait.h>

#include <signal.h>

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

int exec_prog(char **args){
	ptrace(PTRACE_TRACEME, 0L, 0L, 0L);
	kill(getpid(), SIGSTOP);
	return execv(args[0], args);
}

int do_syscall(pid_t child) {
	int status;
	while (1) {
		ptrace(PTRACE_SYSCALL, child, 0, 0);
		waitpid(child, &status, 0);
		if (WIFSTOPPED(status) && WSTOPSIG(status) & 0x80)
			return 0;
		if (WIFEXITED(status))
			return 1;
    }
}

int trace_calls(pid_t child){
	unsigned short last_bytes;
	int status;
	long rip, syscall_number;

	waitpid(child, &status, 0);
	ptrace(PTRACE_SETOPTIONS, child, 0, PTRACE_O_TRACESYSGOOD);

	while(1){
		if(do_syscall(child)){
			break;
		}

		syscall_number = ptrace(PTRACE_PEEKUSER, child, 8*ORIG_RAX);
		printf("syscall(%zd) --> ", syscall_number);

		rip = ptrace(PTRACE_PEEKUSER, child, sizeof(long)*RIP, NULL);
		last_bytes = (unsigned short)ptrace(PTRACE_PEEKDATA, child, rip-2, NULL);


		if(last_bytes == 0x80cd)
			printf("int 0x80\n");

		else if(last_bytes == 0x050f)
			printf("syscall\n");

		else
			printf("WTF...\n");


		if(do_syscall(child)){
			break;
		}

	}

	return 0;
}



int main(int argc, char **argv){

	if(argc < 2){
		printf("trace [prog] [args] ...\n");
		return 0;
	}


	pid_t child;


	child = fork();
	if(child == 0){
		return exec_prog(argv+1);
	} else {
		return trace_calls(child);
	}

}
{% endhighlight %}

Para testar criei um programa em asm:
{% highlight asm %}
; test-poc.asm

section .rodata
    write_sys db 'print using syscall',0xa
    write_sys_len equ $-write_sys
    write_int db 'print using int 0x80',0xa
    write_int_len equ $-write_int


section .text
    global _start
_start:
    xor r11, r11
    mov r11, 5

    loop:
        push r11

        call write_syscall
        call write_int_h80

        pop r11
        dec r11
        test r11, r11
    jnz loop

    ; exit

    xor eax, eax
    xor ebx, ebx
    inc eax
    int 0x80

write_syscall:
    mov rax, 1
    mov rdi, 2
    mov rsi, write_sys
    mov rdx, write_sys_len
    syscall
    ret

write_int_h80:
    mov eax, 4
    mov ebx, 2
    mov ecx, write_int
    mov edx, write_int_len
    int 0x80
    ret
{% endhighlight %}

testando:

{% highlight text %}
$ gcc trace.c -Wall -Wextra -o trace
$ nasm -f elf64 test-poc.asm 
$ ld -o test-poc test-poc.o
$ ./trace 
trace [prog] [args] ...
$ ./trace ./test-poc
syscall(59) --> syscall
syscall(1) --> syscall
print using syscall
syscall(4) --> int 0x80
print using int 0x80
syscall(1) --> syscall
print using syscall
syscall(4) --> int 0x80
print using int 0x80
syscall(1) --> syscall
print using syscall
syscall(4) --> int 0x80
print using int 0x80
syscall(1) --> syscall
print using syscall
syscall(4) --> int 0x80
print using int 0x80
syscall(1) --> syscall
print using syscall
syscall(4) --> int 0x80
print using int 0x80
syscall(1) --> int 0x80
{% endhighlight %}

