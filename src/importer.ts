import JSZip from "jszip";
import initSqlJs from "sql.js";
import type { NoteRow, CardRow, MediaEntry, SimpleCard } from "./types";

const FIELD_SEP = "\x1f";

function rowify(stmt: any) {
  const rows: any[] = [];
  const names = stmt.getColumnNames();
  while (stmt.step()) {
    const values = stmt.get();
    console.log(values);
    const row: any = {};
    names.forEach((n: string, i: number) => (row[n] = values[i]));

    rows.push(row);
  }
  stmt.free();
  return rows;
}

export async function importApkg(file: File) {
  // 1) Abrir ZIP
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  // 2) Leer "media" (JSON que mapea "0":"nombre.ext", ...)
  const mediaJson = await zip.file("media")?.async("string");
  const mediaMap: Record<string, string> = mediaJson
    ? JSON.parse(mediaJson)
    : {};

  const mediaEntries: MediaEntry[] = [];
  for (const id of Object.keys(mediaMap)) {
    const zf = zip.file(id);
    if (!zf) continue;
    const blob = new Blob([await zf.async("arraybuffer")]);
    const url = URL.createObjectURL(blob);
    mediaEntries.push({ id, fname: mediaMap[id], blob, url });
  }

  // 3) Abrir SQLite "collection.anki2"
  const dbBuf = await zip.file("collection.anki2")!.async("arraybuffer");
  const SQL = await initSqlJs({ locateFile: (f: string) => `/${f}` }); // requiere public/sql-wasm.wasm
  const db = new SQL.Database(new Uint8Array(dbBuf));

  // 4) Leer tablas necesarias
  const notesStmt = db.prepare("SELECT id, mid, flds, tags FROM notes");
  const cardsStmt = db.prepare(
    "SELECT id, nid, did, ord, type, queue, ivl, due, factor FROM cards"
  );
  const colStmt = db.prepare("SELECT models FROM col");

  const notes = rowify(notesStmt) as NoteRow[];
  const cards = rowify(cardsStmt) as CardRow[];
  const colRow = rowify(colStmt)[0] || { models: "{}" };
  const modelsObj = JSON.parse(colRow.models || "{}"); // { [modelId]: { flds, tmpls, ... } }

  // 5) Índices y mapas
  const noteMap = new Map<number, NoteRow>();
  notes.forEach((n) => noteMap.set(n.id, n));

  const mediaByName = new Map<string, string>(); // fname -> blob URL
  mediaEntries.forEach((m) => mediaByName.set(m.fname, m.url));

  // --- Media helpers ---
  const resolveMedia = (html: string): string => {
    if (!html) return html;

    let out = html;

    // Reemplazar src="archivo.ext" por URL blob
    out = out.replace(/(src)=["']([^"']+)["']/g, (_full, attr, name) => {
      const url = mediaByName.get(name);
      return url ? `${attr}="${url}"` : _full;
    });

    // [sound:xxx.mp3] → <audio>
    out = out.replace(/\[sound:([^\]]+)\]/g, (_full, fname) => {
      const url = mediaByName.get(fname);
      return url
        ? `<audio controls preload="none" src="${url}"></audio>`
        : _full;
    });

    return out;
  };

  // Extraer todas las URLs de audio presentes en los campos (aunque la plantilla no los use)
  const soundRegex = /\[sound:([^\]]+)\]/g;
  function extractAudioUrlsFromFields(fields: string[]) {
    const urls: string[] = [];
    for (const f of fields) {
      let m: RegExpExecArray | null;
      while ((m = soundRegex.exec(f)) !== null) {
        const fname = m[1];
        const url = mediaByName.get(fname);
        if (url) urls.push(url);
      }
    }
    return urls;
  }

  // --- helpers para modelos ---
  // Note → diccionario campo->valor (usando nombres del modelo)
  function fieldsByName(note: NoteRow, model: any) {
    const values = note.flds.split(FIELD_SEP);
    const dict: Record<string, string> = {};
    (model.flds || []).forEach((f: any, i: number) => {
      dict[f.name] = (values[i] || "").trim();
    });
    return dict;
  }

  // Render minimal de plantilla ({{Campo}} y {{type:Campo}})
  function renderTemplate(tmpl: string, fieldDict: Record<string, string>) {
    if (!tmpl) return "";
    let html = tmpl.replace(
      /\{\{\s*([^}:]+)\s*\}\}/g,
      (_m, name) => fieldDict[name] ?? ""
    );
    html = html.replace(
      /\{\{\s*type:([^}]+)\s*\}\}/g,
      (_m, name) => fieldDict[name] ?? ""
    );
    return resolveMedia(html);
  }

  // Heurística fallback si no hay modelo/plantilla usable
  function pickFrontBack(fields: string[]) {
    const isMedia = (s: string) => /<img|<audio|<video|\[sound:/i.test(s);
    const onlyMedia = (s: string) =>
      isMedia(s) && s.replace(/<[^>]+>|\[sound:[^\]]+\]/g, "").trim() === "";
    const spanishish = (s: string) => /[áéíóúñ]/i.test(s);

    let frontIdx = fields.findIndex(
      (f) => !onlyMedia(f) && f.trim().length > 0 && f.trim().length <= 60
    );
    if (frontIdx === -1) frontIdx = 0;

    let backIdx = fields.findIndex(
      (f, i) =>
        i !== frontIdx && !onlyMedia(f) && (spanishish(f) || f.length > 60)
    );
    if (backIdx === -1) backIdx = frontIdx === 0 ? 1 : 0;

    return { frontIdx, backIdx };
  }

  // --- construir tarjetas ---
  const simpleCards: SimpleCard[] = [];

  for (const c of cards) {
    const note = noteMap.get(c.nid);
    if (!note) continue;

    const fieldsArr = note.flds.split(FIELD_SEP);
    const audioUrls = extractAudioUrlsFromFields(fieldsArr);

    const model = modelsObj[note.mid];
    if (model && model.tmpls && model.tmpls[c.ord]) {
      // con modelo y plantilla
      const dict = fieldsByName(note, model);
      const qfmt = model.tmpls[c.ord]?.qfmt ?? "";
      const afmt = model.tmpls[c.ord]?.afmt ?? "";
      const htmlFront = renderTemplate(qfmt, dict);
      const htmlBack = renderTemplate(afmt, dict);

      simpleCards.push({
        cardId: c.id,
        noteId: note.id,
        fields: fieldsArr,
        htmlFront,
        htmlBack,
        audioUrls,
      });
    } else {
      // fallback heurístico (modelos raros o faltantes)
      const { frontIdx, backIdx } = pickFrontBack(fieldsArr);
      simpleCards.push({
        cardId: c.id,
        noteId: note.id,
        fields: fieldsArr,
        htmlFront: resolveMedia(fieldsArr[frontIdx] || ""),
        htmlBack: resolveMedia(fieldsArr[backIdx] || ""),
        audioUrls,
      });
    }
  }

  db.close();

  // Logs útiles para depurar
  console.log("Tarjetas generadas:", simpleCards);
  console.log("Media importada:", mediaEntries);

  return { cards: simpleCards, media: mediaEntries };
}
