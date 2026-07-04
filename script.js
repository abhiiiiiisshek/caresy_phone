// Safe localStorage wrapper to prevent crashes in sandboxed or blocked environments
const SafeStorage = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      console.warn("Storage access failed:", e);
      return null;
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      console.warn("Storage access failed:", e);
    }
  },
  removeItem(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn("Storage access failed:", e);
    }
  }
};

// Determine backend API base URL
const API_BASE = (function() {
  const loc = window.location;
  if (loc.protocol === 'file:') {
    return 'http://localhost:3000';
  }
  if (loc.hostname === 'localhost' || loc.hostname === '127.0.0.1') {
    return loc.port === '3000' ? '' : 'http://localhost:3000';
  }
  return ''; // Relative path in production
})();
window.API_BASE = API_BASE;

// Navigation menu toggle
const navToggle = document.querySelector(".nav-toggle");
if (navToggle) {
  navToggle.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("nav-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

document.querySelectorAll(".main-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    document.body.classList.remove("nav-open");
    navToggle?.setAttribute("aria-expanded", "false");
  });
});

// ----------------------------------------------------
// 0. Authentication System (OTP Modal & Header Widget)
// ----------------------------------------------------
(function initAuthentication() {
  // Inject required HTML elements dynamically (Modal and Toast)
  function injectAuthDOM() {
    if (document.getElementById("authModal")) return;

    // 1. Auth Modal
    const authModalHTML = `
      <div class="auth-modal-overlay" id="authModal">
        <div class="auth-modal-card">
          <button class="auth-modal-close" id="authClose" aria-label="Close authentication modal">&times;</button>
          
          <!-- Phase 1: Enter Email Address -->
          <div id="authStepPhone">
            <h2>Verify Email Address</h2>
            <p>Please enter or confirm your email address to receive a 6-digit verification code.</p>
            <div style="margin-bottom: 24px; text-align: left;">
              <label style="font-size: 0.9rem; color: var(--muted); display: block; margin-bottom: 8px; font-weight: 600;">Email Address</label>
              <input type="email" id="authPhoneInput" class="auth-input-text" placeholder="name@example.com" required />
            </div>
            <button class="btn btn-primary full" id="authSendOtpBtn">Send Code</button>
          </div>

          <!-- Phase 2: OTP Verification -->
          <div id="authStepOTP" style="display: none;">
            <h2>Enter verification code</h2>
            <p>We've sent a 6-digit code to <span id="authPhoneDisplay" style="font-weight: 700;">name@example.com</span></p>
            <div class="otp-input-group">
              <input type="text" maxlength="1" class="otp-input" data-index="0" inputmode="numeric" pattern="[0-9]*" />
              <input type="text" maxlength="1" class="otp-input" data-index="1" inputmode="numeric" pattern="[0-9]*" />
              <input type="text" maxlength="1" class="otp-input" data-index="2" inputmode="numeric" pattern="[0-9]*" />
              <input type="text" maxlength="1" class="otp-input" data-index="3" inputmode="numeric" pattern="[0-9]*" />
              <input type="text" maxlength="1" class="otp-input" data-index="4" inputmode="numeric" pattern="[0-9]*" />
              <input type="text" maxlength="1" class="otp-input" data-index="5" inputmode="numeric" pattern="[0-9]*" />
            </div>
            <div class="resend-container">
              Didn't receive the email? <button class="resend-btn" id="authResendBtn" disabled>Resend in <span id="authTimer">30</span>s</button>
            </div>
            <button class="btn btn-primary full" id="authVerifyBtn">Verify & Proceed</button>
          </div>

          <!-- Phase 3: Name Entry (Signup) -->
          <div id="authStepName" style="display: none;">
            <h2>One Last Step</h2>
            <p>Please enter your full name to complete signup and confirm your booking request.</p>
            <div style="margin-bottom: 24px; text-align: left;">
              <label style="font-size: 0.9rem; color: var(--muted); display: block; margin-bottom: 8px; font-weight: 600;">Your Full Name</label>
              <input type="text" id="authNameInput" class="auth-input-text" placeholder="e.g. Ananya Rao" required />
            </div>
            <button class="btn btn-primary full" id="authSignupBtn">Save & Confirm Booking</button>
          </div>
        </div>
      </div>
    `;

    // 2. Simulated Email Toast
    const smsToastHTML = `
      <div class="sms-toast" id="smsToast">
        <div class="sms-icon">📧</div>
        <div class="sms-content">
          <strong>Email sent from Caresy</strong>
          <p>A 6-digit verification code was dispatched to your inbox. Check spam if not received.</p>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", authModalHTML);
    document.body.insertAdjacentHTML("beforeend", smsToastHTML);
  }

  // Setup immediately
  injectAuthDOM();

  // Variables & State
  let currentOtp = "";
  let timerInterval = null;
  let onAuthSuccessCallback = null;
  let tempEmail = "";
  let tempName = "";

  // Auth helper methods
  window.getAuthUser = function() {
    try {
      const data = SafeStorage.getItem("caresy_auth");
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  };

  window.setAuthUser = function(user) {
    SafeStorage.setItem("caresy_auth", JSON.stringify({ ...user, loggedIn: true }));
    updateHeaderAuth();
  };

  window.logoutUser = function() {
    SafeStorage.removeItem("caresy_auth");
    fetch('/api/auth/logout', { method: 'POST' })
      .catch(err => console.error('Error logging out from server:', err));
    updateHeaderAuth();
    if (window.location.pathname.includes("booking.html") || window.location.pathname.includes("quick-help.html") || window.location.pathname.includes("my-bookings.html")) {
      window.location.reload();
    }
  };

  // Header Nav Authenticated State Controller
  function updateHeaderAuth() {
    const mainNav = document.querySelector(".main-nav");
    if (!mainNav) return;

    // Clean up existing auth components if any
    const oldAuthBtn = mainNav.querySelector(".nav-auth");
    const oldDropdown = mainNav.querySelector(".user-menu-container");
    if (oldAuthBtn) oldAuthBtn.remove();
    if (oldDropdown) oldDropdown.remove();

    const user = window.getAuthUser();

    if (user && user.loggedIn) {
      // Logged In Status
      const container = document.createElement("div");
      container.className = "user-menu-container";
      
      const initials = (user.name || "C").split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

      container.innerHTML = `
        <button class="user-menu-btn btn" id="userMenuBtn" type="button">
          <span class="user-avatar-small">${initials}</span>
          <span>Hi, ${(user.name || "Customer").split(" ")[0]}</span>
          <svg style="margin-left: 2px; width: 12px; height: 12px;" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5"></path></svg>
        </button>
        <div class="user-menu-dropdown" id="userMenuDropdown">
          <div class="user-info-section">
            <strong>${user.name}</strong>
            <span>${user.email || "No email linked"}</span>
          </div>
          <a class="dropdown-link" href="booking.html">
            <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"></path></svg>
            Book Assistance
          </a>
          <a class="dropdown-link" href="my-bookings.html">
            <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
            My Bookings
          </a>
          <a class="dropdown-link" href="trust.html">
            <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.285z"></path></svg>
            Trust & Security
          </a>
          <a class="dropdown-link sign-out" id="signOutBtn">
            <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"></path></svg>
            Sign Out
          </a>
        </div>
      `;
      mainNav.appendChild(container);

      // Event listeners for dropdown toggle
      const btn = container.querySelector("#userMenuBtn");
      const dropdown = container.querySelector("#userMenuDropdown");
      const signOut = container.querySelector("#signOutBtn");

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("active");
      });

      signOut.addEventListener("click", (e) => {
        e.preventDefault();
        window.logoutUser();
      });

      // Close when clicking elsewhere
      document.addEventListener("click", () => {
        dropdown.classList.remove("active");
      });
    } else {
      // Logged Out Link
      const authLink = document.createElement("a");
      authLink.href = "#";
      authLink.className = "nav-auth";
      authLink.style.marginLeft = "6px";
      authLink.style.padding = "10px 18px";
      authLink.style.borderRadius = "999px";
      authLink.style.background = "rgba(231, 163, 62, 0.12)";
      authLink.style.color = "var(--primary)";
      authLink.style.fontWeight = "750";
      authLink.textContent = "Sign In";

      authLink.addEventListener("click", (e) => {
        e.preventDefault();
        window.startVerification("", "", () => {
          window.location.reload();
        });
      });

      mainNav.appendChild(authLink);
    }
  }

  // Toast Generator
  function triggerSmsToast(otpCode) {
    const toast = document.getElementById("smsToast");
    if (!toast) return;

    const toastDesc = toast.querySelector("p");
    if (toastDesc) {
      if (otpCode) {
        toastDesc.innerHTML = `A 6-digit verification code was dispatched to your inbox. <strong style="color: var(--primary); font-size: 1.1rem; display: block; margin-top: 6px;">Demo Code: ${otpCode}</strong>`;
      } else {
        toastDesc.textContent = "A 6-digit verification code was dispatched to your inbox. Check spam if not received.";
      }
    }

    toast.classList.remove("active");
    void toast.offsetWidth;
    toast.classList.add("active");

    setTimeout(() => {
      toast.classList.remove("active");
    }, 6000);
  }

  // Timer Countdown Controller
  function startTimer() {
    const timerSpan = document.getElementById("authTimer");
    const resendBtn = document.getElementById("authResendBtn");
    if (!timerSpan || !resendBtn) return;

    let seconds = 30;
    resendBtn.disabled = true;
    timerSpan.textContent = seconds;
    resendBtn.innerHTML = `Resend in <span id="authTimer">${seconds}</span>s`;

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      seconds--;
      if (seconds <= 0) {
        clearInterval(timerInterval);
        resendBtn.disabled = false;
        resendBtn.textContent = "Resend Code";
      } else {
        const span = document.getElementById("authTimer");
        if (span) span.textContent = seconds;
      }
    }, 1000);
  }

  // Open & Close handlers for Auth Modal
  window.startVerification = function(email, name, onSuccess) {
    injectAuthDOM();
    
    onAuthSuccessCallback = onSuccess;
    tempEmail = email || "";
    tempName = name || "";

    const emailInput = document.getElementById("authPhoneInput");
    if (emailInput) {
      emailInput.value = tempEmail;
      emailInput.style.borderColor = "var(--line)";
    }

    const stepPhone = document.getElementById("authStepPhone");
    const stepOTP = document.getElementById("authStepOTP");
    const stepName = document.getElementById("authStepName");
    
    if (stepPhone) stepPhone.style.display = "block";
    if (stepOTP) stepOTP.style.display = "none";
    if (stepName) stepName.style.display = "none";

    const modal = document.getElementById("authModal");
    if (modal) modal.classList.add("active");

    setTimeout(() => {
      if (emailInput) emailInput.focus();
    }, 100);
  };

  window.sendOtpFlow = function() {
    const emailInput = document.getElementById("authPhoneInput");
    if (!emailInput) return;

    const emailVal = emailInput.value.trim();
    if (!emailVal) {
      emailInput.style.borderColor = "var(--coral)";
      emailInput.focus();
      return;
    }

    tempEmail = emailVal;
    
    const emailDisplay = document.getElementById("authPhoneDisplay");
    if (emailDisplay) emailDisplay.textContent = tempEmail;

    // Reset OTP inputs
    const inputs = document.querySelectorAll(".otp-input");
    inputs.forEach(input => {
      input.value = "";
      input.style.borderColor = "var(--line)";
    });

    const stepPhone = document.getElementById("authStepPhone");
    const stepOTP = document.getElementById("authStepOTP");
    if (stepPhone) stepPhone.style.display = "none";
    if (stepOTP) stepOTP.style.display = "block";

    fetch(`${window.API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: tempEmail })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setTimeout(() => {
          triggerSmsToast(data.otp);
        }, 500);
      }
    })
    .catch(err => console.error('Error sending OTP:', err));

    startTimer();

    setTimeout(() => {
      if (inputs[0]) inputs[0].focus();
    }, 100);
  };

  window.closeVerificationModal = function() {
    const modal = document.getElementById("authModal");
    if (modal) modal.classList.remove("active");
    clearInterval(timerInterval);
  };

  // Attach event handlers inside Auth Modal
  function setupAuthEvents() {
    const closeBtn = document.getElementById("authClose");
    if (closeBtn) {
      closeBtn.addEventListener("click", window.closeVerificationModal);
    }

    const modal = document.getElementById("authModal");
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) window.closeVerificationModal();
      });
    }

    const sendOtpBtn = document.getElementById("authSendOtpBtn");
    if (sendOtpBtn) {
      sendOtpBtn.addEventListener("click", window.sendOtpFlow);
    }

    const phoneInput = document.getElementById("authPhoneInput");
    if (phoneInput) {
      phoneInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          window.sendOtpFlow();
        }
      });
    }

    const inputs = document.querySelectorAll(".otp-input");
    inputs.forEach((input, index) => {
      input.addEventListener("input", (e) => {
        const val = e.target.value;
        if (val) {
          e.target.value = val.replace(/\D/g, "").substring(val.length - 1);
          if (e.target.value) {
            input.style.borderColor = "var(--primary)";
            const next = document.querySelector(`.otp-input[data-index="${index + 1}"]`);
            if (next) next.focus();
          } else {
            input.style.borderColor = "var(--line)";
          }
        }
        checkAndVerifyOTP(false);
      });

      input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !input.value) {
          const prev = document.querySelector(`.otp-input[data-index="${index - 1}"]`);
          if (prev) {
            prev.focus();
            prev.value = "";
            prev.style.borderColor = "var(--line)";
          }
        }
      });
    });

    const verifyBtn = document.getElementById("authVerifyBtn");
    if (verifyBtn) {
      verifyBtn.addEventListener("click", () => checkAndVerifyOTP(true));
    }

    const resendBtn = document.getElementById("authResendBtn");
    if (resendBtn) {
      resendBtn.addEventListener("click", () => {
        fetch(`${window.API_BASE}/api/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: tempEmail })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            triggerSmsToast(data.otp);
            startTimer();
            const inputs = document.querySelectorAll(".otp-input");
            inputs.forEach(input => { input.value = ""; input.style.borderColor = "var(--line)"; });
            if (inputs[0]) inputs[0].focus();
          }
        })
        .catch(err => console.error('Error resending OTP:', err));
      });
    }

    const signupBtn = document.getElementById("authSignupBtn");
    const nameInput = document.getElementById("authNameInput");
    if (signupBtn && nameInput) {
      signupBtn.addEventListener("click", () => {
        const nameVal = nameInput.value.trim();
        if (!nameVal) {
          nameInput.style.borderColor = "var(--coral)";
          nameInput.focus();
          return;
        }
        
        fetch(`${window.API_BASE}/api/auth/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: tempEmail, name: nameVal })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            window.setAuthUser(data.user);
            window.closeVerificationModal();
            if (onAuthSuccessCallback) onAuthSuccessCallback();
          }
        })
        .catch(err => console.error('Error saving profile:', err));
      });
    }
  }

  function checkAndVerifyOTP(force) {
    const inputs = document.querySelectorAll(".otp-input");
    let code = "";
    inputs.forEach(input => code += input.value);

    if (code.length === 6) {
      fetch(`${window.API_BASE}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: tempEmail, otp: code })
      })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Verification failed');
      })
      .then(data => {
        if (data.success) {
          if (data.user.name) {
            window.setAuthUser(data.user);
            window.closeVerificationModal();
            if (onAuthSuccessCallback) onAuthSuccessCallback();
          } else {
            const stepOTP = document.getElementById("authStepOTP");
            const stepName = document.getElementById("authStepName");
            if (stepOTP) stepOTP.style.display = "none";
            if (stepName) {
              stepName.style.display = "block";
              const nameInput = document.getElementById("authNameInput");
              if (nameInput) setTimeout(() => nameInput.focus(), 100);
            }
          }
        } else {
          triggerOtpError(inputs);
        }
      })
      .catch(err => {
        console.error('Error verifying OTP:', err);
        triggerOtpError(inputs);
      });
    } else if (force) {
      inputs.forEach(input => {
        if (!input.value) input.style.borderColor = "var(--coral)";
      });
    }
  }

  function triggerOtpError(inputs) {
    inputs.forEach(input => {
      input.style.borderColor = "var(--coral)";
      input.style.transform = "translateX(5px)";
    });
    setTimeout(() => {
      inputs.forEach(input => {
        input.style.transform = "translateX(0)";
        input.value = "";
      });
      if (inputs[0]) inputs[0].focus();
    }, 300);
  }

  updateHeaderAuth();
  setupAuthEvents();
})();

// Reveal items on scroll (IntersectionObserver)
const revealItems = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.05 }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("visible"));
}

// Set minimum date to today for planned booking page
const dateInput = document.querySelector('input[name="date"]');
if (dateInput) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  dateInput.min = `${yyyy}-${mm}-${dd}`;
}

// ----------------------------------------------------
// 1. Homepage Simulator Interactive Logic
// ----------------------------------------------------
const simulatorTabs = document.querySelectorAll(".simulator-tab");
const simulatorPanels = document.querySelectorAll(".simulator-panel");

if (simulatorTabs.length > 0 && simulatorPanels.length > 0) {
  simulatorTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      // Deactivate all tabs
      simulatorTabs.forEach((t) => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      // Hide all panels
      simulatorPanels.forEach((p) => {
        p.classList.remove("active");
        p.setAttribute("hidden", "true");
      });

      // Activate selected tab and panel
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      
      const panelId = tab.getAttribute("aria-controls");
      const activePanel = document.getElementById(panelId);
      if (activePanel) {
        activePanel.classList.add("active");
        activePanel.removeAttribute("hidden");
      }
    });
  });
}

// ----------------------------------------------------
// 2. Trust Page Companion Profile Accordion
// ----------------------------------------------------
const profileCards = document.querySelectorAll(".profile-card");
if (profileCards.length > 0) {
  profileCards.forEach((card) => {
    card.addEventListener("click", () => {
      // Collapse all profiles
      profileCards.forEach((c) => {
        c.classList.remove("active");
        const details = c.querySelector(".profile-expanded-details");
        if (details) details.style.display = "none";
      });

      // Expand clicked profile
      card.classList.add("active");
      const details = card.querySelector(".profile-expanded-details");
      if (details) details.style.display = "block";
    });
  });
}

// Helper to backup bookings to local storage
function saveBookingToLocalStorage(booking) {
  try {
    const localBookings = JSON.parse(SafeStorage.getItem("caresy_local_bookings") || "[]");
    if (!localBookings.some(b => b.id === booking.id)) {
      localBookings.push(booking);
      SafeStorage.setItem("caresy_local_bookings", JSON.stringify(localBookings));
    }
  } catch (e) {
    console.error("Error saving booking to localStorage:", e);
  }
}

// ----------------------------------------------------
// 3. Booking Form Dynamic Request Preview and Matcher
// ----------------------------------------------------
const bookingForm = document.querySelector("#bookingForm");
const bookingId = document.querySelector("#bookingId");
const bookingStatus = document.querySelector("#bookingStatus");
// Form Inputs
const inputPatientName = document.querySelector("#bookingPatientName");
const inputHospital = document.querySelector("#bookingHospital");
const inputDept = document.querySelector("#bookingDept");
const selectService = document.querySelector("#bookingService");

// Pre-fill user details if logged in
const user = window.getAuthUser ? window.getAuthUser() : null;
if (user && user.loggedIn) {
  const inputCustomerName = document.querySelector("input[name='customerName']");
  const inputPhone = document.querySelector("input[name='phone']");
  const inputEmail = document.querySelector("input[name='email']");
  if (inputCustomerName && !inputCustomerName.value) inputCustomerName.value = user.name || "";
  if (inputPhone && !inputPhone.value) inputPhone.value = user.phone || "";
  if (inputEmail && !inputEmail.value) inputEmail.value = user.email || "";
}

const previewPatient = document.querySelector("#previewPatient");
const previewHospital = document.querySelector("#previewHospital");
const previewDept = document.querySelector("#previewDept");
const previewService = document.querySelector("#previewService");
const previewNextStep = document.querySelector("#previewNextStep");

// Companion Matcher Elements
const matcherStatus = document.querySelector("#matcherStatus");
const matcherResult = document.querySelector("#matcherResult");
const matcherName = document.querySelector("#matcherName");
const matcherRating = document.querySelector("#matcherRating");
const matcherAvatar = document.querySelector("#matcherAvatar");
const matcherLang = document.querySelector("#matcherLang");
const matcherSpecialty = document.querySelector("#matcherSpecialty");

// Companion Database Mock
const companionDatabase = {
  cardiology: {
    name: "Priya Sharma",
    avatar: "PS",
    photo: "assets/caresy-companion-priya.png",
    rating: "★ 4.9 (82 visits)",
    verification: "Police Verified",
    lang: "Hindi, English",
    specialty: "Cardiology",
    color: "#E7A33E"
  },
  orthopedics: {
    name: "Anil Kumar",
    avatar: "AK",
    photo: "assets/caresy-companion-anil.png",
    rating: "★ 4.8 (120 visits)",
    verification: "Police Verified",
    lang: "Kannada, Tamil, English",
    specialty: "Orthopedics",
    color: "#E7A33E"
  },
  general: {
    name: "Sarah Mathews",
    avatar: "SM",
    photo: "assets/caresy-companion-sarah.png",
    rating: "★ 4.9 (65 visits)",
    verification: "Police Verified",
    lang: "Malayalam, Telugu, English",
    specialty: "General Care",
    color: "#E7A33E"
  }
};

function updateBookingPreview() {
  if (!bookingForm) return;

  const patientNameVal = inputPatientName ? inputPatientName.value.trim() : "";
  const hospitalVal = inputHospital ? inputHospital.value.trim() : "";
  const deptVal = inputDept ? inputDept.value.trim() : "";
  const serviceVal = selectService ? selectService.value : "";
  
  let servicePrice = "₹499";
  if (serviceVal && serviceVal.includes("Pickup")) servicePrice = "₹899";
  else if (serviceVal && serviceVal.includes("Full Day")) servicePrice = "₹1,299";
  else if (serviceVal && serviceVal.includes("Custom")) servicePrice = "Quote after review";

  // Update preview fields
  if (previewPatient) previewPatient.textContent = patientNameVal || "—";
  if (previewHospital) previewHospital.textContent = hospitalVal || "—";
  if (previewDept) previewDept.textContent = deptVal || "—";
  if (previewService) {
    previewService.textContent = serviceVal ? `${serviceVal} (${servicePrice})` : `Hospital Companion (₹499)`;
  }

  // Update Status & Next Step
  if (patientNameVal && hospitalVal) {
    if (bookingId && (bookingId.textContent === "CRS-XXXX" || bookingId.textContent === "Pending assignment" || bookingId.textContent === "Pending")) {
      const randomId = Math.floor(1000 + Math.random() * 9000);
      bookingId.textContent = `CRS-${randomId}`;
    }
    if (bookingStatus) bookingStatus.textContent = "Ready to Request";
    if (previewNextStep) previewNextStep.textContent = "Submit form to contact dispatch";
  } else {
    if (bookingId) bookingId.textContent = "CRS-XXXX";
    if (bookingStatus) bookingStatus.textContent = "Form incomplete";
    if (previewNextStep) previewNextStep.textContent = "Fill in required details";
  }

  // Companion Matcher logic
  if (matcherStatus && matcherResult) {
    if (patientNameVal || hospitalVal || deptVal) {
      matcherStatus.style.display = "none";
      matcherResult.style.display = "block";

      // Match based on department keywords
      const deptLower = deptVal.toLowerCase();
      let matchedCompanion = companionDatabase.general; // fallback

      if (deptLower.includes("cardio") || deptLower.includes("heart")) {
        matchedCompanion = companionDatabase.cardiology;
      } else if (deptLower.includes("ortho") || deptLower.includes("physio") || deptLower.includes("bone") || deptLower.includes("joint")) {
        matchedCompanion = companionDatabase.orthopedics;
      }

      // Render companion details
      if (matcherName) matcherName.textContent = matchedCompanion.name;
      if (matcherRating) {
        matcherRating.innerHTML = `<i data-lucide="star" style="width: 14px; height: 14px; fill: var(--amber); stroke: var(--amber); display: inline-block; vertical-align: middle; margin-top: -2px; margin-right: 4px;"></i> ${matchedCompanion.rating.replace('★ ', '')}`;
        if (window.lucide) window.lucide.createIcons();
      }
      if (matcherAvatar) {
        if (matchedCompanion.photo) {
          matcherAvatar.innerHTML = `<img style="width: 100%; height: 100%; object-fit: cover;" src="${matchedCompanion.photo}" alt="${matchedCompanion.name}" />`;
          matcherAvatar.style.background = "transparent";
        } else {
          matcherAvatar.textContent = matchedCompanion.avatar;
          matcherAvatar.style.background = matchedCompanion.color;
        }
      }
      if (matcherLang) matcherLang.textContent = matchedCompanion.lang;
      if (matcherSpecialty) matcherSpecialty.textContent = matchedCompanion.specialty;
    } else {
      matcherStatus.style.display = "block";
      matcherResult.style.display = "none";
    }
  }
}

// Add input event listeners to trigger dynamic preview updates
if (bookingForm) {
  [inputPatientName, inputHospital, inputDept, selectService].forEach((input) => {
    if (input) {
      input.addEventListener("input", updateBookingPreview);
      input.addEventListener("change", updateBookingPreview);
    }
  });

  // Handle Form Submit
  bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(bookingForm);
    const patientName = String(formData.get("patientName") || "Patient").trim();
    const service = String(formData.get("service") || "Hospital Companion");
    const isUrgent = !!document.body.querySelector(".urgent-page");
    const phoneVal = String(formData.get("phone") || "").trim();
    const emailVal = String(formData.get("email") || "").trim();
    const customerNameVal = String(formData.get("customerName") || "").trim();

    const proceedWithBooking = () => {
      const user = window.getAuthUser();
      
      const payload = {
        patientName,
        age: formData.get("age") || "",
        phone: phoneVal,
        email: user ? user.email : emailVal,
        emergency: formData.get("emergency") || "",
        hospital: formData.get("hospital") || "",
        department: formData.get("department") || "",
        doctor: formData.get("doctor") || "",
        date: formData.get("date") || "",
        time: formData.get("time") || "",
        language: formData.get("language") || "No preference",
        service,
        needs: Array.from(formData.getAll("needs")),
        notes: formData.get("notes") || "",
        isUrgent
      };

      fetch(`${window.API_BASE}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const booking = data.booking;
          saveBookingToLocalStorage(booking);
          
          // G3: Show step-by-step confirmation
          const successHTML = `
            <div class="booking-success-state" style="text-align: center; padding: 40px 20px;">
              <div style="width: 64px; height: 64px; background: var(--sage); color: var(--ink-teal); border-radius: 50%; display: grid; place-items: center; font-size: 2rem; margin: 0 auto 20px;">✓</div>
              <h2>Booking Received</h2>
              <p style="font-size: 1.1rem; color: var(--muted); margin-bottom: 30px;">Your reference number is <strong>${booking.id}</strong>.</p>
              
              <div style="text-align: left; background: var(--sage); color: var(--ink-teal); padding: 20px; border-radius: 16px; margin-bottom: 30px;">
                <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                  <span style="color: var(--marigold); font-weight: 800;">1.</span>
                  <div><strong>Booking received</strong><br><small style="color: var(--muted-teal-gray);">We have your details.</small></div>
                </div>
                <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                  <span style="color: var(--marigold); font-weight: 800;">2.</span>
                  <div><strong>Operations reviewing</strong><br><small style="color: var(--muted-teal-gray);">Verifying hospital and companion availability.</small></div>
                </div>
                <div style="display: flex; gap: 12px;">
                  <span style="color: var(--muted-teal-gray); font-weight: 800;">3.</span>
                  <div><strong>Companion assigned</strong><br><small style="color: var(--muted-teal-gray);">Profile sent 12 hrs before visit.</small></div>
                </div>
              </div>

              <a href="https://wa.me/919717500225?text=Hi,%20my%20booking%20reference%20is%20${booking.id}" target="_blank" class="btn btn-primary full" style="margin-bottom: 12px;">Save to WhatsApp</a>
              <a href="my-bookings.html" class="btn btn-glass full" style="color: var(--primary);">View My Bookings</a>
            </div>
          `;
          
          const bookingLayout = document.querySelector(".booking-layout");
          if (bookingLayout) {
            bookingLayout.innerHTML = successHTML;
          }
        }
      })
      .catch(err => {
        console.error('Error creating booking:', err);
      });
    };

    const user = window.getAuthUser();
    if (user && user.loggedIn) {
      proceedWithBooking();
    } else {
      window.startVerification(emailVal, customerNameVal, () => {
        proceedWithBooking();
      });
    }
  });

  // Initialize preview on page load
  updateBookingPreview();
}

