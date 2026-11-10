// Northwind staffing grid shaped for a 9-agent team on 8.5h shifts (07:00–22:00, Mon–Fri):
// ~350 agent-hours a week, so Generate lands close to the requirement and Publish flags
// only a handful of intervals rather than a wall of overstaffing.
import ExcelJS from 'exceljs';

const QUEUE = 'Voice – Northwind';
const FROM = '2026-10-19';
const TO = '2026-11-08';
export const GRID_FILE = 'C:/dev/freelance/wfm-demo-video/setup/northwind-staffing-grid.xlsx';

function base(min: number): number {
  const h = min / 60;
  if (h < 8) return 3;
  if (h < 9) return 4;
  if (h < 13.5) return 6;
  if (h < 15.5) return 7;
  if (h < 17.5) return 5;
  if (h < 20) return 3;
  return 2;
}

const DAY_FACTOR = [0, 1.08, 1.0, 0.97, 1.0, 0.94, 0]; // Sun..Sat; weekends closed

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function buildGrid(file = GRID_FILE): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');
  ws.addRow(['Date', 'Interval', 'Queue', 'Requirement']);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let d = FROM; d <= TO; d = addDays(d, 1)) {
    const f = DAY_FACTOR[new Date(`${d}T00:00:00Z`).getUTCDay()]!;
    for (let m = 7 * 60; m < 22 * 60; m += 15) {
      const r = rand();
      const noise = r < 0.12 ? -1 : r > 0.9 ? 1 : 0;
      const v = f === 0 ? 0 : Math.max(1, Math.round(base(m) * f) + noise);
      ws.addRow([d, `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`, QUEUE, v]);
    }
  }
  ws.getRow(1).font = { bold: true };
  [12, 10, 20, 13].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  await wb.xlsx.writeFile(file);
}

if (process.argv[2] === 'build') { await buildGrid(); console.log('grid written', GRID_FILE); }
