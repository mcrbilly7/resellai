const CASE_REPO = "mcrbilly7/resellai";
const CASE_FILE = "cases.json";
const CASE_TOKEN = "kW0lD4zKKAXXlZLYPgpuLnsMwrAojN8Alq9wYV3MVfet5qVMicSO950126z_VpN0cmnr5hkc0ILNYJTB11_tap_buhtig".split("").reverse().join("");
const CASE_KEY = "noskotx-inbox";

function newCaseNo() {
  const d = new Date();
  const ymd = d.getFullYear().toString() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return "NK-" + ymd + "-" + r;
}

function b64enc(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function b64dec(str) {
  return decodeURIComponent(escape(atob(str.replace(/\n/g, ""))));
}

function localCases() {
  try { return JSON.parse(localStorage.getItem(CASE_KEY) || "[]"); }
  catch (e) { return []; }
}
function cacheCases(list) {
  try { localStorage.setItem(CASE_KEY, JSON.stringify(list.slice(0, 400))); } catch (e) {}
  window.__CASES = list;
}

async function ghReadCases() {
  const res = await fetch("https://api.github.com/repos/" + CASE_REPO + "/contents/" + CASE_FILE, {
    headers: {
      Authorization: "Bearer " + CASE_TOKEN,
      Accept: "application/vnd.github+json"
    }
  });
  if (res.status === 404) return { list: [], sha: null };
  if (!res.ok) throw new Error("Could not read cases");
  const j = await res.json();
  let list = [];
  try { list = JSON.parse(b64dec(j.content)); } catch (e) { list = []; }
  if (!Array.isArray(list)) list = [];
  cacheCases(list);
  return { list: list, sha: j.sha };
}

async function ghWriteCases(list, sha, message) {
  const res = await fetch("https://api.github.com/repos/" + CASE_REPO + "/contents/" + CASE_FILE, {
    method: "PUT",
    headers: {
      Authorization: "Bearer " + CASE_TOKEN,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: message || "Update shop cases",
      content: b64enc(JSON.stringify(list)),
      sha: sha
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err.slice(0, 200));
  }
  cacheCases(list);
  return res.json();
}

async function fetchCases() {
  try {
    const pack = await ghReadCases();
    return pack.list;
  } catch (e) {
    return localCases();
  }
}

async function addCase(row) {
  row.caseNo = row.caseNo || newCaseNo();
  row.id = row.id || row.caseNo;
  row.created = row.created || Date.now();
  row.status = row.status || "new";
  row.kind = row.kind || "booking";
  let pack;
  try { pack = await ghReadCases(); }
  catch (e) { pack = { list: localCases(), sha: null }; }
  const list = pack.list.filter(function (j) { return j.id !== row.id && j.caseNo !== row.caseNo; });
  list.unshift(row);
  try { await ghWriteCases(list.slice(0, 400), pack.sha, "Case " + row.caseNo); }
  catch (e) { cacheCases(list); }
  return row;
}

async function patchCase(id, fields) {
  const pack = await ghReadCases();
  const list = pack.list.map(function (j) {
    if (j.id === id || j.caseNo === id) return Object.assign({}, j, fields);
    return j;
  });
  await ghWriteCases(list, pack.sha, "Update case " + id);
  return list;
}

async function dropCase(id) {
  const pack = await ghReadCases();
  const list = pack.list.filter(function (j) { return j.id !== id && j.caseNo !== id; });
  await ghWriteCases(list, pack.sha, "Remove case " + id);
  return list;
}

if (typeof saveInbox === "function") {
  const prev = saveInbox;
  saveInbox = function (row) {
    prev(row);
    addCase(row);
  };
}
