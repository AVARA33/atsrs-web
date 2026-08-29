(function () {
  "use strict";
  var verified = {
      Airswift: {
        mark: "A",
        summary:
          "Global workforce solutions and consulting services for the energy industry.",
        sector: "Workforce Solutions",
        tags: ["Energy Services", "Workforce Solutions"],
        website: "https://www.airswift.com/",
        careers: "https://www.airswift.com/employee/",
        contact: "https://www.airswift.com/contact/",
      },
      Boskalis: {
        mark: "B",
        summary:
          "Leading global provider of dredging, maritime and offshore services.",
        sector: "Offshore & Marine Services",
        tags: ["Offshore Services", "Marine Construction", "Dredging"],
        website: "https://boskalis.com/",
        careers: "https://careers.boskalis.com/",
        contact: "https://boskalis.com/contact",
      },
      Subsea7: {
        mark: "S7",
        summary:
          "Global offshore projects and services for the energy industry.",
        sector: "Offshore projects",
        tags: ["Subsea", "Offshore", "Energy"],
        website: "https://www.subsea7.com/en/index.html/",
        careers: "https://careers.subsea7.com/?locale=en_US",
        contact: "https://www.subsea7.com/en/contact-us.html",
      },
      Oceaneering: {
        mark: "OI",
        summary:
          "Engineered services, products and one of the world’s largest ROV operations.",
        sector: "ROV & engineering",
        tags: ["ROV", "Subsea", "Engineering"],
        website: "https://www.oceaneering.com/",
        careers: "https://www.oceaneering.com/careers/",
        contact: "https://www.oceaneering.com/contact-us/",
      },
      "DOF Group": {
        mark: "DOF",
        summary:
          "Integrated offshore and subsea services with marine and ROV opportunities.",
        sector: "Marine & subsea",
        tags: ["Marine", "ROV", "Subsea"],
        website: "https://www.dof.com/",
        careers: "https://www.dof.com/vacancies",
        contact: "https://www.dof.com/contact",
      },
      Fugro: {
        mark: "FG",
        summary:
          "Global Geo-data specialist supporting marine, energy and infrastructure work.",
        sector: "Geo-data & survey",
        tags: ["Survey", "Marine", "Geo-data"],
        website: "https://www.fugro.com/",
        careers: "https://www.fugro.com/careers",
        contact: "https://www.fugro.com/contact",
      },
      "LEVEL Offshore": {
        mark: "LVL",
        summary:
          "Specialist staffing and recruitment provider for offshore and subsea personnel.",
        sector: "Offshore staffing",
        tags: ["Subsea", "Offshore", "Recruitment"],
        website: "https://www.leveloffshore.no/",
        careers: "https://leveloffshoreno.recman.page/jobs?sort=newest",
        contact: "https://www.leveloffshore.no/contact",
      },
      "HPR (UK)": {
        mark: "HPR",
        summary:
          "Specialist contract and permanent recruitment for offshore construction, oil and gas, and renewables.",
        sector: "Offshore staffing",
        tags: ["ROV", "Marine", "Recruitment"],
        website: "https://hpruk.com/",
        careers: "https://hpruk.com/vacancies/",
        contact: "https://hpruk.com/contact-us/",
      },
      "Archer Offshore": {
        mark: "AO",
        summary:
          "Global offshore recruitment specialist for ROV, survey, diving, marine, inspection and offshore wind personnel.",
        sector: "Offshore staffing",
        tags: ["ROV", "Marine", "Recruitment"],
        website: "https://www.archeroffshore.co.uk/",
        careers: "https://www.archeroffshore.co.uk/#contractors",
        contact: "https://www.archeroffshore.co.uk/#contact",
      },
      "PR Offshore Services Ltd": {
        mark: "PRO",
        summary:
          "Specialist global recruitment agency for ROV, inspection, survey and offshore energy personnel.",
        sector: "Offshore staffing",
        tags: ["ROV", "Survey", "Recruitment"],
        website: "https://proffshoreservices.com/",
        careers: "https://proffshoreservices.com/",
        contact: "https://proffshoreservices.com/",
      },
      "N-Sea": {
        mark: "NS",
        summary:
          "Integrated subsea services provider for survey, offshore cables, IRM, construction and decommissioning.",
        sector: "Marine & subsea",
        tags: ["Subsea", "Survey", "Offshore wind"],
        website: "https://n-sea.com/",
        careers: "https://n-sea.com/careers/",
        contact: "https://n-sea.com/contact/",
      },
      "Reach Subsea": {
        mark: "RS",
        summary:
          "Subsea services, survey and positioning specialist supporting offshore energy and ocean-space projects.",
        sector: "Marine & subsea",
        tags: ["Subsea", "Survey", "ROV"],
        website: "https://reachsubsea.no/",
        careers: "https://reachsubsea.no/careers/",
        contact: "https://reachsubsea.no/contact/",
      },
      Sonardyne: {
        mark: "SY",
        summary:
          "Marine technology company providing underwater positioning, navigation, communications and monitoring systems.",
        sector: "Subsea technology",
        tags: ["Marine", "Survey", "Technology"],
        website: "https://www.sonardyne.com/",
        careers: "https://www.sonardyne.com/about-us/join-sonardyne/",
        contact: "https://www.sonardyne.com/support/",
      },
      EIVA: {
        mark: "EI",
        summary:
          "Engineering company delivering software and hardware for maritime survey and subsea construction.",
        sector: "Subsea technology",
        tags: ["Survey", "Software", "Marine"],
        website: "https://www.eiva.com/",
        careers: "https://www.eiva.com/about/career",
        contact: "https://www.eiva.com/contact",
      },
      MacArtney: {
        mark: "MA",
        summary:
          "Global supplier of underwater technology systems for subsea, offshore energy, marine survey and ocean science.",
        sector: "Subsea technology",
        tags: ["Subsea", "Survey", "Engineering"],
        website: "https://www.macartney.com/",
        careers: "https://www.macartney.com/about-us/career/vacancies/",
        contact: "https://www.macartney.com/contact/",
      },
      "Forum Energy Technologies": {
        mark: "FET",
        summary:
          "Global energy technology manufacturer serving subsea, drilling, completions and production operations.",
        sector: "Subsea technology",
        tags: ["ROV", "Drilling", "Engineering"],
        website: "https://f-e-t.com/",
        careers:
          "https://recruiting.ultipro.com/FOR1013FET/JobBoard/ef7c2aa4-79a3-4d81-8101-e9c85075c8e5",
        contact: "https://f-e-t.com/contact/",
      },
      "Teledyne Marine": {
        mark: "TM",
        summary:
          "Marine technology group delivering subsea imaging, instruments, interconnect, seismic and autonomous vehicle systems.",
        sector: "Subsea technology",
        tags: ["Subsea", "Survey", "Marine technology"],
        website: "https://www.teledynemarine.com/",
        careers: "https://www.teledyne.com/careers",
        contact: "https://www.teledynemarine.com/contact-us",
      },
      "Saab Seaeye": {
        mark: "SS",
        summary:
          "Designer and manufacturer of electric underwater robotic systems for offshore, marine science and defence missions.",
        sector: "ROV & engineering",
        tags: ["ROV", "Subsea", "Robotics"],
        website: "https://www.saabseaeye.com/",
        careers: "https://www.saabseaeye.com/careers",
        contact: "https://www.saabseaeye.com/rov_/contact/contact-us",
      },
      "Soil Machine Dynamics (SMD)": {
        mark: "SMD",
        summary:
          "Subsea engineering company designing remotely operated and autonomous vehicles, trenchers and power-control systems.",
        sector: "ROV & engineering",
        tags: ["ROV", "Subsea", "Trenching"],
        website: "https://www.smd.co.uk/",
        careers: "https://www.smd.co.uk/careers/",
        contact: "https://www.smd.co.uk/contact-us/",
      },
      Seatools: {
        mark: "ST",
        summary:
          "Subsea technology company developing custom ROVs, monitoring, control, trenching and offshore installation systems.",
        sector: "Subsea technology",
        tags: ["ROV", "Subsea", "Engineering"],
        website: "https://www.seatools.com/",
        careers: "https://career.seatools.com/",
        contact: "https://www.seatools.com/contact/",
      },
      Kystdesign: {
        mark: "KD",
        summary:
          "Norwegian subsea technology company designing and manufacturing work-class ROVs, TMS units and custom underwater systems.",
        sector: "ROV & subsea technology",
        tags: ["ROV", "Subsea", "Engineering"],
        website: "https://kystdesign.no/",
        careers: "https://kystdesign.no/career/",
        contact: "https://kystdesign.no/contact/",
      },
      "Subsea Global Solutions": {
        mark: "SGS",
        summary:
          "Global provider of commercial diving, underwater inspection, repair, maintenance and ROV services for marine and offshore assets.",
        sector: "Underwater services",
        tags: ["Subsea", "Marine", "ROV"],
        website: "https://www.subseaglobalsolutions.com/",
        careers: "https://careers.subseaglobalsolutions.com/",
        contact: "https://www.subseaglobalsolutions.com/contact-us",
      },
      "Subsea Technology & Rentals (STR)": {
        mark: "STR",
        summary:
          "Global subsea technology company supplying rental equipment, engineering solutions and operational support for offshore energy and marine projects.",
        sector: "Subsea equipment & technology",
        tags: ["Subsea", "Survey", "Offshore energy"],
        website: "https://www.str-subsea.com/",
        careers: "https://www.str-subsea.com/careers/",
        contact: "https://www.str-subsea.com/contact/",
      },
      "Total Marine Technology": {
        mark: "TMT",
        summary:
          "Australian marine technology company engineering ROVs, subsea tooling and intervention solutions for demanding offshore and harsh-environment operations.",
        sector: "ROV & subsea engineering",
        tags: ["ROV", "Subsea", "Engineering"],
        website: "https://www.tmtrov.com/",
        careers: "https://www.tmtrov.com/get-in-touch/careers/",
        contact: "https://www.tmtrov.com/get-in-touch/",
      },
      VideoRay: {
        mark: "VR",
        summary:
          "Underwater robotics manufacturer developing portable mission-specialist ROV systems for defence, inspection, research and offshore operations.",
        sector: "Underwater robotics",
        tags: ["ROV", "Robotics", "Subsea"],
        website: "https://videoray.com/",
        careers: "https://videoray.com/about-us/careers/",
        contact: "https://videoray.com/contact-us/",
      },
      "Deep Trekker": {
        mark: "DT",
        summary:
          "Canadian underwater robotics manufacturer building portable ROVs and inspection crawlers for energy, maritime, infrastructure, defence and ocean-science missions.",
        sector: "Underwater robotics",
        tags: ["ROV", "Robotics", "Inspection"],
        website: "https://www.deeptrekker.com/",
        careers: "https://www.deeptrekker.com/company/careers",
        contact: "https://www.deeptrekker.com/contact-us",
      },
      "Blueye Robotics": {
        mark: "BR",
        summary:
          "Norwegian underwater technology company developing compact professional ROVs and cloud tools for inspection, defence, aquaculture and marine research.",
        sector: "Underwater robotics",
        tags: ["ROV", "Robotics", "Marine technology"],
        website: "https://www.blueyerobotics.com/",
        careers: "https://blueye.recruitee.com/",
        contact: "https://www.blueyerobotics.com/contact",
      },
      "SEAMOR Marine": {
        mark: "SM",
        summary:
          "Canadian manufacturer of modular inspection-class ROV systems for offshore energy, aquaculture, infrastructure, search and rescue, and scientific exploration.",
        sector: "ROV manufacturing",
        tags: ["ROV", "Subsea", "Marine technology"],
        website: "https://seamor.com/",
        careers: "https://seamor.com/careers/",
        contact: "https://seamor.com/contact/",
      },
      Oceanbotics: {
        mark: "OB",
        summary:
          "US underwater robotics manufacturer building rapidly deployable professional ROVs and mission software for defence, rescue, offshore energy and marine research.",
        sector: "Underwater robotics",
        tags: ["ROV", "Robotics", "Offshore energy"],
        website: "https://oceanbotics.com/",
        careers: "https://oceanbotics.com/careers/",
        contact: "https://oceanbotics.com/fusion_element/contact/",
      },
      "Kraken Robotics": {
        mark: "KR",
        summary:
          "Global marine technology company developing synthetic-aperture sonar, subsea LiDAR, autonomous systems and deep-sea power solutions.",
        sector: "Marine robotics & sensing",
        tags: ["Subsea", "Robotics", "Survey"],
        website: "https://www.krakenrobotics.com/",
        careers: "https://www.krakenrobotics.com/careers/",
        contact: "https://www.krakenrobotics.com/contact/",
      },
      "Cellula Robotics": {
        mark: "CR",
        summary:
          "Canadian marine technology company designing modular long-range autonomous underwater vehicles for subsea survey, science, energy and security missions.",
        sector: "Autonomous underwater systems",
        tags: ["AUV", "Subsea", "Robotics"],
        website: "https://cellula.com/",
        careers: "https://cellula.com/careers/",
        contact: "https://cellula.com/contact-cellula-robotics/",
      },
      "Greensea IQ": {
        mark: "GI",
        summary:
          "Marine intelligence and robotics company developing autonomous ocean systems and software for defense, transportation, energy and science applications.",
        sector: "Marine autonomy & robotics",
        tags: ["ROV", "Robotics", "Marine"],
        website: "https://greenseaiq.com/",
        careers: "https://greenseaiq.com/careers/",
        contact: "https://greenseaiq.com/contact-us/",
      },
    },
    companyLogos = {
      "Subsea7": "assets/company-logos/subsea7.ico",
      "Oceaneering": "assets/company-logos/oceaneering.png",
      "DOF Group": "assets/company-logos/dof-group.png",
      "Fugro": "assets/company-logos/fugro.ico",
      "LEVEL Offshore": "assets/company-logos/level-offshore.ico",
      "HPR (UK)": "assets/company-logos/hpr-uk.png",
      "Archer Offshore": "assets/company-logos/archer-offshore.png",
      "PR Offshore Services Ltd": "assets/company-logos/pr-offshore-services-ltd.ico",
      "N-Sea": "assets/company-logos/n-sea.ico",
      "Reach Subsea": "assets/company-logos/reach-subsea.png",
      "Sonardyne": "assets/company-logos/sonardyne.png",
      "EIVA": "assets/company-logos/eiva.ico",
      "MacArtney": "assets/company-logos/macartney.png",
      "Forum Energy Technologies": "assets/company-logos/forum-energy-technologies.png",
      "Teledyne Marine": "assets/company-logos/teledyne-marine.ico",
      "Saab Seaeye": "assets/company-logos/saab-seaeye.png",
      "Seatools": "assets/company-logos/seatools.jpg",
      "Kystdesign": "assets/company-logos/kystdesign.svg",
      "Subsea Global Solutions": "assets/company-logos/subsea-global-solutions.png",
      "Subsea Technology & Rentals (STR)": "assets/company-logos/subsea-technology-rentals-str.ico",
      "Total Marine Technology": "assets/company-logos/total-marine-technology.svg",
      "VideoRay": "assets/company-logos/videoray.png",
      "Deep Trekker": "assets/company-logos/deep-trekker.png",
      "Blueye Robotics": "assets/company-logos/blueye-robotics.ico",
      "SEAMOR Marine": "assets/company-logos/seamor-marine.png",
      "Oceanbotics": "assets/company-logos/oceanbotics.png",
      "Kraken Robotics": "assets/company-logos/kraken-robotics.png",
      "Cellula Robotics": "assets/company-logos/cellula-robotics.png",
      "Greensea IQ": "assets/company-logos/greensea-iq.png"
    },
    companies = [],
    loadToken = 0;
  var categoryRules = [
    { label: "ROV & Robotics", pattern: /\b(rov|robot(?:ics)?|autonomous|auv|unmanned)\b/i },
    { label: "Subsea & Offshore", pattern: /\b(subsea|offshore|underwater|diving|deepwater)\b/i },
    { label: "Marine & Survey", pattern: /\b(marine|maritime|vessel|survey(?:or|ing)?|hydrograph|geophys|dredg|metocean|sonar|mbes|qinsy|eiva|navipac)\b/i },
    { label: "Energy & Utilities", pattern: /\b(energy|oil|gas|power|utility|utilities|renewable|wind|solar|battery|nuclear)\b/i },
    { label: "Facilities & Maintenance", pattern: /\b(facilit(?:y|ies)|maintenance|hvac|smart building|building engineer|property|reliability technician)\b/i },
    { label: "Technology & Data", pattern: /\b(software|data|digital|cloud|cyber|information technology|\bit\b|artificial intelligence|\bai\b|systems engineer|developer|network|electronics?)\b/i },
    { label: "Manufacturing & Quality", pattern: /\b(manufactur|production|quality|machinist|fabricat|welding|inspection|process engineer)\b/i },
    { label: "Construction & Projects", pattern: /\b(construction|commissioning|installation|project manager|project engineer|piping|civil engineer|structural engineer)\b/i },
    { label: "Engineering", pattern: /\b(engineer|engineering|technical|technician|mechanic|electrical|designer|cad)\b/i },
    { label: "Supply Chain & Logistics", pattern: /\b(supply|procurement|logistics|buyer|purchasing|warehouse|inventory|material planner)\b/i },
    { label: "People & Recruitment", pattern: /\b(recruit|talent|human resources|\bhr\b|people partner|workforce)\b/i },
    { label: "Legal & Compliance", pattern: /\b(legal|lawyer|counsel|paralegal|compliance|regulatory|governance)\b/i },
    { label: "Finance & Commercial", pattern: /\b(finance|financial|account(?:ant|ing)?|commercial|business development|sales|contract manager|cost controller|controller|fp&a|underwriter|business control)\b/i },
    { label: "Science & Environment", pattern: /\b(science|scientist|environment|sustainability|geotechnical|chemist|laboratory|research)\b/i },
    { label: "Architecture & Design", pattern: /\b(architect|architectural|architecture)\b/i },
    { label: "Government & Policy", pattern: /\b(government|policy|public affairs|national security|government relations)\b/i },
    { label: "Retail & E-commerce", pattern: /\b(e-?commerce|merchandis|retail)\b/i },
    { label: "Healthcare", pattern: /\b(health|nurse|nursing|clinical|medical)\b/i },
    { label: "Hospitality", pattern: /\b(hotel|hospitality|chef|stewards?)\b/i },
    { label: "Education & Training", pattern: /\b(university|education|training|instructor|teaching)\b/i },
    { label: "Administration", pattern: /\b(administrative|administrator|office assistant)\b/i },
    { label: "Food & Agriculture", pattern: /\b(agronom|agriculture|crop|seed|farmer|food|broiler)\b/i },
    { label: "Operations", pattern: /\b(operations?|operator|supervisor|coordinator|manager|field service)\b/i },
  ];
  function byId(id) {
    return document.getElementById(id);
  }
  function clean(value) {
    return String(value || "").trim();
  }
  function normalized(value) {
    return clean(value).replace(/\s+/g, " ").toLowerCase();
  }
  function companyData(company) {
    return Object.assign(
      {
        sector: company.sector || "Active vacancies",
        tags: company.tags || [],
      },
      verified[company.name] || {},
    );
  }
  function jobCategories(row) {
    var signal = [row && row.title, row && row.worksite, row && row.work_type, row && row.equipment]
      .map(clean)
      .filter(Boolean)
      .join(" ");
    return categoryRules
      .filter(function (rule) { return rule.pattern.test(signal); })
      .map(function (rule) { return rule.label; });
  }
  function addCategorySignals(company, row) {
    if (!company.categoryScores) company.categoryScores = new Map();
    var matches = jobCategories(row);
    if (!matches.length) matches = ["Other roles"];
    matches.forEach(function (label) {
      company.categoryScores.set(label, (company.categoryScores.get(label) || 0) + 1);
    });
  }
  function finalizeCategorySignals(company) {
    if (verified[company.name]) return company;
    company.tags = Array.from((company.categoryScores || new Map()).entries())
      .sort(function (a, b) {
        return b[1] - a[1] || a[0].localeCompare(b[0]);
      })
      .slice(0, 3)
      .map(function (entry) { return entry[0]; });
    company.sector = company.tags[0] || "Active vacancies";
    delete company.categoryScores;
    return company;
  }
  function db() {
    return window.supabaseClient && window.supabaseClient.rpc
      ? window.supabaseClient
      : null;
  }
  function initials(name) {
    return (
      String(name || "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(function (part) {
          return part.charAt(0).toUpperCase();
        })
        .join("") || "CO"
    );
  }
  function buttonLink(url, label, icon) {
    var link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.innerHTML =
      '<i class="ph ph-' +
      icon +
      '" aria-hidden="true"></i><span>' +
      label +
      "</span>";
    return link;
  }
  function action(label, icon, handler) {
    var button = document.createElement("button");
    button.type = "button";
    button.innerHTML =
      '<i class="ph ph-' +
      icon +
      '" aria-hidden="true"></i><span>' +
      label +
      "</span>";
    button.addEventListener("click", handler);
    return button;
  }
  function unavailableAction(label, icon) {
    var button = document.createElement("button");
    button.type = "button";
    button.disabled = true;
    button.innerHTML =
      '<i class="ph ph-' +
      icon +
      '" aria-hidden="true"></i><span>' +
      label +
      "</span>";
    return button;
  }
  function vacancyLabel(count) {
    return count + " active " + (count === 1 ? "vacancy" : "vacancies");
  }
  function goToJobs(name) {
    if (typeof window.showPage === "function")
      window.showPage("jobs", byId("navJobs"));
    setTimeout(function () {
      var select = byId("jobsCompanyFilter");
      if (select) {
        select.value = name;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }, 0);
  }
  function goToRecruiters(name) {
    if (typeof window.showPage === "function")
      window.showPage("recruiters", byId("navRecruiters"));
    setTimeout(function () {
      var select = byId("recruitersCompany"),
        search = byId("recruitersSearch"),
        hasCompany = select && Array.from(select.options).some(function (option) {
          return option.value === name;
        });
      if (select) select.value = hasCompany ? name : "";
      if (search) search.value = hasCompany ? "" : name;
      if (hasCompany && select)
        select.dispatchEvent(new Event("change", { bubbles: true }));
      else if (search)
        search.dispatchEvent(new Event("input", { bubbles: true }));
    }, 0);
  }
  function ensureCompanyProfileDialog() {
    var dialog = byId("employerProfileDialog");
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.id = "employerProfileDialog";
    dialog.className = "employer-profile-dialog";
    dialog.innerHTML =
      '<div class="employer-profile-dialog-head"><div><span>ATSRS COMPANY PROFILE</span><h3 id="employerProfileTitle"></h3></div><button type="button" data-employer-profile-close aria-label="Close"><i class="ph ph-x" aria-hidden="true"></i></button></div>' +
      '<p id="employerProfileSummary" class="employer-profile-summary"></p>' +
      '<div class="employer-profile-facts"><div><span>Sector</span><strong id="employerProfileSector"></strong></div><div><span>Active vacancies</span><strong id="employerProfileVacancies"></strong></div><div><span>Source</span><strong id="employerProfileSource"></strong></div></div>' +
      '<div id="employerProfileTags" class="employer-tags"></div>' +
      '<div class="employer-profile-dialog-actions"><button type="button" data-employer-profile-recruiters><i class="ph ph-address-book" aria-hidden="true"></i>Contact routes</button><button type="button" data-employer-profile-jobs><i class="ph ph-briefcase" aria-hidden="true"></i>View jobs</button></div>';
    document.body.appendChild(dialog);
    dialog.querySelector("[data-employer-profile-close]").addEventListener("click", function () {
      dialog.close();
    });
    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });
    return dialog;
  }
  function openCompanyProfile(company, data) {
    var dialog = ensureCompanyProfileDialog();
    byId("employerProfileTitle").textContent = company.name;
    byId("employerProfileSummary").textContent = data.summary ||
      "Company information is based on active vacancies published in ATSRS JobSearch.";
    byId("employerProfileSector").textContent = data.sector || "Active vacancies";
    byId("employerProfileVacancies").textContent = vacancyLabel(company.vacancyCount || 0);
    byId("employerProfileSource").textContent = data.website
      ? "Verified official public source"
      : "Published ATSRS vacancies";
    var tags = byId("employerProfileTags");
    tags.textContent = "";
    (data.tags || []).forEach(function (value) {
      var tag = document.createElement("span");
      tag.className = "employer-tag";
      tag.textContent = value;
      tags.appendChild(tag);
    });
    var jobs = dialog.querySelector("[data-employer-profile-jobs]");
    jobs.disabled = !(company.vacancyCount > 0);
    jobs.onclick = function () {
      dialog.close();
      goToJobs(company.name);
    };
    dialog.querySelector("[data-employer-profile-recruiters]").onclick = function () {
      dialog.close();
      goToRecruiters(company.name);
    };
    dialog.showModal();
  }
  function card(company) {
    var data = companyData(company),
      article = document.createElement("article");
    article.className = "employer-card";
    article.tabIndex = 0;
    article.dataset.employerName = company.name;
    var head = document.createElement("div");
    head.className = "employer-card-head";
    var mark = document.createElement("div");
    mark.className = "employer-mark";
    var markFallback = document.createElement("span");
    markFallback.className = "employer-mark-fallback";
    markFallback.textContent = data.mark || initials(company.name);
    mark.appendChild(markFallback);
    var logoUrl = companyLogos[company.name] || "";
    if (logoUrl) {
      var logo = document.createElement("img");
      logo.className = "employer-logo";
      logo.src = logoUrl;
      logo.alt = "";
      logo.setAttribute("aria-hidden", "true");
      logo.addEventListener("load", function () {
        mark.classList.add("has-official-logo");
      });
      logo.addEventListener("error", function () {
        logo.remove();
      });
      mark.prepend(logo);
    }
    var copy = document.createElement("div");
    copy.className = "employer-card-copy";
    var source = document.createElement("span");
    source.className = "employer-source";
    source.innerHTML =
      '<i class="ph ph-' +
      (data.website ? "seal-check" : "briefcase") +
      '" aria-hidden="true"></i> ' +
      (data.website ? "Official public sources" : "Active in JobSearch");
    var title = document.createElement("h4");
    title.textContent = company.name;
    var sectorLabel = document.createElement("strong");
    sectorLabel.className = "employer-sector-label";
    sectorLabel.textContent = data.sector || "ATSRS company listing";
    var summary = document.createElement("p");
    summary.textContent =
      data.summary ||
      "Published company vacancies are available in ATSRS JobSearch.";
    copy.append(source, title, sectorLabel, summary);
    head.append(mark, copy);
    var vacancy = document.createElement("div");
    vacancy.className = "employer-vacancy-panel";
    var vacancyKicker = document.createElement("span");
    vacancyKicker.textContent = "Active vacancies";
    var vacancyNumber = document.createElement("strong");
    vacancyNumber.textContent = String(company.vacancyCount || 0);
    var vacancyHint = document.createElement("span");
    vacancyHint.textContent = company.vacancyCount > 0
      ? "Available in ATSRS"
      : "No active jobs";
    vacancy.append(vacancyKicker, vacancyNumber, vacancyHint);
    var tags = document.createElement("div");
    tags.className = "employer-tags";
    (data.tags || []).forEach(function (value) {
      var tag = document.createElement("span");
      tag.className = "employer-tag";
      tag.textContent = value;
      tags.appendChild(tag);
    });
    if (!data.tags || !data.tags.length) {
      var listingTag = document.createElement("span");
      listingTag.className = "employer-tag";
      listingTag.textContent = "ATSRS listing";
      tags.appendChild(listingTag);
    }
    var actions = document.createElement("div");
    actions.className = "employer-actions";
    actions.append(
      data.website
        ? buttonLink(data.website, "Website", "arrow-square-out")
        : action("Company info", "buildings", function () {
            openCompanyProfile(company, data);
          }),
      data.careers
        ? buttonLink(data.careers, "Careers", "briefcase")
        : action("Careers", "briefcase", function () {
            goToJobs(company.name);
          }),
      data.contact
        ? buttonLink(data.contact, "Contact", "envelope")
        : action("Contact", "envelope", function () {
            goToRecruiters(company.name);
          }),
      data.about || data.website
        ? buttonLink(data.about || data.website, "About", "info")
        : action("About", "info", function () {
            openCompanyProfile(company, data);
          }),
    );
    if (company.vacancyCount > 0) {
      var jobsAction = action("View jobs", "arrow-right", function () {
        goToJobs(company.name);
      });
      jobsAction.className = "employer-action-jobs";
      actions.append(jobsAction);
    }
    article.append(head, vacancy, tags, actions);
    return article;
  }
  function render() {
    var grid = byId("employersGrid");
    if (!grid) return;
    var query = String(byId("employersSearch").value || "")
        .trim()
        .toLowerCase(),
      sector = byId("employersSector").value,
      vacancies = byId("employersVacancies").value,
      sort = byId("employersSort").value;
    var visible = companies.filter(function (company) {
      var data = companyData(company),
        haystack = [company.name, data.summary || "", data.sector || ""]
          .concat(data.tags || [])
          .join(" ")
          .toLowerCase();
      return (
        (!query || haystack.indexOf(query) >= 0) &&
        (!sector || data.sector === sector) &&
        (!vacancies || company.vacancyCount > 0)
      );
    });
    visible.sort(function (a, b) {
      if (sort === "vacancies" && b.vacancyCount !== a.vacancyCount)
        return b.vacancyCount - a.vacancyCount;
      return a.name.localeCompare(b.name);
    });
    grid.textContent = "";
    visible.forEach(function (company) {
      grid.appendChild(card(company));
    });
    byId("employersEmpty").classList.toggle("hidden", visible.length > 0);
    byId("employersVisibleCount").textContent =
      visible.length + " of " + companies.length + " companies";
  }
  async function loadCompanies() {
    var client = db();
    if (!client) return;
    var token = ++loadToken;
    try {
      var result = await client.rpc("atsrs_jobs_facets");
      if (token !== loadToken) return;
      if (result.error) throw result.error;
      var names = new Map();
      Object.keys(verified).forEach(function (name) {
        names.set(normalized(name), { name: name, vacancyCount: 0 });
      });
      (Array.isArray(result.data) ? result.data : []).forEach(function (row) {
        var name = clean(row && (row.recruiter_company || row.company));
        if (!name) return;
        var key = normalized(name);
        var company = names.get(key) || { name: name, vacancyCount: 0 };
        company.vacancyCount += 1;
        addCategorySignals(company, row);
        names.set(key, company);
      });
      companies = Array.from(names.values())
        .map(finalizeCategorySignals)
        .sort(function (a, b) { return a.name.localeCompare(b.name); });
      refreshSectorOptions();
      var message = byId("employersMessage");
      if (message) message.textContent = "";
      render();
    } catch (error) {
      console.warn("ATSRS company directory could not be loaded", error);
      var message = byId("employersMessage");
      if (message) message.textContent = "Companies are temporarily unavailable. Please try again.";
    }
  }
  function refreshSectorOptions() {
    var sector = byId("employersSector"),
      selected = sector.value;
    sector.textContent = "";
    var all = document.createElement("option");
    all.value = "";
    all.textContent = "All sectors";
    sector.appendChild(all);
    Array.from(new Set(companies.map(function (company) {
      return companyData(company).sector;
    }).filter(Boolean))).sort().forEach(function (value) {
      var option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      sector.appendChild(option);
    });
    sector.value = Array.from(sector.options).some(function (option) {
      return option.value === selected;
    }) ? selected : "";
  }
  function install() {
    if (!byId("employersPage")) return;
    var sector = byId("employersSector");
    byId("employersSearch").addEventListener("input", render);
    sector.addEventListener("change", render);
    byId("employersVacancies").addEventListener("change", render);
    byId("employersSort").addEventListener("change", render);
    byId("employersClearFilters").addEventListener("click", function () {
      byId("employersSearch").value = "";
      sector.value = "";
      byId("employersVacancies").value = "";
      byId("employersSort").value = "name";
      render();
    });
    loadCompanies();
    window.addEventListener("atsrs:resume", loadCompanies);
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
