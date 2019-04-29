---
layout: post
title: Detectando debugger usando int3
---

# Detectando debugger usando int3

As técnicas descritas abaixo foram testadas no gdb 8.2.1, em outros debuggers elas
podem não funcionar, dependendo de como eles foram implementados.

Quando um breakpoint é setado em um determinado endereço,
o que o debugger faz é simplesmente substituir o opcode da instrução original por int3
(\xcc), quando a instrução int3 é executada um sinal é gerado (sigtrap),
o que faz o programa parar e retorna o controle do processo para o debugger.

Então, caso algum breakpoint seja setado, é possivel detectá-lo procurando por \xcc
na memória. Um exemplo:

```c
/* tentando evitar q 0xcc fique hardcoded no binario,
 * e falsos positivos aconteçam */
#include <stdio.h>

volatile unsigned char bp = '\xcc';

int main(void){
    size_t i;

    /* alinhando o endereço */
    unsigned char *ptr = (unsigned char *)((size_t)main & ~0xfffL);


    /* 0x1000 = tamanho minimo para um range de memoria */
    for(i = 0; i<0x1000; i++){
        if(ptr[i] == bp){
            printf("[detected] breakpoint at %p\n", ptr+i);
        }
    }


    return 0;
}
```

Testando:

```
$ ./a.out
$ gdb --nx -batch -ex 'b main' -ex 'r' -ex 'c' ./a.out
Breakpoint 1 at 0x113d

Breakpoint 1, 0x000055555555513d in main ()
[detected] breakpoint at 0x55555555513d
[Inferior 1 (process 3664) exited normally]
```

Dependendo do compilador falsos positivos podem acontecer, outra
coisa a se ressaltar é que o código acima não vai escanear toda a memória
executável atrás de breakpoints.

Para mitigar esse tipo de detecção você pode usar hardware breakpoint,
outro alternativa seria usar singlestep até chegar no endereço desejado,
o que poderia facilitar uma possível detecção usando rdtsc (analisando o delay gerado por executar uma instrução de cada vez).

Outra maneira pra se detectar debugger é usando o comportamento descrito no inicio do texto.
Utilizando int3 no código, quando a instrução for executada, o debugger vai pegar o sinal gerado,
mas ele não vai reinjetá-lo para a aplicação. Ai que está o pulo do bicho piruleta,
usando um signal handler podemos saber se estamos ou não em um debugger, veja o exemplo:

```c
#include <signal.h>
#include <stdio.h>

void handle(int sig){
    printf("debug off ...\n");
}

int main(void){
    signal(SIGTRAP, handle);
    asm("int3");

    return 0;
}
```

Testando:
```
$ ./a.out
debug off ...
$ gdb --nx -batch -ex 'r' -ex 'c' ./a.out

Program received signal SIGTRAP, Trace/breakpoint trap.
0x0000555555555179 in main ()
[Inferior 1 (process 3947) exited normally]
```

Essa técnica pode ser mitigada injetando o sinal usando o comando `signal SIGTRAP`,
logo depois do sigtrap ser retornado, nesse caso poderia ser usada em conjunto com rdtsc,
porque até o usuário digitar o comando vai levar algum tempo.
