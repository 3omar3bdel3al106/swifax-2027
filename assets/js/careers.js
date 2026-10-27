/* =====================================================================
   Careers form — sends the application + CV to Google Apps Script,
   which emails it to HR and saves the CV in Google Drive.
   ===================================================================== */
const CAREERS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz48VjbgrOgmMlol14MxcwEqoT1FTNGi0tqenzMUt4KgxBmZDJ1bSgUF_Jtt4DroAY6Gw/exec";

document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);
    const lang = () => (window.Swifax ? window.Swifax.lang() : "en");
    const ar = () => lang() === "ar";

    const form = $("careersForm");
    const applyCard = $("applyCard");
    const fullName = $("fullName");
    const position = $("position");
    const cvInput = $("cvFile");
    const cvLabel = $("cvLabel");
    const cvError = $("cvError");
    const uploadBox = document.querySelector(".cv-upload");
    const sendBtn = $("sendBtn");
    const successAlert = $("successAlert");
    const errorAlert = $("errorAlert");

    const MAX_SIZE = 5 * 1024 * 1024;
    const ALLOWED = ["pdf", "doc", "docx"];

    /* ---- messages ---- */
    function showResult(ok) {
        successAlert.hidden = !ok;
        errorAlert.hidden = ok;
        (ok ? successAlert : errorAlert).scrollIntoView({ behavior: "smooth", block: "center" });
    }
    document.querySelectorAll(".alert-close").forEach(b =>
        b.addEventListener("click", () => { b.closest(".alert").hidden = true; }));

    /* ---- "Apply" buttons pick the role and jump to the form ---- */
    document.querySelectorAll(".btn-apply").forEach(btn => {
        btn.addEventListener("click", () => {
            position.value = btn.dataset.job;
            position.closest(".field").classList.remove("invalid");
            applyCard.scrollIntoView({ behavior: "smooth", block: "center" });
            applyCard.classList.add("highlight");
            setTimeout(() => applyCard.classList.remove("highlight"), 1600);
            setTimeout(() => fullName.focus({ preventScroll: true }), 500);
        });
    });

    /* ---- CV ---- */
    const cvDefault = () => (ar() ? cvLabel.dataset.ar : cvLabel.dataset.en);
    function cvMessage(kind) { return cvError.getAttribute(`data-msg-${lang()}-${kind}`); }
    function validateCV() {
        const file = cvInput.files[0];
        let kind = "";
        if (!file) kind = "missing";
        else if (!ALLOWED.includes(file.name.split(".").pop().toLowerCase())) kind = "type";
        else if (file.size > MAX_SIZE) kind = "size";
        if (kind) cvError.textContent = cvMessage(kind);
        cvInput.closest(".field").classList.toggle("invalid", !!kind);
        return !kind;
    }
    cvInput.addEventListener("change", () => {
        const file = cvInput.files[0];
        if (file && validateCV()) {
            cvLabel.textContent = file.name;
            uploadBox.classList.add("has-file");
        } else {
            if (file) cvInput.value = "";
            uploadBox.classList.remove("has-file");
            cvLabel.textContent = cvDefault();
        }
    });
    document.addEventListener("swifax:lang", () => {
        if (cvInput.files[0]) cvLabel.textContent = cvInput.files[0].name;
        if (cvInput.closest(".field").classList.contains("invalid")) validateCV();
    });

    /* ---- other fields ---- */
    function validateField(input) {
        const v = input.value.trim();
        let ok = v !== "";
        if (ok && input.type === "email") ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        if (ok && input.type === "tel") ok = /^[+\d\s-]{8,}$/.test(v);
        input.closest(".field").classList.toggle("invalid", !ok);
        input.setAttribute("aria-invalid", !ok);
        return ok;
    }
    const required = [fullName, $("email"), $("phone"), position];
    required.forEach(input => {
        input.addEventListener("input", () => input.closest(".field").classList.contains("invalid") && validateField(input));
        input.addEventListener("change", () => validateField(input));
    });

    const toBase64 = file => new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1]);
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
    });

    function busy(on) {
        sendBtn.disabled = on;
        sendBtn.querySelector(".spinner").hidden = !on;
        const t = sendBtn.querySelector(".btn-text");
        t.textContent = on ? (ar() ? "جاري الإرسال..." : "Sending...") : (ar() ? t.dataset.ar : t.dataset.en);
    }

    /* ---- submit ---- */
    form.addEventListener("submit", async e => {
        e.preventDefault();
        let valid = true;
        required.forEach(i => { if (!validateField(i)) valid = false; });
        if (!validateCV()) valid = false;
        if (!valid) {
            const first = form.querySelector(".field.invalid input, .field.invalid select");
            if (first) first.focus();
            return;
        }
        if (form.querySelector('[name="_honey"]').value) { form.reset(); showResult(true); return; }

        successAlert.hidden = true;
        errorAlert.hidden = true;
        busy(true);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 60000);
        try {
            const file = cvInput.files[0];
            const payload = {
                name: fullName.value.trim(),
                email: $("email").value.trim(),
                phone: $("phone").value.trim(),
                position: position.value,
                message: $("message").value.trim(),
                fileName: file.name,
                fileType: file.type,
                fileData: await toBase64(file)
            };
            const res = await fetch(CAREERS_SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            const result = await res.json();
            if (!result.ok) throw new Error(result.error || "Send failed");
            form.reset();
            uploadBox.classList.remove("has-file");
            cvLabel.textContent = cvDefault();
            showResult(true);
        } catch (err) {
            console.error("Careers form:", err);
            showResult(false);
        } finally {
            clearTimeout(timer);
            busy(false);
        }
    });
});
