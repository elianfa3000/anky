export type NoteRow = {
  id: number;
  mid: number; // model id
  flds: string; // campos separados por \x1f
  tags: string; // espacio-separado
};

export type CardRow = {
  id: number;
  nid: number; // note id
  did: number; // deck id (no lo usamos aún)
  ord: number; // índice de plantilla
  type: number;
  queue: number;
  ivl: number;
  due: number;
  factor: number;
};

export type MediaEntry = {
  id: string; // "0", "1", ...
  fname: string; // nombre real en el texto de la nota
  blob: Blob;
  url: string;
};

export type SimpleCard = {
  cardId: number;
  noteId: number;
  fields: string[]; // todos los campos originales
  htmlFront: string; // front renderizado (con media resuelta)
  htmlBack: string; // back renderizado (con media resuelta)
  audioUrls?: string[]; // TODOS los audios encontrados en la nota
};