// ----------------------------------------------------
// 3.5 Quick Help Form Submission
// ----------------------------------------------------
const quickHelpForm = document.querySelector("#quickHelpForm");
if (quickHelpForm) {
  quickHelpForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(quickHelpForm);
    
    // Custom Validation
    let hasError = false;
    quickHelpForm.querySelectorAll("input[required]").forEach(input => {
      if (!input.value.trim()) {
        input.style.borderColor = "var(--danger)";
        hasError = true;
        
        let errorMsg = input.nextElementSibling;
        if (!errorMsg || !errorMsg.classList.contains("error-msg")) {
          errorMsg = document.createElement("span");
          errorMsg.className = "error-msg";
          errorMsg.style.color = "var(--danger)";
          errorMsg.style.fontSize = "0.8rem";
          errorMsg.style.display = "block";
          errorMsg.style.marginTop = "4px";
          input.parentNode.insertBefore(errorMsg, input.nextSibling);
        }
        errorMsg.textContent = "This field is required.";
      } else {
        input.style.borderColor = "var(--line)";
        const errorMsg = input.nextElementSibling;
        if (errorMsg && errorMsg.classList.contains("error-msg")) {
          errorMsg.remove();
        }
      }
    });

    if (hasError) return;

    const patientName = String(formData.get("patientName") || "Patient").trim();
    const phoneVal = String(formData.get("phone") || "").trim();
    const emailVal = String(formData.get("email") || "").trim();
    const hospital = String(formData.get("hospital") || "").trim();
    const notesVal = String(formData.get("notes") || "").trim();
    const serviceVal = String(formData.get("service") || "Same-Day Hospital Companion");

    const payload = {
      patientName,
      phone: phoneVal,
      email: emailVal,
      hospital,
      notes: notesVal,
      isUrgent: true,
      service: serviceVal,
      status: "Operations review needed"
    };

    fetch(`${window.API_BASE}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        saveBookingToLocalStorage(data.booking);
        // Show success state
        quickHelpForm.innerHTML = `
          <div style="text-align: center; padding: 40px 20px;">
            <div style="width: 64px; height: 64px; background: var(--sage); color: var(--ink-teal); border-radius: 50%; display: grid; place-items: center; font-size: 2rem; margin: 0 auto 20px;">✓</div>
            <h2 style="margin-bottom: 12px;">Request received.</h2>
            <p style="font-size: 1.1rem; color: var(--muted);">Our dispatcher will call <strong>${phoneVal}</strong> within 6 minutes.</p>
            <p style="font-size: 0.9rem; color: var(--muted); margin-top: 15px;">Your reference number is <strong>${data.booking.id}</strong>.</p>
            <div style="margin-top: 25px; display: flex; flex-direction: column; gap: 10px;">
              <a href="https://wa.me/919717500225?text=Hi,%20my%20quick%20help%20reference%20is%20${data.booking.id}" target="_blank" class="btn btn-primary full">WhatsApp Support</a>
              <a href="my-bookings.html" class="btn btn-glass full" style="color: var(--primary);">View My Bookings</a>
            </div>
          </div>
        `;
      }
    })
    .catch(err => {
      console.error("Error creating urgent booking:", err);
      // Fallback: save to localStorage even if the network fails
      const mockBookingId = `CRS-${Math.floor(1000 + Math.random() * 9000)}`;
      const offlineBooking = {
        id: mockBookingId,
        patientName,
        phone: phoneVal,
        email: emailVal,
        hospital,
        notes: notesVal,
        isUrgent: true,
        service: serviceVal,
        status: "Offline submission - Pending sync",
        createdAt: new Date().toISOString()
      };
      saveBookingToLocalStorage(offlineBooking);

      quickHelpForm.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
          <div style="width: 64px; height: 64px; background: var(--marigold); color: var(--charcoal); border-radius: 50%; display: grid; place-items: center; font-size: 2rem; margin: 0 auto 20px;">✓</div>
          <h2 style="margin-bottom: 12px;">Saved Offline</h2>
          <p style="font-size: 1.1rem; color: var(--muted);">We saved your request offline. We will attempt to connect and sync once you are back online.</p>
          <p style="font-size: 0.9rem; color: var(--muted); margin-top: 15px;">Your reference number is <strong>${mockBookingId}</strong>.</p>
          <div style="margin-top: 25px; display: flex; flex-direction: column; gap: 10px;">
            <a href="https://wa.me/919717500225?text=Hi,%20my%20offline%20help%20reference%20is%20${mockBookingId}" target="_blank" class="btn btn-primary full">WhatsApp Support</a>
            <a href="my-bookings.html" class="btn btn-glass full" style="color: var(--primary);">View My Bookings</a>
          </div>
        </div>
      `;
    });
  });
}

