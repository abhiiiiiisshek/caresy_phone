const fs = require('fs');
const path = require('path');

// -----------------------------------------------------
// 1. PATCH ABOUT.HTML
// -----------------------------------------------------
const aboutFile = path.join(__dirname, 'about.html');
let aboutContent = fs.readFileSync(aboutFile, 'utf8');

// H1: Founder profiles
const founderCards = `
            <h2>Our Founders & Leadership</h2>
            <div style="display: flex; flex-direction: column; gap: 20px; margin-top: 20px;">
              <div class="material-card" style="display: flex; gap: 16px; align-items: flex-start; padding: 20px; background: rgba(255,255,255,0.7);">
                <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--primary); color: #fff; display: grid; place-items: center; font-size: 1.4rem; font-weight: bold; flex-shrink: 0;">RS</div>
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <strong style="font-size: 1.1rem; color: var(--ink);">Rohan Sen</strong>
                    <a href="#" aria-label="LinkedIn Profile" style="color: #0a66c2;"><i data-lucide="linkedin" style="width: 18px;"></i></a>
                  </div>
                  <span style="color: var(--muted); font-size: 0.85rem; display: block; margin-bottom: 8px;">Co-Founder & CEO (ex-Healthcare Operations)</span>
                  <p style="font-size: 0.9rem; margin: 0; line-height: 1.5;">Rohan started Caresy after managing his grandfather's recurring cardiology visits from another city, realizing the massive gap in coordinated care logistics.</p>
                </div>
              </div>
              <div class="material-card" style="display: flex; gap: 16px; align-items: flex-start; padding: 20px; background: rgba(255,255,255,0.7);">
                <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--coral); color: #fff; display: grid; place-items: center; font-size: 1.4rem; font-weight: bold; flex-shrink: 0;">MN</div>
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                    <strong style="font-size: 1.1rem; color: var(--ink);">Dr. Meera Nair</strong>
                    <a href="#" aria-label="LinkedIn Profile" style="color: #0a66c2;"><i data-lucide="linkedin" style="width: 18px;"></i></a>
                  </div>
                  <span style="color: var(--muted); font-size: 0.85rem; display: block; margin-bottom: 8px;">Co-Founder & Head of Companion Training</span>
                  <p style="font-size: 0.9rem; margin: 0; line-height: 1.5;">Dr. Nair designs our companion onboarding curriculum, bringing 15+ years of clinical protocol and patient relation experience.</p>
                </div>
              </div>
            </div>
`;
aboutContent = aboutContent.replace(/<h2>Our Founders & Leadership<\/h2>[\s\S]*?<\/div>\s*<\/div>/, founderCards + '\n          </div>');

// H2: Origin story image (inserting into the left column of the split)
const originStoryImage = `
            <h2>The Caresy Mission</h2>
            <img src="assets/caresy-hero.png" alt="Caresy origin story" style="width: 100%; border-radius: 16px; margin: 16px 0; aspect-ratio: 16/9; object-fit: cover;" />
            <p>We believe hospital visits shouldn't be stressful chores or lonely trials for the elderly. Navigating massive hospital departments, stand-in queues, billing terminals, and pharmacy counters is physically exhausting. When families live in other cities or struggle to take leave, Caresy companions step in as dedicated family stand-ins, providing reliable logistics support and compassionate presence.</p>
`;
aboutContent = aboutContent.replace(/<h2>The Caresy Mission<\/h2>\s*<p>We believe hospital visits shouldn't be stressful chores/, originStoryImage.trim().replace('<p>We believe hospital visits shouldn\'t be stressful chores', ''));

// H3: Typos
aboutContent = aboutContent.replace('design our companion', 'designs our companion');
aboutContent = aboutContent.replace('coordinate-care', 'coordinated care');

// H4: Trust framework CTA
const trustCTA = `
      <section class="section trust-cta reveal" style="text-align: center; margin: 60px auto; max-width: 800px;">
        <div class="material-card" style="background: var(--surface-2); padding: 40px;">
          <i data-lucide="shield-check" style="width: 48px; height: 48px; color: var(--primary); margin-bottom: 16px;"></i>
          <h2>How we verify our companions</h2>
          <p style="margin-bottom: 24px;">Trust isn't given, it's earned. Learn about our 6-step Aadhaar and Police verification protocol.</p>
          <a href="trust.html" class="btn btn-primary">Read our full trust framework</a>
        </div>
      </section>
`;
aboutContent = aboutContent.replace('</main>', trustCTA + '\n</main>');

