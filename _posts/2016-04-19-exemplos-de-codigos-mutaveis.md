---
layout: post
comments: true
title: "Exemplos de códigos mutáveis"
---

Primeiro precisamos do shellcode do código que iremos mudar, vamos modificar esse código, e durante a execução do programa as instruções desse código
serão mudadas para a versão original.
Criei uma função que não usa a libc, pra gerar um shellcode que não tenha problemas de linkagem ou de qualquer outro tipo.

{% highlight c %}
#include <asm/unistd_64.h>
#include <unistd.h>

void cript(void){
    char msg[]="-- codigos mutaveis --\n";
    asm volatile("syscall" :: "rax" (__NR_write), 
	"D" (STDOUT_FILENO), "S" (msg), "d" (sizeof(msg)-1)
	: "memory", "rcx", "r11" );
}
{% endhighlight %}

Compilando e pegando o shellcode:

{% highlight text %}
$ gcc -Wall -Wextra cript.c -c
$ objdump -d cript.o

cript.o:     file format elf64-x86-64


Disassembly of section .text:

0000000000000000 <cript>:
   0:	55                   	push   %rbp
   1:	48 89 e5             	mov    %rsp,%rbp
   4:	48 b8 2d 2d 20 63 6f 	movabs $0x6769646f63202d2d,%rax
   b:	64 69 67 
   e:	48 89 45 e0          	mov    %rax,-0x20(%rbp)
  12:	48 b8 6f 73 20 6d 75 	movabs $0x766174756d20736f,%rax
  19:	74 61 76 
  1c:	48 89 45 e8          	mov    %rax,-0x18(%rbp)
  20:	48 b8 65 69 73 20 2d 	movabs $0xa2d2d20736965,%rax
  27:	2d 0a 00 
  2a:	48 89 45 f0          	mov    %rax,-0x10(%rbp)
  2e:	b8 01 00 00 00       	mov    $0x1,%eax
  33:	bf 01 00 00 00       	mov    $0x1,%edi
  38:	48 8d 75 e0          	lea    -0x20(%rbp),%rsi
  3c:	ba 17 00 00 00       	mov    $0x17,%edx
  41:	0f 05                	syscall 
  43:	5d                   	pop    %rbp
  44:	c3                   	retq   
$ for i in $(objdump -d cript.o -M intel |grep "^ " |cut -f2); do echo -n '\x'$i; done;echo
\x55\x48\x89\xe5\x48\xb8\x2d\x2d\x20\x63\x6f\x64\x69\x67\x48\x89\x45\xe0\x48\xb8\x6f\x73\x20\x6d\x75\x74\x61\x76\x48\x89\x45\xe8\x48\xb8\x65\x69\x73\x20\x2d\x2d\x0a\x00\x48\x89\x45\xf0\xb8\x01\x00\x00\x00\xbf\x01\x00\x00\x00\x48\x8d\x75\xe0\xba\x17\x00\x00\x00\x0f\x05\x5d\xc3
{% endhighlight %}

testando o shellcode, pra ter certeza que funciona

inject-cript.c

{% highlight c %}
#include <stdio.h>

unsigned const char cript[]=
"\x55\x48\x89\xe5\x48\xb8\x2d\x2d\x20\x63"
"\x6f\x64\x69\x67\x48\x89\x45\xe0\x48\xb8"
"\x6f\x73\x20\x6d\x75\x74\x61\x76\x48\x89"
"\x45\xe8\x48\xb8\x65\x69\x73\x20\x2d\x2d"
"\x0a\x00\x48\x89\x45\xf0\xb8\x01\x00\x00"
"\x00\xbf\x01\x00\x00\x00\x48\x8d\x75\xe0"
"\xba\x17\x00\x00\x00\x0f\x05\x5d\xc3";

int main(void){
    asm("call cript");
    return 0;
}
{% endhighlight %}

{% highlight text %}
$ gcc inject-cript.c -Wall -Wextra
$ gcc inject-cript.c -Wall -Wextra -o inject-cript
$ ./inject-cript
-- codigos mutaveis --
{% endhighlight %}

pra codificar o shellcode vou usar xor, porque é bem simples de implementar.