// ----------------------------------------------------
// 4. Premium Interactive Legal Pages Logic
// ----------------------------------------------------
function initLegalSearch() {
  const legalSections = document.querySelectorAll(".legal-section");
  const tocLinks = document.querySelectorAll(".legal-toc-link");
  const searchInput = document.getElementById("legalSearch");
  const noResultsDiv = document.getElementById("searchNoResults");
  const plainToggle = document.getElementById("plainEnglishToggle");
  const plainCards = document.querySelectorAll(".plain-english-card");

  // 4a. Scroll Spy for Table of Contents
  if (legalSections.length > 0 && tocLinks.length > 0) {
    const observerOptions = {
      root: null,
      rootMargin: "-25% 0px -55% 0px", // Trigger when section occupies the upper-middle region
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      // Find the first visible intersecting section
      let activeSectionId = null;
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeSectionId = entry.target.getAttribute("id");
          break;
        }
      }

      if (activeSectionId) {
        tocLinks.forEach((link) => {
          if (link.getAttribute("href") === `#${activeSectionId}`) {
            link.classList.add("active");
          } else {
            link.classList.remove("active");
          }
        });
      }
    }, observerOptions);

    legalSections.forEach((section) => observer.observe(section));
  }

  // 4b. Plain English Toggle Logic
  if (plainToggle) {
    // Sync UI with initial checkbox state (checked by default in HTML)
    const updatePlainCards = () => {
      const isEnabled = plainToggle.checked;
      plainCards.forEach((card) => {
        if (isEnabled) {
          card.classList.remove("hidden");
        } else {
          card.classList.add("hidden");
        }
      });
    };

    plainToggle.addEventListener("change", updatePlainCards);
    updatePlainCards(); // Initial run
  }

  // 4c. Live Search Keyword Filtering & Highlighting
  if (searchInput && legalSections.length > 0) {
    // Cache original HTML elements inside legal text content and plain English cards
    const searchableElements = [];
    const elementsToCache = document.querySelectorAll(
      ".legal-text-content h2, .legal-text-content p, .legal-text-content li, .plain-english-card p"
    );

    elementsToCache.forEach((el) => {
      searchableElements.push({
        element: el,
        originalHTML: el.innerHTML,
        originalText: el.textContent
      });
    });

    // Highlight text matching searchTerm (preserves HTML tags/structure)
    const highlightElementText = (element, searchTerm) => {
      const termLower = searchTerm.toLowerCase();
      
      const walk = (node) => {
        if (node.nodeType === 3) { // Text node
          const text = node.nodeValue;
          const index = text.toLowerCase().indexOf(termLower);
          if (index !== -1) {
            const parent = node.parentNode;
            if (parent && parent.className !== 'highlight') {
              const spanContainer = document.createElement("span");
              let remainingText = text;
              while (true) {
                const matchIdx = remainingText.toLowerCase().indexOf(termLower);
                if (matchIdx === -1) {
                  if (remainingText) {
                    spanContainer.appendChild(document.createTextNode(remainingText));
                  }
                  break;
                }
                const prefix = remainingText.substring(0, matchIdx);
                const match = remainingText.substring(matchIdx, matchIdx + searchTerm.length);
                if (prefix) {
                  spanContainer.appendChild(document.createTextNode(prefix));
                }
                const highlightSpan = document.createElement("span");
                highlightSpan.className = "highlight";
                highlightSpan.appendChild(document.createTextNode(match));
                spanContainer.appendChild(highlightSpan);
                remainingText = remainingText.substring(matchIdx + searchTerm.length);
              }
              parent.replaceChild(spanContainer, node);
            }
          }
        } else if (node.nodeType === 1 && node.childNodes && !node.classList.contains('highlight')) {
          // Element node: walk children recursively
          const children = Array.from(node.childNodes);
          children.forEach(walk);
        }
      };

      walk(element);
    };

    searchInput.addEventListener("input", () => {
      const searchTerm = searchInput.value.trim();

      // Reset all elements back to original content
      searchableElements.forEach((item) => {
        item.element.innerHTML = item.originalHTML;
      });

      if (!searchTerm) {
        // Show all sections and TOC links
        legalSections.forEach((section) => section.classList.remove("filtered-out"));
        tocLinks.forEach((link) => link.style.display = "block");
        if (noResultsDiv) noResultsDiv.style.display = "none";
        return;
      }

      let visibleSectionsCount = 0;

      legalSections.forEach((section) => {
        const sectionId = section.getAttribute("id");
        // Get elements belonging to this section
        const elementsInThisSection = searchableElements.filter((item) =>
          section.contains(item.element)
        );

        // Check if any element contains the search term
        const hasMatch = elementsInThisSection.some((item) =>
          item.originalText.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const tocLink = document.querySelector(`.legal-toc-link[href="#${sectionId}"]`);

        if (hasMatch) {
          section.classList.remove("filtered-out");
          visibleSectionsCount++;
          if (tocLink) tocLink.style.display = "block";

          // Apply highlights
          elementsInThisSection.forEach((item) => {
            highlightElementText(item.element, searchTerm);
          });
        } else {
          section.classList.add("filtered-out");
          if (tocLink) tocLink.style.display = "none";
        }
      });

      // Show/hide empty state
      if (noResultsDiv) {
        if (visibleSectionsCount === 0) {
          noResultsDiv.style.display = "block";
        } else {
          noResultsDiv.style.display = "none";
        }
      }
    });
  }
}

