const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const standardFooter = `
    <footer class="footer">
      <div class="footer-container">
        <div class="footer-brand">
          <a class="brand" href="index.html">
            <span class="brand-mark">C</span>
            <span style="margin-left: 6px;">Caresy</span>
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
    </footer>
`;

const headAdditions = `
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22 fill=%22%2308796f%22>C</text></svg>">
    <script src="https://unpkg.com/lucide@latest"></script>
`;

const bodyAdditions = `
    <script>
      document.addEventListener("DOMContentLoaded", function() {
        if(window.lucide) {
          window.lucide.createIcons();
        }
      });
    </script>
`;

files.forEach(file => {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');

  // Replace footer
  content = content.replace(/<footer class="footer">[\s\S]*?<\/footer>/, standardFooter);

  // Add head additions
  if (!content.includes('unpkg.com/lucide')) {
    content = content.replace('</head>', headAdditions + '</head>');
  }

  // Add body additions (lucide createIcons)
  if (!content.includes('lucide.createIcons')) {
    content = content.replace('</body>', bodyAdditions + '</body>');
  }

  // Standardize brand logo markup
  if (file === 'admin-ops.html') {
    content = content.replace(/<a class="brand" href="index.html"([^>]*)>[\s\S]*?<\/a>/g, '<a class="brand" href="index.html" aria-label="Caresy home">\n      <span class="brand-mark">C</span>\n      <span style="margin-left: 6px;">Caresy Ops</span>\n    </a>');
  } else {
    content = content.replace(/<a class="brand" href="index.html"([^>]*)>[\s\S]*?<\/a>/g, '<a class="brand" href="index.html" aria-label="Caresy home">\n      <span class="brand-mark">C</span>\n      <span style="margin-left: 6px;">Caresy</span>\n    </a>');
  }

  // Skip to content
  if (!content.includes('Skip to content')) {
    content = content.replace('<body>', '<body>\n    <a href="#main-content" class="sr-only focus:not-sr-only" style="position:absolute; left:-9999px;">Skip to content</a>');
  }

  // Add id main-content to main tag
  if (!content.includes('id="main-content"')) {
    content = content.replace(/<main([^>]*)>/, (match, p1) => {
      if (p1.includes('id=')) return match;
      return `<main${p1} id="main-content">`;
    });
  }

  // Remove small footers from specific pages if they use a custom thin footer
  // Actually, I already replaced `<footer class="footer">` with the full standard footer, so thin footers using that class are fixed.

  fs.writeFileSync(path.join(dir, file), content, 'utf8');
  console.log('Updated', file);
});
