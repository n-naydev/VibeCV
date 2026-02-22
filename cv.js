// cv.js

// --- Helper Functions ---

function el(tag, classes = [], text = "") {
  const element = document.createElement(tag);
  if (classes.length) element.classList.add(...classes);
  if (text) element.textContent = text;
  return element;
}

function addControls(item, container, onRemove) {
  const controls = el("div", ["controls", "no-print"]);

  const upBtn = el("button", ["btn-icon"], "↑");
  upBtn.title = "Move Up";
  upBtn.onclick = (e) => {
    e.stopPropagation();
    if (
      item.previousElementSibling &&
      !item.previousElementSibling.classList.contains("no-sort")
    ) {
      container.insertBefore(item, item.previousElementSibling);
    }
  };

  const downBtn = el("button", ["btn-icon"], "↓");
  downBtn.title = "Move Down";
  downBtn.onclick = (e) => {
    e.stopPropagation();
    const next = item.nextElementSibling;
    if (next && !next.classList.contains("no-sort")) {
      // To move down: insert the next element before the current one
      container.insertBefore(next, item);
    }
  };

  const delBtn = el("button", ["btn-icon", "delete"], "🗑");
  delBtn.title = "Delete";
  delBtn.onclick = (e) => {
    e.stopPropagation();
    if (confirm("Remove this item?")) {
      item.remove();
      if (onRemove) onRemove();
    }
  };

  controls.append(upBtn, downBtn, delBtn);
  item.classList.add("editable-item");
  item.appendChild(controls);
}

// --- Section Setup Functions ---

function setupSimpleField(id, text) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = text || "";
    element.contentEditable = true;
  }
}

function setupListSection(containerId, data, renderFn, createEmptyDataFn) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = "";

  const addBtn = el("div", ["btn-add", "no-print", "no-sort"], "+ Add Item");
  addBtn.onclick = () => {
    const newItem = renderFn(createEmptyDataFn());
    addControls(newItem, container);
    container.insertBefore(newItem, addBtn);
  };

  // Render existing items
  (data || []).forEach((d) => {
    const itemEl = renderFn(d);
    addControls(itemEl, container);
    container.appendChild(itemEl);
  });

  // Always append add button at the end
  container.appendChild(addBtn);
}

// --- Renderers ---

function createSummaryP(text) {
  const p = el("p", [], text);
  p.contentEditable = true;
  p.style.marginBottom = "8px";
  return p;
}

function createExperienceItem(exp) {
  const wrapper = el("div", ["exp-item"]);
  wrapper.style.marginBottom = "12px";

  // Header: Role · Company · Location · Dates
  const headerText = [
    exp.role,
    exp.company,
    exp.location,
    [exp.start, exp.end].filter(Boolean).join(" – "),
  ]
    .filter(Boolean)
    .join(" · ");

  const headerEl = el("div", [], headerText);
  headerEl.style.fontWeight = "bold";
  headerEl.contentEditable = true;
  wrapper.appendChild(headerEl);

  // Bullets
  const ul = el("ul");
  const bullets = exp.bullets || [];

  const addBulletBtn = el(
    "li",
    ["btn-add", "no-print", "no-sort"],
    "+ Add Bullet"
  );
  addBulletBtn.style.listStyle = "none";
  addBulletBtn.style.marginTop = "4px";
  addBulletBtn.onclick = () => {
    const li = createBullet("New Bullet");
    addControls(li, ul);
    ul.insertBefore(li, addBulletBtn);
  };

  bullets.forEach((b) => {
    const li = createBullet(b);
    addControls(li, ul);
    ul.appendChild(li);
  });

  ul.appendChild(addBulletBtn);
  wrapper.appendChild(ul);
  
  return wrapper;
}

function createBullet(text) {
  const li = el("li", [], text);
  li.contentEditable = true;
  return li;
}