// ----------------------------------------------------
// 5. Shared Dynamic Navigation & Footer Components
// ----------------------------------------------------
function injectNavigation() {
  const isOpsPage = window.location.pathname.includes("admin-ops");
  if (isOpsPage) return;

  const appBar = document.querySelector(".app-bar");
  if (appBar) {
    const path = window.location.pathname;
    const page = path.split("/").pop() || "index.html";
    
    const isHome = page === "index.html" || page === "index" || page === "";
    const isServices = page === "services.html" || page === "services";
    const isQuickHelp = page === "quick-help.html" || page === "quick-help";
    const isBooking = page === "booking.html" || page === "booking";
    const isTrack = page === "my-bookings.html" || page === "my-bookings";
    
    // Header Content
    let leftControl = `
      <button class="nav-toggle" type="button" aria-label="Open menu" aria-expanded="false">
        <span></span>
        <span></span>
      </button>
    `;
    if (!isHome) {
      leftControl = `
        <a href="javascript:history.back()" class="nav-back" aria-label="Go back">
          <i data-lucide="arrow-left"></i>
        </a>
      `;
    }

    appBar.innerHTML = `
      ${leftControl}
      <a class="brand" href="index.html" aria-label="Caresy home">
        <svg class="brand-icon" viewBox="0 0 24 24" width="22" height="22" fill="var(--marigold)" stroke="none" style="display: inline-block; vertical-align: middle; margin-right: 4px;">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        <span class="brand-text" style="text-transform: lowercase; font-weight: 700; letter-spacing: -0.02em;">caresy</span>
      </a>
      <a href="tel:+919876543210" class="header-call-btn" aria-label="Call Caresy">
        <i data-lucide="phone"></i>
      </a>

      <nav class="main-nav" aria-label="Primary navigation">
        <button class="menu-close-btn" type="button" aria-label="Close menu"><i data-lucide="x"></i></button>
        <div class="menu-header">
          <div class="brand-mark-gold">C</div>
          <div>
            <strong class="menu-brand-name">caresy</strong>
            <span class="menu-brand-tagline">Your Care, Our Priority.</span>
          </div>
        </div>
        <a class="${isHome ? 'active' : ''}" href="index.html"><i data-lucide="home"></i> Home</a>
        <a class="${isServices ? 'active' : ''}" href="services.html"><i data-lucide="heart-handshake"></i> Services</a>
        <a class="${isTrack ? 'active' : ''}" href="my-bookings.html"><i data-lucide="calendar"></i> Bookings</a>
        <a class="${page.includes('profile') ? 'active' : ''}" href="my-bookings.html#profile"><i data-lucide="user"></i> Profile</a>
        <a class="${page.includes('about') ? 'active' : ''}" href="about.html"><i data-lucide="info"></i> About Us</a>
        <a class="${page.includes('hospitals') ? 'active' : ''}" href="for-hospitals.html"><i data-lucide="building-2"></i> For Hospitals</a>
        <a class="${page.includes('faq') ? 'active' : ''}" href="faq.html"><i data-lucide="help-circle"></i> FAQs</a>
        <a class="${page.includes('contact') ? 'active' : ''}" href="contact.html"><i data-lucide="phone"></i> Contact Us</a>
        <a href="#settings" onclick="alert('Settings page - coming soon!')"><i data-lucide="settings"></i> Settings</a>
        <a href="#logout" id="sidebarLogoutBtn"><i data-lucide="log-out"></i> Logout</a>
      </nav>
    `;
    
    // Re-attach toggle listener
    const toggle = appBar.querySelector(".nav-toggle");
    if (toggle) {
      toggle.addEventListener("click", () => {
        const isOpen = document.body.classList.toggle("nav-open");
        toggle.setAttribute("aria-expanded", String(isOpen));
      });
    }

    // Attach close listener
    const closeBtn = appBar.querySelector(".menu-close-btn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        document.body.classList.remove("nav-open");
        toggle?.setAttribute("aria-expanded", "false");
      });
    }
    
    appBar.querySelectorAll(".main-nav a").forEach((link) => {
      link.addEventListener("click", () => {
        document.body.classList.remove("nav-open");
        toggle?.setAttribute("aria-expanded", "false");
      });
    });

    const logoutBtn = appBar.querySelector("#sidebarLogoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (window.logoutUser) window.logoutUser();
        else alert('Logged out successfully.');
      });
    }

    // Inject mobile bottom nav dynamically if not present
    let bottomNav = document.querySelector(".mobile-bottom-nav");
    if (!bottomNav) {
      bottomNav = document.createElement("nav");
      bottomNav.className = "mobile-bottom-nav";
      bottomNav.setAttribute("aria-label", "Mobile navigation");
      document.body.appendChild(bottomNav);
    }
    
    bottomNav.innerHTML = `
      <a class="mobile-bottom-nav-item ${isHome ? 'active' : ''}" href="index.html">
        <i data-lucide="home"></i>
        <span>Home</span>
      </a>
      <a class="mobile-bottom-nav-item ${isServices ? 'active' : ''}" href="services.html">
        <i data-lucide="heart-handshake"></i>
        <span>Services</span>
      </a>
      <a class="mobile-bottom-nav-item ${isTrack || isBooking || isQuickHelp ? 'active' : ''}" href="my-bookings.html">
        <i data-lucide="calendar"></i>
        <span>Bookings</span>
      </a>
      <a class="mobile-bottom-nav-item" href="my-bookings.html#profile">
        <i data-lucide="user"></i>
        <span>Profile</span>
      </a>
    `;

    // Render Lucide icons
    if (window.lucide) {
      window.lucide.createIcons({
        nodeList: appBar.querySelectorAll('[data-lucide]')
      });
      window.lucide.createIcons({
        nodeList: bottomNav.querySelectorAll('[data-lucide]')
      });
    }
  }
}