fs.writeFileSync(aboutFile, aboutContent, 'utf8');
console.log('about.html patched');


// -----------------------------------------------------
// 2. PATCH FAQ.HTML
// -----------------------------------------------------
const faqFile = path.join(__dirname, 'faq.html');
let faqContent = fs.readFileSync(faqFile, 'utf8');

// I1 & I2: Search bar and accordions
const faqSectionReplace = `
      <section class="section faq-section" style="max-width: 800px; margin: 0 auto;">
        <div style="margin-bottom: 32px; position: relative;">
          <i data-lucide="search" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--muted);"></i>
          <input type="text" id="faqSearch" placeholder="Search FAQs... (e.g., cancellation, late)" style="width: 100%; padding: 16px 16px 16px 48px; border-radius: 99px; border: 1px solid var(--line); font-size: 1.05rem;" onkeyup="filterFAQs()" />
        </div>
        <div class="faq-list" style="display: flex; flex-direction: column; gap: 16px;">
          
          <details class="faq-accordion material-card" style="padding: 0;">
            <summary style="padding: 20px; font-weight: 700; font-size: 1.1rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; list-style: none;">
              Which cities and hospitals does Caresy cover? <i data-lucide="chevron-down" class="acc-icon"></i>
            </summary>
            <div style="padding: 0 20px 20px; color: var(--muted); line-height: 1.6;">
              <p>We currently operate in <strong>Bengaluru, Chennai, and Hyderabad</strong>. We serve patients at all major hospitals in these metro areas, including Apollo Hospitals, Fortis Hospitals, Manipal Hospitals, Narayana Health, and Aster CMI. If your hospital is not listed, contact us on WhatsApp to verify coverage.</p>
            </div>
          </details>

          <details class="faq-accordion material-card" style="padding: 0;">
            <summary style="padding: 20px; font-weight: 700; font-size: 1.1rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; list-style: none;">
              What is your cancellation policy? <i data-lucide="chevron-down" class="acc-icon"></i>
            </summary>
            <div style="padding: 0 20px 20px; color: var(--muted); line-height: 1.6;">
              <p>We offer <strong>free cancellation up to 4 hours before</strong> the scheduled visit. If you cancel within 4 hours of the appointment, a flat ₹150 convenience fee is charged to compensate the assigned companion for their time and travel preparation.</p>
            </div>
          </details>

          <details class="faq-accordion material-card" style="padding: 0;">
            <summary style="padding: 20px; font-weight: 700; font-size: 1.1rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; list-style: none;">
              What happens if a companion is late? <i data-lucide="chevron-down" class="acc-icon"></i>
            </summary>
            <div style="padding: 0 20px 20px; color: var(--muted); line-height: 1.6;">
              <p>Our operations team tracks companion locations live via GPS. If a companion is delayed due to traffic or unforeseen reasons, we notify you immediately. If the delay threatens your appointment time, we will immediately dispatch a backup companion or coordinate directly with the hospital desk.</p>
            </div>
          </details>

          <details class="faq-accordion material-card" style="padding: 0;">
            <summary style="padding: 20px; font-weight: 700; font-size: 1.1rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; list-style: none;">
              What if we are unsatisfied with the companion? <i data-lucide="chevron-down" class="acc-icon"></i>
            </summary>
            <div style="padding: 0 20px 20px; color: var(--muted); line-height: 1.6;">
              <p>Your peace of mind is our absolute priority. If you or the patient are unsatisfied with the companion's service or conduct, please contact our 24/7 care helpline. We will waive the service fee and match you with a different companion for your next visit.</p>
            </div>
          </details>

          <details class="faq-accordion material-card" style="padding: 0;">
            <summary style="padding: 20px; font-weight: 700; font-size: 1.1rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; list-style: none;">
              What are your operations and helpline hours? <i data-lucide="chevron-down" class="acc-icon"></i>
            </summary>
            <div style="padding: 0 20px 20px; color: var(--muted); line-height: 1.6;">
              <p>Our central operations desk operates from <strong>6:00 AM to 10:00 PM daily</strong> for booking verifications, status updates, and support. However, companions can be scheduled and dispatched for visits happening at any hour, including overnight stays if booked in advance.</p>
            </div>
          </details>

          <details class="faq-accordion material-card" style="padding: 0;">
            <summary style="padding: 20px; font-weight: 700; font-size: 1.1rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; list-style: none;">
              Is Caresy a medical service or home nursing agency? <i data-lucide="chevron-down" class="acc-icon"></i>
            </summary>
            <div style="padding: 0 20px 20px; color: var(--muted); line-height: 1.6;">
              <p><strong>No. Caresy provides non-medical assistance and logistics coordination.</strong> Our companions do not administer medicine, perform medical procedures, interpret diagnostics, or give medical advice. We act as family stand-ins to handle navigation, queuing, documentation, and companionship.</p>
            </div>
          </details>

          <details class="faq-accordion material-card" style="padding: 0; background: rgba(231, 127, 98, 0.08); border-color: rgba(231, 127, 98, 0.2);" open>
            <summary style="padding: 20px; font-weight: 700; font-size: 1.1rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; list-style: none; color: #9b432d;">
              Emergency Situations & Boundary Policies <i data-lucide="chevron-up" class="acc-icon"></i>
            </summary>
            <div style="padding: 0 20px 20px; color: var(--ink); line-height: 1.6;">
              <p>In case of emergencies where a patient's vital signs deteriorate or an acute medical issue occurs inside the hospital, our companions immediately alert the hospital triage staff, guide the patient to the emergency ward, and notify the family emergency contact. <strong>Caresy is not a substitute for ambulance services or professional nursing. For any life-threatening emergencies, call the hospital's emergency response team directly.</strong></p>
            </div>
          </details>
          
        </div>
        
        <script>
          function filterFAQs() {
            const input = document.getElementById('faqSearch').value.toLowerCase();
            const faqs = document.querySelectorAll('.faq-accordion');
            faqs.forEach(faq => {
              const text = faq.textContent.toLowerCase();
              faq.style.display = text.includes(input) ? 'block' : 'none';
            });
          }
          
          // Toggle icon helper
          document.querySelectorAll('.faq-accordion').forEach(details => {
            details.addEventListener('toggle', (e) => {
              const icon = e.target.querySelector('.acc-icon');
              if(icon) {
                if(e.target.open) {
                  icon.setAttribute('data-lucide', 'chevron-up');
                } else {
                  icon.setAttribute('data-lucide', 'chevron-down');
                }
                if(window.lucide) window.lucide.createIcons();
              }
            });
          });
        </script>
        
        <style>
          .faq-accordion summary::-webkit-details-marker { display: none; }
          .faq-accordion summary { outline: none; }
          .faq-accordion[open] summary { border-bottom: 1px solid var(--line); margin-bottom: 16px; }
        </style>
      </section>
`;