{% highlight c %}
void xorcript(void *input, void *key, void *output, size_t input_size, size_t key_size){
    size_t i, j;
    char *out = output;

    for(i=0,j=0; i<input_size; i++,j++){
        if(j == key_size) j = 0;

        *out++ = (*(char *)(key+j))^(*(char *)(input+i));
    }

}
{% endhighlight %}

Gerando o shellcode encriptado>

{% highlight c %}
#include <stdio.h>

/* void xorcript(void *input, void *key, void *output, size_t input_size, size_t key_size) */

int main(void){

    unsigned char cript[]=
        "\x55\x48\x89\xe5\x48\xb8\x2d\x2d\x20\x63"
        "\x6f\x64\x69\x67\x48\x89\x45\xe0\x48\xb8"
        "\x6f\x73\x20\x6d\x75\x74\x61\x76\x48\x89"
        "\x45\xe8\x48\xb8\x65\x69\x73\x20\x2d\x2d"
        "\x0a\x00\x48\x89\x45\xf0\xb8\x01\x00\x00"
        "\x00\xbf\x01\x00\x00\x00\x48\x8d\x75\xe0"
        "\xba\x17\x00\x00\x00\x0f\x05\x5d\xc3";


    unsigned char sc[sizeof(cript)-1];
    unsigned char decript[sizeof(cript)-1];
    size_t i;


    xorcript(cript, "kamehameha", sc, sizeof(cript)-1, 10);


    printf("Encriptado -> ");
    for(i=0; i<sizeof(cript)-1;i++){
        printf("\\x%02x", sc[i]);
    }

    printf("\n\n");

    xorcript(sc, "kamehameha", decript, sizeof(cript)-1, 10);


    printf("Decriptado -> ");
    for(i=0; i<sizeof(cript)-1;i++){
        printf("\\x%02x", decript[i]);
    }
    printf("\n\n");

    return 0;

}
{% endhighlight %}

Executando:

{% highlight text %}
$ gcc -Wall -Wextra xor.c -o xor
$ ./xor
Encriptado -> \x3e\x29\xe4\x80\x20\xd9\x40\x48\x48\x02\x04\x05\x04\x02\x20\xe8\x28\x85\x20\xd9\x04\x12\x4d\x08\x1d\x15\x0c\x13\x20\xe8\x2e\x89\x25\xdd\x0d\x08\x1e\x45\x45\x4c\x61\x61\x25\xec\x2d\x91\xd5\x64\x68\x61\x6b\xde\x6c\x65\x68\x61\x25\xe8\x1d\x81\xd1\x76\x6d\x65\x68\x6e\x68\x38\xab

Decriptado -> \x55\x48\x89\xe5\x48\xb8\x2d\x2d\x20\x63\x6f\x64\x69\x67\x48\x89\x45\xe0\x48\xb8\x6f\x73\x20\x6d\x75\x74\x61\x76\x48\x89\x45\xe8\x48\xb8\x65\x69\x73\x20\x2d\x2d\x0a\x00\x48\x89\x45\xf0\xb8\x01\x00\x00\x00\xbf\x01\x00\x00\x00\x48\x8d\x75\xe0\xba\x17\x00\x00\x00\x0f\x05\x5d\xc3

{% endhighlight %}

Podem notar que o shellcode decriptado continua o mesmo, agora é so usar esse shellcode encriptado, decriptar, e injeta-lo, podemos fazer isso
usando a stack, alocando memoria usando mmap, abrindo o arquivo /proc/self/mem e modificando o código por la mesmo, usando mprotect e deixando a area
onde o shellcode esta como executavel, ou usando mprotect pra deixar a area onde o shellcode esta como editavel.

vamos aos exemplos:

## Usando a stack

{% highlight c %}
#include <stdio.h>

/* void xorcript(void *input, void *key, void *output, size_t input_size, size_t key_size) */

int main(void){
    unsigned char cript[]=
        "\x3e\x29\xe4\x80\x20\xd9\x40\x48"
        "\x48\x02\x04\x05\x04\x02\x20\xe8"
        "\x28\x85\x20\xd9\x04\x12\x4d\x08"
        "\x1d\x15\x0c\x13\x20\xe8\x2e\x89"
        "\x25\xdd\x0d\x08\x1e\x45\x45\x4c"
        "\x61\x61\x25\xec\x2d\x91\xd5\x64"
        "\x68\x61\x6b\xde\x6c\x65\x68\x61"
        "\x25\xe8\x1d\x81\xd1\x76\x6d\x65"
        "\x68\x6e\x68\x38\xab";


    unsigned char sc[sizeof(cript)-1];

    xorcript(cript, "kamehameha", sc, sizeof(cript)-1, 10);


    asm volatile("call *%0" :: "r" (sc));


    return 0;

}
{% endhighlight %}

