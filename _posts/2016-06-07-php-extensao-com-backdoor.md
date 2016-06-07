---
layout: post
comments: true
title: "PHP extensão com backdoor"
---

Recentemente comecei a aprender como criar extensão pra php em C, minhas ideias de
projeto foram criar uma extensão pra usar mmap e aumentar o desempenho, 
uma pra usar rdtsc (mas como já criaram um código que
faz isso deixei de lado), e outra que ainda estou testando mas
prefiro não comentar sobre, bem estudando isso tive a ideia de fazer
essa postagem sobre como um backdoor pode ser criado através de uma extensão,
não é algo tão sofisticado quanto um rootkit mas acho bastante válido e
dependendo de quem esta analisando o sistema ele pode deixar passar esse
detalhe.

As empresas que se preocupam com segurança visam se proteger mais de ataques externos, mas se o ataque
for feito por alguém que trabalha la fica mais difícil impedir, alguém que tenha
acesso as maquinas, etc, as pessoas não são confiaveis, sempre temos que confiar nelas desconfiando pois
não temos óculos igual do they lives para distinguir quem são humanos e quem são
os reptilianos humanoides sem coração.

Um programador pode instalar uma extensão maliciosa, pra roubar informações,
encriptar arquivos, etc, pra quando ele for demitido da empresa, ou seu trabalho acabar,
ele continue lucrando, você pode ate contratar alguém pra auditar o código-fonte,
claro que se você vê la um monte de eval, ou preg_match usando eval, base64 e outras
codificações na source vai pensar de cara que tem algo de errado ali, e desofuscar isso é bastante fácil,
so trocar eval por print, não é ?

Mas se a função que ele estiver usando depender de uma extensão, dependendo do conhecimento de quem faz essa analise
ele não vai saber se é algo malicioso ou não, e se ele tirar aquilo dali, não é trabalho
dele, pode arrumar uma dor de cabeça no futuro, como o mal funcionamento do sistema
e com certeza ele não vai querer isso, já que o trabalho dele é só prestar consultaria.

Pra demonstrar como uma extensão maliciosa pode ser criada peguei o exemplo no site [zend developer zone](http://devzone.zend.com/303/extension-writing-part-i-introduction-to-php-and-zend/),
e com poucas modificações ele agora faz conexão reversa em 0.0.0.0 na porta 1337 e disponibiliza uma shell:

{% gist 0d33f7ef165d74abe8ff745b01141c35 %}

**instalando a extensão >>**

{% highlight text  %}
% phpize
% ./configure --enable-evil
% make
% sudo make install
% echo 'extension=evil.so' | sudo tee /etc/php.d/evil.ini
{% endhighlight %}

**testando >>**

<script type="text/javascript" src="https://asciinema.org/a/48157.js" id="asciicast-48157" async></script>



\_\_EOF\_\_
