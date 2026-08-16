// SmartBus Driver Dashboard — trip management, GPS, boarding and drowsiness safety system.
(() => {
  if (!auth.guard()) return;

  const $ = (id) => document.getElementById(id);
  const user = api.store.user;
  const driverId = user?.profile?.id;
  let bus = null;
  let activeTrip = null;
  let watchId = null;

  // ---------------- Safety / drowsiness state ----------------
  let safetyState = 'NORMAL'; // NORMAL | SUSPECTED | WARNING | SOS
  let warningTimer = null;
  let eyesClosedMs = 0;
  const WARN_DELAY_MS = 4000; // eyes closed before warning
  const SOS_DELAY_MS = 15000; // no acknowledgement before SOS

  function setDetectState(state) {
    safetyState = state;
    document.querySelectorAll('.dstate').forEach((el) => el.classList.remove('active', 'sos-active'));
    const map = { NORMAL: 'NORMAL', SUSPECTED: 'SUSPECTED', WARNING: 'WARNING', SOS: 'SOS' };
    const el = document.querySelector(`.dstate[data-state="${map[state]}"]`);
    if (el) { el.classList.add('active'); if (state === 'SOS') el.classList.add('sos-active'); }
    const banner = $('safety-banner');
    if (state === 'WARNING' || state === 'SOS') banner.hidden = false;
    if (state === 'NORMAL' || state === 'SUSPECTED') banner.hidden = true;
    if (state === 'SOS') $('sos-overlay').hidden = false;
  }

  function reportDrowsiness(state) {
    if (!bus) return;
    return api.post('/alerts/safety/drowsiness', {
      bus_id: bus.id,
      driver_id: driverId,
      state,
    }).then((r) => r.data).catch(() => null);
  }

  function beginWarning() {
    if (safetyState !== 'SUSPECTED' && safetyState !== 'NORMAL') return;
    setDetectState('WARNING');
    $('sb-bus').textContent = bus?.bus_number || '—';
    $('sb-driver').textContent = user?.name || '—';
    $('sb-time').textContent = new Date().toLocaleTimeString();
    playWarningSound();
    reportDrowsiness('WARNING');
    toast.warning('Driver drowsiness detected — please acknowledge.');

    const start = Date.now();
    warningTimer = setInterval(() => {
      const left = Math.max(0, Math.round((SOS_DELAY_MS - (Date.now() - start)) / 1000));
      $('safety-countdown').textContent = left > 0 ? `SOS in ${left}s` : 'SOS now';
      if (left <= 0) {
        clearInterval(warningTimer);
        triggerSOS();
      }
    }, 1000);
  }

  function triggerSOS() {
    setDetectState('SOS');
    clearInterval(warningTimer);
    reportDrowsiness('SOS');
    $('sb-time').textContent = new Date().toLocaleTimeString();
    toast.error('🚨 SOS activated — location sent to school and emergency contacts.');
  }

  function acknowledge() {
    clearInterval(warningTimer);
    setDetectState('NORMAL');
    eyesClosedMs = 0;
    reportDrowsiness('NORMAL');
    toast.success('Acknowledged — thank you. Stay alert!');
  }

  let audioCtx = null;
  function playWarningSound() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.5, 1].forEach((delay, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + 0.4);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + delay); osc.stop(audioCtx.currentTime + delay + 0.4);
      });
    } catch (e) { /* audio not available */ }
  }

  // ---------------- Camera + eye detection ----------------
  let videoStream = null;
  let detectionLoop = null;

  async function startCamera() {
    try {
      videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      const video = $('cam-video');
      video.srcObject = videoStream;
      video.hidden = false;
      $('cam-placeholder').hidden = true;
      await video.play();
      $('btn-camera').textContent = 'Stop Camera';
      $('btn-camera').removeEventListener('click', startCamera);
      $('btn-camera').addEventListener('click', stopCamera);
      bootstrapDetection();
    } catch (e) {
      toast.error('Camera access denied. Manual safety controls remain available.');
    }
  }

  function stopCamera() {
    if (videoStream) videoStream.getTracks().forEach((t) => t.stop());
    videoStream = null;
    clearInterval(detectionLoop);
    $('cam-video').hidden = true;
    $('cam-placeholder').hidden = false;
    $('btn-camera').textContent = 'Start Camera';
  }

  function bootstrapDetection() {
    const canvas = $('cam-canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const video = $('cam-video');

    // Use FaceDetector (Chromium) when available — no external models needed.
    const Detector = window.FaceDetector;
    const useFaceDetector = !!Detector && 'Eye' in (window || {});
    const hasFaceApi = typeof faceapi !== 'undefined';

    detectionLoop = setInterval(async () => {
      if (!video.videoWidth) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      let eyesOpen = true;
      let faceFound = false;

      if (useFaceDetector) {
        try {
          const detector = new Detector({ fastMode: true });
          const faces = await detector.detect(canvas);
          faceFound = faces.length > 0;
          // FaceDetector landmarks are limited; treat face presence as the attention signal.
          eyesOpen = faceFound;
        } catch { /* fall through */ }
      } else if (hasFaceApi) {
        try {
          const det = await faceapi.detectAllFaces(canvas)
            .withFaceLandmarks().withFaceExpressions();
          if (det.length) {
            faceFound = true;
            const landmarks = det[0].landmarks;
            const eyes = [
              ['leftEyeOpening', landmarks.getLeftEye()],
              ['rightEyeOpening', landmarks.getRightEye()],
            ];
            let earSum = 0;
            const count = eyes.length;
            eyes.forEach(([, pts]) => {
              const d1 = Math.hypot(pts[1].x - pts[5].x, pts[1].y - pts[5].y);
              const d2 = Math.hypot(pts[2].x - pts[4].x, pts[2].y - pts[4].y);
              const d3 = Math.hypot(pts[0].x - pts[3].x, pts[0].y - pts[3].y);
              earSum += (d1 + d2) / (2 * d3 || 1);
            });
            const ear = earSum / count;
            eyesOpen = ear > 0.22;
          }
        } catch (e) { /* model not ready */ }
      }

      if (faceFound || useFaceDetector || hasFaceApi) {
        if (!eyesOpen) {
          eyesClosedMs += 110;
          if (eyesClosedMs > WARN_DELAY_MS && safetyState === 'NORMAL') setDetectState('SUSPECTED');
          if (eyesClosedMs > WARN_DELAY_MS + 800 && safetyState === 'SUSPECTED') beginWarning();
        } else {
          eyesClosedMs = 0;
          if (safetyState === 'SUSPECTED') setDetectState('NORMAL');
        }
      }
    }, 110);

    // If no detection engine is available, run an assisted attention check fallback.
    if (!useFaceDetector && !hasFaceApi) {
      toast.warning('Eye-tracking models unavailable — manual attention checks active.');
      detectionLoop = setInterval(() => {
        if (safetyState !== 'WARNING' && safetyState !== 'SOS') beginWarning();
      }, 120000); // attention check every 2 minutes as assistance fallback
    }
  }

  // ---------------- Bus + trip ----------------
  async function loadDriverContext() {
    try {
      document.title = 'SmartBus — Driver Dashboard';
      $('driver-name').textContent = user?.name || 'Driver';
      const { data: buses } = await api.get('/buses', { driver_id: driverId, limit: 1 });
      if (!buses.data.length) {
        $('driver-sub').textContent = 'No bus assigned. Contact the transport manager.';
        return;
      }
      bus = buses.data[0];
      $('driver-sub').textContent = `Assigned to ${bus.bus_number} — ${bus.model || 'bus'}`;
      $('trip-bus').textContent = bus.bus_number;
      $('trip-passengers').textContent = bus.passenger_count ?? '0';

      // The route a bus is on is its active trip's route; fall back to the most recent trip.
      if (!bus.route_id) {
        const { data: prev } = await api.get('/trips', { limit: 1 });
        if (prev.data.length) { bus.route_id = prev.data[0].route_id; bus.route_name = prev.data[0].route_name; }
      }
      $('trip-route').textContent = bus.route_name || '—';

      const { data: trips } = await api.get('/trips', { driver_id: driverId, status: 'ACTIVE', limit: 1 });
      if (trips.data.length) {
        activeTrip = trips.data[0];
        $('trip-status').textContent = 'ACTIVE';
        $('trip-sub').textContent = `${activeTrip.trip_type} trip · started ${new Date(activeTrip.start_time).toLocaleTimeString()}`;
        $('btn-start-trip').disabled = true;
        $('btn-end-trip').disabled = false;
      }
      loadStudents();
      startGps();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function startTrip() {
    if (!bus) return;
    try {
      const { data } = await api.post('/trips', { bus_id: bus.id, route_id: bus.route_id, trip_type: 'MORNING' });
      activeTrip = data;
      $('trip-status').textContent = 'ACTIVE';
      $('trip-sub').textContent = `${data.trip_type} trip started`;
      $('btn-start-trip').disabled = true;
      $('btn-end-trip').disabled = false;
      toast.success('Trip started');
    } catch (e) { toast.error(e.message); }
  }

  async function endTrip() {
    if (!activeTrip) return;
    try {
      await api.post(`/trips/${activeTrip.id}/end`, {});
      toast.success('Trip completed');
      activeTrip = null;
      $('trip-status').textContent = 'COMPLETED';
      $('trip-sub').textContent = 'Trip ended';
      $('btn-start-trip').disabled = false;
      $('btn-end-trip').disabled = true;
    } catch (e) { toast.error(e.message); }
  }

  function startGps() {
    if (!bus || !navigator.geolocation) return;
    watchId = navigator.geolocation.watchPosition((pos) => {
      const { latitude, longitude, accuracy, speed } = pos.coords;
      $('trip-speed').textContent = `${Math.round(speed || 0)} km/h`;
      api.post('/tracking/location', {
        bus_id: bus.id, device_id: bus.device_id, latitude, longitude,
        speed: speed || 0, heading: 0, accuracy,
      }).catch(() => {});
      setConnection(true);
    }, () => setConnection(false), { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 });
  }

  function setConnection(online) {
    const dot = $('conn-dot');
    const text = $('conn-text');
    if (!dot || !text) return;
    dot.className = 'conn-dot ' + (online ? 'online' : 'offline');
    text.textContent = online ? 'ONLINE' : 'OFFLINE';
  }

  // ---------------- Boarding ----------------
  async function loadStudents() {
    const tbody = $('board-tbody');
    if (!bus) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#6b7280;">No bus assigned.</td></tr>'; return; }
    try {
      const { data } = await api.get('/students', { bus_id: bus.id, limit: 100 });
      tbody.innerHTML = data.data.map((s) => `
        <tr>
          <td><strong>${s.name}</strong></td>
          <td>${s.grade || '—'}</td>
          <td>${s.pickup_stop || '—'}</td>
          <td><span class="status-badge onboard">On Board</span></td>
          <td style="text-align:center">
            <button class="action-btn" data-id="${s.id}" data-name="${s.name}" data-action="BOARDED">Boarded</button>
            <button class="action-btn" data-id="${s.id}" data-name="${s.name}" data-action="DROPPED_OFF">Dropped</button>
          </td>
        </tr>`).join('');
      tbody.querySelectorAll('.action-btn').forEach((btn) => {
        btn.addEventListener('click', () => recordAttendance(btn.dataset.id, btn.dataset.name, btn.dataset.action));
      });
      if (data.data.length === 0) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#6b7280;">No students assigned to this bus.</td></tr>';
    } catch (e) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#b91c1c;">${e.message}</td></tr>`; }
  }

  async function recordAttendance(studentId, name, status) {
    try {
      await api.post('/attendance', {
        student_id: studentId, trip_id: activeTrip?.id, bus_id: bus?.id,
        status, method: 'DRIVER',
      });
      toast.success(`${name} marked ${status.replace('_', ' ')}`);
    } catch (e) { toast.error(e.message); }
  }

  // ---------------- SOS / emergency ----------------
  async function manualSOS() {
    try {
      await api.post('/alerts', {
        type: 'EMERGENCY_BUTTON', severity: 'CRITICAL',
        bus_id: bus?.id, driver_id: driverId,
        message: `Emergency SOS activated by driver ${user?.name} on ${bus?.bus_number || 'bus'}.`,
      });
      setDetectState('SOS');
      toast.error('🚨 SOS sent to administrators and emergency contacts.');
    } catch (e) { toast.error(e.message); }
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('btn-camera').addEventListener('click', startCamera);
    $('btn-start-trip').addEventListener('click', startTrip);
    $('btn-end-trip').addEventListener('click', endTrip);
    $('btn-sos').addEventListener('click', manualSOS);
    $('btn-ack').addEventListener('click', acknowledge);
    $('btn-cancel-sos').addEventListener('click', () => { setDetectState('NORMAL'); });
    $('btn-load-students').addEventListener('click', loadStudents);
    $('board-search').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('#board-tbody tr').forEach((tr) => {
        tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
    loadDriverContext();
    setConnection(false);
  });
})();