pra desativar nx-bit que faz com q a stack não seja executavel (proteção contra buffer overflow) compilamos usando a opção -z execstack:

{% highlight text %}
$ gcc inject-stack.c 
$ ./a.out
Falha de segmentação (imagem do núcleo gravada)
$ gcc inject-stack.c -z execstack
$ ./a.out
-- codigos mutaveis --
{% endhighlight %}

Aproveitando a deixa, vamos voltar ao arquivo inject-cript.c para esclarecer alguns pontos, variaveis globais ou estaticas normalmente são armazenadas em sections, se forem
constantes são armazenadas na section .rodata, se não forem inicializadas ficam na section .bss caso contrario ficam na section .data, usando o objdump ou readelf podemos comprovar
isso olhando o arquivo compilado inject-cript:

{% highlight text %}
$ objdump -j .rodata -d inject-cript

inject-cript:     file format elf64-x86-64


Disassembly of section .rodata:

00000000004005c0 <_IO_stdin_used>:
  4005c0:	01 00 02 00 00 00 00 00                             ........

00000000004005c8 <__dso_handle>:
	...

0000000000400600 <cript>:
  400600:	55 48 89 e5 48 b8 2d 2d 20 63 6f 64 69 67 48 89     UH..H.-- codigH.
  400610:	45 e0 48 b8 6f 73 20 6d 75 74 61 76 48 89 45 e8     E.H.os mutavH.E.
  400620:	48 b8 65 69 73 20 2d 2d 0a 00 48 89 45 f0 b8 01     H.eis --..H.E...
  400630:	00 00 00 bf 01 00 00 00 48 8d 75 e0 ba 17 00 00     ........H.u.....
  400640:	00 0f 05 5d c3 00                                   ...]..
{% endhighlight %}

Agora usando o readelf, vamos ver que a section .rodata esta no segmento LOAD, que tem permissão de leitura e execução, e por isso o código é executado
sem dar erro e precisar de compilar usando -z execstack

{% highlight text %}
$ readelf -l inject-cript

Elf file type is EXEC (Executable file)
Entry point 0x400400
There are 9 program headers, starting at offset 64

Program Headers:
  Type           Offset             VirtAddr           PhysAddr
                 FileSiz            MemSiz              Flags  Align
  PHDR           0x0000000000000040 0x0000000000400040 0x0000000000400040
                 0x00000000000001f8 0x00000000000001f8  R E    8
  INTERP         0x0000000000000238 0x0000000000400238 0x0000000000400238
                 0x000000000000001c 0x000000000000001c  R      1
      [Requesting program interpreter: /lib64/ld-linux-x86-64.so.2]
  LOAD           0x0000000000000000 0x0000000000400000 0x0000000000400000
                 0x0000000000000774 0x0000000000000774  R E    200000
  LOAD           0x0000000000000e10 0x0000000000600e10 0x0000000000600e10
                 0x000000000000021c 0x0000000000000220  RW     200000
  DYNAMIC        0x0000000000000e28 0x0000000000600e28 0x0000000000600e28
                 0x00000000000001d0 0x00000000000001d0  RW     8
  NOTE           0x0000000000000254 0x0000000000400254 0x0000000000400254
                 0x0000000000000044 0x0000000000000044  R      4
  GNU_EH_FRAME   0x0000000000000648 0x0000000000400648 0x0000000000400648
                 0x0000000000000034 0x0000000000000034  R      4
  GNU_STACK      0x0000000000000000 0x0000000000000000 0x0000000000000000
                 0x0000000000000000 0x0000000000000000  RW     10
  GNU_RELRO      0x0000000000000e10 0x0000000000600e10 0x0000000000600e10
                 0x00000000000001f0 0x00000000000001f0  R      1

 Section to Segment mapping:
  Segment Sections...
   00     
   01     .interp 
   02     .interp .note.ABI-tag .note.gnu.build-id .gnu.hash .dynsym .dynstr .gnu.version .gnu.version_r .rela.dyn .rela.plt .init .plt .text .fini .rodata .eh_frame_hdr .eh_frame 
   03     .init_array .fini_array .jcr .dynamic .got .got.plt .data .bss 
   04     .dynamic 
   05     .note.ABI-tag .note.gnu.build-id 
   06     .eh_frame_hdr 
   07     
   08     .init_array .fini_array .jcr .dynamic .got 
{% endhighlight %}

