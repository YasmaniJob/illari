const fs = require('fs');
const path = require('path');

// Target CSV path
const csvPath = path.join(__dirname, '..', 'src', 'data', 'curriculo.csv');

// Source data directory
const dataDir = path.join(__dirname, '..', 'data');

// List of JSON files to compile (all area files)
const jsonFiles = [
  'personal_social.json',
  'psicomotriz.json',
  'descubrimiento_mundo.json',
  'comunicacion.json',
  'matematica.json',
  'ciencia_tecnologia.json',
  'castellano_segunda_lengua.json',
];

// Predefined age order for sorting
const EDAD_ORDER = ['1 año', '2 años', '3 años', '4 años', '5 años'];

let allRows = [];

jsonFiles.forEach((file) => {
  const filePath = path.join(dataDir, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`Warning: File not found: ${file}`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const areaName = data.area.nombre;

  data.area.competencias.forEach((comp) => {
    const compName = comp.nombre;
    const capacities = comp.capacidades.map((c) => c.nombre);

    if (capacities.length === 0) {
      console.warn(`Warning: Competency "${compName}" in area "${areaName}" has no capacities.`);
      return;
    }

    comp.desempenios.forEach((des) => {
      const ciclo = des.ciclo_id;
      
      // Map developmentally detailed age groups to school grades based on grado_id
      let edad = des.edad;
      if (des.grado_id === 'ini-1-anio') {
        edad = '1 año';
      } else if (des.grado_id === 'ini-2-anios') {
        edad = '2 años';
      } else if (des.grado_id === 'ini-3-anios') {
        edad = '3 años';
      } else if (des.grado_id === 'ini-4-anios') {
        edad = '4 años';
      } else if (des.grado_id === 'ini-5-anios') {
        edad = '5 años';
      }

      des.descripcion.forEach((desc, idx) => {
        // Map desempeño description to capacity using modulo
        const capName = capacities[idx % capacities.length];

        allRows.push({
          ciclo,
          edad,
          area: areaName,
          competencia: compName,
          capacidad: capName,
          criterio: desc.trim(),
        });
      });
    });
  });
});

// Sort rows logically
allRows.sort((a, b) => {
  // 1. Sort by ciclo (ciclo-I before ciclo-II)
  if (a.ciclo !== b.ciclo) {
    return a.ciclo.localeCompare(b.ciclo);
  }

  // 2. Sort by edad using EDAD_ORDER index
  const idxA = EDAD_ORDER.indexOf(a.edad);
  const idxB = EDAD_ORDER.indexOf(b.edad);
  if (idxA !== idxB) {
    return idxA - idxB;
  }

  // 3. Sort by area name
  if (a.area !== b.area) {
    return a.area.localeCompare(b.area, 'es');
  }

  // 4. Sort by competencia name
  if (a.competencia !== b.competencia) {
    return a.competencia.localeCompare(b.competencia, 'es');
  }

  // 5. Sort by capacidad name
  if (a.capacidad !== b.capacidad) {
    return a.capacidad.localeCompare(b.capacidad, 'es');
  }

  // 6. Sort by criterio text
  return a.criterio.localeCompare(b.criterio, 'es');
});

// Escape CSV field helper
function escapeCsv(val) {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

// Build CSV content
const csvHeader = 'ciclo,edad,area,competencia,capacidad,criterio\n';
const csvLines = allRows
  .map(
    (row) =>
      `${row.ciclo},${row.edad},${escapeCsv(row.area)},${escapeCsv(row.competencia)},${escapeCsv(row.capacidad)},${escapeCsv(row.criterio)}`,
  )
  .join('\n');

// Write to file
fs.mkdirSync(path.dirname(csvPath), { recursive: true });
fs.writeFileSync(csvPath, csvHeader + csvLines + '\n', 'utf8');

console.log(`Successfully compiled ${allRows.length} rows to ${csvPath}`);
