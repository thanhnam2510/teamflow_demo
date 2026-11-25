'use strict';

(() => {
  const D = Demo;
  const {
    views,
    actions,
    state,
    h,
    raw,
    t,
    icon,
    link,
    rawLink,
    act,
    iconBtn,
    avatar,
    byId,
    person,
    matches,
    fmtDate,
    hours,
    bar,
    chip,
    header,
    panel,
    placeholder,
    tabs,
    stats,
    stat,
    filter,
    field,
    show,
    confirm,
    refresh,
    render,
    go,
    today,
    shift,
    from,
  } = D;
  const { snapshot, commit } = MockApi;
  const uid = (prefix) =>
    prefix +
    '-' +
    (globalThis.crypto?.randomUUID?.() ||
      Date.now().toString(36) + Math.random().toString(36).slice(2));
  const clean = (value, label, max = 200) => {
    const result = String(value || '').trim();
    if (!result || result.length > max) throw Error(label + ' cần từ 1 đến ' + max + ' ký tự.');
    return result;
  };
  const audit = (data, text, category = 'Tài khoản') =>
    data.security.unshift({
      date: today(),
      time: new Date().toISOString(),
      text,
      category,
      actor: data.currentUserId,
    });
  const monday = (date) => shift(date, -((from(date).getDay() + 6) % 7));
  const actionRow = (body) => '<div class="row-actions">' + body + '</div>';
  const lookup = (data, collection, id) => {
    const row = byId(data, collection, id);
    if (!row) throw Error('Không tìm thấy bản ghi.');
    return row;
  };
  const formError = (form, error) => {
    const alert = form.querySelector('.form-error');
    if (!alert) return D.showToast(error.message, true);
    alert.textContent = error.message;
    alert.hidden = false;
  };
  const localDateTime = (value) =>
    new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
  const password = (value) => {
    if (!/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,100}$/.test(value || ''))
      throw Error('Mật khẩu mẫu cần 8–100 ký tự, có chữ hoa, chữ thường và số.');
  };
  const validateEmail = (value) => {
    const email = String(value || '')
      .trim()
      .toLowerCase();
    if (!/^[a-z0-9._%+-]+@example\.test$/.test(email))
      throw Error('Dùng địa chỉ mẫu dạng ten@example.test.');
    return email;
  };
  function switchUser(userId, target = '') {
    commit((data) => {
      const row = lookup(data, 'employees', userId);
      if (row.locked) throw Error('Tài khoản mẫu này đang bị khóa.');
      data.currentUserId = row.id;
      audit(data, 'Đăng nhập phiên demo.', 'Đăng nhập');
    });
    go(target);
    render();
  }
  function authShell(mode, data) {
    const labels = {
      login: [
        'Chào mừng trở lại',
        'Đăng nhập để tiếp tục vào không gian làm việc của bạn.',
        'Đăng nhập',
      ],
      register: [
        'Tạo tài khoản',
        'Bắt đầu quản lý công việc cùng nhóm của bạn với TeamFlow.',
        'Tạo tài khoản',
      ],
      forgot: [
        'Quên mật khẩu',
        'Nhập email để nhận liên kết đặt lại mật khẩu.',
        'Gửi liên kết đặt lại',
      ],
      set: ['Đặt mật khẩu', 'Thiết lập mật khẩu để kích hoạt tài khoản TeamFlow.', 'Đặt mật khẩu'],
    };
    const [title, sub, button] = labels[mode];
    const employee = person(data, data.currentUserId);
    const slides = [
      ['Cần làm', '#818cf8', ['Thiết kế màn hình', 'Cập nhật tài liệu']],
      ['Đang làm', '#f59e0b', ['Tích hợp đăng nhập', 'Rà soát giao diện']],
      ['Hoàn thành', '#34d399', ['Khởi tạo dự án', 'Kế hoạch tuần']],
    ];
    const features = [
      ['dashboard', 'Bảng Kanban trực quan', 'Theo dõi tiến độ theo từng công việc.'],
      ['groups', 'Cộng tác theo workspace', 'Làm việc cùng nhóm trong một không gian chung.'],
      ['timeline', 'Dữ liệu rõ ràng', 'Xem lịch, thời gian và tiến độ trên cùng hệ thống.'],
    ];
    const art =
      '<aside class="hero"><div class="hero__backdrop" aria-hidden="true"><span class="orb orb--indigo"></span><span class="orb orb--violet"></span><span class="orb orb--cyan"></span><span class="grid"></span></div><div class="hero__brand">' +
      D.brand +
      '</div><div class="hero__content"><span class="eyebrow"><span class="eyebrow__dot"></span>Nền tảng quản lý công việc nội bộ</span><h1>Mọi dự án,<br><span class="headline-accent">một luồng làm việc.</span></h1><p class="lead">Tổ chức công việc, cộng tác với đồng đội và theo dõi tiến độ trong cùng một nơi.</p><ul class="features">' +
      features
        .map(
          ([glyph, name, text]) =>
            '<li class="feature"><span class="feature__icon">' +
            icon(glyph) +
            '</span><div><strong>' +
            h(name) +
            '</strong><span class="feature__text">' +
            h(text) +
            '</span></div></li>',
        )
        .join('') +
      '</ul></div><div class="board" aria-hidden="true"><div class="board__header"><span class="board__dots"><i></i><i></i><i></i></span><span class="board__title">Sprint 12 · TeamFlow</span></div><div class="board__columns">' +
      slides
        .map(
          ([label, color, cards]) =>
            '<div class="column"><div class="column__title"><span class="column__accent" style="background:' +
            color +
            '"></span>' +
            h(label) +
            '</div>' +
            cards
              .map(
                (name) =>
                  '<div class="card"><span class="card__label">' +
                  h(name) +
                  '</span><span class="card__bar" style="width:62%"></span></div>',
              )
              .join('') +
            '</div>',
        )
        .join('') +
      '</div></div><footer class="hero__footer">© ' +
      new Date().getFullYear() +
      ' TeamFlow</footer></aside>';
    let fields = mode === 'register' ? field('Họ tên', 'fullName', '', { required: true }) : '';
    if (mode !== 'set')
      fields += field('Email mẫu', 'email', mode === 'login' ? employee.email : '', {
        required: true,
        type: 'email',
        placeholder: 'ten@example.test',
      });
    if (['login', 'register', 'set'].includes(mode))
      fields += field(
        mode === 'set' ? 'Mật khẩu mới' : 'Mật khẩu mẫu',
        'password',
        mode === 'login' ? 'TeamFlow123' : '',
        { type: 'password', required: true },
      );
    if (['register', 'set'].includes(mode))
      fields +=
        '<meter class="password-meter" min="0" max="4" value="0" aria-label="Độ mạnh mật khẩu"></meter>' +
        field('Xác nhận mật khẩu', 'confirm', '', { type: 'password', required: true });
    if (mode === 'set')
      fields =
        '<p class="muted">Liên kết đặt mật khẩu cho tài khoản demo <strong>' +
        h(state.demoInvite?.email || employee.email) +
        '</strong>.</p>' +
        fields;
    const foot =
      mode === 'login'
        ? '<p>Chưa có tài khoản? ' + link('register', 'Đăng ký ngay', '', '') + '</p>'
        : '<p>' + link('login', 'Quay lại đăng nhập', 'arrow_back', 'btn text') + '</p>';
    return (
      '<div class="auth-shell">' +
      art +
      '<main class="panel"><div class="panel__glow"></div><div class="panel__brand">' +
      D.brand +
      '</div><div class="panel__content"><section class="surface auth-card"><h1>' +
      h(title) +
      '</h1><p class="muted">' +
      h(sub) +
      '</p>' +
      (mode === 'login'
        ? act('demoAccount', 'Chọn tài khoản demo', 'group', 'btn demo-login') +
          '<div class="auth-divider">hoặc dùng biểu mẫu mẫu</div>'
        : '') +
      '<form data-auth-form="' +
      mode +
      '">' +
      fields +
      '<p class="form-error" role="alert" hidden></p>' +
      (mode === 'login'
        ? '<p class="auth-forgot">' + link('forgot-password', 'Quên mật khẩu?', '', '') + '</p>'
        : '') +
      '<button type="submit" class="btn primary">' +
      h(button) +
      '</button></form>' +
      foot +
      '</section></div></main></div>'
    );
  }
  D.standalone = Object.fromEntries(
    [
      ['login', 'login'],
      ['register', 'register'],
      ['forgot-password', 'forgot'],
      ['set-password', 'set'],
    ].map(([key, mode]) => [
      key,
      (data, token) => {
        if (mode === 'set' && token) {
          const invite = data.employees.find((row) => row.invited && row.inviteToken === token);
          if (!invite || invite.inviteExpires < Date.now())
            return (
              '<div class="content">' +
              header('Liên kết kích hoạt đã hết hạn', '', link('login', 'Quay lại đăng nhập')) +
              '</div>'
            );
          state.demoInvite = { email: invite.email, expiry: invite.inviteExpires };
        }
        return authShell(mode, data);
      },
    ]),
  );
  document.addEventListener('input', (event) => {
    if (!event.target.matches('[data-auth-form] input[name="password"]')) return;
    const value = event.target.value;
    const meter = event.target.form.querySelector('meter');
    if (meter)
      meter.value = [
        value.length >= 8,
        /[A-Z]/.test(value),
        /[a-z]/.test(value),
        /\d/.test(value),
      ].filter(Boolean).length;
  });
  document.addEventListener('submit', (event) => {
    const form = event.target.closest('[data-auth-form]');
    if (!form) return;
    event.preventDefault();
    const mode = form.dataset.authForm;
    const values = Object.fromEntries(new FormData(form));
    try {
      if (mode === 'login') {
        const email = validateEmail(values.email);
        const employee = snapshot().employees.find((row) => row.email === email && !row.invited);
        if (!employee || values.password !== 'TeamFlow123')
          throw Error('Dùng tài khoản mẫu và mật khẩu TeamFlow123.');
        return switchUser(employee.id);
      }
      if (mode === 'forgot') {
        state.demoInvite = { email: validateEmail(values.email), expiry: Date.now() + 3600000 };
        go('set-password');
        return;
      }
      password(values.password);
      if (values.confirm !== values.password) throw Error('Xác nhận mật khẩu chưa khớp.');
      if (mode === 'register') {
        const email = validateEmail(values.email);
        const user = commit((data) => {
          if (data.employees.some((row) => row.email === email))
            throw Error('Email này đã được sử dụng.');
          const row = {
            id: uid('employee'),
            fullName: clean(values.fullName, 'Họ tên'),
            email,
            role: 'Member',
            level: 'Thử việc',
            jobTitle: '',
            rate: 0,
          };
          data.employees.push(row);
          return row;
        });
        switchUser(user.id, 'welcome');
      } else {
        const invite = state.demoInvite;
        if (invite && invite.expiry < Date.now()) throw Error('Liên kết mẫu đã hết hạn.');
        delete state.demoInvite;
        const employee = snapshot().employees.find((row) => row.email === invite?.email);
        if (employee) {
          commit((data) => {
            lookup(data, 'employees', employee.id).invited = false;
          });
          switchUser(employee.id, 'welcome');
        } else go('login');
      }
    } catch (error) {
      formError(form, error);
    }
  });
  function profile(data) {
    const user = person(data, data.currentUserId);
    const dept = byId(data, 'departments', user.departmentId);
    const workspaces = data.workspaces.filter((row) => row.memberIds.includes(user.id));
    const currentOff = data.offboarding.find(
      (row) =>
        row.employeeId === user.id && !['Hoàn tất', 'Đã hủy', 'Bị từ chối'].includes(row.status),
    );
    const identity =
      '<aside class="identity"><div class="identity__banner"></div><div class="identity__body">' +
      (user.avatar
        ? '<img class="profile-avatar" src="' + h(user.avatar) + '" alt="Ảnh đại diện">'
        : avatar(user.fullName, 'lg')) +
      '<h2>' +
      h(user.fullName) +
      '</h2><p class="muted">' +
      h(user.jobTitle || user.email) +
      '</p>' +
      actionRow(
        act('profilePhoto', 'Tải ảnh lên', 'upload', 'btn sm') +
          (user.avatar ? iconBtn('profilePhotoRemove', 'Xóa ảnh', 'delete') : ''),
      ) +
      '<dl class="details"><dt>Email</dt><dd>' +
      h(user.email) +
      '</dd><dt>Phòng ban</dt><dd>' +
      h(dept?.name || '—') +
      '</dd><dt>Cấp bậc</dt><dd>' +
      h(user.level || 'Chính thức') +
      '</dd></dl></div></aside>';
    const edit =
      '<form class="profile-form" data-profile-edit><div class="field-grid">' +
      field('Họ tên', 'fullName', user.fullName, { required: true }) +
      field('Email', 'email', user.email, { disabled: true, type: 'email' }) +
      field('Chức danh', 'jobTitle', user.jobTitle) +
      field('Số điện thoại', 'phone', user.phone, { type: 'tel' }) +
      '</div>' +
      field('Giới thiệu', 'bio', user.bio, { type: 'textarea' }) +
      '<p class="form-error" role="alert" hidden></p><button class="btn primary" type="submit">' +
      icon('save') +
      'Lưu thay đổi</button></form>';
    const cards = [
      ['Thông tin cá nhân', 'person', edit],
      [
        'Mật khẩu',
        'lock',
        '<p class="muted">Thử biểu mẫu đổi mật khẩu trên tài khoản mẫu.</p>' +
          act('profilePassword', 'Đổi mật khẩu', 'lock_reset'),
      ],
      [
        'Sơ đồ tổ chức',
        'account_tree',
        '<p>' +
          h(dept?.name || 'Chưa thuộc phòng ban') +
          '</p><p class="muted">Quản lý trực tiếp · ' +
          h(person(data, dept?.managerId)?.fullName || '—') +
          '</p>' +
          link('departments', 'Xem sơ đồ tổ chức', 'account_tree', 'btn sm'),
      ],
      [
        'Nhóm của tôi',
        'groups',
        workspaces
          .map(
            (row) =>
              '<div class="item-line">' +
              icon('group') +
              link('workspaces/' + row.id, row.name, '', '') +
              chip(row.ownerId === user.id ? 'Owner' : row.roles?.[user.id] || 'Thành viên') +
              '</div>',
          )
          .join('') || placeholder('Chưa có workspace.', 'groups'),
      ],
      [
        'Nghỉ việc',
        'badge',
        currentOff
          ? link('offboarding/' + currentOff.id, 'Xem hồ sơ nghỉ việc', 'badge')
          : act('offResign', 'Xin nghỉ việc', 'badge'),
      ],
    ];
    return (
      '<div class="profile-manual">' +
      header(raw('nav.profile')) +
      '<div class="layout">' +
      identity +
      '<div class="main">' +
      cards
        .map(
          ([title, glyph, body]) =>
            '<section class="card"><h2>' + icon(glyph) + h(title) + '</h2>' + body + '</section>',
        )
        .join('') +
      '</div></div></div>'
    );
  }
  document.addEventListener('submit', (event) => {
    const form = event.target.closest('[data-profile-edit]');
    if (!form) return;
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    try {
      commit((data) => {
        const user = person(data, data.currentUserId);
        const bio = String(values.bio || '').trim();
        if (bio.length > 500) throw Error('Giới thiệu tối đa 500 ký tự.');
        Object.assign(user, {
          fullName: clean(values.fullName, 'Họ tên'),
          jobTitle: values.jobTitle.trim(),
          phone: values.phone.trim(),
          bio,
        });
      });
      refresh('Đã lưu thông tin cá nhân.');
    } catch (error) {
      formError(form, error);
    }
  });
  const kinds = [
    ['Code', 'Code', 'indigo'],
    ['Meeting', 'Meeting', 'violet'],
    ['Maintenance', 'Maintenance', 'amber'],
    ['Bug', 'Fix bug', 'rose'],
    ['Learning', 'Học tập', 'emerald'],
    ['Support', 'Hỗ trợ', 'cyan'],
    ['Other', 'Khác', 'slate'],
  ];
  const capacity = [
    ['Free', 'Còn trống', 'emerald'],
    ['Balanced', 'Vừa đủ', 'amber'],
    ['Overloaded', 'Quá tải', 'rose'],
  ];
  function weeklyRows(data) {
    if (data.weeklyItems) return data.weeklyItems;
    return data.tasks.slice(0, 12).map((row, index) => ({
      id: 'seed-weekly-' + index,
      userId: row.assigneeId || data.currentUserId,
      title: row.title,
      date: shift(monday(today()), index % 6),
      projectId: row.projectId,
      kind: kinds[index % kinds.length][0],
      note: '',
    }));
  }
  function weekForm(day, rowId) {
    const data = snapshot();
    const row = weeklyRows(data).find((item) => item.id === rowId);
    if (row && row.userId !== data.currentUserId) return;
    const memberProjects = data.projects.filter((item) =>
      byId(data, 'workspaces', item.workspaceId)?.memberIds.includes(data.currentUserId),
    );
    show(
      row ? 'Sửa việc trong tuần' : 'Thêm việc trong tuần',
      field('Tiêu đề', 'title', row?.title, { required: true }) +
        '<div class="field-grid">' +
        field('Ngày', 'date', row?.date || day, { type: 'date', required: true }) +
        field('Loại việc', 'kind', row?.kind || 'Code', {
          options: kinds.map(([id, label]) => [id, label]),
        }) +
        '</div>' +
        field('Dự án', 'projectId', row?.projectId, {
          options: [['', 'Không chọn'], ...D.options(memberProjects)],
        }) +
        field('Ghi chú', 'note', row?.note, { type: 'textarea' }) +
        (row ? act('weekRemove|' + row.id, 'Xóa việc', 'delete', 'btn danger') : ''),
      {
        glyph: 'calendar_view_week',
        submit: (values) => {
          commit((data) => {
            const rows = (data.weeklyItems ||= weeklyRows(data));
            if (
              rows.filter(
                (item) =>
                  item.id !== rowId &&
                  item.userId === data.currentUserId &&
                  monday(item.date) === monday(values.date),
              ).length >= 30
            )
              throw Error('Mỗi người có tối đa 30 việc trong một tuần.');
            const item = {
              ...values,
              title: clean(values.title, 'Tiêu đề'),
              userId: data.currentUserId,
            };
            if (row)
              Object.assign(
                rows.find((item) => item.id === row.id),
                item,
              );
            else rows.push({ ...item, id: uid('week') });
          });
          refresh('Đã lưu việc trong tuần.');
        },
      },
    );
  }
  function weekly(data) {
    const begin = monday(state.view.weekDate || today());
    const dates = D.datesBetween(begin, 7);
    const list = weeklyRows(data).filter((row) => row.date >= dates[0] && row.date <= dates[6]);
    const people = [...data.employees]
      .sort((a, b) => Number(b.id === data.currentUserId) - Number(a.id === data.currentUserId))
      .filter(
        (row) =>
          matches(state.view.weekQuery, row.fullName) &&
          (state.view.weekShowEmpty ||
            row.id === data.currentUserId ||
            list.some((item) => item.userId === row.id)),
      );
    const columns = [...dates.slice(0, 5).map((date) => [date]), dates.slice(5)];
    const cells = people
      .map((employee) => {
        const mine = employee.id === data.currentUserId;
        const rows = list.filter(
          (row) =>
            row.userId === employee.id &&
            (!state.view.weekType || row.kind === state.view.weekType),
        );
        const level = data.capacity?.[begin]?.[employee.id];
        return (
          '<div class="row' +
          (mine ? ' row--mine' : '') +
          '" role="row"><div class="member" role="rowheader">' +
          avatar(employee.fullName, 'sm') +
          '<span class="member__who">' +
          act('employee|' + employee.id, employee.fullName, '', 'plain-button') +
          '<small class="muted">' +
          h(employee.jobTitle) +
          '</small></span><span class="member__count">' +
          rows.length +
          '</span></div>' +
          columns
            .map((days) => {
              const labels = data.leave
                .filter(
                  (row) =>
                    row.userId === employee.id &&
                    row.status === 'Approved' &&
                    days.some((date) => row.startDate <= date && row.endDate >= date),
                )
                .map(() => chip('Nghỉ phép', 'emerald'))
                .join('');
              const items = rows
                .filter((row) => days.includes(row.date))
                .map((row) => {
                  const [, name, tone] = kinds.find(([kind]) => kind === row.kind) || kinds.at(-1);
                  const project = byId(data, 'projects', row.projectId);
                  const content =
                    '<strong>' +
                    h(row.title) +
                    '</strong><small>' +
                    h(name) +
                    (project ? ' · ' + h(project.key) : '') +
                    '</small>';
                  return mine
                    ? '<button type="button" class="week-item tag--' +
                        tone +
                        '" data-act="weekForm|' +
                        h(row.date) +
                        '|' +
                        h(row.id) +
                        '">' +
                        content +
                        '</button>'
                    : '<div class="week-item tag--' + tone + '">' + content + '</div>';
                })
                .join('');
              return (
                '<div class="slot" role="cell">' +
                labels +
                items +
                (mine
                  ? iconBtn(
                      'weekForm|' + days[0],
                      'Thêm việc vào ' + fmtDate(days[0]),
                      'add',
                      'slot__add',
                    )
                  : '') +
                '</div>'
              );
            })
            .join('') +
          '<div class="slot slot--capacity" role="cell">' +
          capacity
            .map(([value, label, tone]) =>
              mine
                ? act(
                    'weekCapacity|' + begin + '|' + value,
                    label,
                    '',
                    'btn sm capacity-opt tag--' + tone + (level === value ? ' selected' : ''),
                  )
                : level === value
                  ? chip(label, tone)
                  : '',
            )
            .join('') +
          '</div></div>'
        );
      })
      .join('');
    return (
      '<div class="weekly-manual">' +
      header(
        raw('weekly.title'),
        raw('weekly.subtitle'),
        act('weekForm|' + today(), 'Thêm việc', 'add', 'btn primary create'),
      ) +
      '<div class="toolbar"><div class="week">' +
      iconBtn('weekShift|-1', 'Tuần trước', 'chevron_left') +
      '<strong class="week__label">' +
      D.shortDate(dates[0]) +
      ' – ' +
      fmtDate(dates[6]) +
      '</strong>' +
      iconBtn('weekShift|1', 'Tuần sau', 'chevron_right') +
      act('view|weekDate|' + today(), 'Tuần này', '', 'btn sm') +
      '</div><span class="spacer"></span>' +
      D.searchField('weekQuery', 'Tìm theo tên…') +
      act(
        'weekEmpty',
        'Hiện người chưa có việc',
        state.view.weekShowEmpty ? 'check_box' : 'check_box_outline_blank',
        'btn sm',
      ) +
      '</div><div class="legend">' +
      kinds
        .map(([id, label, tone]) =>
          act(
            'weekFilter|' + id,
            label + ' · ' + list.filter((row) => row.kind === id).length,
            '',
            'btn sm tag--' + tone + (state.view.weekType === id ? ' selected' : ''),
          ),
        )
        .join('') +
      '</div><div class="board-wrap"><div class="board" role="table"><div class="board__head" role="row"><div class="corner" role="columnheader">Thành viên</div>' +
      columns
        .map(
          (days) =>
            '<div class="day' +
            (days.includes(today()) ? ' day--today' : '') +
            '" role="columnheader"><span class="day__name">' +
            (days.length === 2 ? 'Cuối tuần' : fmtDate(days[0], { weekday: 'short' })) +
            '</span><span class="day__date">' +
            days.map(D.shortDate).join(' – ') +
            '</span></div>',
        )
        .join('') +
      '<div class="day day--capacity" role="columnheader"><span class="day__name">Capacity</span></div></div>' +
      (cells || placeholder('Không có thành viên phù hợp.')) +
      '</div></div></div>'
    );
  }

  function room(data, id) {
    const item = byId(data, 'meetings', id);
    if (!item)
      return header('Không tìm thấy phòng họp', '', link('calendar', 'Lịch họp', 'arrow_back'));
    const joined = state.view.roomJoined;
    const active = state.view.roomOptions || {};
    const toggle = (key, label, on, off = on) =>
      iconBtn('roomToggle|' + key, label, active[key] ? on : off, active[key] ? 'selected' : '');
    const controls =
      '<div class="room-controls">' +
      toggle('mic', 'Micrô', 'mic', 'mic_off') +
      toggle('camera', 'Máy ảnh', 'videocam', 'videocam_off') +
      (joined
        ? toggle('share', 'Chia sẻ màn hình', 'screen_share', 'present_to_all') +
          toggle('chat', 'Tin nhắn cuộc họp', 'chat') +
          toggle('people', 'Người tham dự', 'group') +
          toggle('record', 'Ghi hình mô phỏng', 'radio_button_checked', 'fiber_manual_record') +
          act('roomLeave', 'Rời phòng', 'call_end', 'btn room-leave')
        : '') +
      '</div>';
    const user = person(data, data.currentUserId);
    const name = h(user.fullName);
    const scene =
      '<div class="room-video"><div class="room-video-person">' +
      avatar(user.fullName, 'lg') +
      '<strong>' +
      name +
      '</strong><small>' +
      (active.camera ? 'Camera mô phỏng' : 'Camera đang tắt') +
      '</small></div>' +
      (active.share ? chip('Đang chia sẻ màn hình mô phỏng') : '') +
      (active.record ? '<span class="room-recording">● Đang ghi mô phỏng</span>' : '') +
      '</div>';
    if (!joined)
      return (
        '<div class="room-manual lobby"><section>' +
        scene +
        controls +
        '</section><section><p class="muted">Bạn sắp tham gia</p><h1>' +
        h(item.title) +
        '</h1><p>' +
        fmtDate(item.startAt) +
        ' · ' +
        h(item.startAt.slice(11) + ' – ' + item.endAt.slice(11)) +
        '</p>' +
        '<p class="room-note">Phòng họp mô phỏng. Camera, micrô và ghi hình hoạt động ở mức giao diện.</p>' +
        field('Micrô', 'roomMic', 'default', { options: [['default', 'Micrô mặc định']] }) +
        field('Máy ảnh', 'roomCamera', 'default', { options: [['default', 'Camera mặc định']] }) +
        actionRow(
          link('calendar', 'Quay lại', 'arrow_back') +
            act('roomJoin', 'Tham gia ngay', 'videocam', 'btn primary'),
        ) +
        '</section></div>'
      );
    const messages = item.roomMessages || [];
    const side = active.chat
      ? '<aside class="room-side"><h2>Trò chuyện</h2>' +
        messages.map((row) => '<div class="item-line">' + h(row.text) + '</div>').join('') +
        act('roomMessage|' + id, 'Gửi tin nhắn', 'send', 'btn') +
        '</aside>'
      : active.people
        ? '<aside class="room-side"><h2>Người tham dự</h2>' +
          [item.organizerId, ...item.attendeeIds]
            .map((userId) => '<p>' + h(person(data, userId)?.fullName) + '</p>')
            .join('') +
          '</aside>'
        : '';
    return (
      '<div class="room-manual meeting-live"><header>' +
      icon('groups') +
      '<strong>' +
      h(item.title) +
      '</strong></header><div class="room-stage">' +
      scene +
      side +
      '</div>' +
      controls +
      '</div>'
    );
  }

  Object.assign(views, {
    profile,
    weekly,
    welcome: (data) => {
      const user = person(data, data.currentUserId);
      const dept = byId(data, 'departments', user.departmentId);
      return (
        '<div class="home"><section class="welcome"><div class="welcome__text"><h1>Chào mừng ' +
        h(user.fullName) +
        ' đến với TeamFlow!</h1></div></section></div>' +
        '<div class="card-grid">' +
        panel('<h2>Phòng ban</h2><p>' + h(dept?.name || 'Chưa có phòng ban') + '</p>') +
        panel(
          '<h2>Workspace</h2>' +
            data.workspaces
              .filter((row) => row.memberIds.includes(user.id))
              .map((row) => '<p>' + link('workspaces/' + row.id, row.name, 'group', '') + '</p>')
              .join(''),
        ) +
        panel('<h2>Phép năm</h2><p>' + h(String(user.annualAllowance ?? 12)) + ' ngày/năm</p>') +
        '</div><h2>Bắt đầu</h2>' +
        actionRow(
          [
            ['profile', 'Hồ sơ', 'person'],
            ['my-work', 'Công việc của tôi', 'checklist'],
            ['calendar', 'Lịch họp', 'event'],
            ['feed', 'Diễn đàn', 'dynamic_feed'],
          ]
            .map((args) => link(...args))
            .join(''),
        )
      );
    },
  });
  D.standalone.meetings = room;
  Object.assign(D, {
    uid,
    clean,
    audit,
    lookup,
    formError,
    switchUser,
    actionRow,
    monday,
    weeklyRows,
    capacity,
    localDateTime,
  });
  Object.assign(actions, {
    demoAccount: () => {
      const data = snapshot();
      show(
        'Chọn tài khoản demo',
        field('Tài khoản', 'id', data.currentUserId, {
          options: data.employees
            .filter((row) => !row.locked && !row.invited)
            .map((row) => [
              row.id,
              row.fullName + ' · ' + (row.role === 'Admin' ? 'Admin' : row.jobTitle || 'Nhân viên'),
            ]),
          required: true,
        }),
        { glyph: 'group', submitLabel: 'Mở TeamFlow', submit: (values) => switchUser(values.id) },
      );
    },
    profilePhoto: () =>
      show(
        'Tải ảnh đại diện',
        field('Ảnh JPG, PNG, WEBP hoặc GIF', 'photo', '', { type: 'file', required: true }),
        {
          glyph: 'upload',
          submit: async (values) => {
            const file = values.photo;
            if (
              !file.size ||
              file.size > 5 * 1024 * 1024 ||
              !/^image\/(png|jpeg|webp|gif)$/.test(file.type)
            )
              throw Error('Chọn tệp JPG, PNG, WEBP hoặc GIF tối đa 5 MB.');
            const encoded = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });
            commit((data) => {
              person(data, data.currentUserId).avatar = encoded;
            });
            refresh('Đã cập nhật ảnh đại diện.');
          },
        },
      ),
    profilePhotoRemove: () =>
      confirm(
        'Xóa ảnh đại diện?',
        'TeamFlow sẽ dùng chữ viết tắt của tên bạn.',
        () => {
          commit((data) => {
            delete person(data, data.currentUserId).avatar;
          });
          refresh('Đã xóa ảnh đại diện.');
        },
        'Xóa ảnh',
      ),
    profilePassword: () =>
      show(
        'Đổi mật khẩu',
        field('Mật khẩu mẫu hiện tại', 'current', '', { type: 'password', required: true }) +
          field('Mật khẩu mẫu mới', 'password', '', { type: 'password', required: true }) +
          field('Xác nhận mật khẩu', 'confirm', '', { type: 'password', required: true }),
        {
          glyph: 'lock',
          submit: (values) => {
            if (values.current !== 'TeamFlow123')
              throw Error('Mật khẩu hiện tại của tài khoản mẫu là TeamFlow123.');
            password(values.password);
            if (values.password !== values.confirm) throw Error('Xác nhận mật khẩu chưa khớp.');
            commit((data) => audit(data, 'Đã kiểm tra biểu mẫu đổi mật khẩu mẫu.'));
            refresh('Đã kiểm tra mật khẩu mới. Phiên demo vẫn dùng mật khẩu mẫu.');
          },
        },
      ),
    weekForm: (day, id) => weekForm(day, typeof id === 'string' ? id : ''),
    weekRemove: (id) =>
      confirm(
        'Xóa việc trong tuần?',
        'Mục này sẽ được xóa khỏi kế hoạch tuần.',
        () => {
          commit((data) => {
            data.weeklyItems = weeklyRows(data).filter(
              (row) => row.id !== id || row.userId !== data.currentUserId,
            );
          });
          refresh('Đã xóa việc.');
        },
        'Xóa việc',
      ),
    weekEmpty: () => {
      state.view.weekShowEmpty = !state.view.weekShowEmpty;
      render();
    },
    weekFilter: (value) => {
      state.view.weekType = state.view.weekType === value ? '' : value;
      render();
    },
    weekCapacity: (week, level) => {
      commit((data) => {
        const byWeek = (data.capacity ||= {});
        const people = (byWeek[week] ||= {});
        people[data.currentUserId] = people[data.currentUserId] === level ? '' : level;
      });
      refresh('Đã cập nhật capacity.');
    },
    roomToggle: (key) => {
      const options = (state.view.roomOptions ||= {});
      options[key] = !options[key];
      if (options[key] && key === 'chat') options.people = false;
      if (options[key] && key === 'people') options.chat = false;
      render();
    },
    roomJoin: () => {
      state.view.roomJoined = true;
      render();
    },
    roomLeave: () => {
      go('calendar');
    },
    roomMessage: (id) =>
      show('Tin nhắn cuộc họp', field('Nội dung', 'text', '', { required: true }), {
        submitLabel: 'Gửi',
        submit: (values) => {
          commit((data) => {
            const item = lookup(data, 'meetings', id);
            (item.roomMessages ||= []).push({
              authorId: data.currentUserId,
              text: clean(values.text, 'Tin nhắn', 2000),
            });
          });
          refresh();
        },
      }),
  });
})();
