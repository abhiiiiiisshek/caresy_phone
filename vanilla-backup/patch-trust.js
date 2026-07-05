const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'trust.html');
let content = fs.readFileSync(file, 'utf8');

// E1: Companion avatars round
content = content.replace(/<div class="avatar"><img /g, '<div class="avatar" style="border-radius: 50%; overflow: hidden; width: 64px; height: 64px; flex-shrink: 0;"><img style="width: 100%; height: 100%; object-fit: cover;" ');

// E3: Shield icon for Police Cleared
content = content.replace(
  /<span style="background: rgba\(8, 121, 111, 0\.1\); color: var\(--primary\); padding: 2px 8px; border-radius: 99px; font-size: 0\.72rem; font-weight: 700;">Police Cleared<\/span>/g,
  '<span style="background: rgba(8, 121, 111, 0.1); color: var(--primary); padding: 2px 8px; border-radius: 99px; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="shield-check" style="width: 14px; height: 14px;"></i> Police Cleared</span>'
);
content = content.replace(
  /<span style="background: rgba\(8, 121, 111, 0\.1\); color: var\(--primary\); padding: 2px 8px; border-radius: 99px; font-size: 0\.72rem; font-weight: 700;">Aadhaar Verified<\/span>/g,
  '<span style="background: rgba(8, 121, 111, 0.1); color: var(--primary); padding: 2px 8px; border-radius: 99px; font-size: 0.72rem; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="check-circle" style="width: 14px; height: 14px;"></i> Aadhaar Verified</span>'
);

// E2: Timeline for verification
const timelineCSS = `
<style>
.verification-timeline {
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: relative;
  max-width: 800px;
  margin: 0 auto 60px;
}
.verification-timeline::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 32px;
  width: 2px;
  background: var(--line);
}
.timeline-item {
  position: relative;
  padding-left: 80px;
  padding-right: 20px;
}
.timeline-icon {
  position: absolute;
  left: 16px;
  top: 0;
  width: 34px;
  height: 34px;
  background: var(--surface);
  border: 2px solid var(--primary);
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--primary);
  z-index: 2;
}
</style>
`;
content = content.replace('</head>', timelineCSS + '</head>');

const timelineHTML = `
      <section class="section verification-timeline reveal">
        <div class="timeline-item">
          <div class="timeline-icon"><i data-lucide="fingerprint" style="width: 18px;"></i></div>
          <article class="material-card" style="padding: 24px;">
            <strong style="display: block; font-size: 1.2rem; color: var(--ink); margin-bottom: 8px;">1. Aadhaar verification</strong>
            <span style="color: var(--muted); line-height: 1.5;">Identity checked before companion activation via UIDAI / Digilocker API integration.</span>
          </article>
        </div>
        <div class="timeline-item">
          <div class="timeline-icon"><i data-lucide="shield-alert" style="width: 18px;"></i></div>
          <article class="material-card" style="padding: 24px;">
            <strong style="display: block; font-size: 1.2rem; color: var(--ink); margin-bottom: 8px;">2. Police verification</strong>
            <span style="color: var(--muted); line-height: 1.5;">Conducted in partnership with AuthBridge (India's leading verification partner).</span>
          </article>
        </div>
        <div class="timeline-item">
          <div class="timeline-icon"><i data-lucide="map-pin" style="width: 18px;"></i></div>
          <article class="material-card" style="padding: 24px;">
            <strong style="display: block; font-size: 1.2rem; color: var(--ink); margin-bottom: 8px;">3. Address verification</strong>
            <span style="color: var(--muted); line-height: 1.5;">Current residential address and family emergency contacts physically verified.</span>
          </article>
        </div>
        <div class="timeline-item">
          <div class="timeline-icon"><i data-lucide="camera" style="width: 18px;"></i></div>
          <article class="material-card" style="padding: 24px;">
            <strong style="display: block; font-size: 1.2rem; color: var(--ink); margin-bottom: 8px;">4. Photo verification</strong>
            <span style="color: var(--muted); line-height: 1.5;">Customer receives a recognizable companion profile with recent photo.</span>
          </article>
        </div>
        <div class="timeline-item">
          <div class="timeline-icon"><i data-lucide="graduation-cap" style="width: 18px;"></i></div>
          <article class="material-card" style="padding: 24px;">
            <strong style="display: block; font-size: 1.2rem; color: var(--ink); margin-bottom: 8px;">5. Training completion</strong>
            <span style="color: var(--muted); line-height: 1.5;">Etiquette, hospital navigation, patient coordination, and central dispatcher training.</span>
          </article>
        </div>
        <div class="timeline-item">
          <div class="timeline-icon"><i data-lucide="shield-check" style="width: 18px;"></i></div>
          <article class="material-card" style="padding: 24px; border-left: 4px solid var(--primary);">
            <strong style="display: block; font-size: 1.2rem; color: var(--primary); margin-bottom: 8px;">6. Final Background check</strong>
            <span style="color: var(--muted); line-height: 1.5;">AuthBridge screening and continuous checks completed before assignment.</span>
          </article>
        </div>
      </section>
`;

content = content.replace(/<section class="section trust-grid">[\s\S]*?<\/section>/, timelineHTML);

// J6: Explicit dimensions for avatars
content = content.replace(/<img src="assets\/caresy-companion-priya.png" alt="Priya Sharma" \/>/g, '<img src="assets/caresy-companion-priya.png" alt="Priya Sharma" width="64" height="64" />');
content = content.replace(/<img src="assets\/caresy-companion-anil.png" alt="Anil Kumar" \/>/g, '<img src="assets/caresy-companion-anil.png" alt="Anil Kumar" width="64" height="64" />');
content = content.replace(/<img src="assets\/caresy-companion-sarah.png" alt="Sarah Mathews" \/>/g, '<img src="assets/caresy-companion-sarah.png" alt="Sarah Mathews" width="64" height="64" />');


fs.writeFileSync(file, content, 'utf8');
console.log('trust.html patched');
