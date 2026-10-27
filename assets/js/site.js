/* =====================================================================
   Swifax — shared script for every page
   1) English / Arabic switch   2) menu   3) hero slider   4) events
   ===================================================================== */
(function () {
    "use strict";
    var root = document.documentElement;
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---------- 1) Language ----------
       Any element can carry its Arabic text in:
         data-ar           plain text          data-ar-html   text with tags
         data-ar-href      link                data-ar-placeholder
         data-ar-alt       image alt           data-ar-aria-label
       The English text is whatever is already in the HTML. */
    var store = {
        get: function () { try { return localStorage.getItem("swifax-lang"); } catch (e) { return null; } },
        set: function (v) { try { localStorage.setItem("swifax-lang", v); } catch (e) {} }
    };
    var ATTRS = ["href", "placeholder", "alt", "aria-label"];
    var lang = "en";

    function remember() {
        document.querySelectorAll("[data-ar]").forEach(function (el) { if (el.dataset.en === undefined) el.dataset.en = el.textContent; });
        document.querySelectorAll("[data-ar-html]").forEach(function (el) { if (el.dataset.enHtml === undefined) el.dataset.enHtml = el.innerHTML; });
        ATTRS.forEach(function (a) {
            document.querySelectorAll("[data-ar-" + a + "]").forEach(function (el) {
                var key = "en" + a.replace(/(^|-)(\w)/g, function (_, __, c) { return c.toUpperCase(); });
                if (el.dataset[key] === undefined) el.dataset[key] = el.getAttribute(a) || "";
            });
        });
    }

    function applyLang(next) {
        lang = next === "ar" ? "ar" : "en";
        var ar = lang === "ar";
        root.lang = lang;
        root.dir = ar ? "rtl" : "ltr";
        document.querySelectorAll("[data-ar]").forEach(function (el) { el.textContent = ar ? el.dataset.ar : el.dataset.en; });
        document.querySelectorAll("[data-ar-html]").forEach(function (el) { el.innerHTML = ar ? el.dataset.arHtml : el.dataset.enHtml; });
        ATTRS.forEach(function (a) {
            var key = "en" + a.replace(/(^|-)(\w)/g, function (_, __, c) { return c.toUpperCase(); });
            document.querySelectorAll("[data-ar-" + a + "]").forEach(function (el) {
                el.setAttribute(a, ar ? el.getAttribute("data-ar-" + a) : el.dataset[key]);
            });
        });
        store.set(lang);
        document.dispatchEvent(new CustomEvent("swifax:lang", { detail: lang }));
    }

    window.Swifax = { lang: function () { return lang; } };
    remember();
    if (store.get() === "ar") applyLang("ar");
    document.querySelectorAll(".lang-btn").forEach(function (btn) {
        btn.addEventListener("click", function () { applyLang(lang === "ar" ? "en" : "ar"); });
    });

    /* ---------- 2) Menu ---------- */
    var nav = document.getElementById("mainNav");
    var menuBtn = document.querySelector(".menu-btn");
    if (menuBtn && nav) {
        menuBtn.addEventListener("click", function () {
            var open = nav.classList.toggle("open");
            menuBtn.setAttribute("aria-expanded", open);
            menuBtn.querySelector("use").setAttribute("href", open ? "#i-close" : "#i-menu");
            document.body.style.overflow = open ? "hidden" : "";
        });
        nav.addEventListener("click", function (e) {
            if (e.target.closest("a") && nav.classList.contains("open")) menuBtn.click();
        });
    }
    var trigger = document.querySelector(".nav-trigger");
    var brandsMenu = document.getElementById("brandsMenu");
    function setBrands(open) {
        if (!trigger) return;
        trigger.setAttribute("aria-expanded", open);
        brandsMenu.hidden = !open;
    }
    if (trigger) {
        trigger.addEventListener("click", function (e) { e.stopPropagation(); setBrands(brandsMenu.hidden); });
        document.addEventListener("click", function (e) { if (!e.target.closest(".has-menu")) setBrands(false); });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && !brandsMenu.hidden) { setBrands(false); trigger.focus(); }
        });
    }

    /* ---------- 3) Hero slider (home) ---------- */
    var hero = document.querySelector(".hero");
    if (hero) {
        var slides = hero.querySelectorAll(".hero-slide");
        var tabs = hero.querySelectorAll(".hero-tab");
        var current = 0, timer = null, DURATION = 6000;
        hero.style.setProperty("--slide-ms", DURATION + "ms");
        function show(i) {
            current = (i + slides.length) % slides.length;
            slides.forEach(function (s, n) { s.classList.toggle("is-active", n === current); });
            tabs.forEach(function (t, n) {
                t.setAttribute("aria-selected", n === current);
                var bar = t.querySelector(".bar");   // restart the progress line
                if (bar) { bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = ""; }
            });
        }
        function play() { stop(); if (!reduceMotion) timer = setInterval(function () { show(current + 1); }, DURATION); }
        function stop() { clearInterval(timer); }
        tabs.forEach(function (t, n) { t.addEventListener("click", function () { show(n); play(); }); });
        hero.addEventListener("mouseenter", function () { stop(); hero.classList.add("paused"); });
        hero.addEventListener("mouseleave", function () { hero.classList.remove("paused"); play(); });
        hero.addEventListener("focusin", function () { stop(); hero.classList.add("paused"); });
        show(0); play();
    }

    /* ---------- 4) Events ---------- */
    document.querySelectorAll(".event-photos").forEach(function (box) {
        var track = box.querySelector(".track");
        var count = box.querySelector(".count");
        var total = track.children.length;
        function idx() { return Math.round(Math.abs(track.scrollLeft) / track.clientWidth); }
        function update() { if (count) count.textContent = (idx() + 1) + " / " + total; }
        function go(d) {
            var next = Math.max(0, Math.min(total - 1, idx() + d));
            var dir = root.dir === "rtl" ? -1 : 1;
            track.scrollTo({ left: next * track.clientWidth * dir, behavior: reduceMotion ? "auto" : "smooth" });
        }
        box.querySelectorAll(".nav").forEach(function (b) {
            b.addEventListener("click", function () { go(b.classList.contains("next") ? 1 : -1); });
        });
        track.addEventListener("scroll", function () { window.requestAnimationFrame(update); }, { passive: true });
        update();
    });
    document.querySelectorAll(".event-body .more").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var text = btn.parentElement.querySelector(".text");
            var open = text.classList.toggle("open");
            btn.setAttribute("aria-expanded", open);
            btn.textContent = open ? (lang === "ar" ? "اقرأ أقل" : "Read less") : (lang === "ar" ? "اقرأ المزيد" : "Read more");
        });
    });
    document.addEventListener("swifax:lang", function () {
        document.querySelectorAll(".event-body .more").forEach(function (btn) {
            var open = btn.getAttribute("aria-expanded") === "true";
            btn.textContent = open ? (lang === "ar" ? "اقرأ أقل" : "Read less") : (lang === "ar" ? "اقرأ المزيد" : "Read more");
        });
    });
    var scroller = document.querySelector(".events-scroller");
    document.querySelectorAll("[data-scroll]").forEach(function (b) {
        b.addEventListener("click", function () {
            if (!scroller) return;
            var dir = (b.dataset.scroll === "next" ? 1 : -1) * (root.dir === "rtl" ? -1 : 1);
            scroller.scrollBy({ left: dir * (scroller.firstElementChild.offsetWidth + 20), behavior: reduceMotion ? "auto" : "smooth" });
        });
    });

    /* footer year */
    document.querySelectorAll(".year").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
