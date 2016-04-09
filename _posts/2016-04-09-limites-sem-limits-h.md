---
layout: post
comments: true
title: "Limites sem limits.h"
---

Dependendo do sistema e opções definidas durante a compilação de um programa alguns tipos de dados
podem ter tamanhos diferentes, um exemplo:

{% highlight text %}
$ echo 'main(){ printf("%d\n",sizeof(off_t)); }' | \
gcc -m64 -include sys/types.h -include stdio.h -x c - -o /tmp/z
$ /tmp/z
8
$ echo 'main(){ printf("%d\n",sizeof(off_t)); }' | \
gcc -m32 -include sys/types.h -include stdio.h -x c - -o /tmp/z
$ /tmp/z
4
{% endhighlight %}

O primeiro comando gera um elf que vai rodar em sistemas x86-64, o segundo gera um que vai rodar em i386, o
tamanho de **off_t** muda, e se você quiser saber qual é o tamanho maximo, por exemplo, para evitar overflow,
pode usar sizeof ou alguns macros para verificar a arquitetura (**\_\_x86_64\_\_**, **\_\_i386\_\_**, etc [considerando que você esta compilando com o gcc]),
mas dependendo do numero de typedefs e de diretivas de preprocessor, isso não é nada pratico, pensando nisso eu fiz esses macros:

{% highlight c %}
#define GET_MAX_UNSIGNED(cast) (cast)(~0)
#define GET_MIN_SIGNED(cast) (cast)( (cast)1 << (sizeof(cast)*8)-1 )
#define GET_MAX_SIGNED(cast) (cast)( ~GET_MIN_SIGNED(cast) )
{% endhighlight %}

Exemplo de utilização:

{% gist 34d57bddbc620e9665c8e4651f497e1a %}

Testando:

{% highlight text %}
$ gcc limits-test.c -o limits
$ ./limits
INT MAX:	01111111111111111111111111111111
INT MIN:	10000000000000000000000000000000
INT MAX limits.h:	01111111111111111111111111111111
INT MIN limits.h:	10000000000000000000000000000000
unsigned int:	11111111111111111111111111111111
unsigned int limits.h:	11111111111111111111111111111111
custom test:	1111111111111111111111111111111111111111111111111111111111111111
$ gcc limits-test.c -o limits -DABC
$ ./limits
INT MAX:	01111111111111111111111111111111
INT MIN:	10000000000000000000000000000000
INT MAX limits.h:	01111111111111111111111111111111
INT MIN limits.h:	10000000000000000000000000000000
unsigned int:	11111111111111111111111111111111
unsigned int limits.h:	11111111111111111111111111111111
custom test:	11111111111111111111111111111111
{% endhighlight %}


Usei o gcc v4.9.2, não testei com outro compiladores, se for usar em versões antigas do gcc ou outro compiladores sugiro testar antes, para ver
se realmente esta funcionando.

