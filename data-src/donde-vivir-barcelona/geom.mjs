/**
 * Geometría compartida por los scripts de datos.
 *
 * Vivía dentro de fetch-linies.mjs; la usa también build-transport.mjs para
 * aligerar los polígonos de las zonas, así que se saca aquí en vez de tenerla
 * duplicada en dos sitios con el riesgo de que se separen.
 *
 * Todo trabaja en pares [lon, lat] en grados, con las tolerancias en metros.
 */

/** Latitud de referencia del área de Barcelona, para corregir la longitud.
    A 41,45° un grado de longitud vale un 25 % menos que uno de latitud: sin
    esta corrección una tolerancia «en grados» sería anisótropa y simplificaría
    más en el eje este-oeste que en el norte-sur. */
export const LAT0 = 41.45;
const KX = Math.cos(LAT0 * Math.PI / 180);
const M_PER_DEG = 111320;

/** Distancia al cuadrado, en grados de latitud corregidos, del punto p al
    segmento a-b. Se usa al cuadrado para no pagar una raíz por vértice. */
function distSegQuad(p, a, b) {
  let px = (p[0] - a[0]) * KX, py = p[1] - a[1];
  const bx = (b[0] - a[0]) * KX, by = b[1] - a[1];
  const ll = bx * bx + by * by;
  if (ll > 0) {
    const t = Math.max(0, Math.min(1, (px * bx + py * by) / ll));
    px -= bx * t; py -= by * t;
  }
  return px * px + py * py;
}

/**
 * Douglas-Peucker con tolerancia métrica. Iterativo, no recursivo: un anillo
 * costero puede tener miles de vértices y la recursión se desborda.
 *
 * @param {Array<[number,number]>} pts
 * @param {number} tolM  tolerancia en metros
 */
export function simplifica(pts, tolM) {
  if (pts.length <= 2) return pts;
  const tol = tolM / M_PER_DEG;
  const tol2 = tol * tol;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const pila = [[0, pts.length - 1]];
  while (pila.length) {
    const [i, j] = pila.pop();
    let best = -1, bd = tol2;
    for (let k = i + 1; k < j; k++) {
      const d = distSegQuad(pts[k], pts[i], pts[j]);
      if (d > bd) { bd = d; best = k; }
    }
    if (best > 0) { keep[best] = 1; pila.push([i, best], [best, j]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/**
 * Simplifica un anillo cerrado de polígono conservando el cierre.
 *
 * Un anillo no es una polilínea: el primer y el último punto son el mismo, y
 * Douglas-Peucker los fija a los dos, así que el vértice de cierre nunca se
 * mueve aunque sea irrelevante. Peor: si el anillo se queda por debajo de
 * cuatro puntos deja de ser un polígono válido. Aquí se simplifica el anillo
 * abierto y se vuelve a cerrar, y si el resultado degenera se devuelve `null`
 * para que quien llame decida — descartar una isla de 30 m es correcto, pero
 * emitir un anillo roto no.
 */
export function simplificaAnell(ring, tolM) {
  const tancat = ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
  const obert = tancat ? ring.slice(0, -1) : ring.slice();
  if (obert.length < 3) return null;
  let out = simplifica(obert, tolM);
  if (out.length < 3) return null;
  out.push([out[0][0], out[0][1]]);
  return out;
}

/** Redondea a `d` decimales. A 5 decimales el error es ~1 m: por debajo de
    cualquier tolerancia que usemos, y ahorra la mitad del fichero. */
export const redon = (v, d = 5) => {
  const k = 10 ** d;
  return Math.round(v * k) / k;
};

/** Recorre los anillos de una geometría GeoJSON (Polygon o MultiPolygon). */
export function eachRing(geom, cb) {
  if (!geom) return;
  if (geom.type === "Polygon") geom.coordinates.forEach(cb);
  else if (geom.type === "MultiPolygon") geom.coordinates.forEach(p => p.forEach(cb));
}

/**
 * Simplifica una geometría entera de GeoJSON. Devuelve `null` si no queda
 * ningún anillo exterior válido.
 */
export function simplificaGeometria(geom, tolM, dec = 5) {
  const red = (ring) => ring.map(([lo, la]) => [redon(lo, dec), redon(la, dec)]);
  const poli = (rings) => {
    const out = [];
    for (const r of rings) {
      const s = simplificaAnell(r, tolM);
      // Solo el anillo exterior (el primero) obliga: si se pierde, el polígono
      // entero se va. Un agujero que degenera simplemente no se dibuja.
      if (!s) { if (out.length === 0) return null; continue; }
      out.push(red(s));
    }
    return out.length ? out : null;
  };

  if (geom.type === "Polygon") {
    const p = poli(geom.coordinates);
    return p && { type: "Polygon", coordinates: p };
  }
  if (geom.type === "MultiPolygon") {
    const ps = geom.coordinates.map(poli).filter(Boolean);
    return ps.length ? { type: "MultiPolygon", coordinates: ps } : null;
  }
  return null;
}

/** Cuenta vértices de una geometría, para los informes de los build-*. */
export function contaVertexs(geom) {
  let n = 0;
  eachRing(geom, (r) => { n += r.length; });
  return n;
}

/**
 * Desplazamiento máximo, en metros, del anillo simplificado respecto al
 * original: para cada vértice del original, la distancia a la polilínea
 * simplificada. Es la comprobación de que la simplificación no miente más de lo
 * que dice — la usa el test.
 */
export function desviacioMaxima(ringOrig, ringSimp) {
  let peor = 0;
  for (const p of ringOrig) {
    let millor = Infinity;
    for (let i = 0; i + 1 < ringSimp.length; i++) {
      const d = distSegQuad(p, ringSimp[i], ringSimp[i + 1]);
      if (d < millor) millor = d;
    }
    if (millor > peor) peor = millor;
  }
  return Math.sqrt(peor) * M_PER_DEG;
}
