const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'services.html');
let content = fs.readFileSync(file, 'utf8');

// D1: Add icons to feature cards
content = content.replace('<span class="service-icon">01</span>', '<i data-lucide="user" class="service-icon" style="color: var(--primary); width: 32px; height: 32px; margin-bottom: 12px; display: block;"></i>');
content = content.replace('<span class="service-icon">02</span>', '<i data-lucide="calendar" class="service-icon" style="color: var(--primary); width: 32px; height: 32px; margin-bottom: 12px; display: block;"></i>');
content = content.replace('<span class="service-icon">03</span>', '<i data-lucide="file-text" class="service-icon" style="color: var(--primary); width: 32px; height: 32px; margin-bottom: 12px; display: block;"></i>');
content = content.replace('<span class="service-icon">04</span>', '<i data-lucide="pill" class="service-icon" style="color: var(--primary); width: 32px; height: 32px; margin-bottom: 12px; display: block;"></i>');
content = content.replace('<span class="service-icon">05</span>', '<i data-lucide="users" class="service-icon" style="color: var(--primary); width: 32px; height: 32px; margin-bottom: 12px; display: block;"></i>');

// D3: Coming Soon badge for Overnight Companion
content = content.replace(
  '<article class="material-card muted-card reveal delay-2">\n          <span class="service-icon">Future</span>\n          <h2>Pickup & Drop</h2>\n          <p>Planned future service for hospital transit and full-day companion coverage.</p>\n        </article>',
  `<article class="material-card muted-card reveal delay-2" style="opacity: 0.7; position: relative;">
          <span style="position: absolute; top: 16px; right: 16px; background: var(--line); color: var(--muted); padding: 4px 10px; border-radius: 99px; font-size: 0.72rem; font-weight: 800; text-transform: uppercase;">Coming Soon</span>
          <i data-lucide="moon" class="service-icon" style="color: var(--muted); width: 32px; height: 32px; margin-bottom: 12px; display: block;"></i>
          <h2>Overnight Hospital Companion</h2>
          <p>Planned future service for overnight hospital stays and post-surgery observation.</p>
        </article>`
);

// D4: Does / Doesn't Table
const dosDontsHTML = `
      <section class="section dos-donts-section reveal" style="padding-top: 60px; padding-bottom: 60px; max-width: 900px; margin: 0 auto;">
        <div class="section-title" style="text-align: center; margin-bottom: 40px;">
          <h2>Clear Boundaries</h2>
          <p>What Caresy Companions Do and Don't Do</p>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
          <div class="material-card" style="border-top: 4px solid var(--primary);">
            <h3 style="color: var(--primary-dark); margin-bottom: 20px; display: flex; align-items: center; gap: 8px;"><i data-lucide="check-circle" style="color: var(--primary);"></i> What We Do</h3>
            <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 12px;">
              <li style="display: flex; gap: 8px; align-items: start;"><i data-lucide="check" style="color: var(--primary); flex-shrink: 0; width: 18px; margin-top: 2px;"></i> Wait in hospital queues (billing, pharmacy)</li>
              <li style="display: flex; gap: 8px; align-items: start;"><i data-lucide="check" style="color: var(--primary); flex-shrink: 0; width: 18px; margin-top: 2px;"></i> Push wheelchairs and aid walking</li>
              <li style="display: flex; gap: 8px; align-items: start;"><i data-lucide="check" style="color: var(--primary); flex-shrink: 0; width: 18px; margin-top: 2px;"></i> Take notes during doctor consultations</li>
              <li style="display: flex; gap: 8px; align-items: start;"><i data-lucide="check" style="color: var(--primary); flex-shrink: 0; width: 18px; margin-top: 2px;"></i> Post live updates to the family app</li>
              <li style="display: flex; gap: 8px; align-items: start;"><i data-lucide="check" style="color: var(--primary); flex-shrink: 0; width: 18px; margin-top: 2px;"></i> Provide friendly emotional support</li>
            </ul>
          </div>
          <div class="material-card" style="border-top: 4px solid var(--coral);">
            <h3 style="color: var(--coral); margin-bottom: 20px; display: flex; align-items: center; gap: 8px;"><i data-lucide="x-circle" style="color: var(--coral);"></i> What We Don't Do</h3>
            <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 12px;">
              <li style="display: flex; gap: 8px; align-items: start;"><i data-lucide="x" style="color: var(--coral); flex-shrink: 0; width: 18px; margin-top: 2px;"></i> Give medical or dosage advice</li>
              <li style="display: flex; gap: 8px; align-items: start;"><i data-lucide="x" style="color: var(--coral); flex-shrink: 0; width: 18px; margin-top: 2px;"></i> Administer injections or IV lines</li>
              <li style="display: flex; gap: 8px; align-items: start;"><i data-lucide="x" style="color: var(--coral); flex-shrink: 0; width: 18px; margin-top: 2px;"></i> Lift non-ambulatory patients</li>
              <li style="display: flex; gap: 8px; align-items: start;"><i data-lucide="x" style="color: var(--coral); flex-shrink: 0; width: 18px; margin-top: 2px;"></i> Make clinical decisions</li>
              <li style="display: flex; gap: 8px; align-items: start;"><i data-lucide="x" style="color: var(--coral); flex-shrink: 0; width: 18px; margin-top: 2px;"></i> Drive patients in private vehicles</li>
            </ul>
          </div>
        </div>
      </section>
`;

content = content.replace('</main>', dosDontsHTML + '\n</main>');

// D5: Bottom CTA
const bottomCTAHTML = `
      <section class="section bottom-cta reveal" style="text-align: center; padding: 80px 24px; background: var(--primary-dark); color: #fff; margin-top: 60px;">
        <h2 style="font-size: 2.4rem; margin-bottom: 16px; color: #fff;">Ready to book a companion?</h2>
        <p style="font-size: 1.1rem; opacity: 0.9; margin-bottom: 32px; max-width: 500px; margin-left: auto; margin-right: auto;">Our operations desk is live. Book for an upcoming appointment or request urgent same-day help.</p>
        <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
          <a class="btn btn-primary" href="booking.html" style="background: var(--mint); color: var(--primary-dark);">Schedule Visit</a>
          <a class="btn btn-glass" href="quick-help.html" style="color: #fff; border-color: rgba(255,255,255,0.3);">Need Same-Day Help</a>
        </div>
      </section>
`;

content = content.replace('</main>', bottomCTAHTML + '\n</main>');

// Remove the placeholder compare-band section as it is replaced by dosDontsHTML effectively
content = content.replace(/<section class="section compare-band reveal">[\s\S]*?<\/section>/, '');

// B7: CTA hierarchy in nav
content = content.replace(
  '<a class="nav-quick" href="quick-help.html">Need help today</a>',
  '<a class="nav-cta" href="quick-help.html">Need help today</a>'
);
content = content.replace(
  '<a class="nav-cta" href="booking.html">Book for later</a>',
  '<a class="nav-quick" href="booking.html" style="background: transparent; color: var(--primary-dark); border: 1px solid var(--primary-dark);">Book for later</a>'
);
content = content.replace(
  '<a class="nav-quick" href="quick-help.html">Need help today</a>',
  '<a class="nav-cta" href="quick-help.html">Need help today</a>'
);

fs.writeFileSync(file, content, 'utf8');
console.log('services.html patched');