function injectFooter() {
  const isOpsPage = window.location.pathname.includes("admin-ops");
  if (isOpsPage) return;

  const footer = document.querySelector(".footer");
  if (!footer) return;

  footer.innerHTML = `
    <div class="footer-container">
      <div class="footer-brand">
        <a class="brand" href="index.html" aria-label="Caresy home">
          <span class="brand-mark">C</span>
          <span class="brand-text">Caresy</span>
        </a>
        <p class="footer-desc">
          Trusted hospital companions for elderly and vulnerable patients in India. We bridge the gap when families cannot be physically present.
        </p>
        <div class="footer-badges">
          <div class="footer-badge">
            <i data-lucide="shield"></i>
            <span>Police Verified Companions</span>
          </div>
          <div class="footer-badge">
            <i data-lucide="check-circle"></i>
            <span>AuthBridge Secured</span>
          </div>
        </div>
      </div>
      
      <div class="footer-links">
        <div class="footer-col">
          <h4>Company</h4>
          <a href="about.html">About Us</a>
          <a href="services.html">Our Services</a>
          <a href="trust.html">Trust Framework</a>
          <a href="faq.html">FAQs & Coverage</a>
        </div>
        <div class="footer-col">
          <h4>Need Care?</h4>
          <a href="quick-help.html">Same-Day Help</a>
          <a href="booking.html">Schedule Visit</a>
          <a href="my-bookings.html">My Bookings</a>
        </div>
        <div class="footer-col">
          <h4>Legal</h4>
          <a href="privacy.html">Privacy Policy</a>
          <a href="terms.html">Terms of Service</a>
        </div>
      </div>

      <div class="footer-newsletter">
        <h4>Stay Connected</h4>
        <p>Get tips and guides on caring for aging family members.</p>
        <form class="footer-form" onsubmit="event.preventDefault(); alert('Thank you for subscribing!');">
          <input type="email" placeholder="Email address" required />
          <button type="submit" aria-label="Subscribe">
            <i data-lucide="send"></i>
          </button>
        </form>
        <div class="footer-socials">
          <a href="https://wa.me/919717500225" target="_blank" rel="noopener" aria-label="WhatsApp">
            <i data-lucide="message-circle"></i> WhatsApp
          </a>
          <a href="https://linkedin.com" target="_blank" rel="noopener" aria-label="LinkedIn">
            <i data-lucide="linkedin"></i>
          </a>
          <a href="https://twitter.com" target="_blank" rel="noopener" aria-label="Twitter">
            <i data-lucide="twitter"></i>
          </a>
        </div>
      </div>
    </div>
    
    <div class="footer-bottom">
      <div class="footer-bottom-container">
        <p class="copyright">&copy; 2026 Caresy Care Services Pvt. Ltd. All rights reserved.</p>
        <div class="footer-bottom-links">
          <span class="footer-address-mini">4th Floor, Sector 7, HSR Layout, Bengaluru, KA 560102</span>
          <span class="footer-divider">|</span>
          <a href="tel:+919717500225">+91 97175 00225</a>
          <span class="footer-divider">|</span>
          <a href="mailto:support@caresy.co">support@caresy.co</a>
        </div>
      </div>
    </div>
  `;
}

