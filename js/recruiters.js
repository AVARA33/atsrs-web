(function () {
  "use strict";
  var recruiters = [],
    loadToken = 0,
    loadInFlight = false,
    lastLoadedAt = 0,
    recruiterPage = 1;
  var RECRUITER_COMPANY_PAGE_SIZE = 30;
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
  function activeRecruiterShare(recruiterId) {
    if (typeof window.atsrsGetActiveRecruiterShares !== "function") return null;
    return window.atsrsGetActiveRecruiterShares().find(function (share) {
      return share.recipient_recruiter_id === recruiterId;
    }) || null;
  }
  function syncShareAction(button, recruiter) {
    if (!button || !hasVerifiedEmail(recruiter)) return;
    var active = activeRecruiterShare(recruiter.id);
    button.disabled = Boolean(active);
    button.setAttribute("aria-disabled", active ? "true" : "false");
    button.classList.toggle("is-shared", Boolean(active));
    button.innerHTML = active
      ? '<i class="ph ph-check-circle" aria-hidden="true"></i><span>Profile shared · 24h active</span>'
      : '<i class="ph ph-share-network" aria-hidden="true"></i><span>Share my profile</span>';
    button.title = active
      ? "An active 24-hour link already exists. Revoke it in Profile → Sharing before sharing again."
      : "Create a 24-hour ATSRS link and open an email draft";
  }
  function syncVisibleShareActions() {
    document.querySelectorAll("#recruitersGrid .employer-action-share[data-recruiter-id]").forEach(function (button) {
      var recruiter = recruiters.find(function (item) { return item.id === button.dataset.recruiterId; });
      if (recruiter) syncShareAction(button, recruiter);
    });
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
      if (typeof window.atsrsRefreshOwnerShares === "function") await window.atsrsRefreshOwnerShares();
      window.alert(error && error.message || "The recruiter email draft could not be prepared. Please try again.");
    } finally {
      button.removeAttribute("aria-busy");
      if (hasVerifiedEmail(recruiter)) syncShareAction(button, recruiter);
      else { button.disabled = false; button.innerHTML = original; }
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
    summary.textContent = [
      recruiter.role_title || "Recruiter",
      recruiter.company,
      recruiter.location,
    ].filter(Boolean).join(" · ");
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
      shareAction.dataset.recruiterId = recruiter.id;
      syncShareAction(shareAction, recruiter);
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
  function recruiterCompanyKey(recruiter) {
    var company = normalized(recruiter && recruiter.company);
    return company || "__recruiter__" + normalized(recruiter && recruiter.name);
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
    if (loadInFlight) return;
    if (lastLoadedAt && Date.now() - lastLoadedAt < 300000) return;
    loadInFlight = true;
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
            role_title: "Recruiter",
            location: "",
            linkedin_url: "",
            vacancyCount: vacancyCounts.get(key) || 0,
          });
        });
      recruiters = Array.from(recruiterMap.values());
      companyOptions();
      if (directoryVisible()) render();
      lastLoadedAt = Date.now();
    } catch (error) {
      console.warn("ATSRS recruiter directory could not be loaded", error);
    } finally {
      loadInFlight = false;
    }
  }
  function directoryVisible() {
    var page = byId("recruitersPage");
    return !!page && !page.classList.contains("hidden");
  }
  function syncDirectoryVisibility() {
    var grid = byId("recruitersGrid");
    if (!grid) return;
    if (!directoryVisible()) {
      grid.replaceChildren();
      return;
    }
    if (recruiters.length) render();
    loadRecruiters();
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
    var companyKeys = [];
    var seenCompanies = new Set();
    visible.forEach(function (recruiter) {
      var key = recruiterCompanyKey(recruiter);
      if (seenCompanies.has(key)) return;
      seenCompanies.add(key);
      companyKeys.push(key);
    });
    var companyCount = companyKeys.length;
    var pageCount = Math.max(1, Math.ceil(companyCount / RECRUITER_COMPANY_PAGE_SIZE));
    recruiterPage = Math.min(recruiterPage, pageCount);
    var pageCompanyKeys = new Set(companyKeys.slice(
      (recruiterPage - 1) * RECRUITER_COMPANY_PAGE_SIZE,
      recruiterPage * RECRUITER_COMPANY_PAGE_SIZE,
    ));
    var pageRecruiters = visible.filter(function (recruiter) {
      return pageCompanyKeys.has(recruiterCompanyKey(recruiter));
    });
    grid.textContent = "";
    pageRecruiters.forEach(function (recruiter) {
      grid.appendChild(card(recruiter));
    });
    byId("recruitersEmpty").classList.toggle("hidden", visible.length > 0);
    var companiesShown = Math.min(recruiterPage * RECRUITER_COMPANY_PAGE_SIZE, companyCount);
    byId("recruitersVisibleCount").textContent = companiesShown + " of " + companyCount + " companies";
    var snapshot = byId("recruitersCompanyCount");
    if (snapshot) snapshot.textContent = "";
    renderPagination(pageCount);
    var exploreLabel = byId("recruitersExploreAllLabel");
    if (exploreLabel) exploreLabel.textContent = "Explore all " + recruiters.length;
  }
  function pageButton(label, targetPage, disabled, current, direction) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "jobs-page-button" + (direction ? " jobs-page-edge" : "");
    button.disabled = !!disabled;
    if (current) {
      button.classList.add("is-current");
      button.setAttribute("aria-current", "page");
    }
    if (direction === "previous") button.innerHTML = '<span class="jobs-page-chevron" aria-hidden="true">‹</span><span class="jobs-page-edge-label">Previous</span>';
    else if (direction === "next") button.innerHTML = '<span class="jobs-page-edge-label">Next</span><span class="jobs-page-chevron" aria-hidden="true">›</span>';
    else button.textContent = label;
    button.addEventListener("click", function () {
      if (disabled || current) return;
      recruiterPage = targetPage;
      render();
      var target = byId("recruitersGrid");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return button;
  }
  function renderPagination(pageCount) {
    var nav = byId("recruitersPagination");
    if (!nav) return;
    nav.replaceChildren();
    nav.classList.toggle("hidden", pageCount <= 1);
    if (pageCount <= 1) return;
    nav.appendChild(pageButton("Previous", recruiterPage - 1, recruiterPage === 1, false, "previous"));
    for (var page = 1; page <= pageCount; page += 1) {
      if (pageCount > 7 && page > 2 && page < pageCount - 1 && Math.abs(page - recruiterPage) > 1) {
        if (page === 3 || page === pageCount - 2) {
          var gap = document.createElement("span");
          gap.className = "jobs-page-ellipsis";
          gap.textContent = "…";
          nav.appendChild(gap);
        }
        continue;
      }
      nav.appendChild(pageButton(String(page), page, false, page === recruiterPage));
    }
    nav.appendChild(pageButton("Next", recruiterPage + 1, recruiterPage === pageCount, false, "next"));
  }
  function resetFilters(activeOnly) {
    byId("recruitersSearch").value = "";
    byId("recruitersCompany").value = "";
    byId("recruitersVacancies").value = activeOnly ? "active" : "";
    byId("recruitersSort").value = "name";
    recruiterPage = 1;
    render();
    var target = byId("recruitersGrid");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function install() {
    if (!byId("recruitersPage")) return;
    ["recruitersSearch", "recruitersCompany", "recruitersVacancies", "recruitersSort"].forEach(function (id) {
      byId(id).addEventListener(id === "recruitersSearch" ? "input" : "change", function () {
        recruiterPage = 1;
        render();
      });
    });
    byId("recruitersClearFilters").addEventListener("click", function () { resetFilters(false); });
    byId("recruitersExploreAll").addEventListener("click", function () { resetFilters(false); });
    byId("recruitersActiveVacancies").addEventListener("click", function () { resetFilters(true); });
    var page = byId("recruitersPage");
    new MutationObserver(syncDirectoryVisibility).observe(page, {
      attributes: true,
      attributeFilter: ["class"],
    });
    syncDirectoryVisibility();
    window.addEventListener("atsrs:resume", syncDirectoryVisibility);
    window.addEventListener("atsrs:share-link-updated", syncVisibleShareActions);
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
