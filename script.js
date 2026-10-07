/* =========================================================
   CPPEM · AULÃO PMPE
   ---------------------------------------------------------
   O script faz cinco coisas:

     1. INGRESSOS   lotes, preços e links de compra (a partir do CONFIG)
     2. RELÓGIO     a contagem regressiva até o início do aulão
     3. ENTRADA     as faíscas do carimbo do brasão na hero
     4. PÁGINA      header, progresso, dock, reveal, contagem dos números
     5. ATMOSFERA   brasas, faíscas, brilho no cursor

   ⚠️ Tudo que muda com a venda (lote aberto, preços, links) mora no
   CONFIG abaixo, e em lugar nenhum mais.
   ========================================================= */
(function () {
  "use strict";

  var CONFIG = {
    pagina: "aulao-pmpe",

    /* Início do aulão, com fuso. É dele que sai a contagem regressiva. */
    inicio: "2026-10-18T08:00:00-03:00",

    /* ─── INGRESSOS ─────────────────────────────────────────
       Três lotes de ingresso comum + um lote único de VIP.
       · loteAtual: qual lote comum está à venda (1, 2 ou 3). Os anteriores
         aparecem como encerrados; o cartão "Comum" mostra o preço e o link
         DESTE lote.
       · preco: texto pronto, do jeito que deve aparecer ("R$ 49,90").
       · parcelas / parcela (opcionais): quando existem, a PARCELA vira o número
         grande do cartão e o à vista desce para a linha de baixo. Copie do
         checkout. ⚠️ 12x R$ 17,42 = R$ 209,04 > R$ 167,00 à vista: há juros,
         então a página NUNCA pode dizer "sem juros".
       · precoDe / off (opcionais): o "de R$ X" riscado e o desconto — os
         MESMOS números do checkout, senão a página contradiz a tela de
         pagamento no momento em que a pessoa vai digitar o cartão.
         Vazio = "Em breve" — ou "Vendas abertas", se o link já existir.
       · checkout: link do produto. Vazio = o botão mostra o aviso
         "vendas abrem em breve" em vez de navegar.

       · extra (opcional): o que o lote pede ALÉM do valor — ex.: "+ 1 kg de
         alimento não perecível". Aparece colado ao preço no cartão do
         comum, na trilha de lotes, no aviso da hero e numa pergunta do FAQ.
         Lote sem `extra` não mostra nada disso.

       A Camisa (+R$ 69,90) do ingresso comum está escrita direto no
       index.html — é valor fixo, não muda por lote. No VIP ela vem inclusa.
       A Dog Tag não é vendida: só brinde dos 100 primeiros VIPs. */
    ingressos: {
      loteAtual: 2,
      lotes: [
        { preco: "R$ 35,00", precoDe: "R$ 56,00", off: "-38%",               // 1º lote (encerrado)
          checkout: "" },
        { preco: "R$ 45,00", extra: "+ 1 kg de alimento não perecível",      // 2º lote (aberto)
          checkout: "https://checkout.cppem.com.br/pay/aulao-pmpe-pos-edital-ingresso-comum" },
        { preco: "", checkout: "" }    // 3º lote
      ],
      vip: { preco: "R$ 167,00", parcelas: "12x", parcela: "R$ 17,42", checkout: "https://checkout.cppem.com.br/pay/aulao-pmpe-pos-edital-ingresso-vip" },

      /* ─── ESCASSEZ ───
         capacidade: lugares do Teatro Difusora (aprox.).
         restantes:  ⚠️ SÓ um número REAL, passado pela equipe de vendas.
                     null = a página não fala em "restam X" — ela continua
                     com a escassez que é fato (lote, virada, capacidade).
                     Um contador inventado é mentira na cara de quem compra. */
      capacidade: 400,
      restantes: null
    }
  };

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }
  function push(dados) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(dados);
  }

  /* =========================================================
     1 · INGRESSOS
     ========================================================= */
  var ING = CONFIG.ingressos;

  function loteAberto() { return ING.lotes[ING.loteAtual - 1] || {}; }

  function linkDe(tipo) {
    if (tipo === "comum") return loteAberto().checkout || "";
    if (tipo === "vip")   return ING.vip.checkout || "";
    return "";
  }

  /* O preço, ou o que dizer no lugar dele: com link e sem preço a venda JÁ
     está aberta — "Em breve" ali faria a pessoa achar que não dá para comprar. */
  function semPreco(dados) {
    return dados.preco || (dados.checkout ? "Vendas abertas" : "Em breve");
  }

  function pintarIngressos() {
    var n = ING.loteAtual;
    var lote = loteAberto();

    $$(".lotes__item").forEach(function (li) {
      var k = li.getAttribute("data-lote");
      var preco  = $("[data-lote-preco]", li);
      var status = $("[data-lote-status]", li);
      if (k === "vip") { if (preco) preco.textContent = semPreco(ING.vip); return; }

      var i = parseInt(k, 10);
      var dados = ING.lotes[i - 1] || {};
      li.classList.toggle("is-atual", i === n);
      li.classList.toggle("is-encerrado", i < n);
      if (preco) preco.textContent = semPreco(dados);
      if (status) {
        status.textContent =
          i < n   ? "Encerrado" :
          i === n ? (dados.checkout ? "Aberto agora" : "Abre em breve") :
          i === 3 ? "Último comum" : "Próximo";
      }
    });

    $$("[data-ingresso-lote]").forEach(function (el) { el.textContent = n + "º lote"; });
    $$("[data-ingresso-label]").forEach(function (el) { el.textContent = "Ingresso no " + n + "º lote"; });

    /* Com parcela: "12x" pequeno + a parcela grande, e o à vista na linha
       de baixo (data-ingresso-avista). Sem parcela: o preço cheio, grande. */
    function escrevePreco(el, dados) {
      var tipo = el.getAttribute("data-ingresso-preco");
      var avista = $('[data-ingresso-avista="' + tipo + '"]');
      var parcelado = !!(dados.parcela && dados.preco);

      el.textContent = "";
      if (parcelado) {
        var x = document.createElement("small");
        x.textContent = (dados.parcelas || "12x") + " de";
        el.appendChild(x);
        el.appendChild(document.createTextNode(" " + dados.parcela));
      } else {
        el.textContent = semPreco(dados);
      }
      el.classList.toggle("is-vazio", !dados.preco);
      el.classList.toggle("is-parcela", parcelado);

      if (avista) {
        avista.hidden = !parcelado;
        if (parcelado) $("strong", avista).textContent = dados.preco;
      }
    }
    $$('[data-ingresso-preco="comum"]').forEach(function (el) { escrevePreco(el, lote); });
    $$("[data-ingresso-de]").forEach(function (el) {
      el.hidden = !lote.precoDe;
      if (!lote.precoDe) return;
      $("s", el).textContent = lote.precoDe;
      var off = $("em", el);
      off.textContent = lote.off || "";
      off.hidden = !lote.off;
    });

    /* O que o lote pede além do valor ("+ 1 kg de alimento não perecível").
       Faz parte do PREÇO: fica colado nele, e não numa nota de rodapé —
       ninguém pode descobrir isso só na porta do teatro. */
    $$("[data-ingresso-extra]").forEach(function (el) {
      el.hidden = !lote.extra;
      el.textContent = lote.extra || "";
    });
    $$("[data-faq-extra]").forEach(function (el) {
      el.hidden = !lote.extra;
      var alvo = $("[data-faq-extra-txt]", el);
      if (alvo && lote.extra) alvo.textContent = lote.preco + " " + lote.extra;
    });
    /* na trilha, cada lote mostra o próprio extra embaixo do preço */
    $$(".lotes__item").forEach(function (li) {
      var i = parseInt(li.getAttribute("data-lote"), 10);
      var dados = ING.lotes[i - 1];
      var tag = $(".lotes__extra", li);
      if (!dados || !dados.extra) { if (tag) tag.remove(); return; }
      if (!tag) {
        tag = document.createElement("span");
        tag.className = "lotes__extra";
        var preco = $("[data-lote-preco]", li);
        preco.parentNode.insertBefore(tag, preco.nextSibling);
      }
      tag.textContent = dados.extra;
    });
    $$('[data-ingresso-preco="vip"]').forEach(function (el) { escrevePreco(el, ING.vip); });

    $$("[data-compra]").forEach(function (btn) {
      btn.href = linkDe(btn.getAttribute("data-compra")) || "#ingressos";
    });

    pintarUrgencia(n, lote);
  }

  /* ─── a escassez ───
     Três frases, todas verdadeiras por construção: saem do lote que está
     de fato aberto e, se houver, do número de lugares que a equipe passou. */
  function pintarUrgencia(n, lote) {
    var aberto = !!lote.checkout;
    var r = ING.restantes;
    var temR = typeof r === "number" && r >= 0;
    var sufixo = temR ? " · restam " + r + " lugares" : "";

    $$("[data-urgencia]").forEach(function (el) {
      el.textContent = aberto
        ? n + "º lote aberto" + (n === 1 ? " — o mais barato de todos" : "") +
          (lote.extra && lote.preco ? ": " + lote.preco + " " + lote.extra : "") +
          ". O valor sobe na virada" + sufixo + "."
        : "Vendas abrem em breve — o 1º lote é o mais barato de todos.";
    });
    $$("[data-urgencia-curta]").forEach(function (el) {
      el.textContent = aberto ? n + "º lote aberto · 18/10" : "18/10 · Teatro Difusora";
    });
    $$("[data-urgencia-lote]").forEach(function (el) { el.textContent = n + "º lote"; });
    /* a fita corrida também é texto fixo no HTML: sem isto ela ficaria
       anunciando o 1º lote depois da virada */
    $$("[data-fita-lote]").forEach(function (el) {
      el.textContent = aberto ? n + "º lote aberto" : "Vendas em breve";
    });

    var bloco = $("[data-restantes-bloco]");
    if (bloco) {
      bloco.hidden = !temR;
      if (temR) {
        $("[data-restantes]", bloco).textContent = r + " de " + ING.capacidade;
        var ocupado = Math.max(0, Math.min(100, (1 - r / ING.capacidade) * 100));
        $("[data-restantes-fill]", bloco).style.setProperty("--ocupado", ocupado.toFixed(1) + "%");
      }
    }
  }
  pintarIngressos();

  /* ─── os cliques ───
     [data-cta]    "Garantir vaga" do header, hero, dock e final: descem até
                   #ingressos (o próprio href faz isso), aqui só marcamos.
     [data-compra] os botões de cada ingresso. Sem link, mostram o aviso. */
  var aviso = document.getElementById("aviso");
  var avisoTimer = null;

  function mostrarAviso() {
    if (!aviso) return;
    aviso.classList.add("is-on");
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(function () { aviso.classList.remove("is-on"); }, 3800);
  }

  $$("[data-cta]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      push({ event: "clique_cta_ingressos", pagina: CONFIG.pagina });
    });
  });

  $$("[data-compra]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      var tipo = btn.getAttribute("data-compra");
      var url  = linkDe(tipo);
      push({
        event: "clique_checkout",
        pagina: CONFIG.pagina,
        produto: tipo === "vip" ? "Ingresso VIP" : "Ingresso Comum — " + ING.loteAtual + "º lote",
        destino: url ? "checkout" : "em_breve"
      });
      if (url) return;
      e.preventDefault();
      mostrarAviso();
    });
  });

  /* =========================================================
     2 · O RELÓGIO
     Quando o aulão começa, os blocos de relógio somem inteiros.
     ========================================================= */
  (function relogio() {
    var alvo = new Date(CONFIG.inicio).getTime();
    var blocos = $$("[data-relogio-bloco], [data-relogio]");
    var timer = null;

    function pinta() {
      var falta = alvo - Date.now();
      if (!(falta > 0)) {
        blocos.forEach(function (el) { el.hidden = true; });
        clearInterval(timer);
        return;
      }
      var s = Math.floor(falta / 1000);
      var partes = {
        d: Math.floor(s / 86400),
        h: Math.floor((s % 86400) / 3600),
        m: Math.floor((s % 3600) / 60),
        s: s % 60
      };
      Object.keys(partes).forEach(function (k) {
        var v = partes[k] < 10 ? "0" + partes[k] : String(partes[k]);
        $$('[data-cd="' + k + '"]').forEach(function (el) { el.textContent = v; });
      });
    }
    pinta();
    timer = setInterval(pinta, 1000);
  })();

  /* =========================================================
     3 · A ENTRADA — o carimbo do brasão
     ---------------------------------------------------------
     A batida é toda CSS (.selo--carimbo). Daqui só saem as faíscas, e o
     instante delas é ESCUTADO no animationend da queda — nunca calculado:
     o relógio das animações começa quando o elemento pinta, não quando a
     página navega, e uma conta de tempo sairia de fase.
     ========================================================= */
  var TONS_CACO = ["#FFE7B0", "#C9AE7A", "#C4703F"];

  function estilhacar(alvo, px, py, quantos, forca) {
    if (!alvo || reduced) return;
    alvo.textContent = "";
    for (var i = 0; i < quantos; i++) {
      var caco = document.createElement("i");
      var ang  = Math.random() * Math.PI * 2;
      var dist = forca * (.42 + Math.random());
      caco.className = "caco";
      caco.style.setProperty("--ox", px + "px");
      caco.style.setProperty("--oy", py + "px");
      caco.style.setProperty("--dx", Math.cos(ang) * dist + "px");
      caco.style.setProperty("--dy", Math.sin(ang) * dist + "px");
      caco.style.setProperty("--s", (2 + Math.random() * 4).toFixed(1) + "px");
      caco.style.setProperty("--cor", TONS_CACO[Math.floor(Math.random() * TONS_CACO.length)]);
      caco.style.setProperty("--dur", (.5 + Math.random() * .6).toFixed(2) + "s");
      alvo.appendChild(caco);
    }
    setTimeout(function () { alvo.textContent = ""; }, 1400);
  }

  (function carimbo() {
    var selo   = document.getElementById("seloHero");
    var edital = document.getElementById("editalCarimbo");
    var cacos  = document.getElementById("heroCacos");
    var hero   = document.getElementById("topo");
    if (!selo || !cacos || !hero || reduced) return;

    function centro(el) {
      var re = el.getBoundingClientRect();
      var rh = hero.getBoundingClientRect();
      return [re.left - rh.left + re.width / 2, re.top - rh.top + re.height / 2];
    }

    /* 1ª quebra — o leão rompe a tela: a chuva grande */
    var leao = document.querySelector(".cena__leao");
    if (leao) {
      leao.addEventListener("animationend", function (e) {
        if (e.animationName !== "leao-rompe") return;
        var c = centro(leao);
        estilhacar(cacos, c[0], c[1], 70, 420);
      });
    }

    /* 2ª quebra — o brasão bate por cima do leão. Contêiner próprio: as
       faíscas da 1ª ainda podem estar voando, e estilhacar() limpa o alvo. */
    var cacosB = document.createElement("div");
    cacosB.className = "hero__cacos";
    cacosB.setAttribute("aria-hidden", "true");
    hero.appendChild(cacosB);
    selo.addEventListener("animationend", function (e) {
      if (e.animationName !== "carimbo-cai") return;
      var c = centro(selo);
      estilhacar(cacosB, c[0], c[1], 44, 300);
    });

    /* o carimbo do edital: um estouro curto, em brasa, no canto onde ele bate.
       Contêiner próprio para não apagar as faíscas da batida, que ainda voam. */
    if (edital) {
      var cacos2 = document.createElement("div");
      cacos2.className = "hero__cacos";
      cacos2.setAttribute("aria-hidden", "true");
      hero.appendChild(cacos2);
      edital.addEventListener("animationend", function (e) {
        if (e.animationName !== "edital-bate") return;
        var c = centro(edital);
        estilhacar(cacos2, c[0], c[1], 22, 150);
      });
    }
  })();

  /* =========================================================
     4 · HEADER, PROGRESSO, PARALLAX E DOCK
     ========================================================= */
  var header   = document.getElementById("header");
  var progress = document.getElementById("progress");
  var heroBg   = document.getElementById("heroBg");
  var dock     = document.getElementById("dock");
  var whats    = document.getElementById("whats");
  var ticking  = false;

  function render() {
    var y  = window.scrollY;
    var vh = window.innerHeight;
    if (header) header.classList.toggle("is-stuck", y > 40);

    if (progress) {
      var max = document.documentElement.scrollHeight - vh;
      progress.style.width = (max > 0 ? (y / max) * 100 : 0) + "%";
    }

    /* A dock e o WhatsApp só entram depois da hero: antes disso o CTA da
       dobra já está na tela, e os dois só cobririam conteúdo. */
    var passouHero = y > vh * 0.85;
    if (dock)  dock.classList.toggle("is-on", passouHero);
    if (whats) whats.classList.toggle("is-on", passouHero);

    if (!reduced && heroBg && y < vh * 1.2) {
      heroBg.style.transform = "translateY(" + (y * 0.16) + "px)";
    }
    ticking = false;
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(render); } }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  render();

  /* ─── reveal ao rolar ─── */
  var alvos = $$(
    ".section__head, .pilar, .materia, .info, " +
    ".lotes, .plano, .camisa, .faq__item, .final__inner"
  );
  alvos.forEach(function (el) { el.classList.add("reveal"); });

  /* ─── contagem dos números da ficha ───
     Só anima número PURO ("400"); "18/10", "1 DIA" e "08H–18H" ficam parados. */
  function contar(el) {
    var bruto = el.textContent.trim();
    if (!/^\d{1,3}(\.\d{3})*$/.test(bruto)) return;
    var destino = parseInt(bruto.replace(/\./g, ""), 10);
    if (!destino || reduced) return;

    var dur = 1100, ini = null;
    el.textContent = "0";
    function passo(ts) {
      if (ini === null) ini = ts;
      var p = Math.min((ts - ini) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(destino * e).toLocaleString("pt-BR");
      if (p < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }

  if (!("IntersectionObserver" in window)) {
    alvos.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      var i = 0;
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.style.transitionDelay = (i++ * 70) + "ms";
        e.target.classList.add("is-visible");
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -60px" });
    alvos.forEach(function (el) { io.observe(el); });

    var ioNum = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        contar(e.target);
        ioNum.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    $$(".ficha__item b").forEach(function (el) { ioNum.observe(el); });
  }

  /* =========================================================
     5 · ATMOSFERA — brasas e faíscas
     ========================================================= */
  var TONS = [
    "rgba(201,174,122,.9)",   // ouro claro
    "rgba(175,146,86,.85)",   // ouro
    "rgba(196,112,63,.85)"    // brasa quente
  ];

  function semear(alvo, quantidade) {
    if (!alvo || reduced) return;
    for (var b = 0; b < quantidade; b++) {
      var br = document.createElement("i");
      br.className = "brasa";
      br.style.setProperty("--x", (Math.random() * 100).toFixed(2) + "%");
      br.style.setProperty("--s", (2 + Math.random() * 3).toFixed(1) + "px");
      br.style.setProperty("--cor", TONS[Math.random() < .34 ? 2 : (Math.random() < .5 ? 0 : 1)]);
      br.style.setProperty("--op", (.35 + Math.random() * .45).toFixed(2));
      br.style.setProperty("--dur", (13 + Math.random() * 13).toFixed(1) + "s");
      br.style.setProperty("--atraso", "-" + (Math.random() * 26).toFixed(1) + "s");
      alvo.appendChild(br);
    }
  }
  semear(document.getElementById("brasas"), 22);
  /* A hero ganha a própria camada, bem mais densa: é a primeira tela e
     precisa de atmosfera de braseiro, não de fundo parado. */
  semear(document.getElementById("heroBrasas"), 46);

  var sparks = document.getElementById("sparks");
  if (sparks && !reduced) {
    for (var s = 0; s < 16; s++) {
      var i = document.createElement("i");
      i.className = "spark";
      i.style.left = (Math.random() * 100) + "%";
      i.style.bottom = (Math.random() * 40) + "%";
      i.style.animationDuration = (7 + Math.random() * 7) + "s";
      i.style.animationDelay = (Math.random() * 8) + "s";
      sparks.appendChild(i);
    }
  }

  /* ─── brilho seguindo o cursor nos cartões ─── */
  $$(".pilar").forEach(function (el) {
    el.addEventListener("mousemove", function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
      el.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
    });
  });

  var ano = document.getElementById("year");
  if (ano) ano.textContent = new Date().getFullYear();

})();
