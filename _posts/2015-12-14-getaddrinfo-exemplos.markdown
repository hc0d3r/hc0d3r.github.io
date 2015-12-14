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

### Entendendo os parametros<br/><br/>

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

Os parametros 'node' e 'service' podem ser NULL, mas só um deles, não os dois ao mesmo tempo.


### Talks is sheep, show me the code


