/* =====================================================================
   AARAV.DEV PORTFOLIO — SCRIPT.JS
   Responsible for:
     1. Sticky navbar background + active-link highlighting on scroll
     2. Mobile hamburger menu
     3. Smooth scrolling for in-page anchor links
     4. Typing animation in the hero
     5. Scroll reveal animations (IntersectionObserver)
     6. Animated skill progress bars (triggered on reveal)
     7. Back-to-top button
     8. Theme toggle (persisted in localStorage)
     9. Contact form validation
   ===================================================================== */

(function () {
  "use strict";

  /* -------------------------------------------------------------------
     DOM REFERENCES
  ------------------------------------------------------------------- */
  const navbar        = document.getElementById("navbar");
  const navLinks       = document.getElementById("navLinks");
  const hamburger        = document.getElementById("hamburger");
  const navLinkEls         = document.querySelectorAll(".nav-link[data-nav]");
  const sections             = document.querySelectorAll("main section[id]");

  const themeToggle = document.getElementById("themeToggle");
  const backToTop     = document.getElementById("backToTop");
  const resumeBtn        = document.getElementById("resumeBtn");
  const currentYearEl       = document.getElementById("currentYear");

  const typingTextEl = document.getElementById("typingText");

  const contactForm = document.getElementById("contactForm");
  const formSuccess   = document.getElementById("formSuccess");

  const THEME_KEY = "aaravdev_theme";

  /* -------------------------------------------------------------------
     FOOTER YEAR
  ------------------------------------------------------------------- */
  currentYearEl.textContent = new Date().getFullYear();

  /* -------------------------------------------------------------------
     STICKY NAVBAR BACKGROUND ON SCROLL
  ------------------------------------------------------------------- */
  function handleNavbarScroll() {
    navbar.classList.toggle("is-scrolled", window.scrollY > 40);
  }
  window.addEventListener("scroll", handleNavbarScroll, { passive: true });
  handleNavbarScroll();

  /* -------------------------------------------------------------------
     MOBILE HAMBURGER MENU
  ------------------------------------------------------------------- */
  function toggleMobileNav() {
    const isOpen = navLinks.classList.toggle("is-open");
    hamburger.classList.toggle("is-open", isOpen);
    hamburger.setAttribute("aria-expanded", String(isOpen));
  }

  hamburger.addEventListener("click", toggleMobileNav);

  // Close the mobile menu whenever a nav link is tapped
  navLinkEls.forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("is-open");
      hamburger.classList.remove("is-open");
      hamburger.setAttribute("aria-expanded", "false");
    });
  });

  /* -------------------------------------------------------------------
     SMOOTH SCROLLING FOR ALL IN-PAGE ANCHOR LINKS
     (CSS `scroll-behavior: smooth` already covers most browsers, this
     adds a JS fallback plus lets us account for the fixed navbar height)
  ------------------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const targetId = anchor.getAttribute("href");
      if (targetId.length <= 1) return; // ignore bare "#"
      const target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      const navHeight = navbar.offsetHeight;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight + 1;
      window.scrollTo({ top, behavior: "smooth" });
    });
  });

  /* -------------------------------------------------------------------
     ACTIVE NAV LINK HIGHLIGHTING BASED ON SCROLL POSITION
  ------------------------------------------------------------------- */
  function updateActiveNavLink() {
    const scrollPos = window.scrollY + navbar.offsetHeight + 60;
    let currentId = sections[0] ? sections[0].id : "";

    sections.forEach((section) => {
      if (scrollPos >= section.offsetTop) {
        currentId = section.id;
      }
    });

    navLinkEls.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${currentId}`);
    });
  }
  window.addEventListener("scroll", updateActiveNavLink, { passive: true });
  updateActiveNavLink();

  /* -------------------------------------------------------------------
     TYPING ANIMATION (hero role text)
  ------------------------------------------------------------------- */
  const ROLES = [
    "accessible web apps.",
    "scalable back-end systems.",
    "delightful user interfaces.",
    "performant React applications.",
  ];

  let roleIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  function typeLoop() {
    const currentRole = ROLES[roleIndex];

    if (isDeleting) {
      charIndex -= 1;
    } else {
      charIndex += 1;
    }

    typingTextEl.textContent = currentRole.slice(0, charIndex);

    let delay = isDeleting ? 40 : 80;

    if (!isDeleting && charIndex === currentRole.length) {
      delay = 1400; // pause at full word before deleting
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      roleIndex = (roleIndex + 1) % ROLES.length;
      delay = 300;
    }

    setTimeout(typeLoop, delay);
  }

  typeLoop();

  /* -------------------------------------------------------------------
     SCROLL REVEAL ANIMATIONS + SKILL BAR FILL
     A single IntersectionObserver drives both: any element with the
     `.reveal` class fades/slides in, and skill bars additionally
     animate their fill width once they enter the viewport.
  ------------------------------------------------------------------- */
  const revealEls = document.querySelectorAll(".reveal");

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-visible");

        // If this revealed element is (or contains) a skill group,
        // animate each bar's fill to its target percentage.
        entry.target.querySelectorAll(".skill-bar").forEach(animateSkillBar);

        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.15 }
  );

  revealEls.forEach((el) => revealObserver.observe(el));

  function animateSkillBar(barEl) {
    const target = barEl.getAttribute("data-skill");
    const fill = barEl.querySelector(".skill-fill");
    if (!fill || !target) return;
    // Small timeout lets the reveal transition start first for a
    // more polished, staggered feel rather than everything firing at once
    setTimeout(() => {
      fill.style.width = `${target}%`;
    }, 150);
  }

  /* -------------------------------------------------------------------
     BACK TO TOP BUTTON
  ------------------------------------------------------------------- */
  function handleBackToTopVisibility() {
    backToTop.classList.toggle("is-visible", window.scrollY > 480);
  }
  window.addEventListener("scroll", handleBackToTopVisibility, { passive: true });
  handleBackToTopVisibility();

  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* -------------------------------------------------------------------
     THEME TOGGLE (persisted in localStorage)
  ------------------------------------------------------------------- */
  function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }

  themeToggle.addEventListener("click", () => {
    const current = document.body.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });

  (function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) applyTheme(saved);
  })();

  /* -------------------------------------------------------------------
     DOWNLOAD RESUME (placeholder)
     Replace `resumeBtn.href` with a real PDF path (e.g. "assets/resume.pdf")
     once you have a resume file to ship with the site.
  ------------------------------------------------------------------- */
  resumeBtn.addEventListener("click", (e) => {
    if (resumeBtn.getAttribute("href") === "#") {
      e.preventDefault();
      alert("Resume placeholder — add your PDF and update the Download Resume link in index.html.");
    }
  });

  /* -------------------------------------------------------------------
     CONTACT FORM VALIDATION
     No backend is wired up — on successful validation we simply show
     a success message. Swap the `submitForm` body for a real fetch()
     call to your API or form service (e.g. Formspree) when ready.
  ------------------------------------------------------------------- */
  const validators = {
    name: (value) => value.trim().length >= 2 || "Please enter your name (2+ characters).",
    email: (value) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) || "Please enter a valid email address.",
    subject: (value) => value.trim().length >= 3 || "Please enter a short subject line.",
    message: (value) => value.trim().length >= 10 || "Your message should be at least 10 characters.",
  };

  function validateField(input) {
    const rule = validators[input.name];
    if (!rule) return true;

    const result = rule(input.value);
    const group = input.closest(".form-group");
    const errorEl = group.querySelector(".form-error");

    if (result === true) {
      group.classList.remove("has-error");
      errorEl.textContent = "";
      return true;
    }

    group.classList.add("has-error");
    errorEl.textContent = result;
    return false;
  }

  // Validate on blur for immediate, friendly feedback
  contactForm.querySelectorAll("input, textarea").forEach((input) => {
    input.addEventListener("blur", () => validateField(input));
    input.addEventListener("input", () => {
      // Clear the error as soon as the field becomes valid again
      if (input.closest(".form-group").classList.contains("has-error")) {
        validateField(input);
      }
    });
  });

  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    formSuccess.classList.remove("is-visible");

    const fields = contactForm.querySelectorAll("input, textarea");
    let allValid = true;

    fields.forEach((field) => {
      const valid = validateField(field);
      if (!valid) allValid = false;
    });

    if (!allValid) {
      // Focus the first invalid field for accessibility
      const firstInvalid = contactForm.querySelector(".has-error input, .has-error textarea");
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    // Simulated submission — replace with a real API/fetch call
    submitForm();
  });

  function submitForm() {
    formSuccess.classList.add("is-visible");
    contactForm.reset();

    setTimeout(() => {
      formSuccess.classList.remove("is-visible");
    }, 5000);
  }
})();