// ----------------------------------------------------
// 6. DPDP Act 2023 Compliant Cookie Banner
// ----------------------------------------------------
function initCookieBanner() {
  if (SafeStorage.getItem("cookieConsent")) return;

  const banner = document.createElement("div");
  banner.className = "cookie-banner";
  banner.innerHTML = `
    <h3 class="cookie-banner-title">
      <i data-lucide="cookie" style="color: var(--primary); width: 20px; height: 20px;"></i>
      Cookie Consent
    </h3>
    <p class="cookie-banner-text">
      In compliance with the DPDP Act 2023, we request your consent to use cookies for analyzing web traffic and optimizing your companion coordination experience. Read our <a href="privacy.html" style="color: var(--primary); text-decoration: underline;">Privacy Policy</a>.
    </p>
    <div class="cookie-banner-preferences" id="cookiePrefs" style="display: none; flex-direction: column; gap: 8px; margin: 12px 0; padding: 10px; border: 1px solid var(--line); border-radius: 12px; background: rgba(0,0,0,0.02); font-size: 0.82rem;">
      <label style="display: flex; align-items: center; gap: 8px; font-weight: 600;">
        <input type="checkbox" checked disabled /> Essential Cookies (Required)
      </label>
      <label style="display: flex; align-items: center; gap: 8px;">
        <input type="checkbox" id="prefAnalytics" checked /> Analytics & Performance
      </label>
      <label style="display: flex; align-items: center; gap: 8px;">
        <input type="checkbox" id="prefPersonalization" checked /> Personalization
      </label>
    </div>
    <div class="cookie-banner-buttons" style="display: flex; gap: 8px; flex-wrap: wrap;">
      <button class="btn btn-primary" id="btnAcceptCookies" style="min-height: 38px; padding: 8px 16px; font-size: 0.88rem; border-radius: 12px; flex: 1;">Accept All</button>
      <button class="btn btn-outline" id="btnDeclineCookies" style="min-height: 38px; padding: 8px 16px; font-size: 0.88rem; border-radius: 12px; flex: 1;">Reject All</button>
      <button class="btn btn-outline" id="btnManageCookies" style="min-height: 38px; padding: 8px 16px; font-size: 0.88rem; border-radius: 12px; flex-basis: 100%;">Manage Preferences</button>
      <button class="btn btn-primary" id="btnSaveCookiePrefs" style="min-height: 38px; padding: 8px 16px; font-size: 0.88rem; border-radius: 12px; flex-basis: 100%; display: none;">Save Choices</button>
    </div>
  `;

  document.body.appendChild(banner);

  // Initialize Lucide icons within the dynamically created banner
  if (window.lucide) {
    window.lucide.createIcons({
      attrs: {
        class: 'lucide'
      },
      nameAttr: 'data-lucide',
      nodeList: banner.querySelectorAll('[data-lucide]')
    });
  }

  setTimeout(() => {
    banner.classList.add("show");
  }, 100);

  const btnManage = document.getElementById("btnManageCookies");
  const btnSave = document.getElementById("btnSaveCookiePrefs");
  const prefsDiv = document.getElementById("cookiePrefs");

  btnManage.addEventListener("click", () => {
    prefsDiv.style.display = "flex";
    btnManage.style.display = "none";
    btnSave.style.display = "block";
  });

  document.getElementById("btnAcceptCookies").addEventListener("click", () => {
    SafeStorage.setItem("cookieConsent", JSON.stringify({ essential: true, analytics: true, personalization: true }));
    banner.classList.remove("show");
    setTimeout(() => banner.remove(), 400);
  });

  document.getElementById("btnDeclineCookies").addEventListener("click", () => {
    SafeStorage.setItem("cookieConsent", JSON.stringify({ essential: true, analytics: false, personalization: false }));
    banner.classList.remove("show");
    setTimeout(() => banner.remove(), 400);
  });

  btnSave.addEventListener("click", () => {
    const analytics = document.getElementById("prefAnalytics").checked;
    const personalization = document.getElementById("prefPersonalization").checked;
    SafeStorage.setItem("cookieConsent", JSON.stringify({ essential: true, analytics, personalization }));
    banner.classList.remove("show");
    setTimeout(() => banner.remove(), 400);
  });
}

