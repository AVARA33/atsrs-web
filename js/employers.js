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