function createEducationItem(edu) {
  const wrapper = el("div");
  wrapper.style.marginBottom = "6px";

  const headerText = [
    edu.degree,
    edu.institution,
    [edu.start, edu.end].filter(Boolean).join(" – "),
  ]
    .filter(Boolean)
    .join(" · ");

  const div = el("div", [], headerText);
  div.contentEditable = true;

  wrapper.appendChild(div);
  return wrapper;
}

function setupSkills(containerId, skillsData) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  const renderSkill = (text) => {
    const badge = el("span", ["badge", "editable-item"]);
    badge.style.position = "relative"; 
    
    const span = el("span", [], text);
    span.contentEditable = true;
    span.style.minWidth = "20px";
    span.style.display = "inline-block";
    span.onkeydown = (e) => {
        if(e.key === 'Enter') {
            e.preventDefault();
            span.blur();
        }
    }

    const removeBtn = el("span", ["remove-skill", "no-print"], "×");
    removeBtn.style.cursor = "pointer";
    removeBtn.style.marginLeft = "6px";
    removeBtn.style.color = "#888";
    removeBtn.title = "Remove Skill";
    removeBtn.onclick = (e) => {
        e.stopPropagation();
        badge.remove();
    };

    badge.append(span, removeBtn);
    return badge;
  };

  const addBtn = el("span", ["badge", "btn-add-skill", "no-print"], "+");
  addBtn.style.background = "#fff";
  addBtn.style.border = "1px dashed #999";
  addBtn.style.cursor = "pointer";
  addBtn.title = "Add Skill";
  addBtn.onclick = () => {
    const newSkill = renderSkill("New Skill");
    container.insertBefore(newSkill, addBtn);
    // Auto-focus the new skill
    const textSpan = newSkill.querySelector("span[contenteditable]");
    if(textSpan) textSpan.focus();
  };

  (skillsData || []).forEach((s) => container.appendChild(renderSkill(s)));
  container.appendChild(addBtn);
}

// --- Main Execution ---

function renderCV(cvData) {
  if (!cvData) {
    console.error("No cvData found");
    return;
  }

  const {
    personal = {},
    summary = [],
    skills = [],
    experience = [],
    education = [],
  } = cvData;

  // 1. Header
  setupSimpleField("cv-name", personal.name);
  setupSimpleField(
    "cv-title-location",
    [personal.title, personal.location].filter(Boolean).join(" · ")
  );
  setupSimpleField(
    "cv-contact",
    [personal.email, personal.phone].filter(Boolean).join(" · ")
  );

  // 2. Summary (Array of strings)
  // Ensure summary is array
  const summaryArr = Array.isArray(summary) ? summary : [summary];
  setupListSection(
    "cv-summary",
    summaryArr.filter(Boolean),
    createSummaryP,
    () => "New paragraph..."
  );

  // 3. Skills
  setupSkills("cv-skills", skills);

  // 4. Experience
  setupListSection(
    "cv-experience",
    experience,
    createExperienceItem,
    () => ({
      role: "Role",
      company: "Company",
      location: "Location",
      start: "YYYY",
      end: "Present",
      bullets: ["New bullet point"],
    })
  );

  // 5. Education
  setupListSection(
    "cv-education",
    education,
    createEducationItem,
    () => ({
      degree: "Degree",
      institution: "Institution",
      start: "YYYY",
      end: "YYYY",
    })
  );
}

const urlParams = new URLSearchParams(window.location.search);
const cvId = urlParams.get('id');

if (cvId) {
  chrome.storage.local.get({ cvHistory: [] }, (res) => {
    const historyItem = res.cvHistory.find(item => item.id === cvId);
    if (historyItem) {
      renderCV(historyItem.cvData);
    } else {
      console.error("CV not found in history");
    }
  });
} else {
  chrome.storage.local.get("cvData", ({ cvData }) => {
    renderCV(cvData);
  });
}

// Print Button
document.getElementById("btn-print")?.addEventListener("click", () => {
  window.print();
});