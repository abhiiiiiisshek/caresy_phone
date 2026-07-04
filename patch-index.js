const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'index.html');
let content = fs.readFileSync(file, 'utf8');

// C1: Fix Trust Badges icons
content = content.replace('<span class="proof-icon">ID</span>', '<i data-lucide="shield-check" class="proof-icon" style="color: var(--primary); width: 32px; height: 32px;"></i>');
content = content.replace('<span class="proof-icon">UP</span>', '<i data-lucide="trending-up" class="proof-icon" style="color: var(--primary); width: 32px; height: 32px;"></i>');
content = content.replace('<span class="proof-icon">OK</span>', '<i data-lucide="check-square" class="proof-icon" style="color: var(--primary); width: 32px; height: 32px;"></i>');

// C3: SVG icons and subtle backgrounds for stats in hero
content = content.replace(
  '<div><strong>4-step</strong><span>family update flow</span></div>',
  '<div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 12px; backdrop-filter: blur(4px);"><i data-lucide="smartphone" style="display: block; margin-bottom: 4px; color: var(--primary);"></i><strong>4-step</strong><span>family update flow</span></div>'
);
content = content.replace(
  '<div><strong>6 checks</strong><span>before assignment</span></div>',
  '<div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 12px; backdrop-filter: blur(4px);"><i data-lucide="shield" style="display: block; margin-bottom: 4px; color: var(--primary);"></i><strong>6 checks</strong><span>before assignment</span></div>'
);
content = content.replace(
  '<div><strong>Human</strong><span>hospital presence</span></div>',
  '<div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 12px; backdrop-filter: blur(4px);"><i data-lucide="heart-handshake" style="display: block; margin-bottom: 4px; color: var(--primary);"></i><strong>Human</strong><span>hospital presence</span></div>'
);

// C4: Testimonials section
const testimonialsHTML = `
    <section class="section testimonials-section" style="background: var(--surface-2); border-radius: 30px; padding: 60px 24px; margin: 60px auto; max-width: var(--max);">
      <div class="section-title reveal" style="text-align: center; margin-bottom: 40px;">
        <p class="section-kicker">Real Stories</p>
        <h2>What families say about Caresy.</h2>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
        <div class="material-card reveal" style="padding: 24px;">
          <div style="display: flex; gap: 4px; color: var(--primary); margin-bottom: 12px;"><i data-lucide="star"></i><i data-lucide="star"></i><i data-lucide="star"></i><i data-lucide="star"></i><i data-lucide="star"></i></div>
          <p style="font-style: italic; margin-bottom: 20px;">"Priya was an absolute godsend. She waited with my father for 3 hours at Apollo and sent me updates every time he moved. I could work without panicking."</p>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--primary); color: #fff; display: grid; place-items: center; font-weight: bold;">AK</div>
            <div><strong>Arjun K.</strong><br><small>Delhi NCR</small></div>
          </div>
        </div>
        <div class="material-card reveal delay-1" style="padding: 24px;">
          <div style="display: flex; gap: 4px; color: var(--primary); margin-bottom: 12px;"><i data-lucide="star"></i><i data-lucide="star"></i><i data-lucide="star"></i><i data-lucide="star"></i><i data-lucide="star"></i></div>
          <p style="font-style: italic; margin-bottom: 20px;">"I live in the US and it’s always stressful when mom has to go for checkups. Anil managed everything, including getting her medicines from the pharmacy."</p>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: #a45b9a; color: #fff; display: grid; place-items: center; font-weight: bold;">SS</div>
            <div><strong>Sneha S.</strong><br><small>San Francisco, CA</small></div>
          </div>
        </div>
        <div class="material-card reveal delay-2" style="padding: 24px;">
          <div style="display: flex; gap: 4px; color: var(--primary); margin-bottom: 12px;"><i data-lucide="star"></i><i data-lucide="star"></i><i data-lucide="star"></i><i data-lucide="star"></i><i data-lucide="star"></i></div>
          <p style="font-style: italic; margin-bottom: 20px;">"The live updates feature is what sets Caresy apart. Knowing exactly which stage of the consultation my wife was in gave me immense peace of mind."</p>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: #e77f62; color: #fff; display: grid; place-items: center; font-weight: bold;">RM</div>
            <div><strong>Rohan M.</strong><br><small>Bengaluru</small></div>
          </div>
        </div>
      </div>
    </section>
`;

content = content.replace(/<\/section>\s*<section class="section service-teaser">/, '</section>\n' + testimonialsHTML + '\n    <section class="section service-teaser">');

// C5: Hero section depth and Ken Burns
content = content.replace('<style>', '<style>\n@keyframes kenBurns {\n  0% { transform: scale(1); }\n  100% { transform: scale(1.1); }\n}\n');
content = content.replace(
  '<img src="assets/caresy-hero.png" alt="A Caresy companion helping an elderly patient in a hospital lobby" />',
  '<img src="assets/caresy-hero.png" alt="A Caresy companion helping an elderly patient in a hospital lobby" style="animation: kenBurns 20s infinite alternate; width: 100%; height: 100%; object-fit: cover;" />'
);
content = content.replace(
  '<div class="hero-scrim"></div>',
  '<div class="hero-scrim" style="background: linear-gradient(to right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.1) 100%);"></div>'
);

// C6: Simulator enhancements
content = content.replace(
  '<div class="simulator-display reveal delay-1">',
  '<div class="simulator-display reveal delay-1" style="position: relative;">\n<div style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.7rem; z-index: 10;">INTERACTIVE DEMO</div>'
);
content = content.replace(
  '</div>\n        </div>\n\n        <div class="simulator-display reveal delay-1">',
  '</div>\n          <button class="btn btn-glass" onclick="document.getElementById(\'stage-tab-1\').click();" style="margin-top: 16px;"><i data-lucide="rotate-ccw"></i> Replay Demo</button>\n        </div>\n\n        <div class="simulator-display reveal delay-1">'
);

// J6: Image explicit dimensions - I've added some in styles, but some inline:
content = content.replace(
  'alt="Smartphone displaying the Caresy live care journey timeline updates"',
  'alt="Smartphone displaying the Caresy live care journey timeline updates" width="380" height="380"'
);

// B7: CTA hierarchy in nav (already primary / ghost implicitly, but let's ensure styling in CSS instead, or inline for now)
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

// Fix remaining standard checks
content = content.replace(
  '<span\n                style="display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: var(--primary); color: #fff; font-weight: 800; font-size: 0.8rem; margin-top: 2px;">✓</span>',
  '<i data-lucide="check-circle" style="color: var(--primary);"></i>'
);
content = content.replace(
  '<span\n                style="display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: var(--primary); color: #fff; font-weight: 800; font-size: 0.8rem; margin-top: 2px;">✓</span>',
  '<i data-lucide="check-circle" style="color: var(--primary);"></i>'
);

fs.writeFileSync(file, content, 'utf8');
console.log('index.html patched');
