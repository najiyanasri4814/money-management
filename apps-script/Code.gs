/**
 * Money Management — Google Apps Script backend
 * ==============================================
 *
 * This file is a reference implementation of the exact API contract used by
 * the deployed Web App that this project talks to
 * (https://script.google.com/macros/s/AKfycby.../exec).
 *
 * IMPORTANT: The currently deployed script ALREADY supports list/add/update/
 * delete over GET query parameters, so NO redeployment is required. Use this
 * file only if you want to re-host or extend the backend yourself.
 *
 * Spreadsheet layout (Sheet1) — DO NOT change the column order:
 *   A: id            B: date      C: type
 *   D: category      E: amount    F: payment method
 *   G: note
 *
 * Contract:
 *   GET ?action=list            -> { success: true, data: [{id,date,type,category,amount,paymentMethod,note}, ...] }
 *   GET ?action=add&date=..&type=..&category=..&amount=..&paymentMethod=..&note=..
 *                               -> { success: true, id: <newId> }        (id = max id + 1)
 *   GET ?action=update&id=N&...  -> { success: true }                     (replaces the full row — send ALL fields)
 *   GET ?action=delete&id=N      -> { success: true }
 *   anything else                -> { success: false, error: "unknown action: ..." }
 *
 * NOTE: Only doGet is implemented. Google's Apps Script platforms answers POST
 * requests with its own "Page not found" page when doPost is missing, so the
 * frontend intentionally sends every operation as a GET query-string request
 * through a server-side Next.js proxy.
 */

var SHEET_NAME = "Sheet1";
var HEADER_ROW = 1;
var TOTAL_COLUMNS = 7;

/**
 * Optional shared token gate. Leave empty "" to disable (current deployed
 * behaviour). If you set a value, every request must also pass ?token=<value>,
 * which the Next.js app can forward via its APPS_SCRIPT_TOKEN env var.
 */
var SCRIPT_ACCESS_TOKEN = "";

/**
 * Entry point. Apps Script Web Apps answer simple GET requests here.
 * @param {GoogleAppsScript.Events.DoGet} e
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};

  if (SCRIPT_ACCESS_TOKEN && params.token !== SCRIPT_ACCESS_TOKEN) {
    return jsonOutput({ success: false, error: "unauthorized" });
  }

  var action = params.action;
  try {
    switch (action) {
      case "list":
        return jsonOutput({ success: true, data: listTransactions() });
      case "add":
        return jsonOutput({ success: true, id: addTransaction(params) });
      case "update":
        return jsonOutput({ success: true, id: updateTransaction(params) });
      case "delete":
        return jsonOutput({ success: true, id: deleteTransaction(params) });
      default:
        return jsonOutput({ success: false, error: "unknown action: " + action });
    }
  } catch (err) {
    return jsonOutput({
      success: false,
      error: err && err.message ? String(err.message) : String(err),
    });
  }
}

/* ------------------------------------------------------------------ */
/* Read                                                                */
/* ------------------------------------------------------------------ */

function listTransactions() {
  var sheet = getSheet();
  var values = sheet.getDataRange().getValues();
  var rows = [];

  for (var i = HEADER_ROW; i < values.length; i++) {
    var row = values[i];
    if (isRowEmpty(row)) continue;

    rows.push({
      id: row[0],
      date: formatDateValue(row[1]),
      type: row[2],
      category: row[3],
      amount: row[4],
      paymentMethod: row[5],
      note: row[6],
    });
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* Create                                                              */
/* ------------------------------------------------------------------ */

function addTransaction(p) {
  var sheet = getSheet();
  var maxId = 0;

  var values = sheet.getDataRange().getValues();
  for (var i = HEADER_ROW; i < values.length; i++) {
    var id = Number(values[i][0]);
    if (isFinite(id) && id > maxId) maxId = id;
  }

  var newId = maxId + 1;
  sheet.appendRow(buildRow(newId, p));
  return newId;
}

/* ------------------------------------------------------------------ */
/* Update (row replacement — send ALL fields)                          */
/* ------------------------------------------------------------------ */

function updateTransaction(p) {
  var id = Number(p.id);
  var sheet = getSheet();
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error("id not found");

  sheet.getRange(rowIndex, 1, 1, TOTAL_COLUMNS).setValues([buildRow(id, p)]);
  return id;
}

/* ------------------------------------------------------------------ */
/* Delete                                                              */
/* ------------------------------------------------------------------ */

function deleteTransaction(p) {
  var id = Number(p.id);
  var sheet = getSheet();
  var rowIndex = findRowIndexById(sheet, id);
  if (rowIndex === -1) throw new Error("id not found");

  sheet.deleteRow(rowIndex);
  return id;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.getSheets()[0]; // fall back to the first sheet
  }
  return sheet;
}

function buildRow(id, p) {
  return [
    id,
    normalizeString(p.date),
    normalizeString(p.type),
    normalizeString(p.category),
    toAmount(p.amount),
    normalizeString(p.paymentMethod),
    normalizeString(p.note),
  ];
}

function normalizeString(v) {
  if (v === undefined || v === null) return "";
  return String(v);
}

/** Store amounts as numbers when possible; keep blank cells blank. */
function toAmount(v) {
  if (v === undefined || v === null || v === "") return "";
  var n = Number(v);
  return isFinite(n) ? n : String(v);
}

/** The deployed API returns Date cells as e.g. "Fri Jul 10 2026 00:00:00 ...". */
function formatDateValue(v) {
  if (v instanceof Date) return String(v);
  return v;
}

function isRowEmpty(row) {
  for (var i = 0; i < row.length; i++) {
    if (row[i] !== "" && row[i] !== null && row[i] !== undefined) return false;
  }
  return true;
}

function findRowIndexById(sheet, id) {
  var values = sheet.getDataRange().getValues();
  for (var i = HEADER_ROW; i < values.length; i++) {
    if (Number(values[i][0]) === id) return i + 1; // 1-based sheet row
  }
  return -1;
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}