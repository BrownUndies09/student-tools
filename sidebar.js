/* ===== Sidebar Navigation ===== */

const SIDEBAR_TOOLS = [
  {
    group: 'Study Tools',
    tools: [
      { label: 'Smart Flashcards', icon: '🧠', href: 'smartcards.html' },
      { label: 'Simple Flashcards', icon: '🗂️', href: 'flashcards.html' },
      { label: 'Pomodoro Timer', icon: '⏱️', href: 'timer.html' }
    ]
  },
  {
    group: 'Writing Tools',
    tools: [
      { label: 'Citation Generator', icon: '📖', href: 'citation.html' },
      { label: 'Reference Formatter', icon: '📚', href: 'reference.html' },
      { label: 'Essay Outline', icon: '📝', href: 'essay.html' },
      { label: 'Plagiarism Checker', icon: '🔍', href: 'plagiarism.html' },
      { label: 'Word Count to Pages', icon: '📄', href: 'wordcount.html' }
    ]
  },
  {
    group: 'Math Tools',
    tools: [
      { label: 'GPA Calculator', icon: '🎓', href: 'gpa.html' },
      { label: 'Grade Calculator', icon: '📊', href: 'grade.html' },
      { label: 'Math Keyboard', icon: '🧮', href: 'math.html' },
      { label: 'Equation Solver', icon: '➗', href: 'solver.html' },
      { label: 'Unit Converter', icon: '📐', href: 'convert.html' }
    ]
  },
  {
    group: 'Science Tools',
    tools: [
      { label: 'Periodic Table', icon: '⚗️', href: 'periodic.html' },
      { label: 'Molar Mass', icon: '🧪', href: 'molar.html' }
    ]
  },
  {
    group: 'NSC Mathematics',
    tools: [
      { label: 'Maths (Gr 10–12)', icon: '📐', href: 'maths.html' }
    ]
  },
  {
    group: 'NSC Physical Sciences',
    tools: [
      { label: 'Physics (Gr 10–12)', icon: '⚡', href: 'physics.html' },
      { label: 'Chemistry (Gr 10–12)', icon: '🧪', href: 'chemistry.html' }
    ]
  },
  {
    group: 'NSC Life Sciences',
    tools: [
      { label: 'Life Sciences (Gr 10–12)', icon: '🧬', href: 'lifesciences.html' }
    ]
  },
  {
    group: 'Planning Tools',
    tools: [
      { label: 'Study Schedule', icon: '📅', href: 'schedule.html' }
    ]
  }
];

function buildSidebar() {
  const root = document.getElementById('sidebar-root');
  if (!root) return;

  const currentPath = window.location.pathname.replace(/\/+$/, '');
  const currentPage = currentPath.split('/').pop() || 'index.html';

  let activeGroupIndex = -1;
  SIDEBAR_TOOLS.forEach((group, idx) => {
    if (group.tools.some(t => t.href === currentPage)) {
      activeGroupIndex = idx;
    }
  });

  if (activeGroupIndex === -1) activeGroupIndex = 0;

  let storedIndex = -1;
  try {
    const stored = localStorage.getItem('sidebarOpenGroup');
    if (stored !== null) storedIndex = parseInt(stored);
  } catch (e) {}

  const initialOpenIndex = activeGroupIndex !== -1 ? activeGroupIndex : (storedIndex >= 0 ? storedIndex : 0);

  let linksHtml = '';
  SIDEBAR_TOOLS.forEach((group, gIdx) => {
    const isOpen = gIdx === initialOpenIndex;
    const hasCurrentPage = group.tools.some(t => t.href === currentPage);

    let toolsHtml = '';
    group.tools.forEach(tool => {
      const isActive = tool.href === currentPage;
      toolsHtml += '<a href="' + tool.href + '" class="sidebar-link' + (isActive ? ' active' : '') + '">' +
        '<span class="sidebar-icon">' + tool.icon + '</span>' +
        '<span class="sidebar-label">' + tool.label + '</span>' +
      '</a>';
    });

    linksHtml += '<div class="sidebar-group' + (isOpen ? ' open' : '') + (hasCurrentPage ? ' contains-active' : '') + '" data-group-index="' + gIdx + '">' +
      '<button class="sidebar-group-toggle" onclick="toggleGroup(' + gIdx + ', event)">' +
        '<span class="sidebar-group-title">' + group.group + '</span>' +
        '<span class="sidebar-chevron">▼</span>' +
      '</button>' +
      '<div class="sidebar-group-body">' +
        '<div class="sidebar-group-inner">' + toolsHtml + '</div>' +
      '</div>' +
    '</div>';
  });

  root.innerHTML =
    '<div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()"></div>' +
    '<aside class="sidebar" id="sidebarPanel" aria-label="Tools navigation">' +
      '<div class="sidebar-header">' +
        '<a href="index.html" class="sidebar-brand">' +
          '<span class="nav-logo">S</span>' +
          '<span>StudyTools</span>' +
        '</a>' +
        '<button class="sidebar-close" onclick="closeSidebar()" aria-label="Close menu">×</button>' +
      '</div>' +
      '<div class="sidebar-body">' + linksHtml + '</div>' +
      '<div class="sidebar-footer">Made for students</div>' +
    '</aside>';
}

function toggleGroup(index, event) {
  if (event) event.stopPropagation();
  const allGroups = document.querySelectorAll('.sidebar-group');
  const target = document.querySelector('.sidebar-group[data-group-index="' + index + '"]');
  if (!target) return;

  const isCurrentlyOpen = target.classList.contains('open');
  allGroups.forEach(g => g.classList.remove('open'));

  if (!isCurrentlyOpen) {
    target.classList.add('open');
    try { localStorage.setItem('sidebarOpenGroup', index); } catch (e) {}
  } else {
    try { localStorage.removeItem('sidebarOpenGroup'); } catch (e) {}
  }
}

function openSidebar() {
  const panel = document.getElementById('sidebarPanel');
  const overlay = document.getElementById('sidebarOverlay');
  if (!panel || !overlay) return;
  panel.classList.add('open');
  overlay.classList.add('open');
  document.body.classList.add('sidebar-open');
}

function closeSidebar() {
  const panel = document.getElementById('sidebarPanel');
  const overlay = document.getElementById('sidebarOverlay');
  if (!panel || !overlay) return;
  panel.classList.remove('open');
  overlay.classList.remove('open');
  document.body.classList.remove('sidebar-open');
}

function toggleSidebar() {
  const panel = document.getElementById('sidebarPanel');
  if (!panel) return;
  if (panel.classList.contains('open')) closeSidebar();
  else openSidebar();
}

document.addEventListener('DOMContentLoaded', function () {
  buildSidebar();
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeSidebar();
});