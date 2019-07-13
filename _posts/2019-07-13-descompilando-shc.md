---
layout: post
title: Descompilando binários gerados pelo SHC
---

# Descompilando binários gerados pelo SHC

Você conhece o SHC (https://github.com/neurobin/shc) ? Até a alguns dias
atrás eu nunca tinha ouvido falar disso, mas ai uma pessoa, em um grupo de
shell-script no telegram, apareceu pedindo ajuda para descompilar um binário
que foi gerado usando essa tool, e eu, como bom ~~desempregado~~ samaritano que
sou, fui ver qual era a desse SHC.

## Como o SHC funciona ?

O programa funciona de maneira bem simples, ele encripta o script usando RC4, e
gera um arquivo .c com o conteúdo encriptado hardcoded e algumas técnicas
anti-debugging. Esse arquivo depois é compilado, o que gera o binário, que ao
ser executado desencripta o script, que por fim, é passado via linha de comando
para o bash (bash -c decoded-script).

A tool tem varias opções, mas as que realmente importam são apenas duas,
-H (hardening) e -U (untraceble), que são responsáveis por ativar as proteções
anti-debugging. Apesar de algumas operações serem redundates, optei por criar o
binário, que será usado como exemplo, usando ambas: ```shc -UHf script.sh```.

### Mecanismos anti-debugging

Inicialmente, o programa usa a função prctl duas vezes, a primeira chamando
```prctl(PR_SET_DUMPABLE, 0)```, que tem como um dos efeitos impedir que o
processo seja debugado (**PTRACE_ATTACH**). E a segunda chamando
```prctl(PR_SET_PTRACER, -1)```, que ignora possíveis restrições em
*/proc/sys/kernel/yama/ptrace_scope*, e permite que uma child desse processo
possa controlá-lo.

Continuando a execução, é checado se o *ppid* (parent pid), isto é, o pid que
criou o pid em que o binário está rodando, está em uma whitelist de programas
permitidos, que contém bash, sh, sudo, entre outros. Isto é feito obtendo o
*ppid* através da função ```getppid()```, e depois lendo o arquivo
*/proc/[ppid]/cmdline*.

Depois disso, o programa cria uma child e através dela verifica se pode
controlar o pid principal (**PTRACE_ATTACH**).

Passando essa etapa, ele começa o processo de desencriptação, e após a conclusão
dessa fase vem as duas últimas técnicas anti-debugging.

Um arquivo .c é criado em */tmp/shc_x.c*, esse arquivo é compilado, gerando um
DSO em */tmp/shc_x.so*. A função dele é hookar a função main e sobrescrever os
parâmetros que foram passados via linha de comando, evitando assim que eles
sejam acessíveis via */proc/[pid]/cmdline*. Esse DSO é injetado usando
**LD_PRELOAD**.

E para finalizar, **PTRACE_TRACEME** é usado para checar se o processo está sendo
debugado ou não.

## Descompilando

Sabendo o funcionamento do programa, uma maneira fácil de se obter o script
original seria interceptar a system call que executa programas (execve) e printar
os argumentos, já que o script inteiro é passado via linha de comando. Isso
pode ser feito usando o gdb, radare2, ou algum outro debugger, mas eu vi que era
a oportunidade perfeita para brincar um pouco com a **libspyderhook**, que foi feita
justamente para manipular system calls. Mas primeiro é necessário burlar a
whitelist de programas.

### Fakeproc

Criar um fakeproc é bastante simples, pelo menos se */proc/[pid]/cmdline* estiver
sendo usado para obter o nome do processo, que é o caso, você só precisa
alterar o primeiro argumento para o nome desejado:

```c
int main(int argc, char **argv, char **envp){

    /* re-executa o programa se o primeiro argumento
     * for diferente de /bin/bash */
    if(strcmp(argv[0], "/bin/bash")){
        char *exe = argv[0];
        argv[0] = "/bin/bash";
        execve(exe, argv, envp);

        /* encerra o programa, se execve falhar */
        return 1;
    }

    // ...
```
E.\.. Voilà! Problema resolvido.

### Manipulando as system calls

Agora vem a parte que realmente importa, depois de toda essa enrolação.\..

A **libspyderhook** funciona de uma maneira bem simples, ela intercepta as system
calls em userland usando ptrace, e passa o controle para uma callback em duas
situações distintas, a primeira antes da system call ser de fato executada,
e a segunda quando a system call já foi executada. Através do status code
retornado pela callback a lib decide o que fazer, continuar a execução,
não executar a syscall, matar o pid, etc. Além disso, ela conta com algumas funções
para facilitar a manipulação dos parâmetros, sendo possível alterar
completamente a syscall que será executada, ou o seu retorno.

Só existem duas system calls que realmente serão um problema na hora de debuggar
o programa, prctl e ptrace. A prctl não pode ser executada, e a ptrace precisa
ter o resultado alterado para 0 (Success). Sendo assim duas callbacks serão
necessárias.

Dando bypass no prctl:

```c
int syscall_enter(pidinfo_t *info, unsigned long nr, void *data){
    /* faz a lib 'pular' a syscall */
    if(nr == SYS_prctl){
        return SH_SKIP_SYSCALL;
    }

    /* printa os parametros da syscall execve */
    if(nr == SYS_execve){
        print_execve(info->pid);
    }

    return SH_CONTINUE;
}
```

Alterando o resultado da syscall ptrace:

```c
int syscall_result(pidinfo_t *info, unsigned long nr, void *data){
    if(nr == SYS_ptrace){
        /* altera o resultado da syscall ptrace
         * que no SHC é usada para detectar se
         * o processo está sendo debugado */
        sh_setreg(info->pid, SH_SYSCALL_RESULT, 0);
    }

    return SH_CONTINUE;
}
```

A configuração da lib fica da seguinte forma:

```c
#include <spyderhook.h>
// ...

int main(int argc,char **argv, char **envp){
    spyderhook_t *sh;

    // ...

    sh = sh_init();
    if(sh == NULL){
        die("sh_init()");
        return 1;
    }

    sh_setopt(sh, SHOPT_FILENAME, argv[1]);
    sh_setopt(sh, SHOPT_ARGV, argv+1);
    sh_setopt(sh, SHOPT_ENVP, envp);
    sh_setopt(sh, SHOPT_ENTER_CALLBACK, syscall_enter);
    sh_setopt(sh, SHOPT_RESULT_CALLBACK, syscall_result);
    sh_setopt(sh, SHOPT_FOLLOW_ALL, 1);

    if((err = sh_mainloop(sh)) != SH_SUCCESS){
        printf("error => %s\n", sh_strerror(err));
    }

    sh_free(sh);

    // ...

```

Bem autoexplicativo, apesar da lib ainda não ter documentação, com esses
exemplos, e lendo os comentários no header, fica fácil usar.

Por último, mas não menos importante, na função *print_execve*, eu uso a
**libignotum**, para facilitar a leitura da memória:

```c
#include <ignotum.h>
// ...

void print_execve(pid_t pid){
    long exe, args, addr;
    size_t len;
    int i = 0;

    char *string;

    /* pega os endereços de memória */
    exe = sh_getreg(pid, SH_FIRST_ARG);

    /* read_until_zero usa a libignotum */
    string = read_until_zero(pid, exe, &len);
    printf("\n[*] cmd = %s\n", string);
    free(string);

    if(wantcontinue()){
        return;
    }

    args = sh_getreg(pid, SH_SECOND_ARG);

    while(1){
        addr = 0;

        /* addr = *remote_argv */
        ignotum_mem_read(pid, &addr, sizeof(long), args);
        if(addr == 0)
            break;

        printf("ARG[%d]:\n", i++);

        /* printf("%s\n", addr); */
        string = read_until_zero(pid, addr, &len);
        hexdump(string, len);
        free(string);

        /* remote_argv++ */
        args += sizeof(long);
    }
}
```

O código completo está nesse [link](https://gist.github.com/hc0d3r/318b0aa0ae4697372688b624cecbd610).

### Compilando o descompilador

Esses são os comandos para compilar o código:

```
git clone https://gist.github.com/hc0d3r/318b0aa0ae4697372688b624cecbd610 unshc
cd unshc
git clone https://github.com/hc0d3r/spyderhook
git clone https://github.com/hc0d3r/ignotum
make -C spyderhook
make -C ignotum
gcc unshc.c -o unshc -Iignotum/src -Ispyderhook/src \
 ignotum/lib/libignotum.a spyderhook/lib/libspyderhook.a
```

### Testando

```
$ shc -UHf script.sh
$ ./script.sh.x
./script.sh.x: Operation not permitted
Morto
$ sudo ./script.sh.x
nothing to view here
$ ./unshc ./script.sh.x
$ ./unshc ./script.sh.x

[*] cmd = ./script.sh.x
>> printar os parametros (s/n) ? s
ARG[0]:
00000000  2e 2f 73 63 72 69 70 74  2e 73 68 2e 78 00        |./script.sh.x.|
0000000e

[*] cmd = /bin/bash
>> printar os parametros (s/n) ? s
ARG[0]:
00000000  2e 2f 73 63 72 69 70 74  2e 73 68 2e 78 00        |./script.sh.x.|
0000000e
ARG[1]:
00000000  2d 63 00                                          |-c.|
00000003
ARG[2]:
00000000  65 78 65 63 20 27 2e 2f  73 63 72 69 70 74 2e 73  |exec './script.s|
00000010  68 2e 78 27 20 22 24 40  22 00                    |h.x' "$@".|
0000001a
ARG[3]:
00000000  2e 2f 73 63 72 69 70 74  2e 73 68 2e 78 00        |./script.sh.x.|
0000000e

[*] cmd = /home/matheus/Desktop/pwn-shc/script.sh.x
>> printar os parametros (s/n) ? s
ARG[0]:
00000000  2e 2f 73 63 72 69 70 74  2e 73 68 2e 78 00        |./script.sh.x.|
0000000e

#### muitos programas depois ...

[*] cmd = /bin/sh
>> printar os parametros (s/n) ? s
ARG[0]:
00000000  73 68 00                                          |sh.|
00000003
ARG[1]:
00000000  2d 63 00                                          |-c.|
00000003
ARG[2]:
00000000  23 21 2f 62 69 6e 2f 62  61 73 68 0a 23 20 6c 61  |#!/bin/bash.# la|
00000010  20 63 75 63 61 72 61 63  68 61 0a 0a 65 63 68 6f  | cucaracha..echo|
00000020  20 22 6e 6f 74 68 69 6e  67 20 74 6f 20 76 69 65  | "nothing to vie|
00000030  77 20 68 65 72 65 22 0a  00                       |w here"..|
00000039
nothing to view here
Could not start seccomp:: Function not implemented
$ cat script.sh
#!/bin/bash
# la cucaracha

echo "nothing to view here"
```

## Conclusão

O código para descompilação não é uma sandbox, e mesmo se fosse, tenha muito
cuidado com os binários que você roda, ou pode acabar conhecendo o */dev/null*.

Se for usar o SHC, não deixe nada de comprometedor nos seus scripts, e.g, xingamentos,
segredos escusos, que você usa java.\..
