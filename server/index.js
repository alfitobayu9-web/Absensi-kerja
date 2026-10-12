import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import {
  calculateOvertime,
  calculateWorkMinutes,
  jakartaDate,
  normalizeName,
} from './attendance.js';

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));
const dataFile = process.env.ATTENDANCE_FILE
  ? path.resolve(process.env.ATTENDANCE_FILE)
  : path.join(projectDirectory, '..', 'data', 'attendance.json');
const dataDirectory = path.dirname(dataFile);
const app = express();
const port = Number(process.env.PORT || 3001);
let writeQueue = Promise.resolve();

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));

async function readAttendance() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    const content = await readFile(dataFile, 'utf8');
    const attendance = JSON.parse(content);

    if (!Array.isArray(attendance)) {
      throw new Error('Isi file absensi harus berupa array JSON.');
    }

    return attendance;
  } catch (error) {
    if (error.code === 'ENOENT') {
      await writeFile(dataFile, '[]\n', 'utf8');
      return [];
    }

    throw error;
  }
}

async function saveAttendance(attendance) {
  const temporaryFile = `${dataFile}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporaryFile, `${JSON.stringify(attendance, null, 2)}\n`, 'utf8');

  try {
    await rename(temporaryFile, dataFile);
  } catch (error) {
    try {
      await unlink(temporaryFile);
    } catch (cleanupError) {
      console.error('Gagal membersihkan file sementara absensi:', cleanupError);
    }
    throw error;
  }
}

function withWriteLock(operation) {
  const result = writeQueue.then(operation, operation);
  writeQueue = result.then(() => undefined, () => undefined);

  return result;
}

function requireEmployeeName(request, response, next) {
  const name = typeof request.body?.employeeName === 'string'
    ? request.body.employeeName.trim().replace(/\s+/g, ' ')
    : '';

  if (!name || name.length > 100) {
    return response.status(422).json({
      message: 'Nama karyawan wajib diisi dan maksimal 100 karakter.',
    });
  }

  request.employeeName = name;
  next();
}

app.get('/api/attendance', async (request, response, next) => {
  try {
    await writeQueue;
    const attendance = await readAttendance();
    const today = jakartaDate();
    const todayRecords = attendance.filter((record) => record.workDate === today);
    const requestedName = typeof request.query.nama === 'string'
      ? normalizeName(request.query.nama)
      : '';

    response.json({
      records: attendance
        .slice()
        .sort((first, second) => second.checkInAt.localeCompare(first.checkInAt))
        .slice(0, 30),
      selectedAttendance: requestedName
        ? todayRecords.find((record) => normalizeName(record.employeeName) === requestedName) || null
        : null,
      today,
      todayCount: todayRecords.length,
      overtimeCount: todayRecords.filter((record) => record.overtimeMinutes > 0).length,
      todayBonus: todayRecords.reduce((total, record) => total + record.bonusAmount, 0),
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/attendance/check-in', requireEmployeeName, async (request, response, next) => {
  try {
    const record = await withWriteLock(async () => {
      const attendance = await readAttendance();
      const today = jakartaDate();
      const nameKey = normalizeName(request.employeeName);
      const existingRecord = attendance.find(
        (entry) => entry.workDate === today && normalizeName(entry.employeeName) === nameKey,
      );

      if (existingRecord) {
        const error = new Error(existingRecord.checkOutAt
          ? 'Absensi untuk hari ini sudah selesai.'
          : 'Anda sudah melakukan absen masuk hari ini.');
        error.status = 409;
        throw error;
      }

      const checkInAt = new Date().toISOString();
      const newRecord = {
        id: randomUUID(),
        employeeName: request.employeeName,
        workDate: today,
        checkInAt,
        checkOutAt: null,
        workMinutes: 0,
        overtimeMinutes: 0,
        bonusAmount: 0,
      };

      attendance.push(newRecord);
      await saveAttendance(attendance);

      return newRecord;
    });

    response.status(201).json({ message: 'Absen masuk berhasil dicatat.', record });
  } catch (error) {
    next(error);
  }
});

app.post('/api/attendance/check-out', requireEmployeeName, async (request, response, next) => {
  try {
    const record = await withWriteLock(async () => {
      const attendance = await readAttendance();
      const today = jakartaDate();
      const nameKey = normalizeName(request.employeeName);
      const existingRecord = attendance.find(
        (entry) => entry.workDate === today && normalizeName(entry.employeeName) === nameKey,
      );

      if (!existingRecord) {
        const error = new Error('Data absen masuk hari ini tidak ditemukan.');
        error.status = 404;
        throw error;
      }

      if (existingRecord.checkOutAt) {
        const error = new Error('Absen pulang hari ini sudah tercatat.');
        error.status = 409;
        throw error;
      }

      const checkOutAt = new Date().toISOString();
      const workMinutes = calculateWorkMinutes(existingRecord.checkInAt, checkOutAt);
      const { overtimeMinutes, bonusAmount } = calculateOvertime(workMinutes);

      Object.assign(existingRecord, {
        checkOutAt,
        workMinutes,
        overtimeMinutes,
        bonusAmount,
      });
      await saveAttendance(attendance);

      return existingRecord;
    });

    const message = record.overtimeMinutes > 0
      ? 'Absen pulang berhasil. Bonus lembur Rp25.000 sudah dicatat.'
      : 'Absen pulang berhasil dicatat.';
    response.json({ message, record });
  } catch (error) {
    next(error);
  }
});

app.use('/api', (request, response) => {
  response.status(404).json({ message: 'Endpoint API tidak ditemukan.' });
});

const buildDirectory = path.join(projectDirectory, '..', 'dist');
if (existsSync(buildDirectory)) {
  app.use(express.static(buildDirectory));
  app.get('*', (request, response) => {
    response.sendFile(path.join(buildDirectory, 'index.html'));
  });
}

app.use((error, request, response, next) => {
  if (response.headersSent) {
    return next(error);
  }

  if (error.status && error.status < 500) {
    return response.status(error.status).json({ message: error.message });
  }

  console.error('Kesalahan API absensi:', error);
  response.status(500).json({ message: 'Terjadi kesalahan saat memproses absensi.' });
});

readAttendance()
  .then(() => {
    app.listen(port, '127.0.0.1', () => {
      console.log(`API absensi berjalan di http://127.0.0.1:${port}`);
    });
  })
  .catch((error) => {
    console.error('Gagal menyiapkan penyimpanan JSON absensi:', error);
    process.exitCode = 1;
  });
