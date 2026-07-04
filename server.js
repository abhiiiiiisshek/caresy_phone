const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Database configuration
const DB_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Ensure db directory and file exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ users: {}, bookings: [] }, null, 2));
}

// In-memory store for generated OTPs (phone -> otp)
const activeOtps = new Map();

// In-memory store for admin sessions (sessionToken -> email)
const adminSessions = new Map();

// Helper to parse cookies from headers
function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const key = parts.shift().trim();
    const value = parts.join('=');
    list[key] = decodeURIComponent(value);
  });
  return list;
}

// Helper to get authenticated admin email from request
function getAdminEmail(req) {
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies['admin_session'];
  if (!sessionToken) return null;
  return adminSessions.get(sessionToken) || null;
}

// Helper to read database
function readDb() {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading database:', err);
    return { users: {}, bookings: [] };
  }
}

// Helper to write database
function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing to database:', err);
  }
}

const https = require('https');

// Helper for calling external sauravhathi/otp-service API
function callOtpService(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const dataStr = JSON.stringify(payload);
    const options = {
      hostname: 'otp-service-beta.vercel.app',
      port: 443,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': dataStr.length
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: body ? JSON.parse(body) : {}
        });
      });
    });
    
    req.on('error', (err) => reject(err));
    req.write(dataStr);
    req.end();
  });
}

// ==========================================
// Authentication API Endpoints
// ==========================================

// 1. Send OTP
app.post('/api/auth/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Generate a local 6-digit OTP for presentation/demo fallback
  const localOtp = Math.floor(100000 + Math.random() * 900000).toString();
  activeOtps.set(email, {
    otp: localOtp,
    expires: Date.now() + 5 * 60 * 1000 // 5 minutes validity
  });
  console.log(`[AUTH] Local OTP generated for ${email}: ${localOtp}`);

  try {
    const result = await callOtpService('/api/otp/generate', { email });
    console.log(`[AUTH] Requested external OTP for email ${email}, status: ${result.statusCode}`);

    if (result.statusCode === 200) {
      res.json({ 
        success: true, 
        message: 'OTP sent to your email successfully',
        otp: localOtp // Provide local OTP in response for demo presentation
      });
    } else {
      console.warn(`[AUTH] External OTP service failed with status ${result.statusCode}. Falling back to local OTP.`);
      res.json({
        success: true,
        message: 'OTP sent to your email successfully (local fallback active)',
        otp: localOtp
      });
    }
  } catch (err) {
    console.error('Error calling OTP service generate:', err);
    console.warn('[AUTH] OTP service exception. Falling back to local OTP.');
    res.json({
      success: true,
      message: 'OTP sent to your email successfully (local fallback active)',
      otp: localOtp
    });
  }
});

// 2. Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP are required' });
  }

  // Check local OTP map first (for quick demo login)
  const localOtpData = activeOtps.get(email);
  if (localOtpData && localOtpData.otp === otp && localOtpData.expires > Date.now()) {
    console.log(`[AUTH] Local OTP verification successful for ${email}`);
    activeOtps.delete(email); // Consume the OTP

    const db = readDb();
    let user = db.users[email];
    const isNewUser = !user || !user.name;

    if (isNewUser && !user) {
      db.users[email] = { email, name: '' };
      writeDb(db);
      user = db.users[email];
    }

    // Set cookie if admin
    if (email.endsWith('@caresy.co')) {
      const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      adminSessions.set(sessionToken, email);
      res.setHeader('Set-Cookie', `admin_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    }

    return res.json({
      success: true,
      user: {
        email: user.email,
        name: user.name || null,
        loggedIn: true
      },
      isNewUser
    });
  }

  // Fallback: Verify via external OTP service
  try {
    const result = await callOtpService('/api/otp/verify', { email, otp });
    console.log(`[AUTH] Verifying external OTP for email ${email}, status: ${result.statusCode}`);

    if (result.statusCode === 200) {
      const db = readDb();
      let user = db.users[email];
      const isNewUser = !user || !user.name;

      if (isNewUser && !user) {
        db.users[email] = { email, name: '' };
        writeDb(db);
        user = db.users[email];
      }

      // Set cookie if admin
      if (email.endsWith('@caresy.co')) {
        const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
        adminSessions.set(sessionToken, email);
        res.setHeader('Set-Cookie', `admin_session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
      }

      res.json({
        success: true,
        user: {
          email: user.email,
          name: user.name || null,
          loggedIn: true
        },
        isNewUser
      });
    } else {
      res.status(result.statusCode).json({ error: result.body.error || 'Invalid OTP' });
    }
  } catch (err) {
    console.error('Error calling OTP service verify:', err);
    res.status(500).json({ error: 'Internal server error verifying OTP' });
  }
});

// 3. User Registration / Update Profile (Save Name)
app.post('/api/auth/signup', (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: 'Email and Name are required' });
  }

  const db = readDb();
  db.users[email] = {
    email,
    name: name.trim()
  };
  writeDb(db);

  res.json({
    success: true,
    user: {
      email,
      name: db.users[email].name,
      loggedIn: true
    }
  });
});

