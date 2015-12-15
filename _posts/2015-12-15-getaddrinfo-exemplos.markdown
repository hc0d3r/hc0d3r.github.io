---
layout: post
comments: false
title: "exemplos de como usar a função getaddrinfo"
---

Se você ler a documentação da função **gethostbyname** (man gethostbyname), no primeiro paragrafo da sessão DESCRIPTION, tem um aviso,
falando que a função é obsoleta, e que novas aplicações deveriam usar a função **getaddrinfo**.

O prototipo da função getaddrinfo é:

{% highlight c %}

int getaddrinfo(const char *node, const char *service,
                const struct addrinfo *hints,
                struct addrinfo **res);

{% endhighlight %}

### Entendendo os parâmetros

* node -> string contendo o hostname ou endereço de IP, ex: (ipv6.google.com, 127.0.0.1)
* service -> string contendo o nome do protocolo, ou o numero da porta, ex: (http, 8080, https)
* hints -> struct contendo critérios para selecionar quais structs vão ser retornados em **res**
* res -> ponteiro onde uma lista de endereço será retornada

<br/>

Membros da struct addrinfo:

{% highlight c %}
struct addrinfo {
    int              ai_flags;
    int              ai_family;
    int              ai_socktype;
    int              ai_protocol;
    socklen_t        ai_addrlen;
    struct sockaddr *ai_addr;
    char            *ai_canonname;
    struct addrinfo *ai_next;
};
{% endhighlight %}

Os quatros primeiros membros da struct podem ser usados para espcificar as opções, que são
setadas pelo parametro **hints**

* ai_family -> familia do endereço que você deseja que a função retorne, para ipv6 -> AF_INET6, para ipv4 -> AF_INET, para retornar ambos use AF_UNSPEC.

* ai_socktype -> tipo de socket, exemplo: SOCK_STREAM, SOCK_DGRAM, SOCK_RAW, etc (/usr/include/bits/socket_type.h).

* ai_protocol -> especifica o protocolo para os endereços de sockets retornados (/usr/include/netinet/in.h).  

* ai_flags -> Opções adicionais, cada opção é setada usando bitwise OR , pra ver as opções disponiveis leia o manual =D.

Os outros parametros da struct, devem ser zerados, pra isso podemos usar memset.

Se a função for executada sem erros ela retorna 0, se o retorno for diferente de 0 significa que algo deu errado,
a lista de erros você pode ver na seção RETURN VALUE no manual da função (man getaddrinfo).

Os parâmetros 'node' e 'service' podem ser NULL, mas somente um deles, não os dois ao mesmo tempo.


### Talk is sheep, show me the code

Vamos ver um exemplo de getaddrinfo vs gethostbyname, vou criar um programa
pra resolver um hostname, e vou tentar resolver um host que retorna um endereço ipv6.

gethostbyname.c:
{% highlight c %}
#include <stdio.h>
#include <netdb.h>
#include <arpa/inet.h>


int main(int argc, char *argv[]){
    if(argc != 2){
        printf("%s [hostname]\n",argv[0]);
        return 0;
    }

    struct hostent *ips;
    struct in_addr **addrs;
    int i;

    if( (ips = gethostbyname(argv[1])) == NULL ){
        fprintf(stderr, "Failed to solve hostname: %s\n", argv[1]);
        return 1;
    } else {
	addrs = (struct in_addr **) ips->h_addr_list;

        printf("Hostname solved:\n");
        for(i=0; addrs[i] != NULL; i++){
            printf("%s\n", inet_ntoa( *addrs[i] ) );
        }
    }

    return 0;
}
{% endhighlight %}

Compilando e testando:

{% highlight plain  %}
$ gcc gethostbyname.c -Wall -Wextra -o ghbn
$ ./ghbn localhost
Hostname solved:
127.0.0.1
$ ./ghbn hc0d3r.github.io
Hostname solved:
199.27.76.133
$ ./ghbn ipv6.google.com
Failed to solve hostname: ipv6.google.com
$ ./ghbn www.v6.facebook.com
Failed to solve hostname: www.v6.facebook.com
{% endhighlight %}

Hostnames que retornam somente um endereço ipv6 falharam, agora vamos ver com a função getaddrinfo:

getaddrinfo.c:
{% highlight c %}
#include <stdio.h>
#include <string.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netdb.h>
#include <arpa/inet.h>

int main(int argc, char *argv[]){
    if(argc != 2){
        printf("%s [hostname]\n",argv[0]);
        return 0;
    }

    struct addrinfo hints, *res, *addr;
    char str_ip[INET6_ADDRSTRLEN];
    int status;

    memset(&hints, 0x0, sizeof(struct addrinfo));

    hints.ai_family = AF_UNSPEC; // retorna endereços IPv6 e IPv4
    hints.ai_socktype = SOCK_STREAM;
    hints.ai_flags |= AI_CANONNAME;

    if( (status = getaddrinfo(argv[1], NULL, &hints, &res)) != 0){
        fprintf(stderr, "[-] getaddrinfo(\"%s\") : %s\n", argv[1], gai_strerror(status));
        return 1;
    } else {

	printf("Hostname solved:\n");

        for(addr=res; addr!=NULL; addr=addr->ai_next){

            if(addr->ai_family == AF_INET){
                inet_ntop(addr->ai_family, &((struct sockaddr_in *) addr->ai_addr)->sin_addr ,str_ip, INET6_ADDRSTRLEN);
                // inet_ntop substitui inet_ntoa
            }

            else if(addr->ai_family == AF_INET6){
                inet_ntop(addr->ai_family, &((struct sockaddr_in6 *) addr->ai_addr)->sin6_addr ,str_ip, INET6_ADDRSTRLEN);
            }

            printf("%s\n", str_ip);

        }

    }

    freeaddrinfo(res); // dando free na struct, não queremos memory leak
    return 0;
}
{% endhighlight %}

Compilando e testando:

{% highlight plain  %}
$ gcc getaddrinfo.c -Wall -Wextra -o gai
$ ./gai localhost
Hostname solved:
127.0.0.1
$ ./gai ipv6.google.com
Hostname solved:
2800:3f0:4001:813::100e
$ ./gai www.v6.facebook.com
Hostname solved:
2a03:2880:20:8f08:face:b00c:0:1
{% endhighlight %}

E usando getaddrinfo conseguimos resolver o hostname -D.

### Resolvendo hostname e conectando:

[kadimus_socket.c](https://github.com/P0cL4bs/Kadimus/blob/master/src/kadimus_socket.c) -> olhem a função "kadimus_connect"

### Conclusão

Bem esse pequeno texto foi na verdade uma visão superficial da função, deixei de falar algumas coisas, por preguiça mesmo e falta de tempo,
pra saber mais sobre a função é so ler a doc, lá aliás tem exemplos de cliente e servidor usando a função.