## Usando mmap

talvez seja a forma mais bonita:

{% highlight c %}
#include <stdio.h>
#include <sys/mman.h>

/* void xorcript(void *input, void *key, void *output, size_t input_size, size_t key_size) */

int main(void){
    unsigned char cript[]=
        "\x3e\x29\xe4\x80\x20\xd9\x40\x48"
        "\x48\x02\x04\x05\x04\x02\x20\xe8"
        "\x28\x85\x20\xd9\x04\x12\x4d\x08"
        "\x1d\x15\x0c\x13\x20\xe8\x2e\x89"
        "\x25\xdd\x0d\x08\x1e\x45\x45\x4c"
        "\x61\x61\x25\xec\x2d\x91\xd5\x64"
        "\x68\x61\x6b\xde\x6c\x65\x68\x61"
        "\x25\xe8\x1d\x81\xd1\x76\x6d\x65"
        "\x68\x6e\x68\x38\xab";


    unsigned char *sc;


    sc = mmap(NULL, sizeof(cript)-1, PROT_EXEC|PROT_WRITE|PROT_READ, MAP_ANON|MAP_PRIVATE, -1, 0);

    if(sc != MAP_FAILED){
        xorcript(cript, "kamehameha", sc, sizeof(cript)-1, 10);
        asm volatile("call *%0" :: "r" (sc));
    }

    return 0;

}
{% endhighlight %}

{% highlight text %}
$ gcc inject-mmap.c -o inject-mmap -Wall -Wextra
$ ./inject-mmap 
-- codigos mutaveis --
{% endhighlight %}

## Usando mprotect

{% highlight c %}
#include <sys/mman.h>
#include <unistd.h>
#include <stdint.h>
#include <string.h>
#include <err.h>

/* void xorcript(void *input, void *key, void *output, size_t input_size, size_t key_size) */

unsigned const char cript[]=
    "\x3e\x29\xe4\x80\x20\xd9\x40\x48"
    "\x48\x02\x04\x05\x04\x02\x20\xe8"
    "\x28\x85\x20\xd9\x04\x12\x4d\x08"
    "\x1d\x15\x0c\x13\x20\xe8\x2e\x89"
    "\x25\xdd\x0d\x08\x1e\x45\x45\x4c"
    "\x61\x61\x25\xec\x2d\x91\xd5\x64"
    "\x68\x61\x6b\xde\x6c\x65\x68\x61"
    "\x25\xe8\x1d\x81\xd1\x76\x6d\x65"
    "\x68\x6e\x68\x38\xab";


int main(void){
    long pg_size = sysconf(_SC_PAGESIZE);
    unsigned char sc[sizeof(cript)-1];
    uintptr_t start, end;

    xorcript((void *)cript,  "kamehameha", sc, sizeof(cript)-1, 10);

    start = (uintptr_t)cript & -pg_size;
    end = (uintptr_t)cript + sizeof(cript) - start;

    if(mprotect((void *)start, end, PROT_READ|PROT_WRITE|PROT_EXEC)){
        err(1,"mprotect failed");
    }

    memcpy((void *)cript, sc, sizeof(sc));

    asm volatile("call cript");

    return 0;
}
{% endhighlight %}

{% highlight text %}
$ gcc inject-mprotect.c -Wall -Wextra -o inject-mprotect
$ ./inject-mprotect 
-- codigos mutaveis --
{% endhighlight %}


## Usando /proc/self/mem

Esse jeito de injetar tbm ficou bacana =D

{% highlight c %}
#include <sys/stat.h>
#include <sys/types.h>
#include <fcntl.h>
#include <err.h>
#include <unistd.h>

/* void xorcript(void *input, void *key, void *output, size_t input_size, size_t key_size) */

