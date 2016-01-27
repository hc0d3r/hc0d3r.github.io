---
layout: post
comments: true
title: "Resolvendo labirinto usando perl"
---

Programar jogos é uma otima maneira de aprimorar a logica, e criar programas pra resolver jogos tambem, em alguns casos da pra aprender
ate mais do que criando. Existem varias formas de se resolver um labirinto, vou explicar sobre como resolver usando uma função recursiva;

O primeiro passo seria pegar as coordenadas da posição inicial:

Pra começar vamos carregar o labirinto, no script que eu estou criando vou carregar ele atraves do stdin

{% highlight perl %}
sub carregar_labirinto {

    my $array_ref = shift; # (perldoc perlref) http://perldoc.perl.org/perlref.html
    my $len = 0;

    while(<>){ # (perldoc -v \$_)
        chomp; # removendo \n

        next if($_ =~ /^$/);
        $len = length($_) if(!$len);

        if($len != length($_)){
            return 0;
        }

        push $array_ref, [split //];
    }


    return $len; # se forem passadas somente linhas vazias, ira retorna erro 0
}
{% endhighlight %}

Testando a função:

{% highlight perl %}

#!/usr/bin/env perl -w

use strict;
use feature 'say';

### sub carregar_labirinto { ... }

my @labirinto;

if(! carregar_labirinto(\@labirinto) ){
	die "Labirinto invalido\n";
}

else {
	say "Labirinto carregado";
	say "Numero de linhas -> " . scalar( @labirinto );
	say "Numero de colunas -> ". scalar( @{ $labirinto[0] } );
	
}

{% endhighlight %}

Executando:

{% highlight bash %}
$ perl CarregarLabirintoTest.pl <<A
###
######
A
Labirinto invalido
$ perl CarregarLabirintoTest.pl <<A
###
###
A
Labirinto carregado
Numero de linhas -> 2
Numero de colunas -> 3
{% endhighlight %}

Agora que podemos acessar os elementos do labirinto da seguinte forma> $labirinto[linha][coluna], vamos procurar qual é a posição inicial, que vai ser definida pela letras __S__

{% highlight perl %}
sub get_start_position {
	my @labirinto = @_;

	for(my $y=0; $y<scalar(@array); $y++){
		for(my $x; $x< scalar(@{$array[0]}); $x++){
			if($labirinto[$y][$x] eq 'S'){
				return ($x, $y);
			}
		}
	}

	return undef;
}


## usando a função

my($x,$y) = get_start_position(@labirinto);

if(!defined $x){
	die "Inicio não encontrado\n";
}

else {
	say "X-> $x Y-> $y";
}
{% endhighlight %}


Testando:

{% highlight bash %}
$ perl GetStartPositionTest.pl <<A
##S##
#####
A
X-> 2 Y-> 0
$ perl GetStartPositionTest.pl <<A
#####
#####
A
Inicio não encontrado
$ perl GetStartPositionTest.pl <<A
#####
####S
A
X-> 4 Y-> 1
{% endhighlight %}


Agora a parte q realmente complica, criar a função recursiva, o prototipo da função vai ser:

resolver_labirinto \@respostas, $ultima_posicao, $caminho_percorrido, $x, $y, @labirinto;

\@respostas -> vai ser onde as possiveis soluções serão retornadas  
$ultimas_posicao -> para não retorna a posição anterior antes do movimento (esquerda, direita, cima, baixo)  
$caminho_percorrido -> armazena as coordenadas, e caso ache a saida vai ser retornada em \@respostas  
$x, $y -> coordernadas  
@labirinto -> -labirinto-

Alem dessa função, precisaremos de outra pra verificar se podemos ir ou não pra determinada direção.

{% highlight perl %}

sub can_move {
	my($x,$y,$caminho,@labirinto) = @_;

	if($x < 0 || $y < 0){
		return 0;
	}

	if($x >= scalar(@{ $labirinto[0] }) || $y >= scalar(@labirinto)){
		return 0;
	}

    
	if($labirinto[$y][$x] eq '#'){
		return 0;
	}

	if($caminho =~ /\($x, $y\)/){ # se o caminho ja foi percorrido, então não volta, pra evitar loops infinitos
		return 0;
	}


	return 1; # se estiver tudo ok retorna 1
}


sub resolver_labirinto {
	my($array_ref,$ultima_posicao,$caminho_percorrido,$x,$y,@labirinto) = @_;

	$caminho_percorrido .= "($x, $y)"; # concatena o caminho

	if($labirinto[$y][$x] eq 'F'){ # E (exit) marca a saida
		push($array_ref, $caminho_percorrido); # salva o resultado no array
		return;
	}

	foreach('E','D','C','B'){ # Esquerda, Direita, Cima, Baixo
		next if($_ eq $ultima_posicao); # pula, pra não voltar atras e refazer o caminho


		if($_ eq 'E'){ # se vc vai pra esquerda, então vc não pode ir pra direita
			if( can_move(($x-1), $y, $caminho_percorrido, @labirinto) ){ # como vc esta quer testar se pode ir pra esquerda, então é so diminuir 1 de $x
				resolver_labirinto($array_ref, 'D', $caminho_percorrido, ($x-1), $y, @labirinto); # vai pra esquerda e vai ficar assim, ate não ter mais opções, ou achar a saida
			}
		}

		if($_ eq 'D'){ # se vc vai pra direita, então vc não pode ir pra esqueda
			if( can_move(($x+1), $y, $caminho_percorrido, @labirinto) ){ # como vc esta quer testar se pode ir pra direita, então é so incrementar $x por 1
				resolver_labirinto($array_ref, 'E', $caminho_percorrido, ($x+1), $y, @labirinto);
			}
		}

		if($_ eq 'C'){
			if( can_move($x, ($y-1), $caminho_percorrido, @labirinto) ){
				resolver_labirinto($array_ref, 'B', $caminho_percorrido, $x, ($y-1), @labirinto);
			}
		}

		if($_ eq 'B'){
			if( can_move($x, ($y+1), $caminho_percorrido, @labirinto) ){
				resolver_labirinto($array_ref, 'C', $caminho_percorrido, $x, ($y+1), @labirinto);
			}
		}

	}

}

{% endhighlight %}


script final:
{% highlight perl %}
#!/usr/bin/env perl

use strict;
use warnings;
no warnings 'recursion';
use feature 'say';

### funções ...

my @labirinto;

if(! carregar_labirinto(\@labirinto) ){
	die "Labirinto invalido\n";
}

my($x,$y) = get_start_position(@labirinto);

if(!defined $x && !defined $y){
    die "Inicio não encontrado\n";
}

my @respostas;

resolver_labirinto(\@respostas, '', '', $x, $y, @labirinto);

if(!scalar(@respostas)){
    die "Nenhuma solução encontrada !!!\n";
}

say "Soluções encontradas>";
say foreach(@respostas);

@respostas = sort { length($a) <=> length($b) } @respostas;

say "Solução mais curta > ";
say $respostas[0];

{% endhighlight %}

Executando:

{% highlight bash %}
$ perl labirinto.pl <<A
#################################
S #         #   #           #   #
# ####### # # # ### ####### # ###
#     #   #   #     # #   # #   #
##### # ############# # # # ### #
#   # #   #         #   # #   # #
# ### # # ##### ### # ### ### # #
#     # #     #   # #   #   # # #
# ########### ### # ####### # # #
# #           #   # #   #   # # #
# ##### ####### ### # # # ### # #
#       #   #     #   #   #     #
######### # # ### # ##### # ### #
#       # # #   # # #   # # #   #
# ####### # ### # ### # ### # # #
#         #     #     #       #E#
#################################
A

Soluções encontradas>
(0, 1)(1, 1)(1, 2)(1, 3)(2, 3)(3, 3)(4, 3)(5, 3)(5, 4)(5, 5)(5, 6)(5, 7)(4, 7)(3, 7)(2, 7)(1, 7)(1, 8)(1, 9)(1, 10)(1, 11)(2, 11)(3, 11)(4, 11)(5, 11)(6, 11)(7, 11)(7, 10)(7, 9)(8, 9)(9, 9)(10, 9)(11, 9)(12, 9)(13, 9)(13, 8)(13, 7)(12, 7)(11, 7)(10, 7)(9, 7)(9, 6)(9, 5)(8, 5)(7, 5)(7, 4)(7, 3)(8, 3)(9, 3)(9, 2)(9, 1)(10, 1)(11, 1)(11, 2)(11, 3)(12, 3)(13, 3)(13, 2)(13, 1)(14, 1)(15, 1)(15, 2)(15, 3)(16, 3)(17, 3)(18, 3)(19, 3)(19, 2)(19, 1)(20, 1)(21, 1)(22, 1)(23, 1)(24, 1)(25, 1)(26, 1)(27, 1)(27, 2)(27, 3)(27, 4)(27, 5)(28, 5)(29, 5)(29, 6)(29, 7)(29, 8)(29, 9)(29, 10)(29, 11)(28, 11)(27, 11)(27, 12)(27, 13)(27, 14)(27, 15)(28, 15)(29, 15)(29, 14)(29, 13)(30, 13)(31, 13)(31, 14)(31, 15)
(0, 1)(1, 1)(1, 2)(1, 3)(2, 3)(3, 3)(4, 3)(5, 3)(5, 4)(5, 5)(5, 6)(5, 7)(4, 7)(3, 7)(2, 7)(1, 7)(1, 8)(1, 9)(1, 10)(1, 11)(2, 11)(3, 11)(4, 11)(5, 11)(6, 11)(7, 11)(7, 10)(7, 9)(8, 9)(9, 9)(10, 9)(11, 9)(12, 9)(13, 9)(13, 8)(13, 7)(12, 7)(11, 7)(10, 7)(9, 7)(9, 6)(9, 5)(8, 5)(7, 5)(7, 4)(7, 3)(8, 3)(9, 3)(9, 2)(9, 1)(10, 1)(11, 1)(11, 2)(11, 3)(12, 3)(13, 3)(13, 2)(13, 1)(14, 1)(15, 1)(15, 2)(15, 3)(16, 3)(17, 3)(18, 3)(19, 3)(19, 2)(19, 1)(20, 1)(21, 1)(22, 1)(23, 1)(24, 1)(25, 1)(26, 1)(27, 1)(27, 2)(27, 3)(27, 4)(27, 5)(28, 5)(29, 5)(29, 6)(29, 7)(29, 8)(29, 9)(29, 10)(29, 11)(30, 11)(31, 11)(31, 12)(31, 13)(31, 14)(31, 15)
Solução mais curta > 
(0, 1)(1, 1)(1, 2)(1, 3)(2, 3)(3, 3)(4, 3)(5, 3)(5, 4)(5, 5)(5, 6)(5, 7)(4, 7)(3, 7)(2, 7)(1, 7)(1, 8)(1, 9)(1, 10)(1, 11)(2, 11)(3, 11)(4, 11)(5, 11)(6, 11)(7, 11)(7, 10)(7, 9)(8, 9)(9, 9)(10, 9)(11, 9)(12, 9)(13, 9)(13, 8)(13, 7)(12, 7)(11, 7)(10, 7)(9, 7)(9, 6)(9, 5)(8, 5)(7, 5)(7, 4)(7, 3)(8, 3)(9, 3)(9, 2)(9, 1)(10, 1)(11, 1)(11, 2)(11, 3)(12, 3)(13, 3)(13, 2)(13, 1)(14, 1)(15, 1)(15, 2)(15, 3)(16, 3)(17, 3)(18, 3)(19, 3)(19, 2)(19, 1)(20, 1)(21, 1)(22, 1)(23, 1)(24, 1)(25, 1)(26, 1)(27, 1)(27, 2)(27, 3)(27, 4)(27, 5)(28, 5)(29, 5)(29, 6)(29, 7)(29, 8)(29, 9)(29, 10)(29, 11)(30, 11)(31, 11)(31, 12)(31, 13)(31, 14)(31, 15)

{% endhighlight %}

Eu poderia ter usado @labirinto como uma variavel global, tambem poderia ter usado o algoritmo de Dijkstra talvez seria mais eficiente do que fazer recursão.
