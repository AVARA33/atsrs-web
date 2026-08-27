(function () {
  "use strict";
  var verified = {
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
    },
    companies = [],
    loadToken = 0;
  function byId(id) {
    return document.getElementById(id);
  }
  function clean(value) {
    return String(value || "").trim();
  }
  function normalized(value) {
    return clean(value).replace(/\s+/g, " ").toLowerCase();
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
  function card(company) {
    var data = verified[company.name] || {},
      article = document.createElement("article");
    article.className = "employer-card";
    article.tabIndex = 0;
    article.dataset.employerName = company.name;
    var head = document.createElement("div");
    head.className = "employer-card-head";
    var mark = document.createElement("div");
    mark.className = "employer-mark";
    mark.textContent = data.mark || initials(company.name);
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
    var detailLabel = document.createElement("strong");
    detailLabel.className = "employer-detail-label";
    detailLabel.textContent = data.summary ? "Activity" : "ATSRS listing";
    var summary = document.createElement("p");
    summary.textContent =
      data.summary ||
      "Published company vacancies are available in ATSRS JobSearch.";
    copy.append(source, title, detailLabel, summary);
    head.append(mark, copy);
    var tags = document.createElement("div");
    tags.className = "employer-tags";
    [vacancyLabel(company.vacancyCount || 0)].concat(data.tags || []).forEach(function (value, index) {
      var tag = document.createElement("span");
      tag.className = "employer-tag" + (index === 0 ? " employer-vacancy-count" : "");
      tag.textContent = value;
      tags.appendChild(tag);
    });
    var actions = document.createElement("div");
    actions.className = "employer-actions";
    if (data.website)
      actions.append(
        buttonLink(data.website, "Website", "globe"),
        buttonLink(data.careers, "Careers", "briefcase"),
        buttonLink(data.contact, "Contact", "arrow-square-out"),
      );
    else
      actions.append(
        action("View jobs", "briefcase", function () {
          goToJobs(company.name);
        }),
      );
    article.append(head, tags, actions);
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
      var data = verified[company.name] || {},
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
        names.set(key, company);
      });
      companies = Array.from(names.values())
        .sort(function (a, b) { return a.name.localeCompare(b.name); });
      var message = byId("employersMessage");
      if (message) message.textContent = "";
      render();
    } catch (error) {
      console.warn("ATSRS company directory could not be loaded", error);
      var message = byId("employersMessage");
      if (message) message.textContent = "Companies are temporarily unavailable. Please try again.";
    }
  }
  function install() {
    if (!byId("employersPage")) return;
    var sector = byId("employersSector");
    Array.from(
      new Set(
        Object.keys(verified).map(function (name) {
          return verified[name].sector;
        }),
      ),
    )
      .sort()
      .forEach(function (value) {
        var option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        sector.appendChild(option);
      });
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
