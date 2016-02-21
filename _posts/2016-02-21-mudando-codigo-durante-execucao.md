---
layout: post
comments: true
title: "Mudando código durante execução"
---

Mudar uma instrução asm durante a execução de um programa não é algo tão complicado
se utilizarmos o gdb, para mudar você precisa do endereço onde esta a instrução que sera substituida, e do bytecode da nova instrução, com isso em mãos basta usar o comando set:


{% highlight sh %}
(gdb) b *0x400084
Breakpoint 1 at 0x400084
(gdb) r
Starting program: /tmp/z 

Breakpoint 1, 0x0000000000400084 in _start ()
(gdb) disas /r _start
Dump of assembler code for function _start:
   0x0000000000400080 <+0>:	66 b8 66 55	mov    $0x5566,%ax
=> 0x0000000000400084 <+4>:	90	nop
End of assembler dump.
(gdb) set *0x400080=0x90909090
(gdb) disas /r _start
Dump of assembler code for function _start:
   0x0000000000400080 <+0>:	90	nop
   0x0000000000400081 <+1>:	90	nop
   0x0000000000400082 <+2>:	90	nop
   0x0000000000400083 <+3>:	90	nop
=> 0x0000000000400084 <+4>:	90	nop
End of assembler dump.
{% endhighlight %}

O tamanho dos bytes-codes tem q ser especificado se forem menor que 4, porque o gdb vai completar com zeros, ex: 1 bytes (char), 2 bytes (short):

{% highlight sh %}
(gdb) disas /r _start
Dump of assembler code for function _start:
   0x0000000000400080 <+0>:	b8 ff ff ff ff	mov    $0xffffffff,%eax
=> 0x0000000000400085 <+5>:	90	nop
End of assembler dump.
(gdb) set *0x400081=0x55
(gdb) disas /r _start
Dump of assembler code for function _start:
   0x0000000000400080 <+0>:	b8 55 00 00 00	mov    $0x55,%eax
=> 0x0000000000400085 <+5>:	90	nop
End of assembler dump.
{% endhighlight %}

ele muda o primeiro ff pra 55, mas tbm sobrescrever os outros ff com 00, agora especificando o tamanho isso não vai acontecer:

{% highlight sh %}
(gdb) disas /r _start
Dump of assembler code for function _start:
   0x0000000000400080 <+0>:	b8 ff ff ff ff	mov    $0xffffffff,%eax
=> 0x0000000000400085 <+5>:	90	nop
End of assembler dump.
(gdb) set *(char *)0x400081=0x55
(gdb) disas /r _start
Dump of assembler code for function _start:
   0x0000000000400080 <+0>:	b8 55 ff ff ff	mov    $0xffffff55,%eax
=> 0x0000000000400085 <+5>:	90	nop
End of assembler dump.
{% endhighlight %}

Outra coisa que você tem que prestar atenção é quando ta alterando mais de um bytecode de uma vez só, você tem que alterar a ordem, exe:
O codigo> [66 b8 ff ff] correspode a (mov ax,0xffff), para mudar a instrução, por exemplo, para [66 bb fe ca] (mov bx,0xcafe), o comando seria:

set *0x400080=0xcafebb66 --> certo  
set *0x400080=0x66bbfeca --> errado

Proof>
{% highlight sh %}
(gdb) set *0x400080=0xcafebb66
(gdb) disas /r _start
Dump of assembler code for function _start:
   0x0000000000400080 <+0>:	66 bb fe ca	mov    $0xcafe,%bx
=> 0x0000000000400084 <+4>:	90	nop
End of assembler dump.
(gdb) set *0x400080=0x66bbfeca
(gdb) disas /r _start
Dump of assembler code for function _start:
   0x0000000000400080 <+0>:	ca fe bb	lret   $0xbbfe
   0x0000000000400083 <+3>:	66 90	xchg   %ax,%ax
End of assembler dump.
{% endhighlight %}

Pra terminar fiz um script pra usar como demo:

{% highlight nasm %}

sys_write equ 1
sys_nanosleep equ 35
sys_exit equ 60

stdout equ 1

section .rodata
	loop_msg db 'loop infinito, não posso sair daqui !!!',0xa
	loop_msg_len equ $-loop_msg

	out_msg db 'por essa voce nao esperava !@#$!¿¡!?',0xa
	out_msg_len equ $-out_msg

section .text
	global _start
_start:
	mov rbp, rsp
	sub rsp, 32 ;

	mov qword [rbp-32], 1
	mov qword [rbp-24], 0

infinite:

	mov rax, sys_write
	mov rdi, stdout
	mov rsi, loop_msg
	mov rdx, loop_msg_len
	syscall

	mov rax, 35
	lea rdi, [rbp-32]
	lea rsi, [rbp-16]
	syscall

	jmp infinite

out:

	mov rax, sys_write
	mov rdi, stdout
	mov rsi, out_msg
	mov rdx, out_msg_len
	syscall

	mov rax, sys_exit
	xor rdi, rdi
	syscall
{% endhighlight %}

<script type="text/javascript" src="https://asciinema.org/a/36972.js" id="asciicast-36972" async></script>
