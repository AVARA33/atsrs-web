(function () {
  "use strict";
  var recruiters = [],
    loadToken = 0;
  // Permanent Owner exclusion: nurlan jafarov / nurlan cəfərov and transliterations.
  function excluded(name) {
    const normalized = String(name || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase()
      .replaceAll("ə", "a")
      .replaceAll("ç", "c");

    return /^nurlan\s+(?:jafarov|cafarov|ceferov)$/.test(normalized);
  }
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
        .join("") || "R"
    );
  }
  function goToJobs(name) {
    if (typeof window.showPage === "function")
      window.showPage("jobs", byId("navJobs"));
    setTimeout(function () {
      var select = byId("jobsRecruiterFilter");
      if (select) {
        select.value = name;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }, 0);
  }
  function share(name) {
    try {
      sessionStorage.setItem(
        "atsrs_recruiter_share_target",
        JSON.stringify({ name: name }),
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
          name +
          ", then copy it to the recruiter’s verified contact route.";
    }, 0);
  }
  function hasVerifiedEmail(recruiter) {
    return !!(recruiter && recruiter.email_verification_status === "verified");
  }
  async function shareRecruiter(recruiter, button) {
    if (!hasVerifiedEmail(recruiter) || typeof window.atsrsCreateRecruiterEmailShare !== "function") {
      share(recruiter.name);
      return;
    }
    var original = button.innerHTML;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.innerHTML = '<i class="ph ph-spinner-gap" aria-hidden="true"></i><span>Preparing 24h link…</span>';
    try {
      await window.atsrsCreateRecruiterEmailShare({
        id: recruiter.id,
        name: recruiter.name,
        company: recruiter.company,
      });
    } catch (error) {
      console.error("ATSRS recruiter email share failed", error);
      window.alert(error && error.message || "The recruiter email draft could not be prepared. Please try again.");
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.innerHTML = original;
    }
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
  function vacancyLabel(count) {
    return count + " active " + (count === 1 ? "vacancy" : "vacancies");
  }
  function card(recruiter) {
    var name = recruiter.name;
    var article = document.createElement("article");
    article.className = "employer-card";
    article.tabIndex = 0;
    article.dataset.recruiterName = name;
    var head = document.createElement("div");
    head.className = "employer-card-head";
    var mark = document.createElement("div");
    mark.className = "employer-mark";
    mark.textContent = initials(name);
    var copy = document.createElement("div");
    copy.className = "employer-card-copy";
    var source = document.createElement("span");
    source.className = "employer-source";
    source.innerHTML = recruiter.linkedin_url
      ? '<i class="ph ph-linkedin-logo" aria-hidden="true"></i> Verified LinkedIn profile'
      : '<i class="ph ph-briefcase" aria-hidden="true"></i> Active in JobSearch';
    var title = document.createElement("h4");
    title.textContent = name;
    var summary = document.createElement("p");
    summary.textContent = recruiter.linkedin_url
      ? [recruiter.role_title, recruiter.company, recruiter.location]
          .filter(Boolean)
          .join(" · ")
      : "Recruiter listed on one or more published ATSRS vacancies.";
    copy.append(source, title, summary);
    head.append(mark, copy);
    var tags = document.createElement("div");
    tags.className = "employer-tags";
    var vacancyIcon = document.createElement("i");
    vacancyIcon.className = "ph ph-briefcase";
    vacancyIcon.setAttribute("aria-hidden", "true");
    var vacancyCopy = document.createElement("div");
    vacancyCopy.className = "employer-vacancy-copy";
    var vacancyTag = document.createElement("span");
    vacancyTag.className = "employer-tag employer-vacancy-count";
    vacancyTag.textContent = vacancyLabel(recruiter.vacancyCount || 0);
    var vacancyHint = document.createElement("span");
    vacancyHint.className = "employer-vacancy-hint";
    vacancyHint.textContent = recruiter.vacancyCount > 0
      ? "Active on published jobs"
      : "No active jobs at the moment";
    vacancyCopy.append(vacancyTag, vacancyHint);
    tags.append(vacancyIcon, vacancyCopy);
    var actions = document.createElement("div");
    actions.className = "employer-actions";
    var linkedinAction;
    if (recruiter.linkedin_url) {
      linkedinAction = buttonLink(
        recruiter.linkedin_url,
        "LinkedIn profile",
        "linkedin-logo",
      );
    } else {
      linkedinAction = action("LinkedIn profile", "linkedin-logo", function () {});
      linkedinAction.disabled = true;
      linkedinAction.setAttribute("aria-disabled", "true");
    }
    linkedinAction.className = "employer-action-linkedin";
    actions.append(linkedinAction);
    var jobsAction = action(
      "View offers on ATSRS",
      "arrow-right",
      function () {
        goToJobs(name);
      },
    );
    jobsAction.className = recruiter.vacancyCount > 0
      ? "employer-action-jobs is-active"
      : "employer-action-jobs";
    if (!(recruiter.vacancyCount > 0)) {
      jobsAction.disabled = true;
      jobsAction.setAttribute("aria-disabled", "true");
    }
    actions.append(jobsAction);
    var shareAction = action("Share my profile", "share-network", function () {
      shareRecruiter(recruiter, shareAction);
    });
    shareAction.className = "employer-action-share";
    if (hasVerifiedEmail(recruiter)) {
      shareAction.dataset.emailRoute = "verified";
      shareAction.title = "Create a 24-hour ATSRS link and open an email draft";
    } else {
      shareAction.title = "Choose what to include in a secure profile link";
    }
    actions.append(shareAction);
    article.append(head, tags, actions);
    return article;
  }
  function db() {
    return window.supabaseClient || null;
  }
  function normalized(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }
  function companyOptions() {
    var select = byId("recruitersCompany");
    if (!select) return;
    var selected = select.value;
    var companies = new Map();
    recruiters.forEach(function (recruiter) {
      var company = String(recruiter.company || "").trim();
      if (!company) return;
      var key = normalized(company);
      var current = companies.get(key) || { name: company, count: 0 };
      current.count += 1;
      companies.set(key, current);
    });
    var all = document.createElement("option");
    all.value = "";
    all.textContent = "All companies (" + recruiters.length + ")";
    var options = Array.from(companies.values()).sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    select.replaceChildren(all);
    options.forEach(function (company) {
      var option = document.createElement("option");
      option.value = company.name;
      option.textContent = company.name + " (" + company.count + ")";
      select.appendChild(option);
    });
    if (options.some(function (company) { return company.name === selected; }))
      select.value = selected;
  }
  async function loadRecruiters() {
    var client = db();
    if (!client || !client.from || !client.rpc) return;
    var token = ++loadToken;
    try {
      var results = await Promise.all([
        client
          .from("atsrs_recruiters")
          .select("id,name,company,role_title,location,linkedin_url,email_verification_status")
          .eq("status", "active")
          .order("name", { ascending: true }),
        client.rpc("atsrs_jobs_facets"),
      ]);
      var result = results[0], facets = results[1];
      if (token !== loadToken) return;
      if (result.error) throw result.error;
      var facetRows = Array.isArray(facets.data) ? facets.data : [];
      var vacancyCounts = new Map();
      if (!facets.error)
        facetRows.forEach(function (row) {
          var key = normalized(row && row.recruiter_name);
          if (key) vacancyCounts.set(key, (vacancyCounts.get(key) || 0) + 1);
        });
      else console.warn("ATSRS recruiter vacancy counts could not be loaded", facets.error);
      var directoryRecruiters = Array.isArray(result.data)
        ? result.data.filter(function (recruiter) {
          return recruiter && recruiter.name && !excluded(recruiter.name);
        }).map(function (recruiter) {
          return Object.assign({}, recruiter, {
            vacancyCount: vacancyCounts.get(normalized(recruiter.name)) || 0,
          });
        })
        : [];
      var recruiterMap = new Map();
      directoryRecruiters.forEach(function (recruiter) {
        recruiterMap.set(normalized(recruiter.name), recruiter);
      });
      if (!facets.error)
        facetRows.forEach(function (row) {
          var name = String(row && row.recruiter_name || "").trim();
          var key = normalized(name);
          if (!key || excluded(name) || recruiterMap.has(key)) return;
          recruiterMap.set(key, {
            name: name,
            company: String(row.recruiter_company || row.company || "").trim(),
            role_title: "Recruiter on a published ATSRS vacancy",
            location: String(row.location || "").trim(),
            linkedin_url: "",
            vacancyCount: vacancyCounts.get(key) || 0,
          });
        });
      recruiters = Array.from(recruiterMap.values());
      companyOptions();
      render();
    } catch (error) {
      console.warn("ATSRS recruiter directory could not be loaded", error);
    }
  }
  function render() {
    var grid = byId("recruitersGrid");
    if (!grid) return;
    var query = String(byId("recruitersSearch").value || "")
      .trim()
      .toLowerCase();
    var selectedCompany = String(byId("recruitersCompany").value || "").trim();
    var vacancies = byId("recruitersVacancies").value;
    var sort = byId("recruitersSort").value;
    var visible = recruiters.filter(function (recruiter) {
      var haystack = [
        recruiter.name,
        recruiter.company || "",
        recruiter.role_title || "",
        recruiter.location || "",
      ]
        .join(" ")
        .toLowerCase();
      var matchesQuery = !query || haystack.indexOf(query) >= 0;
      var matchesCompany =
        !selectedCompany || normalized(recruiter.company) === normalized(selectedCompany);
      return matchesQuery && matchesCompany && (!vacancies || recruiter.vacancyCount > 0);
    });
    visible.sort(function (a, b) {
      if (sort === "vacancies" && b.vacancyCount !== a.vacancyCount)
        return b.vacancyCount - a.vacancyCount;
      return a.name.localeCompare(b.name);
    });
    grid.textContent = "";
    visible.forEach(function (recruiter) {
      grid.appendChild(card(recruiter));
    });
    byId("recruitersEmpty").classList.toggle("hidden", visible.length > 0);
    byId("recruitersVisibleCount").textContent =
      visible.length + " of " + recruiters.length + " recruiters";
    var snapshot = byId("recruitersVisibleCount").nextElementSibling;
    if (snapshot)
      snapshot.textContent = selectedCompany || "Verified LinkedIn directory";
  }
  function install() {
    if (!byId("recruitersPage")) return;
    byId("recruitersSearch").addEventListener("input", render);
    byId("recruitersCompany").addEventListener("change", render);
    byId("recruitersVacancies").addEventListener("change", render);
    byId("recruitersSort").addEventListener("change", render);
    byId("recruitersClearFilters").addEventListener("click", function () {
      byId("recruitersSearch").value = "";
      byId("recruitersCompany").value = "";
      byId("recruitersVacancies").value = "";
      byId("recruitersSort").value = "name";
      render();
    });
    loadRecruiters();
    window.addEventListener("atsrs:resume", loadRecruiters);
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