// ==========================================
// Booking API Endpoints
// ==========================================

// 1. Submit Booking Request
app.post('/api/bookings', (req, res) => {
  const {
    patientName,
    age,
    phone,
    email,
    emergency,
    hospital,
    department,
    doctor,
    date,
    time,
    language,
    service,
    needs,
    notes,
    isUrgent
  } = req.body;

  if (!patientName || !hospital) {
    return res.status(400).json({ error: 'Patient name and hospital are required fields' });
  }

  const db = readDb();
  
  // Ensure the user exists in database
  if (email && !db.users[email]) {
    db.users[email] = { email, name: patientName, phone: phone || '' };
  }

  const randomId = Math.floor(1000 + Math.random() * 9000);
  const bookingId = `CRS-${randomId}`;

  const newBooking = {
    id: bookingId,
    patientName,
    age: age || '',
    phone: phone || '',
    email: email || '',
    emergency: emergency || '',
    hospital,
    department: department || '',
    doctor: doctor || '',
    date: date || new Date().toISOString().split('T')[0],
    time: time || '',
    language: language || 'No preference',
    service: service || 'Hospital Companion',
    needs: Array.isArray(needs) ? needs : [needs].filter(Boolean),
    notes: notes || '',
    status: isUrgent ? 'Operations review needed' : 'Request submitted',
    createdAt: new Date().toISOString()
  };

  db.bookings.push(newBooking);
  writeDb(db);

  console.log(`[BOOKING] Created new booking ${bookingId} for email ${email}`);
  res.json({ success: true, booking: newBooking });
});

// 2. Retrieve All Bookings for a user
app.get('/api/bookings', (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: 'Email query parameter is required' });
  }

  const db = readDb();
  const userBookings = db.bookings
    .filter(b => b.email === email)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ success: true, bookings: userBookings });
});

// 3. Retrieve a specific booking status
app.get('/api/bookings/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const booking = db.bookings.find(b => b.id === id);

  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  res.json({ success: true, booking });
});

// ==========================================
// Admin / Operations API Endpoints
// ==========================================

// 1. Retrieve all bookings for operations dashboard
app.get('/api/admin/bookings', (req, res) => {
  const email = getAdminEmail(req);
  if (!email || !email.endsWith('@caresy.co')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const db = readDb();
  const sortedBookings = [...db.bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, bookings: sortedBookings });
});

// 2. Update booking status & companion assignment
app.post('/api/admin/bookings/update', (req, res) => {
  const email = getAdminEmail(req);
  if (!email || !email.endsWith('@caresy.co')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { bookingId, status, companion } = req.body;
  if (!bookingId || !status) {
    return res.status(400).json({ error: 'bookingId and status are required' });
  }

  const db = readDb();
  const booking = db.bookings.find(b => b.id === bookingId);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  booking.status = status;
  if (companion) {
    booking.companion = companion;
  } else if (companion === null) {
    delete booking.companion;
  }

  writeDb(db);
  console.log(`[ADMIN] Updated booking ${bookingId}: Status = "${status}", Companion = ${companion ? companion.name : 'None'}`);
  res.json({ success: true, booking });
});

// 3. Admin/Ops Logout
app.post('/api/auth/logout', (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies['admin_session'];
  if (sessionToken) {
    adminSessions.delete(sessionToken);
  }
  res.setHeader('Set-Cookie', 'admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  res.json({ success: true });
});

// ==========================================
// Static Files Serving
// ==========================================

// Serve static assets folder
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Serve styles and script directly
app.get('/styles.css', (req, res) => res.sendFile(path.join(__dirname, 'styles.css')));
app.get('/script.js', (req, res) => res.sendFile(path.join(__dirname, 'script.js')));

// Serve Gated Admin Operations page
app.get('/admin-ops.html', (req, res) => {
  const email = getAdminEmail(req);
  if (!email || !email.endsWith('@caresy.co')) {
    return res.redirect('/?login=admin');
  }
  res.sendFile(path.join(__dirname, 'admin-ops.html'));
});

app.get('/admin-ops', (req, res) => {
  const email = getAdminEmail(req);
  if (!email || !email.endsWith('@caresy.co')) {
    return res.redirect('/?login=admin');
  }
  res.sendFile(path.join(__dirname, 'admin-ops.html'));
});

// Serve HTML pages
const htmlPages = [
  'index',
  'about',
  'booking',
  'faq',
  'privacy',
  'quick-help',
  'services',
  'terms',
  'trust',
  'my-bookings',
  'how-it-works',
  'for-hospitals',
  'testimonials',
  'contact'
];

htmlPages.forEach(page => {
  app.get(`/${page}.html`, (req, res) => {
    res.sendFile(path.join(__dirname, `${page}.html`));
  });
  // Handle routes without .html extension as well
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, `${page}.html`));
  });
});

// Fallback: Map root path to index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Caresy Server is running at http://localhost:${PORT}`);
});
