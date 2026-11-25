'use strict';

window.DemoStorage = (() => {
  const dataKey = 'teamflow.demo.data.v1';
  const preferences = 'teamflow.demo.';
  let memory = createDemoData();

  try {
    const saved = localStorage.getItem(dataKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.tasks) && parsed.currentUserId) memory = parsed;
    }
  } catch {
    // Browsers can disable localStorage for local files or private sessions.
  }

  function write(data) {
    memory = data;
    try {
      localStorage.setItem(dataKey, JSON.stringify(data));
    } catch {}
  }

  function preference(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(preferences + key);
      localStorage.setItem(preferences + key, value);
    } catch {
      return null;
    }
  }

  return {
    read: () => structuredClone(memory),
    write,
    preference,
    reset: () => write(createDemoData()),
  };
})();
