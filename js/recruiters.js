(function () {
  "use strict";
  var recruiters = [],
    directoryRecruiters = [];
  function excluded(name) {
    return String(name || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase() === "nurlan jafarov";
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
    var actions = document.createElement("div");
    actions.className = "employer-actions";
    if (recruiter.linkedin_url)
      actions.append(
        buttonLink(
          recruiter.linkedin_url,
          "View LinkedIn profile",
          "linkedin-logo",
        ),
      );
    actions.append(
      action("View jobs & contact", "address-book", function () {
        goToJobs(name);
      }),
      action("Share my profile", "share-network", function () {
        share(name);
      }),
    );
    article.append(head, actions);
    return article;
  }
  function db() {
    return window.supabaseClient || null;
  }
  async function loadDirectoryRecruiters() {
    var client = db();
    if (!client || !client.from) return;
    try {
      var result = await client
        .from("atsrs_recruiters")
        .select("name,company,role_title,location,linkedin_url")
        .eq("status", "active")
        .order("name", { ascending: true });
      if (!result.error && Array.isArray(result.data))
        directoryRecruiters = result.data.filter(function (recruiter) {
          return recruiter && recruiter.name && !excluded(recruiter.name);
        });
    } catch (_error) {}
  }
  function sync() {
    var select = byId("jobsRecruiterFilter");
    if (!select) return;
    var jobsRecruiters = Array.from(select.options)
      .map(function (option) {
        return String(option.value || "").trim();
      })
      .filter(function (name) {
        return name && !excluded(name);
      })
      .map(function (name) {
        return { name: name };
      });
    var merged = new Map();
    jobsRecruiters.concat(directoryRecruiters).forEach(function (recruiter) {
      var key = recruiter.name.trim().toLowerCase();
      merged.set(key, Object.assign({}, merged.get(key) || {}, recruiter));
    });
    recruiters = Array.from(merged.values()).sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    render();
  }
  function render() {
    var grid = byId("recruitersGrid");
    if (!grid) return;
    var query = String(byId("recruitersSearch").value || "")
      .trim()
      .toLowerCase();
    var visible = recruiters.filter(function (recruiter) {
      var haystack = [
        recruiter.name,
        recruiter.company || "",
        recruiter.role_title || "",
        recruiter.location || "",
      ]
        .join(" ")
        .toLowerCase();
      return !query || haystack.indexOf(query) >= 0;
    });
    grid.textContent = "";
    visible.forEach(function (recruiter) {
      grid.appendChild(card(recruiter));
    });
    byId("recruitersEmpty").classList.toggle("hidden", visible.length > 0);
    byId("recruitersVisibleCount").textContent =
      visible.length + " of " + recruiters.length + " recruiters";
  }
  function install() {
    if (!byId("recruitersPage")) return;
    byId("recruitersSearch").addEventListener("input", render);
    byId("recruitersClearFilters").addEventListener("click", function () {
      byId("recruitersSearch").value = "";
      render();
    });
    loadDirectoryRecruiters().then(sync);
    var select = byId("jobsRecruiterFilter");
    if (select) new MutationObserver(sync).observe(select, { childList: true });
    window.addEventListener("atsrs:resume", sync);
    window.addEventListener("atsrs:jobs-nav", function () {
      var refresh = window.atsrsJobs && window.atsrsJobs.refreshDirectoryOptions;
      if (typeof refresh === "function") Promise.resolve(refresh()).then(sync);
    });
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