// ----------------------------------------------------
// 7. Dynamic Operations Desk Stats Updates
// ----------------------------------------------------
function initDispatcherStatus() {
  const statusBanners = document.querySelectorAll(".dispatcher-status-banner");
  if (statusBanners.length === 0) return;

  const updateStatus = () => {
    const callbackMin = 4 + Math.floor(Math.random() * 5); // 4-8 mins
    const companions = 5 + Math.floor(Math.random() * 7); // 5-11 online

    statusBanners.forEach((banner) => {
      const p = banner.querySelector("p");
      if (p) {
        p.innerHTML = `Desk Status: <strong style="color: #27a875;">Active</strong> &bull; Estimated Callback: <strong>${callbackMin} mins</strong> &bull; Nearby Companions: <strong>${companions} online</strong>`;
      }
    });
  };

  updateStatus();
  setInterval(updateStatus, 15000); // update every 15 seconds
}

// ----------------------------------------------------
// 7.5 Centralized Stats Sync (CF-006)
// ----------------------------------------------------
const CARESY_STATS = {
  companions: "1,200+",
  visits: "5,000+"
};

function updateDynamicStats() {
  const companionStats = document.querySelectorAll('[data-stat="companions"]');
  const visitStats = document.querySelectorAll('[data-stat="visits"]');
  
  companionStats.forEach(el => {
    if (el.tagName === 'STRONG' && el.textContent.includes('Verified')) {
      el.textContent = `${CARESY_STATS.companions} Verified Companions`;
    } else {
      el.textContent = CARESY_STATS.companions;
    }
  });

  visitStats.forEach(el => {
    if (el.tagName === 'STRONG' && (el.textContent.includes('Visits') || el.textContent.includes('Completed'))) {
      el.textContent = `${CARESY_STATS.visits} Completed Visits`;
    } else {
      el.textContent = CARESY_STATS.visits;
    }
  });
}

