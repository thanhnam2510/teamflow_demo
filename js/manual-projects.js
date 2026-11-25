'use strict';

(() => {
  const D = Demo;
  const {
    state,
    views,
    actions,
    h,
    raw,
    icon,
    link,
    act,
    iconBtn,
    byId,
    person,
    matches,
    fmtDate,
    hours,
    chip,
    bar,
    panel,
    placeholder,
    table,
    tabs,
    searchField,
    filter,
    field,
    show,
    confirm,
    refresh,
    render,
    go,
    today,
    shift,
    uid,
    clean,
    lookup,
    actionRow,
  } = D;
  const { snapshot, commit } = MockApi;
  const roleOf = (workspace, userId) =>
    workspace.ownerId === userId
      ? 'Owner'
      : workspace.roles?.[userId] || (workspace.memberIds.includes(userId) ? 'Member' : '');
  const canManage = (workspace, userId) =>
    ['Owner', 'Admin', 'Manager'].includes(roleOf(workspace, userId));
  function workspaceButtons(data, workspace) {
    const role = roleOf(workspace, data.currentUserId);
    return (
      (['Owner', 'Admin'].includes(role)
        ? act('workspaceForm|' + workspace.id, raw('common.edit'), 'edit')
        : '') +
      (role ? iconBtn('workspaceMenu|' + workspace.id, 'Tùy chọn workspace', 'more_vert') : '')
    );
  }
  function workspaceMemberControls(data, workspace, member) {
    const role = roleOf(workspace, member.id);
    const me = roleOf(workspace, data.currentUserId);
    return actionRow(
      chip(
        { Member: 'Thành viên', Owner: 'Chủ sở hữu', Admin: 'Admin', Manager: 'Manager' }[role],
        'indigo',
      ) +
        (me === 'Owner' || (me === 'Admin' && ['Member', 'Manager'].includes(role))
          ? iconBtn(
              'memberRole|' + workspace.id + '|' + member.id,
              'Thay đổi vai trò',
              'manage_accounts',
            )
          : ''),
    );
  }
  function projectCanBudget(data, project) {
    const role = roleOf(byId(data, 'workspaces', project.workspaceId), data.currentUserId);
    return D.access(data).admin || ['Owner', 'Admin'].includes(role);
  }
  function projectButtons(data, workspace, project) {
    if (!canManage(workspace, data.currentUserId) && project.creatorId !== data.currentUserId)
      return '';
    return (
      act('projectForm|' + workspace.id + '|' + project.id, raw('common.edit'), 'edit') +
      act('projectRemove|' + project.id, 'Xóa', 'delete', 'btn danger')
    );
  }
  function clearWorkspaceProjects(data, ids) {
    const tasks = data.tasks.filter((row) => ids.includes(row.projectId)).map((row) => row.id);
    data.tasks = data.tasks.filter((row) => !ids.includes(row.projectId));
    data.projects = data.projects.filter((row) => !ids.includes(row.id));
    data.expenses = data.expenses.filter((row) => !ids.includes(row.projectId));
    data.files = data.files.filter((row) => !ids.includes(row.projectId));
    data.worklogs = data.worklogs.filter((row) => !tasks.includes(row.taskId));
    data.requests.forEach((row) => {
      if (tasks.includes(row.taskId)) delete row.taskId;
    });
    for (const id of ids) delete data.taskSequence[id];
  }
  const filesByType = [
    ['image', 'Ảnh', /\.(png|jpe?g|gif|webp)$/i, 'image'],
    ['pdf', 'PDF', /\.pdf$/i, 'picture_as_pdf'],
    ['document', 'Tài liệu', /\.(txt|md|docx?|odt|json)$/i, 'description'],
    ['sheets', 'Bảng tính', /\.(xlsx?|ods|csv)$/i, 'table_view'],
    ['slides', 'Trình chiếu', /\.(pptx?|odp)$/i, 'slideshow'],
    ['archive', 'Nén', /\.(zip|rar|7z)$/i, 'folder_zip'],
    ['media', 'Âm thanh / video', /\.(mp3|wav|mp4|mov)$/i, 'movie'],
    ['other', 'Khác', /./, 'attach_file'],
  ];
  const typeFor = (name) => filesByType.find(([, , rule]) => rule.test(name)) || filesByType.at(-1);
  function projectFiles(data, project) {
    const source = state.view.fileSource || 'all';
    const type = state.view.fileType;
    const layout = state.view.fileView || 'grid';
    const rows = [
      ...data.files
        .filter((row) => row.projectId === project.id)
        .map((row) => ({ ...row, source: 'project' })),
      ...data.tasks
        .filter((row) => row.projectId === project.id)
        .flatMap((task) =>
          task.comments.flatMap((comment) =>
            (comment.files || []).map((file) => ({
              ...file,
              attachmentId: file.id,
              source: 'comments',
              taskId: task.id,
              taskCode: task.code,
            })),
          ),
        ),
    ].filter(
      (row) =>
        (source === 'all' || source === row.source) &&
        (!type || typeFor(row.name)[0] === type) &&
        matches(state.view.fileQuery, row.name, row.taskCode),
    );
    const preview = (row) =>
      row.attachmentId
        ? act(
            'attachment|' + row.attachmentId + '|' + encodeURIComponent(row.name),
            row.name,
            '',
            'file-open plain-button',
          )
        : act('downloadFile|' + row.id, row.name, '', 'file-open plain-button');
    const controls = (row) =>
      row.taskId
        ? act('task|' + row.taskId, row.taskCode, 'task_alt', 'btn sm')
        : iconBtn('deleteFile|' + row.id, 'Xóa tài liệu', 'delete');
    const glyph = (row) => icon(typeFor(row.name)[3]);
    const grid =
      '<div class="card-grid">' +
      rows
        .map((row) =>
          panel(
            '<div class="file-preview file-type-' +
              typeFor(row.name)[0] +
              '">' +
              glyph(row) +
              '</div><div class="file-caption">' +
              preview(row) +
              '<small class="muted">' +
              (row.taskId ? 'Trong bình luận' : 'Tải lên dự án') +
              '</small>' +
              controls(row) +
              '</div>',
            'file-card',
          ),
        )
        .join('') +
      '</div>';
    return (
      '<div data-file-drop="' +
      h(project.id) +
      '" class="project-files"><div class="toolbar">' +
      searchField('fileQuery', 'Tìm tài liệu dự án…') +
      tabs(
        'fileSource',
        [
          ['all', 'Tất cả'],
          ['project', 'Tải lên'],
          ['comments', 'Trong bình luận'],
        ],
        source,
      ) +
      '<span class="spacer"></span>' +
      tabs(
        'fileView',
        [
          ['grid', 'Lưới', 'grid_view'],
          ['list', 'Danh sách', 'view_list'],
        ],
        layout,
      ) +
      act('addFile|' + project.id, 'Tải lên', 'upload', 'btn primary') +
      '</div>' +
      '<div class="status-pills file-kinds" role="group" aria-label="Loại tệp">' +
      [['', 'Tất cả loại', null, 'folder_open'], ...filesByType]
        .map(([key, label, , glyph]) =>
          act(
            'view|fileType|' + key,
            label,
            glyph,
            'status-pill' + ((type || '') === key ? ' is-selected' : ''),
          ),
        )
        .join('') +
      '</div>' +
      (rows.length
        ? layout === 'grid'
          ? grid
          : panel(
              table(
                ['Tên tệp', 'Loại', 'Nguồn', ''],
                rows.map((row) => [
                  glyph(row) + preview(row),
                  typeFor(row.name)[1],
                  row.taskId ? 'Trong bình luận' : 'Tải lên dự án',
                  controls(row),
                ]),
              ),
            )
        : panel(
            placeholder(
              'Chưa có tài liệu phù hợp. Thả tệp vào đây hoặc bấm Tải lên.',
              'folder_open',
            ),
          )) +
      '</div>'
    );
  }
  async function addProjectAttachments(projectId, files) {
    const parts = await D.saveAttachments(files);
    if (!parts.length) throw Error('Chọn ít nhất một tệp.');
    commit((data) => {
      const project = lookup(data, 'projects', projectId);
      if (!byId(data, 'workspaces', project.workspaceId).memberIds.includes(data.currentUserId))
        throw Error('Bạn cần là thành viên workspace.');
      data.files.unshift(
        ...parts.map((file) => ({
          ...file,
          attachmentId: file.id,
          projectId,
          ownerId: data.currentUserId,
          date: today(),
        })),
      );
    });
    refresh('Đã tải lên ' + parts.length + ' tệp.');
  }
  document.addEventListener('dragover', (event) => {
    if (event.target.closest('[data-file-drop]') && event.dataTransfer.types.includes('Files'))
      event.preventDefault();
  });
  document.addEventListener('drop', (event) => {
    const zone = event.target.closest('[data-file-drop]');
    if (!zone || !event.dataTransfer.files.length) return;
    event.preventDefault();
    addProjectAttachments(zone.dataset.fileDrop, event.dataTransfer.files).catch((error) =>
      D.showToast(error.message, true),
    );
  });
  function taskDetail(id) {
    const data = snapshot();
    const task = byId(data, 'tasks', id);
    if (!task) return;
    const project = byId(data, 'projects', task.projectId);
    const workspace = byId(data, 'workspaces', project.workspaceId);
    const manages =
      canManage(workspace, data.currentUserId) || task.creatorId === data.currentUserId;
    const canProgress = manages || task.assigneeId === data.currentUserId;
    const workMinutes = data.worklogs
      .filter((row) => row.taskId === id && row.status !== 'Rejected')
      .reduce((total, row) => total + row.minutes, 0);
    const current = state.view.taskDiscussion === 'history' ? 'history' : 'comments';
    const attrs = 'type="button" role="tab"';
    const tabs =
      '<div class="tabs" role="tablist">' +
      [
        ['comments', 'Bình luận'],
        ['history', 'Lịch sử'],
      ]
        .map(
          ([id, name]) =>
            '<button ' +
            attrs +
            ' class="tab' +
            (current === id ? ' tab--active' : '') +
            '" aria-selected="' +
            (current === id) +
            '" data-act="taskDetailTab|' +
            h(task.id) +
            '|' +
            id +
            '">' +
            name +
            '</button>',
        )
        .join('') +
      '</div>';
    const controls = actionRow(
      (manages || canProgress
        ? act('editTask|' + task.projectId + '|' + id, 'Sửa công việc', 'edit', 'btn primary')
        : '') +
        act('logFor|' + id, raw('worklogs.add'), 'more_time') +
        (canProgress
          ? task.status !== 'Done'
            ? act('completeTask|' + id + '|detail', 'Hoàn thành', 'check')
            : act('reopenTask|' + id, 'Mở lại', 'refresh')
          : '') +
        (manages ? iconBtn('deleteTask|' + id, raw('common.delete'), 'delete') : ''),
    );
    const details = D.definitions([
      ['Dự án', link('projects/' + task.projectId, project.name, '', '')],
      ['Người thực hiện', h(person(data, task.assigneeId)?.fullName || 'Chưa giao')],
      ['Ngày bắt đầu', fmtDate(task.startDate)],
      ['Hạn hoàn thành', fmtDate(task.dueDate)],
      [
        'Thời gian',
        h(hours(workMinutes)) +
          (task.estimateHours ? ' / ' + h(task.estimateHours + 'h ước tính') : ''),
      ],
    ]);
    const progress =
      '<div class="task-progress-input"><strong>Tiến độ · <output>' +
      task.progress +
      '%</output></strong>' +
      (canProgress && task.status !== 'Done'
        ? '<input type="range" min="0" max="100" step="1" value="' +
          task.progress +
          '" data-task-progress="' +
          h(id) +
          '" aria-label="Tiến độ công việc">'
        : bar(task.progress)) +
      '</div>';
    const checklist =
      '<div class="item-line"><strong>Checklist ' +
      task.checklist.filter((row) => row.done).length +
      '/' +
      task.checklist.length +
      '</strong>' +
      act(
        'taskAutoProgress|' + id,
        'Tự tính tiến độ',
        task.autoProgress ? 'check_box' : 'check_box_outline_blank',
        'btn sm',
      ) +
      '</div>' +
      task.checklist
        .map(
          (row, index) =>
            '<div class="task-check-row" draggable="true" data-check-id="' +
            h(row.id) +
            '" data-check-task="' +
            h(id) +
            '">' +
            icon('drag_indicator') +
            '<label class="form-check"><input type="checkbox" data-act="taskCheck|' +
            h(id) +
            '|' +
            h(row.id) +
            '"' +
            (row.done ? ' checked' : '') +
            '>' +
            h(row.title) +
            '</label>' +
            (index
              ? iconBtn(
                  'checkMove|' + id + '|' + row.id + '|-1',
                  'Đưa mục lên',
                  'keyboard_arrow_up',
                )
              : '') +
            iconBtn('checkDelete|' + id + '|' + row.id, 'Xóa mục', 'close') +
            '</div>',
        )
        .join('') +
      act('addCheck|' + id, 'Thêm mục', 'add', 'btn sm') +
      '<div class="item-line"><strong>Lặp lại công việc này</strong>' +
      (task.recurrence
        ? chip(task.recurrence.frequency + ' · mỗi ' + task.recurrence.every + ' kỳ', 'indigo')
        : '') +
      (manages
        ? act(
            'taskRecurring|' + id,
            task.recurrence ? 'Sửa lịch lặp' : 'Thiết lập',
            'event_repeat',
            'btn sm',
          )
        : '') +
      '</div>';
    const rendered =
      current === 'history'
        ? (task.history || [])
            .map(
              (row) =>
                '<div class="item-line"><span class="stack"><strong>' +
                h(row.text) +
                '</strong><small>' +
                fmtDate(row.date) +
                '</small></span></div>',
            )
            .join('') || '<p class="muted">Chưa có lịch sử thay đổi.</p>'
        : ((task.comments || [])
            .map((row, i) => {
              const key = row.id || 'initial-' + i;
              return (
                '<article class="item-line"><div class="stack"><strong>' +
                h(person(data, row.authorId)?.fullName) +
                '</strong><small>' +
                fmtDate(row.date) +
                '</small><p class="pre-wrap">' +
                h(row.text) +
                '</p>' +
                D.attachmentRows(row.files) +
                '</div>' +
                (row.authorId === data.currentUserId
                  ? iconBtn('taskCommentForm|' + id + '|' + key, 'Sửa bình luận', 'edit')
                  : '') +
                (row.authorId === data.currentUserId || manages
                  ? iconBtn('taskCommentRemove|' + id + '|' + key, 'Xóa bình luận', 'delete')
                  : '') +
                '</article>'
              );
            })
            .join('') || '<p class="muted">Chưa có bình luận.</p>') +
          act('taskCommentForm|' + id, 'Viết bình luận', 'chat_bubble_outline', 'btn sm');
    show(
      task.code + ' · ' + task.title,
      '<div class="task-detail-manual"><section><div class="toolbar">' +
        chip(raw('tasks.status.' + task.status), task.status === 'Done' ? 'emerald' : 'indigo') +
        chip(raw('tasks.priority.' + task.priority)) +
        '</div><p class="muted pre-wrap">' +
        h(task.description || 'Chưa có mô tả.') +
        '</p>' +
        details +
        progress +
        controls +
        checklist +
        '</section><aside>' +
        tabs +
        rendered +
        '</aside></div>',
      { glyph: 'task_alt', wide: true },
    );
    D.dialog.classList.add('task-wide');
  }
  function recursAt(rule, date) {
    const diff = Math.round((D.from(date) - D.from(rule.start)) / 86400000);
    if (diff < 0) return false;
    if (rule.frequency === 'Hằng ngày') return diff % rule.every === 0;
    if (rule.frequency === 'Hằng tuần')
      return Math.floor(diff / 7) % rule.every === 0 && D.from(date).getDay() === rule.weekday;
    const months =
      (Number(date.slice(0, 4)) - Number(rule.start.slice(0, 4))) * 12 +
      Number(date.slice(5, 7)) -
      Number(rule.start.slice(5, 7));
    return months % rule.every === 0 && Number(date.slice(8, 10)) === rule.monthday;
  }
  function runRecurring() {
    const current = today();
    const seeded = snapshot().tasks.filter(
      (task) => task.recurrence && task.recurrence.lastScan !== current,
    );
    if (!seeded.length) return;
    commit((data) => {
      for (const template of data.tasks.filter(
        (task) => task.recurrence && task.recurrence.lastScan !== current,
      )) {
        const rule = template.recurrence;
        const start = [rule.start, shift(rule.lastScan || shift(current, -31), 1)].sort().at(-1);
        const project = byId(data, 'projects', template.projectId);
        const length =
          template.startDate && template.dueDate
            ? Math.round((D.from(template.dueDate) - D.from(template.startDate)) / 86400000)
            : 0;
        for (
          let date = start;
          date <= current && (!rule.end || date <= rule.end);
          date = shift(date, 1)
        ) {
          if (!recursAt(rule, date)) continue;
          const count = (data.taskSequence[project.id] || 0) + 1;
          data.taskSequence[project.id] = count;
          const { recurrence, ...fields } = template;
          data.tasks.push({
            ...fields,
            id: uid('task'),
            code: project.key + '-' + count,
            progress: 0,
            status: 'Todo',
            startDate: date,
            dueDate: template.dueDate ? shift(date, length) : '',
            recurrenceSource: template.id,
            checklist: template.checklist.map((row) => ({ ...row, id: uid('check'), done: false })),
            comments: [],
            history: [{ date, text: 'Đã tạo từ lịch lặp ' + template.code }],
          });
        }
        rule.lastScan = current;
      }
    });
  }
  function reorderCheck(taskId, checkId, relative) {
    commit((data) => {
      const task = lookup(data, 'tasks', taskId);
      const start = task.checklist.findIndex((row) => row.id === checkId);
      const end =
        typeof relative === 'number'
          ? start + relative
          : task.checklist.findIndex((row) => row.id === relative);
      if (start < 0 || end < 0 || end >= task.checklist.length || start === end) return;
      task.checklist.splice(end, 0, ...task.checklist.splice(start, 1));
    });
    taskDetail(taskId);
  }
  let draggingCheck;
  document.addEventListener('input', (event) => {
    const input = event.target.closest('[data-task-progress]');
    if (input) input.parentElement.querySelector('output').value = input.value + '%';
  });
  document.addEventListener('change', (event) => {
    const input = event.target.closest('[data-task-progress]');
    if (!input) return;
    try {
      MockApi.progress(input.dataset.taskProgress, input.value);
      refresh();
      taskDetail(input.dataset.taskProgress);
    } catch (error) {
      D.showToast(error.message, true);
    }
  });
  document.addEventListener('dragstart', (event) => {
    const check = event.target.closest('[data-check-id]');
    if (!check) return;
    draggingCheck = { taskId: check.dataset.checkTask, id: check.dataset.checkId };
    event.dataTransfer.setData('text/plain', draggingCheck.id);
  });
  document.addEventListener('dragover', (event) => {
    if (draggingCheck && event.target.closest('[data-check-id]')) event.preventDefault();
  });
  document.addEventListener('drop', (event) => {
    const check = event.target.closest('[data-check-id]');
    if (draggingCheck && check && check.dataset.checkTask === draggingCheck.taskId) {
      event.preventDefault();
      reorderCheck(draggingCheck.taskId, draggingCheck.id, check.dataset.checkId);
    }
    draggingCheck = null;
  });
  document.addEventListener('dragend', () => {
    draggingCheck = null;
  });
  document.addEventListener('keydown', (event) => {
    const row = event.target.closest('[data-gantt-task]');
    if (!row || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const task = byId(snapshot(), 'tasks', row.dataset.ganttTask);
    const step = event.key === 'ArrowLeft' ? -1 : 1;
    try {
      MockApi.saveTask(
        {
          ...task,
          startDate:
            !event.shiftKey && task.startDate ? shift(task.startDate, step) : task.startDate,
          dueDate: task.dueDate ? shift(task.dueDate, step) : task.dueDate,
        },
        task.id,
      );
      refresh('Đã đổi ngày công việc.');
      document
        .querySelector('[data-gantt-task="' + CSS.escape(task.id) + '"]')
        ?.focus({ preventScroll: true });
    } catch (error) {
      D.showToast(error.message, true);
    }
  });
  let touch;
  let suppressClickUntil = 0;
  document.addEventListener(
    'touchstart',
    (event) => {
      const card = event.target.closest('[data-drag-task]');
      if (!card || event.touches.length !== 1) return;
      const point = event.touches[0];
      touch = { card, x: point.clientX, y: point.clientY, start: Date.now(), active: false };
    },
    { passive: true },
  );
  document.addEventListener(
    'touchmove',
    (event) => {
      if (!touch) return;
      const point = event.touches[0];
      const distance = Math.hypot(point.clientX - touch.x, point.clientY - touch.y);
      if (!touch.active && distance < 10) return;
      if (!touch.active && Date.now() - touch.start < 260) {
        touch = null;
        return;
      }
      touch.active = true;
      if (event.cancelable) event.preventDefault();
      const board = touch.card.closest('.board');
      const bounds = board.getBoundingClientRect();
      if (point.clientX > bounds.right - 30) board.scrollLeft += 18;
      if (point.clientX < bounds.left + 30) board.scrollLeft -= 18;
      board.querySelectorAll('.drag-over').forEach((node) => node.classList.remove('drag-over'));
      const hit = document.elementFromPoint(point.clientX, point.clientY);
      touch.target = hit?.closest('[data-drop-status]');
      touch.target?.classList.add('drag-over');
    },
    { passive: false },
  );
  function finishTouch(event) {
    if (!touch) return;
    if (touch.active) {
      suppressClickUntil = Date.now() + 400;
      if (event.type === 'touchend' && touch.target) {
        MockApi.moveTask(touch.card.dataset.dragTask, touch.target.dataset.dropStatus);
        refresh('Đã đổi trạng thái công việc.');
      }
      document.querySelectorAll('.drag-over').forEach((node) => node.classList.remove('drag-over'));
    }
    touch = null;
  }
  document.addEventListener('touchend', finishTouch);
  document.addEventListener('touchcancel', finishTouch);
  document.addEventListener(
    'click',
    (event) => {
      if (Date.now() < suppressClickUntil && event.target.closest('[data-drag-task]')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
  Object.assign(D, {
    roleOf,
    workspaceButtons,
    workspaceMemberControls,
    projectCanBudget,
    projectButtons,
    projectFiles,
  });
  Object.assign(actions, {
    workspaceMenu: (id) => {
      const data = snapshot();
      const workspace = lookup(data, 'workspaces', id);
      show(
        workspace.name,
        actionRow(
          act('workspaceLeave|' + id, 'Rời workspace', 'logout') +
            (roleOf(workspace, data.currentUserId) === 'Owner'
              ? act('workspaceDelete|' + id, 'Xóa workspace', 'delete', 'btn danger')
              : ''),
        ),
        { glyph: 'group' },
      );
    },
    workspaceLeave: (id) =>
      confirm(
        'Rời workspace?',
        'Bạn sẽ rời nhóm và danh sách thành viên.',
        () => {
          commit((data) => {
            const room = lookup(data, 'workspaces', id);
            const me = data.currentUserId;
            if (roleOf(room, me) === 'Owner') {
              const next = room.memberIds.find((id) => id !== me && roleOf(room, id) === 'Owner');
              if (!next) throw Error('Workspace phải còn ít nhất một Owner.');
              if (room.ownerId === me) room.ownerId = next;
            }
            room.memberIds = room.memberIds.filter((id) => id !== me);
            if (room.roles) delete room.roles[me];
          });
          go('workspaces');
          refresh('Đã rời workspace.');
        },
        'Rời workspace',
      ),
    workspaceDelete: (id) =>
      confirm(
        'Xóa workspace?',
        'Dự án, công việc và dữ liệu liên quan trong bản demo sẽ bị xóa.',
        () => {
          commit((data) => {
            if (roleOf(lookup(data, 'workspaces', id), data.currentUserId) !== 'Owner')
              throw Error('Chỉ Owner có quyền xóa workspace.');
            clearWorkspaceProjects(
              data,
              data.projects.filter((row) => row.workspaceId === id).map((row) => row.id),
            );
            const meetingIds = data.meetings
              .filter((row) => row.workspaceId === id)
              .map((row) => row.id);
            data.meetings = data.meetings.filter((row) => row.workspaceId !== id);
            data.notifications = data.notifications.filter(
              (row) => !meetingIds.some((id) => row.target === 'meeting:' + id),
            );
            data.workspaces = data.workspaces.filter((row) => row.id !== id);
          });
          go('workspaces');
          refresh('Đã xóa workspace.');
        },
        'Xóa workspace',
      ),
    addMember: (id) => {
      const data = snapshot();
      const item = lookup(data, 'workspaces', id);
      const actor = roleOf(item, data.currentUserId);
      const roles =
        actor === 'Owner' ? ['Member', 'Manager', 'Admin', 'Owner'] : ['Member', 'Manager'];
      show(
        'Thêm thành viên',
        field('Email tài khoản mẫu', 'memberEmail', '', {
          required: true,
          type: 'email',
          placeholder: 'ten@example.test',
        }) + field('Vai trò', 'role', 'Member', { options: roles.map((role) => [role, role]) }),
        {
          glyph: 'person_add',
          submit: (values) => {
            commit((data) => {
              const ws = lookup(data, 'workspaces', id);
              const employee = data.employees.find(
                (row) => row.email === values.memberEmail.trim().toLowerCase() && !row.locked,
              );
              if (!employee || ws.memberIds.includes(employee.id))
                throw Error('Email chưa có tài khoản hoặc người này đã là thành viên.');
              if (
                !['Owner', 'Admin'].includes(roleOf(ws, data.currentUserId)) ||
                !roles.includes(values.role)
              )
                throw Error('Bạn chưa có quyền thêm thành viên.');
              ws.memberIds.push(employee.id);
              (ws.roles ||= {})[employee.id] = values.role;
            });
            refresh('Đã thêm thành viên.');
          },
        },
      );
    },
    memberRole: (id, memberId) => {
      const data = snapshot();
      const ws = lookup(data, 'workspaces', id);
      const user = lookup(data, 'employees', memberId);
      const actor = roleOf(ws, data.currentUserId);
      const current = roleOf(ws, memberId);
      const roles =
        actor === 'Owner' ? ['Member', 'Manager', 'Admin', 'Owner'] : ['Member', 'Manager'];
      show(
        'Vai trò của ' + user.fullName,
        field('Vai trò workspace', 'role', current, {
          options: roles.map((role) => [role, role]),
        }) +
          act(
            'memberRemove|' + id + '|' + memberId,
            'Xóa khỏi workspace',
            'person_remove',
            'btn danger',
          ),
        {
          glyph: 'manage_accounts',
          submit: (values) => {
            commit((data) => {
              const ws = lookup(data, 'workspaces', id);
              const myRole = roleOf(ws, data.currentUserId);
              if (!(
                myRole === 'Owner' ||
                (myRole === 'Admin' && ['Member', 'Manager'].includes(current))
              ))
                throw Error('Bạn chưa có quyền đổi vai trò này.');
              if (current === 'Owner' && values.role !== 'Owner') {
                const newOwner = ws.memberIds.find(
                  (other) => other !== memberId && roleOf(ws, other) === 'Owner',
                );
                if (!newOwner) throw Error('Workspace phải còn ít nhất một Owner.');
                if (ws.ownerId === memberId) ws.ownerId = newOwner;
              }
              (ws.roles ||= {})[memberId] = values.role;
            });
            refresh('Đã cập nhật vai trò.');
          },
        },
      );
    },
    memberRemove: (id, memberId) =>
      confirm(
        'Xóa thành viên?',
        'Người này sẽ rời workspace trong bản demo.',
        () => {
          commit((data) => {
            const ws = lookup(data, 'workspaces', id);
            const actor = roleOf(ws, data.currentUserId);
            const target = roleOf(ws, memberId);
            if (!(
              actor === 'Owner' ||
              (actor === 'Admin' && ['Member', 'Manager'].includes(target))
            ))
              throw Error('Bạn chưa có quyền xóa thành viên này.');
            if (target === 'Owner') {
              const next = ws.memberIds.find(
                (other) => other !== memberId && roleOf(ws, other) === 'Owner',
              );
              if (!next) throw Error('Workspace phải còn ít nhất một Owner.');
              if (ws.ownerId === memberId) ws.ownerId = next;
            }
            ws.memberIds = ws.memberIds.filter((id) => id !== memberId);
            if (ws.roles) delete ws.roles[memberId];
          });
          refresh('Đã xóa thành viên.');
        },
        'Xóa thành viên',
      ),
    projectRemove: (id) =>
      confirm(
        'Xóa dự án?',
        'Công việc và dữ liệu liên quan trong demo sẽ bị xóa.',
        () => {
          const workspaceId = commit((data) => {
            const row = lookup(data, 'projects', id);
            if (
              !canManage(lookup(data, 'workspaces', row.workspaceId), data.currentUserId) &&
              row.creatorId !== data.currentUserId
            )
              throw Error('Bạn chưa có quyền xóa dự án.');
            clearWorkspaceProjects(data, [id]);
            return row.workspaceId;
          });
          go('workspaces/' + workspaceId);
          refresh('Đã xóa dự án.');
        },
        'Xóa dự án',
      ),
    taskClear: () => {
      delete state.view.taskMine;
      delete state.view.taskStatus;
      delete state.view.taskQuery;
      render();
    },
    ganttMine: () => {
      state.view.ganttMine = !state.view.ganttMine;
      render();
    },
    task: (id) => {
      delete state.view.taskDiscussion;
      taskDetail(id);
    },
    completeTask: (id, detail) => {
      MockApi.moveTask(id, 'Done');
      refresh('Đã hoàn thành công việc.');
      if (detail === 'detail') taskDetail(id);
    },
    reopenTask: (id, mode) => {
      MockApi.moveTask(id, 'InProgress');
      refresh('Đã mở lại công việc.');
      if (mode !== 'inline') taskDetail(id);
    },
    taskCheck: (id, checkId) => {
      MockApi.taskCheck(id, checkId);
      taskDetail(id);
      refresh();
    },
    addCheck: (id) =>
      show('Thêm mục checklist', field('Tên mục', 'title', '', { required: true }), {
        glyph: 'checklist',
        submit: (values) => {
          MockApi.addCheck(id, values.title);
          refresh();
          taskDetail(id);
        },
      }),
    taskDetailTab: (id, tab) => {
      state.view.taskDiscussion = tab;
      taskDetail(id);
    },
    taskAutoProgress: (id) => {
      commit((data) => {
        const row = lookup(data, 'tasks', id);
        row.autoProgress = !row.autoProgress;
        if (row.autoProgress && row.status !== 'Done' && row.checklist.length) {
          row.progress = Math.round(
            (row.checklist.filter((check) => check.done).length * 100) / row.checklist.length,
          );
          if (row.progress > 0 && row.status === 'Todo') row.status = 'InProgress';
        }
      });
      refresh();
      taskDetail(id);
    },
    checkMove: (id, checkId, steps) => reorderCheck(id, checkId, Number(steps)),
    checkDelete: (id, checkId) => {
      commit((data) => {
        const row = lookup(data, 'tasks', id);
        row.checklist = row.checklist.filter((item) => item.id !== checkId);
      });
      refresh();
      taskDetail(id);
    },
    taskRecurring: (id) => {
      const row = lookup(snapshot(), 'tasks', id);
      const rule = row.recurrence || {};
      show(
        'Lặp lại công việc này',
        field('Tần suất', 'frequency', rule.frequency || 'Hằng tuần', {
          options: ['Hằng ngày', 'Hằng tuần', 'Hằng tháng'].map((value) => [value, value]),
        }) +
          field('Mỗi số kỳ', 'every', rule.every || 1, {
            type: 'number',
            min: 1,
            max: 12,
            required: true,
          }) +
          field('Thứ trong tuần', 'weekday', rule.weekday ?? 1, {
            options: [
              ['1', 'Thứ Hai'],
              ['2', 'Thứ Ba'],
              ['3', 'Thứ Tư'],
              ['4', 'Thứ Năm'],
              ['5', 'Thứ Sáu'],
              ['6', 'Thứ Bảy'],
              ['0', 'Chủ Nhật'],
            ],
          }) +
          field('Ngày trong tháng', 'monthday', rule.monthday || 1, {
            type: 'number',
            min: 1,
            max: 31,
          }) +
          field('Ngày bắt đầu', 'start', rule.start || today(), { type: 'date', required: true }) +
          field('Ngày kết thúc', 'end', rule.end, { type: 'date' }) +
          (row.recurrence
            ? act('taskStopRecurring|' + id, 'Dừng lặp', 'event_busy', 'btn danger')
            : '') +
          '<p class="muted">Bản demo tạo các kỳ đến hạn khi mở ứng dụng hoặc lưu lịch lặp.</p>',
        {
          glyph: 'event_repeat',
          submit: (values) => {
            if (values.end && values.end < values.start)
              throw Error('Ngày kết thúc phải sau ngày bắt đầu.');
            commit((data) => {
              const task = lookup(data, 'tasks', id);
              task.recurrence = {
                ...values,
                every: Number(values.every),
                weekday: Number(values.weekday),
                monthday: Number(values.monthday),
                lastScan: rule.lastScan,
              };
            });
            runRecurring();
            refresh('Đã lưu lịch lặp.');
            taskDetail(id);
          },
        },
      );
    },
    taskStopRecurring: (id) => {
      commit((data) => {
        delete lookup(data, 'tasks', id).recurrence;
      });
      refresh('Đã dừng lịch lặp.');
      taskDetail(id);
    },
    taskCommentForm: (id, commentId) => {
      const data = snapshot();
      const item = lookup(data, 'tasks', id);
      const previous = item.comments.find((row, i) => (row.id || 'initial-' + i) === commentId);
      show(
        previous ? 'Sửa bình luận' : 'Viết bình luận',
        field('Nội dung', 'text', previous?.text, { type: 'textarea' }) +
          D.attachInput() +
          field('Nhắc thành viên', 'mention', '', {
            options: [
              ['', 'Không nhắc'],
              ...data.employees
                .filter((row) =>
                  byId(
                    data,
                    'workspaces',
                    byId(data, 'projects', item.projectId).workspaceId,
                  ).memberIds.includes(row.id),
                )
                .map((row) => [row.id, row.fullName]),
            ],
          }),
        {
          glyph: 'chat_bubble_outline',
          submitLabel: 'Gửi',
          submit: async (values, form) => {
            const files = await D.saveAttachments(new FormData(form).getAll('attachment'));
            const mentioned = person(data, values.mention);
            const contents = values.text.trim() + (mentioned ? ' @' + mentioned.fullName : '');
            if (!contents.trim() && !files.length) throw Error('Nhập nội dung hoặc đính kèm tệp.');
            commit((data) => {
              const task = lookup(data, 'tasks', id);
              if (previous) {
                const row = task.comments.find(
                  (item, i) => (item.id || 'initial-' + i) === commentId,
                );
                if (row.authorId !== data.currentUserId)
                  throw Error('Chỉ tác giả sửa được bình luận.');
                row.text = contents;
                row.files = [...(row.files || []), ...files];
              } else
                task.comments.push({
                  id: uid('comment'),
                  authorId: data.currentUserId,
                  text: contents,
                  files,
                  date: today(),
                });
            });
            refresh();
            taskDetail(id);
          },
        },
      );
    },
    taskCommentRemove: (id, commentId) =>
      confirm(
        'Xóa bình luận?',
        'Tệp đính kèm không còn xuất hiện trong tài liệu dự án.',
        () => {
          commit((data) => {
            const task = lookup(data, 'tasks', id);
            const project = lookup(data, 'projects', task.projectId);
            const ws = lookup(data, 'workspaces', project.workspaceId);
            const current = task.comments.find(
              (item, i) => (item.id || 'initial-' + i) === commentId,
            );
            if (current.authorId !== data.currentUserId && !canManage(ws, data.currentUserId))
              throw Error('Bạn chưa có quyền xóa bình luận.');
            task.comments = task.comments.filter((row) => row !== current);
          });
          refresh();
          taskDetail(id);
        },
        'Xóa bình luận',
      ),
    addFile: (projectId) =>
      show(
        'Tải tài liệu lên',
        '<p class="muted">Chọn tối đa 5 tệp, mỗi tệp tối đa 20 MB.</p>' + D.attachInput('Chọn tệp'),
        {
          glyph: 'upload',
          submitLabel: 'Tải lên',
          submit: (_values, form) =>
            addProjectAttachments(projectId, new FormData(form).getAll('attachment')),
        },
      ),
    downloadFile: (id) => {
      const item = lookup(snapshot(), 'files', id);
      if (item.attachmentId)
        D.openAttachment(item.attachmentId, item.name).catch((error) =>
          D.showToast(error.message, true),
        );
      else D.download(item.name, item.content);
    },
  });
  document.addEventListener('DOMContentLoaded', () => {
    runRecurring();
    if (snapshot().tasks.some((task) => task.recurrence)) render();
  });
})();
