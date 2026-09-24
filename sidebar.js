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

  let linksHtml = '';
  SIDEBAR_TOOLS.forEach(group => {
    linksHtml += '<div class="sidebar-group">';
    linksHtml += '<div class="sidebar-group-title">' + group.group + '</div>';
    group.tools.forEach(tool => {
      const isActive = tool.href === currentPage;
      linksHtml += '<a href="' + tool.href + '" class="sidebar-link' + (isActive ? ' active' : '') + '">' +
        '<span class="sidebar-icon">' + tool.icon + '</span>' +
        '<span class="sidebar-label">' + tool.label + '</span>' +
      '</a>';
    });
    linksHtml += '</div>';
  });

  root.innerHTML =
    '<div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()"></div>' +
    '<aside class="sidebar" id="sidebarPanel" aria-label="Tools navigation">' +
      '<div class="sidebar-header">' +
        '<a href="index.html" class="sidebar-brand">' +
          '<span class="nav-logo">S</span>' +
          '<span>StudyTools</span>' +
        '</a>' +
        '<button class="sidebar-close" onclick="closeSidebar()" aria-label="Close menu"></button>' +
      '</div>' +
      '<div class="sidebar-body">' + linksHtml + '</div>' +
      '<div class="sidebar-footer">Made for students</div>' +
    '</aside>';
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