// ----------------------------------------------------
// 7.8 Mobile Multi-Step Form & Swipers Redesign Logic
// ----------------------------------------------------
function initMobileMultiStepForm() {
  const forms = document.querySelectorAll("#bookingForm, #quickHelpForm");
  if (forms.length === 0) return;

  forms.forEach(form => {
    const sections = form.querySelectorAll(".form-section");
    if (sections.length < 2) return;

    // If screen width > 768px, disable multi-step behaviors
    if (window.innerWidth > 768) {
      form.classList.remove("multi-step-active");
      sections.forEach(sec => sec.classList.remove("step-active"));
      
      const progressContainer = form.querySelector(".step-progress-container");
      if (progressContainer) progressContainer.style.display = "none";
      
      const navButtons = form.querySelector(".form-navigation-buttons");
      if (navButtons) navButtons.style.display = "none";
      
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.style.removeProperty("display");
      }
      return;
    }

    form.classList.add("multi-step-active");

    // Add progress bar if not exists
    let progressContainer = form.querySelector(".step-progress-container");
    if (!progressContainer) {
      progressContainer = document.createElement("div");
      progressContainer.className = "step-progress-container";
      progressContainer.innerHTML = `
        <div class="step-progress-header">
          <span class="step-current-text">Step 1 of 3</span>
          <span class="step-section-title">Patient details</span>
        </div>
        <div class="step-progress-bar-bg">
          <div class="step-progress-bar-fill"></div>
        </div>
      `;
      form.insertBefore(progressContainer, sections[0]);
    } else {
      progressContainer.style.display = "block";
    }

    // Add navigation buttons if not exists
    let navButtons = form.querySelector(".form-navigation-buttons");
    if (!navButtons) {
      navButtons = document.createElement("div");
      navButtons.className = "form-navigation-buttons";
      navButtons.innerHTML = `
        <button type="button" class="btn btn-outline prev-step-btn" style="flex: 1;">Back</button>
        <button type="button" class="btn btn-primary next-step-btn" style="flex: 1.5;">Next</button>
      `;
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        form.insertBefore(navButtons, submitBtn);
      } else {
        form.appendChild(navButtons);
      }
    } else {
      navButtons.style.display = "flex";
    }

    let currentStep = 0;

    const updateWizard = () => {
      sections.forEach((sec, idx) => {
        if (idx === currentStep) {
          sec.classList.add("step-active");
        } else {
          sec.classList.remove("step-active");
        }
      });

      // Update progress bar
      const fill = progressContainer.querySelector(".step-progress-bar-fill");
      const currentText = progressContainer.querySelector(".step-current-text");
      const titleText = progressContainer.querySelector(".step-section-title");

      const pct = ((currentStep + 1) / sections.length) * 100;
      fill.style.width = `${pct}%`;
      currentText.textContent = `Step ${currentStep + 1} of ${sections.length}`;

      const activeHeading = sections[currentStep].querySelector("h2");
      titleText.textContent = activeHeading ? activeHeading.textContent : "";

      // Update button states
      const prevBtn = navButtons.querySelector(".prev-step-btn");
      const nextBtn = navButtons.querySelector(".next-step-btn");
      const submitBtn = form.querySelector('button[type="submit"]');

      if (currentStep === 0) {
        prevBtn.style.visibility = "hidden";
      } else {
        prevBtn.style.visibility = "visible";
      }

      if (currentStep === sections.length - 1) {
        nextBtn.style.display = "none";
        if (submitBtn) {
          submitBtn.style.setProperty("display", "inline-flex", "important");
        }
      } else {
        nextBtn.style.display = "inline-flex";
        if (submitBtn) {
          submitBtn.style.setProperty("display", "none", "important");
        }
      }
    };

    // Initialize first step
    updateWizard();

    // Event listeners
    const prevBtn = navButtons.querySelector(".prev-step-btn");
    const nextBtn = navButtons.querySelector(".next-step-btn");

    // Remove existing event listeners to avoid duplicates
    const newPrevBtn = prevBtn.cloneNode(true);
    const newNextBtn = nextBtn.cloneNode(true);
    prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
    nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);

    newPrevBtn.addEventListener("click", () => {
      if (currentStep > 0) {
        currentStep--;
        updateWizard();
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    newNextBtn.addEventListener("click", () => {
      const activeSec = sections[currentStep];
      const fields = activeSec.querySelectorAll("input, select, textarea");
      let isValid = true;

      // Native HTML5 Validation check before advancing
      for (const field of fields) {
        if (!field.checkValidity()) {
          field.reportValidity();
          isValid = false;
          break;
        }
      }

      if (isValid) {
        currentStep++;
        updateWizard();
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

function initMobileSwipers() {
  const swiperSelectors = [
    ".pricing-grid",
    ".teaser-grid",
    ".decision-grid",
    ".testimonials-section > div[style*='grid-template-columns']",
    ".coverage-section .grid-3-col"
  ];
  
  swiperSelectors.forEach(selector => {
    const el = document.querySelector(selector);
    if (el) {
      if (window.innerWidth <= 768) {
        el.classList.add("horizontal-swipe-mobile");
      } else {
        el.classList.remove("horizontal-swipe-mobile");
      }
    }
  });
}

function initMobileAccordions() {
  const isMobile = window.innerWidth <= 768;
  
  // 1. Services Page Accordion
  const servicesMain = document.querySelector(".services-page-main");
  if (servicesMain) {
    let accordionWrapper = document.getElementById("servicesMobileAccordion");
    
    if (isMobile) {
      if (!accordionWrapper) {
        accordionWrapper = document.createElement("details");
        accordionWrapper.id = "servicesMobileAccordion";
        accordionWrapper.className = "mobile-accordion-details";
        accordionWrapper.innerHTML = `
          <summary class="mobile-accordion-summary">
            <span>Additional Details & Coverage</span>
            <i data-lucide="chevron-down"></i>
          </summary>
          <div class="mobile-accordion-content"></div>
        `;
        
        const bottomCta = servicesMain.querySelector(".bottom-cta");
        servicesMain.insertBefore(accordionWrapper, bottomCta);
        
        const sectionsToMove = [
          servicesMain.querySelector(".coverage-section"),
          servicesMain.querySelector(".dos-donts-section"),
          servicesMain.querySelector(".services-faq-summary"),
          servicesMain.querySelector(".compare-band")
        ];
        
        const contentDiv = accordionWrapper.querySelector(".mobile-accordion-content");
        sectionsToMove.forEach(sec => {
          if (sec) contentDiv.appendChild(sec);
        });
        
        if (window.lucide) window.lucide.createIcons();
      }
    } else {
      if (accordionWrapper) {
        const bottomCta = servicesMain.querySelector(".bottom-cta");
        const contentDiv = accordionWrapper.querySelector(".mobile-accordion-content");
        while (contentDiv.firstChild) {
          servicesMain.insertBefore(contentDiv.firstChild, bottomCta);
        }
        accordionWrapper.remove();
      }
    }
  }

  // 2. Home Page Accordion
  const homeMain = document.querySelector("#main-content");
  const isHomePage = homeMain && !homeMain.classList.contains("page") && homeMain.querySelector(".home-hero");
  if (isHomePage) {
    let homeAccordion = document.getElementById("homeMobileAccordion");
    
    if (isMobile) {
      if (!homeAccordion) {
        homeAccordion = document.createElement("details");
        homeAccordion.id = "homeMobileAccordion";
        homeAccordion.className = "mobile-accordion-details";
        homeAccordion.innerHTML = `
          <summary class="mobile-accordion-summary">
            <span>How Caresy Works & Safety Protocols</span>
            <i data-lucide="chevron-down"></i>
          </summary>
          <div class="mobile-accordion-content"></div>
        `;
        
        const testimonials = homeMain.querySelector(".testimonials-section");
        homeMain.insertBefore(homeAccordion, testimonials);
        
        // Find direct visual showcase sections
        const showcases = Array.from(homeMain.children).filter(child => child.classList.contains("visual-showcase-section"));
        const sectionsToMove = [
          ...showcases,
          homeMain.querySelector(".service-teaser"),
          homeMain.querySelector(".home-emergency")
        ];
        
        const contentDiv = homeAccordion.querySelector(".mobile-accordion-content");
        sectionsToMove.forEach(sec => {
          if (sec) contentDiv.appendChild(sec);
        });
        
        if (window.lucide) window.lucide.createIcons();
      }
    } else {
      if (homeAccordion) {
        const testimonials = homeMain.querySelector(".testimonials-section");
        const contentDiv = homeAccordion.querySelector(".mobile-accordion-content");
        while (contentDiv.firstChild) {
          homeMain.insertBefore(contentDiv.firstChild, testimonials);
        }
        homeAccordion.remove();
      }
    }
  }
}

// ----------------------------------------------------
// 8. Global Feature Bootstrapper
// ----------------------------------------------------
function initGlobalFeatures() {
  injectNavigation();
  injectFooter();
  initCookieBanner();
  initDispatcherStatus();
  initLegalSearch();
  updateDynamicStats();
  initMobileMultiStepForm();
  initMobileSwipers();
  initMobileAccordions();

  // Re-initialize Lucide Icons on final generated DOM
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Auto-open sign in modal if URL parameters request it
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('login') === 'admin' || urlParams.get('login') === '1') {
    const defaultEmail = urlParams.get('login') === 'admin' ? 'ops@caresy.co' : '';
    setTimeout(() => {
      window.startVerification(defaultEmail, "", () => {
        if (defaultEmail) {
          window.location.href = 'admin-ops.html';
        } else {
          window.location.reload();
        }
      });
    }, 500);
  }
}

// Re-evaluate layouts on window resize
window.addEventListener("resize", () => {
  initMobileMultiStepForm();
  initMobileSwipers();
  initMobileAccordions();
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGlobalFeatures);
} else {
  initGlobalFeatures();
}


