export const STORAGE_KEY = 'aula-inferencia:v1';
export const PROGRESS_VERSION = 1;

function lessonIds(course) {
  return course.units.flatMap(unit => unit.lessons.map(lesson => lesson.id));
}

export function freshProgress(course) {
  return {version:PROGRESS_VERSION, courseId:course.id, studied:[], checks:{}, attempts:{}, lastLesson:lessonIds(course)[0]};
}

export function parseProgress(raw, course) {
  if (typeof raw !== 'string' || raw.length > 2000000) throw new TypeError('La copia debe ser un archivo JSON de menos de 2 MB.');
  const data = JSON.parse(raw);
  if (!data || data.version !== PROGRESS_VERSION || data.courseId !== course.id) throw new TypeError('La copia no corresponde a esta versión del aula de inferencia.');
  const ids = new Set(lessonIds(course));
  if (!Array.isArray(data.studied) || data.studied.some(id => !ids.has(id))) throw new TypeError('La copia contiene lecciones no reconocidas.');
  const checks = {};
  if (!data.checks || typeof data.checks !== 'object' || Array.isArray(data.checks)) throw new TypeError('Las comprobaciones del archivo no son válidas.');
  for (const [id, solved] of Object.entries(data.checks)) {
    if (!ids.has(id) || typeof solved !== 'boolean') throw new TypeError('La copia contiene comprobaciones no reconocidas.');
    checks[id] = solved;
  }
  if (!data.attempts || typeof data.attempts !== 'object' || Array.isArray(data.attempts) || Object.keys(data.attempts).length > 5000) throw new TypeError('El historial de ejercicios no es válido.');
  const attempts = {};
  for (const [key, entry] of Object.entries(data.attempts)) {
    if (!/^[a-z][a-z-]*-\d{1,10}\/[a-z][a-z0-9-]*$/.test(key) || !entry || !Number.isInteger(entry.count) || entry.count < 0 || entry.count > 1000000 || typeof entry.solved !== 'boolean' || typeof entry.assisted !== 'boolean') throw new TypeError('La copia contiene intentos no válidos.');
    attempts[key] = {count:entry.count, solved:entry.solved, assisted:entry.assisted};
  }
  return {version:PROGRESS_VERSION, courseId:course.id, studied:[...new Set(data.studied)], checks, attempts, lastLesson:ids.has(data.lastLesson) ? data.lastLesson : lessonIds(course)[0]};
}

export function loadProgress(storage, course) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    return {progress:raw ? parseProgress(raw, course) : freshProgress(course), warning:''};
  } catch {
    return {progress:freshProgress(course), warning:'No se pudo recuperar el progreso guardado. El aula funciona, pero exporta una copia si este navegador bloquea el almacenamiento.'};
  }
}

export function saveProgress(storage, progress) {
  try {
    if (!storage) throw new Error('Almacenamiento no disponible');
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function recordAnswer(progress, key, correct, assisted = false) {
  const previous = progress.attempts[key] || {count:0, solved:false, assisted:false};
  progress.attempts[key] = {count:Math.min(previous.count + 1, 1000000), solved:previous.solved || correct, assisted:previous.assisted || assisted};
}

export function recordAssistance(progress, key) {
  const previous = progress.attempts[key] || {count:0, solved:false, assisted:false};
  progress.attempts[key] = {...previous, assisted:true};
}

export function progressSummary(progress) {
  const entries = Object.values(progress.attempts);
  return {studied:progress.studied.length, checks:Object.values(progress.checks).filter(Boolean).length, attempts:entries.reduce((total, entry) => total + entry.count, 0), solved:entries.filter(entry => entry.solved).length, independent:entries.filter(entry => entry.solved && !entry.assisted).length, assisted:entries.filter(entry => entry.solved && entry.assisted).length};
}