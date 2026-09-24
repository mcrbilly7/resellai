const SHOP_MAIL = "noskotx@gmail.com";
const FORM_HASH = "392d527d09be6d2ef7eba61b05686ad0";
const AUTO_NOTE = "Thank you for writing Nossonk LLC. We received your message and will get back to you within 48 hours. If you need the shop sooner, call or text (945) 239-5974.";

function sendShopMail(fields) {
  const payload = Object.assign({
    _subject: fields._subject || "Nossonk LLC website message",
    _template: "table",
    _captcha: "false",
    _autoresponse: fields._autoresponse || AUTO_NOTE
  }, fields);
  const body = JSON.stringify(payload);
  return fetch("https://formsubmit.co/ajax/" + FORM_HASH, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: body
  }).catch(function () {
    return fetch("https://formsubmit.co/ajax/" + SHOP_MAIL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: body
    });
  }).catch(function () { return { ok: false }; });
}

function wirePageForm(form) {
  if (!form) return;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });
    const btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }
    sendShopMail(data).finally(function () {
      window.location.href = "thanks.html";
    });
  });
}

document.querySelectorAll("form[action*='formsubmit']").forEach(wirePageForm);
