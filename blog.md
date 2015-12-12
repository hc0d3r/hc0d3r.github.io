---
layout: page
title: Postagens do blog
permalink: /blog/
---

{% for post in site.posts %}

<li><div id='data'>{{ post.date | date_to_string }}</div> - <a href="{{ post.url }}"><b>{{ post.title }}</b></a></li>

{% endfor %}
