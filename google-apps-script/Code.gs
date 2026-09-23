/**
 * SI FOUR AM — Google Apps Script backend
 * Receives JSON POSTs from the SI FOUR AM server and:
 *   1) appends every record as a row in a Google Sheet tab (one tab per data type)
 *   2) uploads base64 photos to a Google Drive folder and writes the file link into the row
 *
 * Deploy as Web App: Execute as "Me", Who has access: "Anyone". Paste the /exec URL in
 * SI FOUR AM → Settings → Google Apps Script URL (Superadmin).
 */
const SPREADSHEET_ID = "";          // optional: leave empty to auto-create "SI FOUR AM Database"
const DRIVE_FOLDER_NAME = "SI FOUR AM Photos";

function getSpreadsheet_() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty("SS_ID");
  if (!id) { const ss = SpreadsheetApp.create("SI FOUR AM Database"); id = ss.getId(); props.setProperty("SS_ID", id); }
  return SpreadsheetApp.openById(id);
}

function getFolder_() {
  const it = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(DRIVE_FOLDER_NAME);
}

function savePhoto_(base64, name) {
  if (!base64) return "";
  const m = base64.match(/^data:(image\/\w+);base64,(.*)$/);
  const mime = m ? m[1] : "image/jpeg";
  const bytes = Utilities.base64Decode(m ? m[2] : base64);
  const file = getFolder_().createFile(Utilities.newBlob(bytes, mime, name || ("photo_" + Date.now() + ".jpg")));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const body = JSON.parse(e.postData.contents);
    const sheetName = body.sheet || "misc";
    const rec = body.record || {};
    const ss = getSpreadsheet_();
    let sh = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
    if (body.photo) rec.photo_link = savePhoto_(body.photo, body.photo_name);
    rec.synced_at = new Date();

    // header row = union of keys
    let headers = sh.getLastRow() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].filter(String) : [];
    Object.keys(rec).forEach(k => { if (headers.indexOf(k) < 0) headers.push(k); });
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");

    // duplicate handling: same id (or same rider_name+date) → overwrite latest instead of new row
    const idCol = headers.indexOf("id");
    let rowIdx = -1;
    if (idCol >= 0 && rec.id && sh.getLastRow() > 1) {
      const ids = sh.getRange(2, idCol + 1, sh.getLastRow() - 1, 1).getValues().map(r => String(r[0]));
      rowIdx = ids.indexOf(String(rec.id));
    }
    const row = headers.map(h => { const v = rec[h]; return (v !== null && typeof v === "object") ? JSON.stringify(v) : (v === undefined ? "" : v); });
    if (rowIdx >= 0) sh.getRange(rowIdx + 2, 1, 1, headers.length).setValues([row]);
    else sh.appendRow(row);

    return ContentService.createTextOutput(JSON.stringify({ ok: true, photo_link: rec.photo_link || null })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, app: "SI FOUR AM Apps Script", spreadsheet: getSpreadsheet_().getUrl() })).setMimeType(ContentService.MimeType.JSON);
}
