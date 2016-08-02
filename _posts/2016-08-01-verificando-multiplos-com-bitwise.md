---
layout: post
comments: true
title: "Verificando multiplos com bitwise"
---

Dica rápida, verificar se um número é multiplo de uma potência de base 2 usando bitwise, pode ser feito com and ou com shl

### Usando AND (&)

numero & (divisor - 1)
se o resultado da operação for igual a 0, o número é multiplo.

exe:
{% highlight c %}
#include <stdio.h>


int main(void){
	int i;

	for(i=0; i<100; i++){
		// verificar multiplos de 4, bem gay isso, de 4 ...
		if( !(i & 3) )
			printf("%d ", i);
	}

	putchar('\n');

	return 0;
}
{% endhighlight %}


### Usando SHL (<\<)

Com shl pode ser feito pegando o total de bits que a variavel tem, exe: sizeof(int)*8, e depois diminuir pelo numeros de bits
1 que resultam da operação (divisor - 1), exemplo:

decimal -> 2 - 1  
binario -> 1

então ficaria (32 - 1) [supondo que o int tem tamanho de 4 bytes]

decimal -> 4 - 1  
binario -> 11

(32 - 2)

decimal -> 8 - 1  
binario -> 111

(32 - 3)

e assim em diante ...

se o resultado da operação (shl) for 0 então o número é multiplo

{% highlight c %}
#include <stdio.h>
#define BITS(x) sizeof(x)*8


int main(void){
	int i;

	for(i=0; i<100; i++){
		// verificar multiplos de 8
		if( !(i << (BITS(int) - 3)) )
			printf("%d ", i);
	}
	
	putchar('\n');

	return 0;
}
{% endhighlight %}