faqContent = faqContent.replace(/<section class="section faq-section">[\s\S]*?<\/section>/, faqSectionReplace);

// I3: Coverage map
const coverageMap = `
      <section class="section coverage-section reveal" style="padding-top: 60px; padding-bottom: 40px;">
        <div class="material-card" style="background: rgba(231, 243, 237, 0.6); display: flex; flex-direction: column; gap: 14px;">
          <span class="coverage-badge" style="background: var(--primary); color: #fff; padding: 4px 12px; border-radius: 99px; font-size: 0.72rem; font-weight: 900; text-transform: uppercase; width: max-content; letter-spacing: 0.05em;">Coverage Area</span>
          <h2>Active Metro Areas & Network Hospitals</h2>
          <p>
            Caresy companions are currently deployed and operating in <strong>Bengaluru, Chennai, and Hyderabad</strong>. We coordinate care across all major private and public healthcare systems.
          </p>
          <div class="grid-3-col" style="margin-top: 10px;">
            <div>
              <strong style="color: var(--primary-dark);">Bengaluru</strong>
              <p style="font-size: 0.88rem; margin: 4px 0 0; line-height: 1.45;">Apollo Jayanagar/BG Road, Fortis, Manipal Hospital (Old Airport Road, Hebbal), Narayana Health, Aster CMI.</p>
            </div>
            <div>
              <strong style="color: var(--primary-dark);">Chennai</strong>
              <p style="font-size: 0.88rem; margin: 4px 0 0; line-height: 1.45;">Apollo Greams Road/OMR, MGM Healthcare, Fortis Malar, MIOT International, Sri Ramachandra Medical Centre.</p>
            </div>
            <div>
              <strong style="color: var(--primary-dark);">Hyderabad</strong>
              <p style="font-size: 0.88rem; margin: 4px 0 0; line-height: 1.45;">Apollo Jubilee Hills, Care Hospitals, Yashoda Hospitals (Somajiguda, Secunderabad), KIMS, AIG Hospitals.</p>
            </div>
          </div>
        </div>
      </section>
`;
faqContent = faqContent.replace('</main>', coverageMap + '\n</main>');

fs.writeFileSync(faqFile, faqContent, 'utf8');
console.log('faq.html patched');