unsigned const char cript[]=
    "\x3e\x29\xe4\x80\x20\xd9\x40\x48"
    "\x48\x02\x04\x05\x04\x02\x20\xe8"
    "\x28\x85\x20\xd9\x04\x12\x4d\x08"
    "\x1d\x15\x0c\x13\x20\xe8\x2e\x89"
    "\x25\xdd\x0d\x08\x1e\x45\x45\x4c"
    "\x61\x61\x25\xec\x2d\x91\xd5\x64"
    "\x68\x61\x6b\xde\x6c\x65\x68\x61"
    "\x25\xe8\x1d\x81\xd1\x76\x6d\x65"
    "\x68\x6e\x68\x38\xab";


int main(void){
    unsigned char sc[sizeof(cript)-1];

    int fd = open("/proc/self/mem", O_RDWR);
    off_t addr;
    if(fd == -1){
        err(1,"failed to open /proc/self/mem");
    }

    addr = (off_t)cript;
    if( lseek(fd, addr, SEEK_SET) == (off_t) -1){
        err(1,"lseek() failed");
    }

    xorcript((void *)cript, "kamehameha", sc, sizeof(cript)-1, 10);

    write(fd, sc, sizeof(cript)-1);
    close(fd);

    asm volatile("call cript");


    return 0;
}
{% endhighlight %}

{% highlight text %}
$ gcc inject-proc-mem.c -o inject-proc-mem -Wall -Wextra
$ ./inject-proc-mem 
-- codigos mutaveis --
{% endhighlight %}

## Usando ptrace

{% highlight c %}
#include <sys/ptrace.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <stdio.h>
#include <unistd.h>
#include <signal.h>
#include <string.h>
#include <stdlib.h>


#define wordsize sizeof(long)

/* void xorcript(void *input, void *key, void *output, size_t input_size, size_t key_size) */

unsigned const char cript[]=
    "\x3e\x29\xe4\x80\x20\xd9\x40\x48"
    "\x48\x02\x04\x05\x04\x02\x20\xe8"
    "\x28\x85\x20\xd9\x04\x12\x4d\x08"
    "\x1d\x15\x0c\x13\x20\xe8\x2e\x89"
    "\x25\xdd\x0d\x08\x1e\x45\x45\x4c"
    "\x61\x61\x25\xec\x2d\x91\xd5\x64"
    "\x68\x61\x6b\xde\x6c\x65\x68\x61"
    "\x25\xe8\x1d\x81\xd1\x76\x6d\x65"
    "\x68\x6e\x68\x38\xab";

void ptrace_write(pid_t pid, long addr, const void *data, size_t len){
    size_t i;
    long word, old;
    int final_size;

    for(i=0; i<len; i+=wordsize){
        if((i+wordsize) > len){
            final_size = len-i;
            word = 0;

            memcpy(&word, data+i, final_size);
            old = ptrace(PTRACE_PEEKDATA, pid, addr+i, 0L);
            old &= (unsigned long)-1 << (8*final_size);
            word |= old;
            ptrace(PTRACE_POKEDATA, pid, addr+i, word);

        } else {
            word = *(long *)(data+i);
            ptrace(PTRACE_POKEDATA, pid, addr+i, word);
        }
    }

}

int main(void){
    unsigned char sc[sizeof(cript)-1];
    pid_t child;
    child = fork();

    if(child == 0){
        ptrace(PTRACE_TRACEME, 0L, 0L, 0L);
        kill(getpid(), SIGSTOP);

        asm volatile("call cript");
        exit(0);
    }

    waitpid(child, NULL, 0);
    xorcript((void *)cript, "kamehameha", sc, sizeof(cript)-1, 10);
    ptrace_write(child, (long)cript, sc, sizeof(cript)-1);

    return 0;
}
{% endhighlight %}

{% highlight text %}
$ gcc inject-ptrace.c -o inject-ptrace -Wall -Wextra
$ ./inject-ptrace
-- codigos mutaveis --
{% endhighlight %}


## Finish

Acho que depois de estudar (man elf) vou tentar criar um cripter, se a preguiça deixar eu acabo de fazer minha lib pra hack de jogos também, se alguem tiver alguma
duvida sobre os códigos, ou achar qualquer erro é so comentar ai, ou abrir um issue no github.

/quit .

