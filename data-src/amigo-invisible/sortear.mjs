import { randomInt } from 'node:crypto';
import { parseArgs } from 'node:util';
import { writeDraw } from './escribir-sorteo.mjs';

try {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      fijo: { type: 'string', multiple: true },
      salida: { type: 'string' },
    },
  });
  if (!values.salida) throw new Error('Indica el archivo HTML de destino con --salida.');
  const names = positionals.map(name => name.trim());
  const people = new Set(names);
  if (names.length < 2 || names.includes('') || people.size !== names.length) {
    throw new Error('Indica al menos dos nombres distintos y no vacios.');
  }

  const fixed = new Map();
  const reserved = new Set();
  for (const pair of values.fijo ?? []) {
    const [giver, recipient, extra] = pair.split(':').map(name => name.trim());
    if (extra !== undefined || !people.has(giver) || !people.has(recipient)
      || giver === recipient || fixed.has(giver) || reserved.has(recipient)) {
      throw new Error(`Asignacion fija no valida: ${pair}.`);
    }
    fixed.set(giver, recipient);
    reserved.add(recipient);
  }

  const givers = names.filter(name => !fixed.has(name));
  const recipients = names.filter(name => !reserved.has(name));
  if (givers.length === 1 && givers[0] === recipients[0]) {
    throw new Error('Las asignaciones fijas no dejan un reparto posible.');
  }

  do {
    for (let index = recipients.length - 1; index > 0; index--) {
      const swap = randomInt(index + 1);
      [recipients[index], recipients[swap]] = [recipients[swap], recipients[index]];
    }
  } while (givers.some((name, index) => name === recipients[index]));

  let next = 0;
  const assignments = names.map(name => ({
    regala: name,
    recibe: fixed.get(name) ?? recipients[next++],
    fija: fixed.has(name),
  }));
  writeDraw(assignments, values.salida);
} catch (error) {
  console.error(error.message);
  console.error('Uso: node sortear.mjs Nombre1 Nombre2 [...] [--fijo=Nombre1:Nombre2] --salida=ruta.html');
  process.exitCode = 1;
}