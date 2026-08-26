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
    companies = [];
  function byId(id) {
    return document.getElementById(id);
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
  function share(company) {
    try {
      sessionStorage.setItem(
        "atsrs_employer_share_target",
        JSON.stringify({ name: company.name, contact: company.contact || "" }),
      );
    } catch (_error) {}
    if (typeof window.showPage === "function")
      window.showPage("profile", byId("navProfile"));
    setTimeout(function () {
      var sharing = byId("profileTabSharingBtn");
      if (sharing) sharing.click();
      var edit = byId("profileSharingEditBtn");
      if (edit) edit.click();
      var recipient = document.querySelector(
        'input[name="profileSharingAudience"][value="recipient"]',
      );
      if (recipient && !recipient.disabled) {
        recipient.checked = true;
        recipient.dispatchEvent(new Event("change", { bubbles: true }));
      }
      var status = byId("profileSharingCreateStatus");
      if (status)
        status.textContent =
          "Create a secure link for " +
          company.name +
          ", then copy it to the company’s verified contact route.";
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
    var summary = document.createElement("p");
    summary.textContent =
      data.summary ||
      "Company represented by one or more published ATSRS vacancies.";
    copy.append(source, title, summary);
    head.append(mark, copy);
    var tags = document.createElement("div");
    tags.className = "employer-tags";
    (data.tags || ["Published vacancies"]).forEach(function (value) {
      var tag = document.createElement("span");
      tag.className = "employer-tag";
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
    actions.append(
      action("Share my profile", "share-network", function () {
        share(Object.assign({ name: company.name }, data));
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
      sector = byId("employersSector").value;
    var visible = companies.filter(function (company) {
      var data = verified[company.name] || {},
        haystack = [company.name, data.summary || "", data.sector || ""]
          .concat(data.tags || [])
          .join(" ")
          .toLowerCase();
      return (
        (!query || haystack.indexOf(query) >= 0) &&
        (!sector || data.sector === sector)
      );
    });
    grid.textContent = "";
    visible.forEach(function (company) {
      grid.appendChild(card(company));
    });
    byId("employersEmpty").classList.toggle("hidden", visible.length > 0);
    byId("employersVisibleCount").textContent =
      visible.length + " of " + companies.length + " companies";
  }
  function sync() {
    var select = byId("jobsCompanyFilter");
    if (!select) return;
    companies = Array.from(select.options)
      .map(function (option) {
        return String(option.value || "").trim();
      })
      .filter(Boolean)
      .filter(function (name, index, list) {
        return list.indexOf(name) === index;
      })
      .sort(function (a, b) {
        return a.localeCompare(b);
      });
    render();
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
    byId("employersClearFilters").addEventListener("click", function () {
      byId("employersSearch").value = "";
      sector.value = "";
      render();
    });
    sync();
    var select = byId("jobsCompanyFilter");
    if (select) new MutationObserver(sync).observe(select, { childList: true });
    window.addEventListener("atsrs:resume", sync);
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
