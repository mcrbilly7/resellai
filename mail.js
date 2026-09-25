const SHOP_MAIL = "noskotx@gmail.com";
const FORM_HASH = "392d527d09be6d2ef7eba61b05686ad0";

function sendShopMail(fields) {
  const caseNo = fields.case_number || fields.caseNo || (typeof newCaseNo === "function" ? newCaseNo() : "");
  const payload = Object.assign({
    _subject: (fields._subject || "Nossonk LLC website message") + (caseNo ? " [" + caseNo + "]" : ""),
    _template: "table",
    _captcha: "false",
    _autoresponse: "Thank you for contacting Nossonk LLC. Case " + caseNo + ". We received your message and will get back to you within 48 hours. Call or text (945) 239-5974 if you need us sooner.",
    _cc: SHOP_MAIL,
    case_number: caseNo
  }, fields);
  if (!payload.email && payload.Email) payload.email = payload.Email;
  const body = new URLSearchParams();
  Object.keys(payload).forEach(function (k) {
    if (payload[k] == null) return;
    body.append(k, String(payload[k]));
  });
  return fetch("https://formsubmit.co/ajax/" + FORM_HASH, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: body.toString()
  }).then(function (res) {
    if (res.ok) return res;
    return fetch("https://formsubmit.co/ajax/" + SHOP_MAIL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: body.toString()
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
    const row = {
      kind: "message",
      name: data.name || "",
      phone: data.phone || "",
      email: data.email || "",
      message: data.message || data.job || "",
      city: data.city || data.job || "",
      status: "new"
    };
    const go = function (saved) {
      data.case_number = saved && saved.caseNo ? saved.caseNo : (typeof newCaseNo === "function" ? newCaseNo() : "");
      data.caseNo = data.case_number;
      sendShopMail(data).finally(function () {
        window.location.href = "thanks.html?case=" + encodeURIComponent(data.case_number || "");
      });
    };
    if (typeof addCase === "function") addCase(row).then(go).catch(function () { go(row); });
    else go(row);
  });
}

document.querySelectorAll("form[action*='formsubmit']").forEach(wirePageForm);
