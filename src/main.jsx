import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function timeOf(value) {
  if (!value) return '—';

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
}

function dateOf(value) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00+07:00`));
}

function durationOf(minutes) {
  return `${Math.floor(minutes / 60)}j ${minutes % 60}m`;
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Permintaan tidak berhasil.');
  }

  return result;
}

function App() {
  const [employeeName, setEmployeeName] = useState('');
  const [activeRecord, setActiveRecord] = useState(null);
  const [dashboard, setDashboard] = useState({
    records: [],
    today: new Date().toISOString().slice(0, 10),
    todayCount: 0,
    overtimeCount: 0,
    todayBonus: 0,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  const loadDashboard = useCallback(async () => {
    try {
      const result = await request('/api/attendance');
      setDashboard(result);
    } catch (error) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function checkIn(event) {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);

    try {
      const result = await request('/api/attendance/check-in', {
        method: 'POST',
        body: JSON.stringify({ employeeName }),
      });
      setActiveRecord(result.record);
      setNotice({ type: 'success', text: result.message });
      await loadDashboard();
    } catch (error) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function lookUpStatus() {
    if (!employeeName.trim()) {
      setNotice({ type: 'error', text: 'Masukkan nama karyawan terlebih dahulu.' });
      return;
    }

    setSubmitting(true);
    setNotice(null);

    try {
      const result = await request(`/api/attendance?nama=${encodeURIComponent(employeeName.trim())}`);
      setDashboard(result);

      if (result.selectedAttendance) {
        setActiveRecord(result.selectedAttendance);
        setNotice({ type: 'success', text: 'Data absensi hari ini ditemukan.' });
      } else {
        setActiveRecord(null);
        setNotice({ type: 'error', text: 'Belum ada absensi hari ini untuk nama tersebut.' });
      }
    } catch (error) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function checkOut() {
    setSubmitting(true);
    setNotice(null);

    try {
      const result = await request('/api/attendance/check-out', {
        method: 'POST',
        body: JSON.stringify({ employeeName: activeRecord.employeeName }),
      });
      setActiveRecord(result.record);
      setNotice({ type: 'success', text: result.message });
      await loadDashboard();
    } catch (error) {
      setNotice({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  const todayLabel = dashboard.today
    ? dateFormatter.format(new Date(`${dashboard.today}T00:00:00+07:00`))
    : 'Hari ini';

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="RuangKerja beranda">
          <span className="brand-icon"><BrandIcon /></span>
          <span>ruang<span className="brand-light">kerja</span></span>
        </a>
        <div className="topbar-right">
          <span className="live-dot" />
          <span>Sistem absensi aktif</span>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-line" /> ABSENSI HARIAN</p>
          <h1>Kerja baik,<br /><span>tercatat rapi.</span></h1>
          <p className="hero-description">Satu langkah kecil untuk hari kerja yang lebih teratur. Catat kehadiranmu dan fokus melakukan yang terbaik.</p>
          <div className="today-date"><CalendarIcon /> {todayLabel}</div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-sun" />
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-clock"><ClockIcon /><span>08<span className="clock-colon">:</span>00</span><small>WAKTU KERJA</small></div>
          <div className="art-spark spark-one">✳</div>
          <div className="art-spark spark-two">✳</div>
          <div className="art-pill"><span className="live-dot" /> Hari kerja produktif</div>
        </div>
      </section>

      <section className="stats-grid" aria-label="Ringkasan absensi hari ini">
        <StatCard icon={<PeopleIcon />} label="Hadir hari ini" value={loading ? '—' : dashboard.todayCount} footnote="karyawan tercatat" tone="green" />
        <StatCard icon={<OvertimeIcon />} label="Sedang lembur" value={loading ? '—' : dashboard.overtimeCount} footnote="melewati 8 jam kerja" tone="orange" />
        <StatCard icon={<BonusIcon />} label="Bonus lembur" value={loading ? '—' : rupiah.format(dashboard.todayBonus)} footnote="akumulasi hari ini" tone="lilac" />
      </section>

      <section className="content-grid">
        <article className="panel attendance-panel">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">MULAI HARI KERJAMU</p>
              <h2>Absensi</h2>
            </div>
            <span className="heading-icon"><FingerprintIcon /></span>
          </div>
          <p className="panel-description">Isi nama lengkap untuk mencatat atau melihat absensimu hari ini.</p>

          {notice && (
            <div className={`notice ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
              <span>{notice.type === 'success' ? '✓' : '!'}</span>
              {notice.text}
            </div>
          )}

          {!activeRecord && (
            <form onSubmit={checkIn}>
              <label htmlFor="employee-name">Nama lengkap</label>
              <input
                id="employee-name"
                type="text"
                maxLength="100"
                placeholder="Contoh: Budi Santoso"
                value={employeeName}
                onChange={(event) => {
                  setEmployeeName(event.target.value);
                  setNotice(null);
                }}
                autoComplete="name"
                required
              />
              <button className="primary-button" type="submit" disabled={submitting}>
                {submitting ? 'Memproses…' : <><span>Catat absen masuk</span><ArrowIcon /></>}
              </button>
              <button className="lookup-button" type="button" onClick={lookUpStatus} disabled={submitting}>
                Sudah absen? Lihat status hari ini
              </button>
            </form>
          )}

          {activeRecord && (
            <div className="attendance-status">
              <div className="employee-chip"><span className="avatar">{activeRecord.employeeName.slice(0, 1).toUpperCase()}</span><div><strong>{activeRecord.employeeName}</strong><small>{activeRecord.checkOutAt ? 'Absensi selesai' : 'Sedang bekerja'}</small></div></div>
              <div className="time-summary">
                <div><span>Waktu masuk</span><strong>{timeOf(activeRecord.checkInAt)}</strong></div>
                <div><span>Waktu pulang</span><strong>{timeOf(activeRecord.checkOutAt)}</strong></div>
                {activeRecord.checkOutAt && <div><span>Total kerja</span><strong>{durationOf(activeRecord.workMinutes)}</strong></div>}
              </div>
              {!activeRecord.checkOutAt ? (
                <>
                  <div className="bonus-hint"><BonusIcon /><span>Bonus <strong>Rp25.000</strong> jika bekerja lebih dari 8 jam.</span></div>
                  <button className="primary-button checkout-button" type="button" onClick={checkOut} disabled={submitting}>
                    {submitting ? 'Memproses…' : <>Catat absen pulang <ArrowIcon /></>}
                  </button>
                </>
              ) : (
                <div className={`result-banner ${activeRecord.overtimeMinutes > 0 ? 'earned' : ''}`}>
                  {activeRecord.overtimeMinutes > 0 ? <><span>✦</span> Lembur {durationOf(activeRecord.overtimeMinutes)} · Bonus {rupiah.format(activeRecord.bonusAmount)}</> : <>Hari kerja selesai · Tidak ada lembur</>}
                </div>
              )}
              <button className="lookup-button change-name" type="button" onClick={() => { setActiveRecord(null); setEmployeeName(''); setNotice(null); }}>
                Gunakan nama lain
              </button>
            </div>
          )}

          <div className="workday-note"><ClockIcon /><span>Jam kerja normal <strong>8 jam</strong><i>•</i> Bonus lembur tetap <strong>Rp25.000</strong></span></div>
        </article>

        <article className="panel history-panel">
          <div className="history-heading">
            <div><p className="panel-kicker">AKTIVITAS TERBARU</p><h2>Riwayat absensi</h2></div>
            <button className="refresh-button" type="button" onClick={loadDashboard} aria-label="Segarkan riwayat"><RefreshIcon /></button>
          </div>
          <p className="panel-description">Catatan absensi terbaru seluruh karyawan.</p>
          <div className="history-table-wrap">
            <table>
              <thead><tr><th>Karyawan</th><th>Tanggal</th><th>Jam masuk</th><th>Jam pulang</th><th>Bonus</th><th>Status</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="empty-row">Memuat catatan absensi…</td></tr>
                ) : dashboard.records.length === 0 ? (
                  <tr><td colSpan="6" className="empty-row">Belum ada absensi tercatat. Jadilah yang pertama!</td></tr>
                ) : dashboard.records.map((record) => (
                  <tr key={record.id}>
                    <td><span className="table-employee"><span className="table-avatar">{record.employeeName.slice(0, 1).toUpperCase()}</span>{record.employeeName}</span></td>
                    <td>{dateOf(record.workDate)}</td>
                    <td>{timeOf(record.checkInAt)}</td>
                    <td>{timeOf(record.checkOutAt)}</td>
                    <td className={record.bonusAmount > 0 ? 'bonus-value' : 'muted-cell'}>{record.bonusAmount > 0 ? rupiah.format(record.bonusAmount) : '—'}</td>
                    <td><span className={`status-badge ${record.checkOutAt ? 'complete' : 'working'}`}><i />{record.checkOutAt ? 'Selesai' : 'Bekerja'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-foot"><span>Menampilkan maks. 30 catatan terbaru</span><span className="secure-note"><LockIcon /> Data lokal</span></div>
        </article>
      </section>

      <footer className="footer"><span>RuangKerja <i>·</i> Absensi yang sederhana, hari kerja yang lebih baik.</span><span>Zona waktu WIB <i>(UTC+7)</i></span></footer>
    </main>
  );
}

function StatCard({ icon, label, value, footnote, tone }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div className="stat-text"><span>{label}</span><strong>{value}</strong><small>{footnote}</small></div>
      <span className={`stat-decoration ${tone}`} />
    </article>
  );
}

function BrandIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19V8.5l7-4 7 4V19M9 19v-6h6v6M3 19h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function CalendarIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" /><path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>;
}

function ClockIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" /><path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PeopleIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM16 4.2a3.5 3.5 0 0 1 0 6.7m2.3 4.2a3.5 3.5 0 0 1 1.7 3v1.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

function OvertimeIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" /><path d="M12 7v5l3 1.8M18.5 5.5l1.5-1.5M5.5 5.5 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>;
}

function BonusIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.5 14.5 9l6 .7-4.5 4 1.3 6-5.3-3.1-5.3 3.1 1.3-6-4.5-4 6-.7L12 3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>;
}

function FingerprintIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 11a2 2 0 0 0-2 2c0 2.7-.4 5-1.2 7M12 7a6 6 0 0 0-6 6c0 2-.2 3.7-.7 5.2M12 3.5A9.5 9.5 0 0 0 2.5 13c0 .8 0 1.5-.1 2.2M12 11a2 2 0 0 1 2 2c0 3.4-.5 6.1-1.4 8.5M12 7a6 6 0 0 1 6 6c0 2.3-.2 4.4-.7 6.2M12 3.5a9.5 9.5 0 0 1 9.5 9.5c0 .8 0 1.5-.1 2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
}

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function RefreshIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5m9.2-2A6.5 6.5 0 0 0 7 7.2L5 9m14 6-2 1.8A6.5 6.5 0 0 1 6 14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function LockIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" /><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 4v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>;
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
