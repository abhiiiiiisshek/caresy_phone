const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'quick-help.html');
let content = fs.readFileSync(file, 'utf8');

// F2: Live indicator banner
const dispatcherBanner = `
      <div class="dispatcher-status-banner reveal" style="max-width: var(--max); margin: 0 auto; padding: 0 24px 20px;">
        <div class="material-card" style="background: rgba(8, 121, 111, 0.04); border-color: rgba(8, 121, 111, 0.15); padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="pulse"></span>
            <div>
              <strong style="color: var(--primary-dark); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; display: block;">Live Operations Desk</strong>
              <p style="margin: 3px 0 0; font-size: 0.92rem; color: var(--muted);">Desk Status: <strong>Active</strong> &bull; Estimated Callback: <strong>6 mins</strong> &bull; Nearby Companions: <strong>8 online</strong></p>
            </div>
          </div>
          <a href="https://wa.me/919717500225" target="_blank" rel="noopener" class="btn btn-glass" style="min-height: auto; padding: 8px 14px; font-size: 0.84rem; color: #27a875; border-color: #27a875;">Chat on WhatsApp &rarr;</a>
        </div>
      </div>
`;

content = content.replace('<section class="section booking-layout">', dispatcherBanner + '\n      <section class="section booking-layout">');

fs.writeFileSync(file, content, 'utf8');
console.log('quick-help.html patched');
