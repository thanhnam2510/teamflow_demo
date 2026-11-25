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
    chip,
    bar,
    header,
    panel,
    placeholder,
    table,
    tabs,
    searchField,
    filter,
    stats,
    stat,
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
    audit,
    lookup,
    actionRow,
    crumbs,
  } = D;
  const { snapshot, commit, canReview } = MockApi;
  const peopleOptions = (data, people = data.employees) =>
    people.map((row) => [row.id, row.fullName]);
  const paired = (values) => values.map((value) => [value, value]);
  const validId = (value) => (typeof value === 'string' ? value : '');
  const dateField = (label, name, value = today(), required = true) =>
    field(label, name, value, { type: 'date', required });
  function access(data) {
    const user = person(data, data.currentUserId);
    const admin = user.role === 'Admin';
    const hr = admin || !!user.hr;
    const manager = data.departments.some((row) => row.managerId === user.id);
    return {
      admin,
      hr,
      manager,
      assets: admin || !!user.assetManager,
      review: admin || manager,
      offboarding: hr || manager,
    };
  }
  const ensure = (value, text = 'Bạn chưa có quyền thực hiện thao tác này.') => {
    if (!value) throw Error(text);
  };
  const addNotice = (data, userId, title, body, route, target, glyph = 'notifications') =>
    data.notifications.unshift({
      id: uid('notice'),
      userId,
      title,
      text: body,
      icon: glyph,
      route,
      target,
      date: today(),
      read: false,
    });
  D.access = access;

  function adminUsers(data) {
    const group = state.view.userGroup || 'all';
    const registered = data.employees.filter(
      (row) =>
        matches(state.view.employeeQuery, row.fullName, row.email, row.jobTitle) &&
        (group === 'all' ||
          (group === 'admins' && row.role === 'Admin') ||
          (group === 'locked' && row.locked) ||
          (group === 'invited' && row.invited) ||
          (group === 'active' && !row.locked && !row.invited)),
    );
    const page = D.paginate('employeePage', registered, 8);
    return (
      header(
        raw('nav.admin'),
        'Xem tài khoản đã đăng ký, workspace, cấp quyền và khóa tài khoản.',
        act('employeeForm', 'Thêm nhân viên', 'person_add', 'btn primary'),
      ) +
      stats([
        stat('Tài khoản đăng ký', data.employees.length, 'group', 'indigo'),
        stat(
          'Đang hoạt động',
          data.employees.filter((row) => !row.locked && !row.invited).length,
          'bolt',
          'emerald',
        ),
        stat(
          'Quản trị viên',
          data.employees.filter((row) => row.role === 'Admin').length,
          'admin_panel_settings',
          'indigo',
        ),
        stat('Bị khóa', data.employees.filter((row) => row.locked).length, 'lock', 'rose'),
      ]) +
      '<div class="toolbar">' +
      searchField('employeeQuery', 'Tìm tên hoặc email…') +
      tabs(
        'userGroup',
        [
          ['all', 'Tất cả'],
          ['active', 'Đang hoạt động'],
          ['admins', 'Quản trị'],
          ['locked', 'Bị khóa'],
          ['invited', 'Chờ kích hoạt'],
        ],
        group,
      ) +
      '</div>' +
      panel(
        table(
          ['Người dùng', 'Workspace', 'Đăng nhập bằng', 'Ngày đăng ký', 'Trạng thái'],
          page.rows.map((row) => [
            '<div class="person-cell">' +
              D.avatar(row.fullName, 'sm') +
              '<div>' +
              act('adminPerson|' + row.id, row.fullName, '', 'plain-button') +
              '<small>' +
              h(row.email) +
              '</small></div></div>',
            String(data.workspaces.filter((ws) => ws.memberIds.includes(row.id)).length),
            'Email',
            fmtDate(row.createdAt),
            chip(
              row.locked ? 'Bị khóa' : row.invited ? 'Chờ kích hoạt' : 'Hoạt động',
              row.locked ? 'rose' : row.invited ? 'amber' : 'emerald',
            ),
          ]),
        ) + page.foot,
      )
    );
  }
  function adminPerson(id) {
    const data = snapshot();
    const row = lookup(data, 'employees', id);
    const own = id === data.currentUserId;
    const workspaces = data.workspaces.filter((ws) => ws.memberIds.includes(id));
    const assets = data.assets.filter((asset) => asset.holderId === id);
    const activeTasks = data.tasks.filter(
      (task) => task.assigneeId === id && task.status !== 'Done',
    );
    const controls =
      (own
        ? ''
        : act(
            'adminToggle|' + id + '|locked',
            row.locked ? 'Mở khóa tài khoản' : 'Khóa tài khoản',
            row.locked ? 'lock_open' : 'lock',
            'btn danger',
          ) +
          act(
            'adminToggle|' + id + '|admin',
            row.role === 'Admin' ? 'Thu hồi quyền quản trị' : 'Cấp quyền quản trị',
            'admin_panel_settings',
          )) +
      act(
        'adminToggle|' + id + '|assetManager',
        row.assetManager ? 'Thu hồi quyền quản lý tài sản' : 'Cấp quyền quản lý tài sản',
        'inventory_2',
      ) +
      act(
        'adminToggle|' + id + '|hr',
        row.hr ? 'Thu hồi quyền HR / Đánh giá' : 'Cấp quyền HR / Đánh giá',
        'assignment_ind',
      ) +
      (row.invited
        ? act('inviteCopy|' + id, 'Sao chép link mời', 'content_copy') +
          act('inviteResend|' + id, 'Gửi lại lời mời mẫu', 'send')
        : '');
    show(
      row.fullName,
      '<p class="muted">' +
        h(row.email) +
        '</p>' +
        D.definitions([
          ['Phòng ban', h(byId(data, 'departments', row.departmentId)?.name || '—')],
          ['Chức danh', h(row.jobTitle || '—')],
          ['Quản trị', h(row.role)],
          ['Tài sản đang giữ', String(assets.length)],
          ['Việc đang mở', String(activeTasks.length)],
        ]) +
        '<h3>Workspace</h3>' +
        (workspaces
          .map(
            (ws) =>
              '<div class="item-line">' +
              link('workspaces/' + ws.id, ws.name, '', '') +
              chip(ws.ownerId === id ? 'Owner' : ws.roles?.[id] || 'Thành viên') +
              '</div>',
          )
          .join('') || '<p class="muted">Chưa tham gia workspace.</p>') +
        '<h3>Thao tác tài khoản</h3>' +
        actionRow(controls) +
        '<p>' +
        act('employeeForm|' + id, 'Chỉnh sửa thông tin nhân viên', 'edit', 'btn sm') +
        '</p>',
      { drawer: true, glyph: 'admin_panel_settings' },
    );
  }
  const employment = ['Nội bộ', 'Bên ngoài'];
  const levels = ['Thực tập', 'Thử việc', 'Chính thức'];
  function employeeForm(id) {
    const data = snapshot();
    const rights = access(data);
    const row = byId(data, 'employees', validId(id));
    const departments = data.departments.filter(
      (dept) => rights.admin || dept.managerId === data.currentUserId,
    );
    if (!departments.length) {
      D.showToast('Bạn chưa có quyền thêm nhân viên.', true);
      return;
    }
    show(
      row ? 'Sửa thông tin nhân viên' : 'Thêm nhân viên',
      '<div class="field-grid">' +
        field('Họ tên', 'fullName', row?.fullName, { required: true }) +
        field('Email mẫu', 'email', row?.email, {
          type: 'email',
          required: true,
          placeholder: 'ten@example.test',
        }) +
        field('Chức danh', 'jobTitle', row?.jobTitle) +
        dateField('Ngày vào làm', 'joinedAt', row?.joinedAt || today(), false) +
        field('Phòng ban', 'departmentId', row?.departmentId || departments[0]?.id, {
          options: D.options(departments),
          required: true,
        }) +
        field('Hình thức', 'employment', row?.employment || 'Nội bộ', {
          options: paired(employment),
        }) +
        field('Cấp bậc', 'level', row?.level || 'Thử việc', { options: paired(levels) }) +
        '</div><h3>Workspace</h3>' +
        data.workspaces
          .filter((ws) => rights.admin || ws.memberIds.includes(data.currentUserId))
          .map((ws) =>
            field(ws.name, 'workspace-' + ws.id, !!row && ws.memberIds.includes(row.id), {
              type: 'checkbox',
            }),
          )
          .join('') +
        (!row ? field('Đăng thông báo chào mừng', 'welcomePost', true, { type: 'checkbox' }) : '') +
        '<p class="muted">Dùng email mẫu. Lời mời sẽ tạo liên kết kích hoạt trong trình duyệt.</p>',
      {
        glyph: 'person_add',
        wide: true,
        submitLabel: row ? 'Lưu' : 'Thêm nhân viên',
        submit: (values) => {
          const found = MockApi.saveEmployee({ ...values, role: row?.role || 'Member' }, row?.id);
          commit((data) => {
            const employee = lookup(data, 'employees', found.id);
            Object.assign(employee, {
              level: values.level,
              employment: values.employment,
              joinedAt: values.joinedAt,
              createdAt: employee.createdAt || today(),
            });
            if (!row) {
              employee.invited = true;
              employee.inviteToken = uid('invite');
              employee.inviteExpires = Date.now() + 3 * 86400000;
            }
            const defaults =
              byId(data, 'departments', employee.departmentId)?.defaultWorkspaces || [];
            for (const ws of data.workspaces)
              if (
                (values['workspace-' + ws.id] || (!row && defaults.includes(ws.id))) &&
                !ws.memberIds.includes(employee.id)
              )
                ws.memberIds.push(employee.id);
            if (!row && values.welcomePost)
              data.posts.unshift({
                id: uid('post'),
                authorId: data.currentUserId,
                title: 'Chào mừng ' + employee.fullName,
                text: employee.fullName + ' đã tham gia TeamFlow.',
                date: today(),
                likes: 0,
                comments: [],
              });
            audit(
              data,
              row ? 'Đã sửa thông tin ' + employee.fullName : 'Đã mời ' + employee.fullName,
              'Tài khoản',
            );
          });
          refresh(row ? 'Đã cập nhật nhân viên.' : 'Đã tạo tài khoản và lời mời mẫu.');
          if (!row && rights.admin) adminPerson(found.id);
        },
      },
    );
  }
  Object.assign(actions, {
    adminPerson,
    employeeForm,
    adminToggle: (id, key) => {
      const row = person(snapshot(), id);
      const labels = {
        locked: row.locked ? 'Mở khóa tài khoản' : 'Khóa tài khoản',
        admin: row.role === 'Admin' ? 'Thu hồi quyền quản trị' : 'Cấp quyền quản trị',
        assetManager: row.assetManager
          ? 'Thu hồi quyền quản lý tài sản'
          : 'Cấp quyền quản lý tài sản',
        hr: row.hr ? 'Thu hồi quyền HR / Đánh giá' : 'Cấp quyền HR / Đánh giá',
      };
      confirm(
        labels[key] + '?',
        row.fullName +
          ' · ' +
          (row.locked ? 'Đang bị khóa' : 'Tài khoản mẫu') +
          '. Thao tác được ghi vào nhật ký.',
        () => {
          commit((data) => {
            ensure(access(data).admin);
            const employee = lookup(data, 'employees', id);
            if (['locked', 'admin'].includes(key) && employee.id === data.currentUserId)
              throw Error('Không thể tự khóa hoặc thu hồi quyền quản trị của chính mình.');
            if (key === 'admin') employee.role = employee.role === 'Admin' ? 'Member' : 'Admin';
            else employee[key] = !employee[key];
            audit(
              data,
              labels[key] + ' · ' + employee.fullName,
              key === 'locked' ? 'Tài khoản' : 'Phân quyền',
            );
          });
          refresh('Đã cập nhật tài khoản.');
          adminPerson(id);
        },
        'Xác nhận',
      );
    },
    inviteCopy: (id) => {
      const row = lookup(snapshot(), 'employees', id);
      const url = new URL(location.href);
      url.hash = '#/set-password/' + encodeURIComponent(row.inviteToken || '');
      show(
        'Liên kết kích hoạt mẫu',
        field('Liên kết có hiệu lực 3 ngày', 'link', url.href) +
          '<p class="muted">Chọn và sao chép địa chỉ để mở trang kích hoạt.</p>',
        { glyph: 'link' },
      );
      const input = D.dialog.querySelector('[name=link]');
      input.readOnly = true;
      input.select();
    },
    inviteResend: (id) => {
      commit((data) => {
        const user = lookup(data, 'employees', id);
        user.inviteToken = uid('invite');
        user.inviteExpires = Date.now() + 3 * 86400000;
        audit(data, 'Đã tạo lại lời mời cho ' + user.fullName, 'Tài khoản');
      });
      refresh('Đã tạo lại liên kết mẫu.');
      adminPerson(id);
    },
  });

  const offStates = {
    manager: 'Chờ quản lý',
    hr: 'Chờ HR duyệt',
    work: 'Đang bàn giao',
    done: 'Hoàn tất',
    reject: 'Bị từ chối',
    cancel: 'Đã hủy',
  };
  const terminal = [offStates.done, offStates.reject, offStates.cancel];
  const pending = [offStates.manager, offStates.hr, 'Chờ duyệt'];
  const offReasons = [
    'Nghỉ việc theo nguyện vọng',
    'Hết hạn hợp đồng',
    'Chấm dứt hợp đồng',
    'Nghỉ hưu',
    'Lý do khác',
  ];
  const defaultChecklist = () =>
    [
      ['Nhân viên', 'Bàn giao công việc đang làm'],
      ['Nhân viên', 'Bàn giao tài liệu, dữ liệu và tài khoản dùng chung'],
      ['Quản lý', 'Xác nhận đã nhận đủ công việc'],
      ['HR', 'Thu hồi tài khoản và quyền truy cập'],
      ['HR', 'Phỏng vấn nghỉ việc'],
      ['HR', 'Quyết toán lương, phép năm và các khoản khác'],
      ['HR', 'Chốt và trả sổ bảo hiểm xã hội'],
    ].map(([owner, title]) => ({ owner, title, status: 'Cần làm' }));
  const heldAssets = (data, row) =>
    data.assets.filter((asset) => asset.holderId === row.employeeId && asset.status === 'Assigned');
  const signed = (row) => Object.values(row.signatures || {}).length;
  const completeChecks = (row) =>
    row.checks.every((check) => check.done || ['Đã xong', 'Không áp dụng'].includes(check.status));
  const managerOf = (data, employeeId) => {
    const user = person(data, employeeId);
    const manager = byId(data, 'departments', user?.departmentId)?.managerId;
    return manager && manager !== employeeId ? manager : '';
  };
  const requiredSigners = (data, row) => [
    'Nhân viên',
    ...(managerOf(data, row.employeeId) ? ['Quản lý'] : []),
    'HR',
  ];
  const allowedOff = (data, row) =>
    row.employeeId === data.currentUserId || access(data).hr || canReview(data, row.employeeId);
  function offLog(row, text) {
    (row.events ||= []).push({ date: today(), text });
  }
  function offboarding(data, id) {
    const rights = access(data);
    const list = data.offboarding.filter((row) => allowedOff(data, row));
    const row = byId(data, 'offboarding', id);
    if (id)
      return row && allowedOff(data, row)
        ? offDetail(data, row, rights)
        : header('Không tìm thấy hồ sơ nghỉ việc', '', link('offboarding', 'Danh sách hồ sơ'));
    const current = state.view.offboardingTab || 'todo';
    const types = [
      ['todo', 'Cần xử lý'],
      ['pending', 'Chờ duyệt'],
      ['active', 'Đang bàn giao'],
      ['closed', 'Đã đóng'],
      ['all', 'Tất cả'],
    ];
    const includes = (row) =>
      current === 'all' ||
      (current === 'todo' && !terminal.includes(row.status)) ||
      (current === 'pending' && pending.includes(row.status)) ||
      (current === 'active' && row.status === offStates.work) ||
      (current === 'closed' && terminal.includes(row.status));
    const records = list.filter(
      (row) =>
        (!rights.offboarding || includes(row)) &&
        matches(state.view.offQuery, row.code, person(data, row.employeeId)?.fullName, row.reason),
    );
    const summary = rights.offboarding
      ? stats([
          stat(
            'Chờ duyệt',
            list.filter((row) => pending.includes(row.status)).length,
            'hourglass_top',
            'amber',
          ),
          stat(
            'Đang bàn giao',
            list.filter((row) => row.status === offStates.work).length,
            'sync_alt',
            'indigo',
          ),
          stat(
            'Khóa trong 7 ngày',
            list.filter((row) => row.status === offStates.work && row.date <= shift(today(), 7))
              .length,
            'lock_clock',
            'rose',
          ),
          stat(
            'Còn tài sản',
            list.filter((row) => !terminal.includes(row.status) && heldAssets(data, row).length)
              .length,
            'assignment_return',
            'amber',
          ),
          stat(
            'Hoàn tất trong năm',
            list.filter((row) => row.status === offStates.done).length,
            'task_alt',
            'emerald',
          ),
        ]) +
        '<div class="toolbar">' +
        tabs('offboardingTab', types, current) +
        searchField('offQuery', 'Tìm theo tên hoặc mã hồ sơ…') +
        '</div>'
      : '';
    return (
      header(
        rights.offboarding ? 'Nghỉ việc' : 'Nghỉ việc của tôi',
        'Theo dõi đơn nghỉ, bàn giao, xác nhận và thu hồi quyền truy cập.',
        rights.offboarding
          ? act('offCreate', 'Tạo hồ sơ nghỉ việc', 'person_remove', 'btn primary')
          : act('offResign', 'Xin nghỉ việc', 'outgoing_mail', 'btn primary'),
      ) +
      summary +
      panel(
        table(
          ['Nhân viên', 'Lý do', 'Ngày làm việc cuối', 'Trạng thái', 'Tiến độ'],
          records.map((row) => [
            link(
              'offboarding/' + row.id,
              person(data, row.employeeId)?.fullName || row.code,
              'badge',
              'plain-button',
            ) +
              '<small class="muted block">' +
              h(row.code) +
              '</small>',
            h(row.reason || 'Nghỉ việc theo nguyện vọng'),
            fmtDate(row.date),
            chip(row.status, terminal.includes(row.status) ? 'emerald' : 'amber'),
            row.checks.length
              ? row.checks.filter(
                  (check) =>
                    check.done || check.status === 'Không áp dụng' || check.status === 'Đã xong',
                ).length +
                '/' +
                row.checks.length
              : '—',
          ]),
          'Chưa có hồ sơ nghỉ việc.',
        ),
      )
    );
  }
  function offDetail(data, row, rights) {
    const name = person(data, row.employeeId)?.fullName;
    const own = row.employeeId === data.currentUserId;
    const isManager = !own && canReview(data, row.employeeId);
    const waiting = pending.includes(row.status);
    const live = row.status === offStates.work;
    const assets = heldAssets(data, row);
    const checklistReady = completeChecks(row);
    const locked = signed(row) > 0;
    const ready = !assets.length && checklistReady;
    const roles = requiredSigners(data, row);
    const allSigned = roles.every((role) => row.signatures?.[role]);
    const role = own
      ? 'Nhân viên'
      : managerOf(data, row.employeeId) === data.currentUserId
        ? 'Quản lý'
        : rights.hr
          ? 'HR'
          : 'Quản lý';
    const top = waiting
      ? actionRow(
          (!own && rights.hr
            ? act('offDecision|' + row.id + '|approve', 'Duyệt', 'check', 'btn primary')
            : '') +
            (!own && isManager && row.status === offStates.manager
              ? act(
                  'offDecision|' + row.id + '|forward',
                  'Đồng ý, chuyển HR',
                  'send',
                  'btn primary',
                )
              : '') +
            (!own && (rights.hr || isManager)
              ? act('offDecision|' + row.id + '|reject', 'Từ chối', 'close', 'btn danger')
              : '') +
            (own ? act('offDecision|' + row.id + '|withdraw', 'Rút lại hồ sơ', 'undo') : ''),
        )
      : live && rights.hr && !own
        ? actionRow(
            act('offDecision|' + row.id + '|cancel', 'Hủy hồ sơ', 'close', 'btn danger') +
              act('offDecision|' + row.id + '|lock', 'Khóa ngay', 'lock') +
              (allSigned && ready
                ? act('offDecision|' + row.id + '|close', 'Đóng hồ sơ', 'task_alt', 'btn primary')
                : ''),
          )
        : '';
    const info = panel(
      '<h2>Thông tin hồ sơ</h2>' +
        D.definitions([
          ['Nhân viên', h(name)],
          ['Ngày làm việc cuối', fmtDate(row.date)],
          ['Lý do', h(row.reason || '—')],
          ['Người nhận bàn giao', h(person(data, row.recipient)?.fullName || '—')],
          ['Nội dung bàn giao', h(row.note || '—')],
          ['Trạng thái', chip(row.status, 'indigo')],
        ]) +
        (live && !locked
          ? act('offNotes|' + row.id, 'Cập nhật nội dung bàn giao', 'edit', 'btn sm')
          : ''),
    );
    const checks =
      live || row.status === offStates.done
        ? panel(
            '<h2>Danh mục bàn giao</h2>' +
              table(
                ['Mục bàn giao', 'Phụ trách', 'Trạng thái', ''],
                row.checks.map((check, index) => [
                  h(check.title),
                  h(check.owner || 'HR'),
                  chip(
                    check.status || (check.done ? 'Đã xong' : 'Cần làm'),
                    check.done || check.status === 'Đã xong' ? 'emerald' : 'indigo',
                  ),
                  live && !locked && (rights.hr || role === check.owner)
                    ? actionRow(
                        act(
                          'offChecklist|' + row.id + '|' + index + '|done',
                          check.done || check.status === 'Đã xong' ? 'Bỏ đánh dấu' : 'Đã xong',
                          'check',
                          'btn sm',
                        ) +
                          act(
                            'offChecklist|' + row.id + '|' + index + '|skip',
                            'Không áp dụng',
                            '',
                            'btn sm',
                          ) +
                          (rights.hr
                            ? iconBtn(
                                'offChecklist|' + row.id + '|' + index + '|delete',
                                'Bỏ mục',
                                'delete',
                              )
                            : ''),
                      )
                    : '',
                ]),
              ) +
              (live && !locked && (rights.hr || isManager)
                ? act('offNewCheck|' + row.id, 'Thêm mục', 'add', 'btn sm')
                : ''),
          )
        : '';
    const acknowledgements =
      live || row.status === offStates.done
        ? panel(
            '<h2>Xác nhận biên bản</h2>' +
              (ready
                ? ''
                : '<p class="form-error">Cần hoàn thành danh mục và thu hồi mọi tài sản còn giữ.</p>') +
              '<div class="card-grid">' +
              roles
                .map((name) =>
                  panel(
                    '<h3>' +
                      h(name) +
                      '</h3>' +
                      (row.signatures?.[name]
                        ? chip('Đã xác nhận', 'emerald') +
                          '<p class="muted">' +
                          h(person(data, row.signatures[name].userId)?.fullName) +
                          '</p>'
                        : chip('Chưa xác nhận', 'amber') +
                          (live && ready && (role === name || (rights.hr && name === 'Nhân viên'))
                            ? '<p>' +
                              act(
                                'offSign|' + row.id + '|' + name,
                                role === name ? 'Xác nhận' : 'Ghi nhận thay nhân viên',
                                'verified',
                                'btn sm',
                              ) +
                              '</p>'
                            : '')),
                  ),
                )
                .join('') +
              '</div>' +
              '<div class="toolbar panel-tools">' +
              act(
                'offDocument|' + row.id,
                row.status === offStates.done ? 'In biên bản / lưu PDF' : 'Tải bản nháp PDF',
                'print',
              ) +
              (live && rights.hr && locked
                ? act('offDecision|' + row.id + '|reopen', 'Mở lại biên bản', 'lock_open')
                : '') +
              (live && rights.hr && ready && !allSigned
                ? act('offDecision|' + row.id + '|remind', 'Nhắc các bên xác nhận', 'notifications')
                : '') +
              '</div>',
          )
        : '';
    return (
      crumbs([
        ['offboarding', 'Nghỉ việc'],
        [null, row.code],
      ]) +
      header(name || row.code, row.code + ' · ' + row.status, top) +
      '<div class="split off-detail"><div>' +
      info +
      checks +
      acknowledgements +
      '</div><aside>' +
      panel(
        '<h2>Tài sản cần thu hồi</h2>' +
          (assets
            .map(
              (asset) =>
                '<p>' +
                link(
                  'assets/' + asset.id,
                  asset.code + ' · ' + asset.name,
                  'devices',
                  'plain-button',
                ) +
                '</p>',
            )
            .join('') || '<p class="muted">Không còn thiết bị đang giữ.</p>'),
      ) +
      panel(
        '<h2>Lịch sử hồ sơ</h2>' +
          (row.events || [])
            .map(
              (event) =>
                '<div class="item-line"><span class="stack"><strong>' +
                h(event.text) +
                '</strong><small>' +
                fmtDate(event.date) +
                '</small></span></div>',
            )
            .join(''),
      ) +
      '</aside></div>'
    );
  }
  function offForm(own) {
    const data = snapshot();
    const rights = access(data);
    const people = data.employees.filter(
      (row) =>
        row.id !== data.currentUserId && (rights.hr || canReview(data, row.id)) && !row.locked,
    );
    if (!own && !people.length) {
      D.showToast('Chưa có nhân viên thuộc phạm vi quản lý.', true);
      return;
    }
    show(
      own ? 'Gửi đơn xin nghỉ việc' : 'Tạo hồ sơ nghỉ việc',
      (!own
        ? field('Nhân viên', 'employeeId', '', {
            options: [['', 'Chọn nhân viên'], ...peopleOptions(data, people)],
            required: true,
          }) +
          field('Lý do', 'reason', offReasons[0], { options: paired(offReasons) }) +
          dateField('Ngày thông báo', 'notice')
        : '') +
        field('Ngày làm việc cuối', 'date', shift(today(), 14), {
          type: 'date',
          min: own ? today() : shift(today(), -90),
          max: shift(today(), 365),
          required: true,
        }) +
        (!own
          ? field('Người nhận bàn giao', 'recipient', '', {
              options: [['', 'Chưa chỉ định'], ...peopleOptions(data)],
            })
          : '') +
        field(own ? 'Lý do (không bắt buộc)' : 'Ghi chú', 'note', '', { type: 'textarea' }),
      {
        glyph: 'person_remove',
        submitLabel: own ? 'Gửi đơn' : 'Tạo hồ sơ',
        submit: (values) => {
          const created = commit((data) => {
            const employeeId = own ? data.currentUserId : values.employeeId;
            ensure(
              own ||
                ((rights.hr || canReview(data, employeeId)) && employeeId !== data.currentUserId),
            );
            ensure(
              !data.offboarding.some(
                (row) => row.employeeId === employeeId && !terminal.includes(row.status),
              ),
              'Nhân viên đã có hồ sơ đang mở.',
            );
            const status = own
              ? managerOf(data, employeeId)
                ? offStates.manager
                : offStates.hr
              : rights.hr
                ? offStates.work
                : offStates.hr;
            const no =
              Math.max(
                0,
                ...data.offboarding.map((row) => Number(row.code.split('-').at(-1)) || 0),
              ) + 1;
            const row = {
              id: uid('off'),
              code: 'OFF-' + String(no).padStart(4, '0'),
              employeeId,
              date: values.date,
              notice: values.notice || today(),
              status,
              reason: values.reason || offReasons[0],
              note: values.note.trim(),
              recipient: values.recipient || '',
              checks: status === offStates.work ? defaultChecklist() : [],
              events: [],
              signatures: {},
            };
            offLog(row, own ? 'Đã gửi đơn xin nghỉ việc.' : 'Đã tạo hồ sơ.');
            data.offboarding.unshift(row);
            audit(data, 'Đã tạo ' + row.code, 'Nghỉ việc');
            return row;
          });
          go('offboarding/' + created.id);
          refresh('Đã lưu hồ sơ nghỉ việc.');
        },
      },
    );
  }
  Object.assign(actions, {
    offCreate: () => offForm(false),
    offResign: () => offForm(true),
    offDecision: (id, actKey) => {
      const labels = {
        approve: 'Duyệt hồ sơ',
        forward: 'Đồng ý, chuyển HR',
        reject: 'Từ chối',
        withdraw: 'Rút lại hồ sơ',
        cancel: 'Hủy hồ sơ',
        lock: 'Khóa tài khoản ngay',
        close: 'Đóng hồ sơ',
        reopen: 'Mở lại biên bản',
        remind: 'Nhắc các bên xác nhận',
      };
      const title = labels[actKey];
      const source = lookup(snapshot(), 'offboarding', id);
      show(
        title,
        ['approve', 'forward'].includes(actKey)
          ? dateField('Ngày làm việc cuối', 'date', source.date)
          : ['reject', 'cancel'].includes(actKey)
            ? field('Lý do', 'note', '', { type: 'textarea', required: true })
            : '<p>Xác nhận thay đổi hồ sơ ' + h(source.code) + '.</p>',
        {
          glyph: 'badge',
          submitLabel: title,
          submit: (values) => {
            commit((data) => {
              const rights = access(data);
              const row = lookup(data, 'offboarding', id);
              const own = row.employeeId === data.currentUserId;
              ensure(allowedOff(data, row));
              if (actKey === 'withdraw') {
                ensure(own && pending.includes(row.status));
                row.status = offStates.cancel;
              } else if (actKey === 'forward') {
                ensure(!own && canReview(data, row.employeeId) && row.status === offStates.manager);
                row.status = offStates.hr;
                row.date = values.date;
              } else if (actKey === 'reject') {
                ensure(!own && pending.includes(row.status) && rights.offboarding);
                row.status = offStates.reject;
              } else {
                ensure(rights.hr && !own);
                if (actKey === 'approve') {
                  ensure(pending.includes(row.status));
                  row.status = offStates.work;
                  row.date = values.date;
                  row.checks = defaultChecklist();
                } else {
                  ensure(row.status === offStates.work);
                  if (actKey === 'cancel') row.status = offStates.cancel;
                  if (actKey === 'reopen') row.signatures = {};
                  if (actKey === 'lock') {
                    const employee = lookup(data, 'employees', row.employeeId);
                    ensure(
                      employee.role !== 'Admin' ||
                        data.employees.filter((user) => user.role === 'Admin' && !user.locked)
                          .length > 1,
                      'Không thể khóa Admin cuối cùng.',
                    );
                    employee.locked = true;
                  }
                  if (actKey === 'close') {
                    ensure(
                      !heldAssets(data, row).length &&
                        completeChecks(row) &&
                        requiredSigners(data, row).every((role) => row.signatures?.[role]),
                      'Cần hoàn thành bàn giao và đủ xác nhận.',
                    );
                    row.status = offStates.done;
                  }
                  if (actKey === 'remind')
                    addNotice(
                      data,
                      row.employeeId,
                      'Xác nhận biên bản bàn giao',
                      row.code,
                      'offboarding/' + row.id,
                      '',
                      'badge',
                    );
                }
              }
              offLog(row, title + (values.note ? ' · ' + values.note : ''));
              audit(data, title + ' · ' + row.code, 'Nghỉ việc');
            });
            refresh('Đã cập nhật hồ sơ nghỉ việc.');
          },
        },
      );
    },
    offNotes: (id) => {
      const data = snapshot();
      const row = lookup(data, 'offboarding', id);
      show(
        'Cập nhật nội dung bàn giao',
        field('Người nhận bàn giao', 'recipient', row.recipient, {
          options: [['', 'Chưa chỉ định'], ...peopleOptions(data)],
        }) + field('Nội dung', 'note', row.note, { type: 'textarea' }),
        {
          submit: (values) => {
            commit((data) => {
              const target = lookup(data, 'offboarding', id);
              ensure(
                target.status === offStates.work && !signed(target) && allowedOff(data, target),
              );
              Object.assign(target, values);
              offLog(target, 'Đã cập nhật nội dung bàn giao.');
            });
            refresh('Đã lưu nội dung bàn giao.');
          },
        },
      );
    },
    offNewCheck: (id) =>
      show(
        'Thêm mục bàn giao',
        field('Nội dung', 'title', '', { required: true }) +
          field('Phụ trách', 'owner', 'Nhân viên', {
            options: paired(['Nhân viên', 'Quản lý', 'HR']),
          }),
        {
          glyph: 'checklist',
          submit: (values) => {
            commit((data) => {
              const row = lookup(data, 'offboarding', id);
              ensure(
                access(data).offboarding &&
                  allowedOff(data, row) &&
                  row.status === offStates.work &&
                  !signed(row) &&
                  row.checks.length < 30,
              );
              row.checks.push({
                owner: values.owner,
                title: clean(values.title, 'Nội dung'),
                status: 'Cần làm',
              });
            });
            refresh('Đã thêm mục bàn giao.');
          },
        },
      ),
    offChecklist: (id, index, command) => {
      commit((data) => {
        const row = lookup(data, 'offboarding', id);
        const check = row.checks[Number(index)];
        const rights = access(data);
        const own = row.employeeId === data.currentUserId;
        ensure(
          row.status === offStates.work &&
            !signed(row) &&
            check &&
            (rights.hr ||
              (own && check.owner === 'Nhân viên') ||
              (canReview(data, row.employeeId) && check.owner === 'Quản lý')),
        );
        if (command === 'delete') {
          ensure(rights.hr);
          row.checks.splice(Number(index), 1);
        } else {
          check.status = command === 'skip' ? 'Không áp dụng' : check.done ? 'Cần làm' : 'Đã xong';
          check.done = check.status === 'Đã xong';
        }
        offLog(row, check.title + ' · ' + (command === 'delete' ? 'Đã bỏ mục' : check.status));
      });
      render();
    },
    offSign: (id, role) =>
      show(
        'Xác nhận biên bản bàn giao',
        '<p>Xác nhận sẽ khóa nội dung để các bên cùng ký một phiên bản.</p>' +
          field('Ghi chú', 'note', '', { type: 'textarea' }),
        {
          glyph: 'verified',
          submitLabel: 'Xác nhận',
          submit: (values) => {
            commit((data) => {
              const row = lookup(data, 'offboarding', id);
              const own = row.employeeId === data.currentUserId;
              const me = data.currentUserId;
              const rights = access(data);
              ensure(
                row.status === offStates.work &&
                  !heldAssets(data, row).length &&
                  completeChecks(row) &&
                  requiredSigners(data, row).includes(role),
              );
              ensure(
                role === 'Nhân viên'
                  ? own || rights.hr
                  : role === 'Quản lý'
                    ? managerOf(data, row.employeeId) === me
                    : rights.hr && !own,
              );
              ensure(
                !row.signatures?.[role] &&
                  !Object.values(row.signatures || {}).some((item) => item.userId === me),
                'Mỗi tài khoản chỉ xác nhận một vai.',
              );
              if (!own && role === 'Nhân viên') clean(values.note, 'Ghi chú xác nhận thay', 500);
              (row.signatures ||= {})[role] = {
                userId: me,
                note: values.note,
                at: new Date().toISOString(),
              };
              offLog(row, role + ' đã xác nhận biên bản.');
            });
            refresh('Đã ghi nhận xác nhận.');
          },
        },
      ),
    offDocument: (id) => {
      const data = snapshot();
      const row = lookup(data, 'offboarding', id);
      show(
        'Biên bản bàn giao khi nghỉ việc',
        '<div class="print-document"><h2>BIÊN BẢN BÀN GIAO KHI NGHỈ VIỆC</h2>' +
          (row.status !== offStates.done ? '<p class="tag tag--amber">BẢN NHÁP</p>' : '') +
          D.definitions([
            ['Mã hồ sơ', h(row.code)],
            ['Nhân viên', h(person(data, row.employeeId)?.fullName)],
            ['Ngày làm việc cuối', fmtDate(row.date)],
            ['Nội dung bàn giao', h(row.note || '—')],
          ]) +
          table(
            ['Danh mục', 'Phụ trách', 'Trạng thái'],
            row.checks.map((check) => [
              h(check.title),
              h(check.owner || 'HR'),
              h(check.status || 'Cần làm'),
            ]),
          ) +
          '<h3>Xác nhận</h3>' +
          requiredSigners(data, row)
            .map(
              (role) =>
                '<p>' +
                h(role) +
                ' · ' +
                h(person(data, row.signatures?.[role]?.userId)?.fullName || 'Chưa xác nhận') +
                '</p>',
            )
            .join('') +
          '</div>' +
          act('printDialog', 'In / Lưu PDF', 'print', 'btn primary'),
        { wide: true, glyph: 'badge' },
      );
    },
  });

  const trainingTabs = [
    ['mine', 'Học tập của tôi'],
    ['classes', 'Lớp học'],
    ['courses', 'Khóa đào tạo'],
    ['competencies', 'Năng lực'],
    ['matrix', 'Ma trận năng lực'],
    ['needs', 'Nhu cầu đào tạo'],
    ['certificates', 'Chứng chỉ'],
    ['dashboard', 'Báo cáo'],
  ];
  const classState = { Draft: 'Nháp', Open: 'Đang mở', Ended: 'Đã kết thúc', Cancelled: 'Đã hủy' };
  function courseList(data) {
    return (
      data.courses || [
        {
          id: 'course-security',
          title: 'Quy trình bảo mật thông tin',
          code: 'DT-001',
          pass: 70,
          attendance: 80,
          months: 12,
          description: 'Các bước bảo mật khi làm việc với tài liệu nội bộ.',
          materials: [],
        },
      ]
    );
  }
  function skillsList(data) {
    return (
      data.skills || [
        {
          id: 'skill-1',
          name: 'Bảo mật thông tin',
          required: 3,
          levels: ['Nhận biết', 'Thực hành', 'Vận dụng', 'Hướng dẫn', 'Chuyên gia'],
        },
        {
          id: 'skill-2',
          name: 'Phối hợp nhóm',
          required: 4,
          levels: ['Nhận biết', 'Thực hành', 'Vận dụng', 'Hướng dẫn', 'Chuyên gia'],
        },
      ]
    );
  }
  const linkedCourse = (data, row) =>
    courseList(data).find((course) => course.id === (row.courseId || 'course-security'));
  const enrollments = (row) =>
    row.enrollments || (row.enrolled ? [{ employeeId: 'lan', result: '', attendance: {} }] : []);
  const nextClass = (row) => row.lessons?.[0]?.date || row.date;
  function courseCard(data, course, rights) {
    return panel(
      chip(course.code, 'indigo') +
        '<h3>' +
        h(course.title) +
        '</h3><p class="muted">' +
        h(course.description || '') +
        '</p><p>Điểm đạt ' +
        course.pass +
        ' · Chuyên cần ' +
        course.attendance +
        '%</p>' +
        actionRow(
          act('courseDetail|' + course.id, 'Tài liệu', 'folder_open', 'btn sm') +
            (rights.hr ? iconBtn('courseForm|' + course.id, 'Sửa khóa đào tạo', 'edit') : ''),
        ),
    );
  }
  function classCard(data, row) {
    const course = linkedCourse(data, row);
    return panel(
      chip(classState[row.status] || row.status, row.status === 'Open' ? 'emerald' : 'indigo') +
        '<h3>' +
        h(row.title) +
        '</h3><p class="muted">' +
        h(course?.title || 'Khóa đào tạo') +
        ' · ' +
        fmtDate(nextClass(row)) +
        '</p><p>' +
        enrollments(row).length +
        '/' +
        (row.seats || 30) +
        ' học viên</p>' +
        link('training/sessions/' + row.id, 'Chi tiết', 'school', 'btn sm'),
    );
  }
  function skillCells(data, employeeId) {
    return skillsList(data).map((skill) => {
      const score =
        data.skillScores?.find((row) => row.employeeId === employeeId && row.skillId === skill.id)
          ?.score || 0;
      return [skill, score];
    });
  }
  const skillDots = (score) =>
    '<span class="skill-dots" aria-label="' +
    score +
    ' trên 5">' +
    Array.from(
      { length: 5 },
      (_, index) => '<i class="' + (score > index ? 'filled' : '') + '"></i>',
    ).join('') +
    '</span>';
  function certificateStatus(row) {
    if (row.revoked) return 'Thu hồi';
    if (!row.verified) return 'Chờ xác minh';
    if (row.expires && row.expires < today()) return 'Hết hạn';
    if (row.expires && row.expires <= shift(today(), 30)) return 'Sắp hết hạn';
    return 'Còn hiệu lực';
  }
  function training(data, section, id) {
    if (section === 'sessions') return trainingSession(data, id);
    if (section === 'people') return trainingPerson(data, id);
    const rights = access(data);
    const allowedTabs = trainingTabs.filter(
      ([key]) => !['matrix', 'needs', 'dashboard'].includes(key) || rights.hr || rights.manager,
    );
    const selected = allowedTabs.some(([key]) => key === state.view.trainingTab)
      ? state.view.trainingTab
      : 'mine';
    const training = data.training;
    const courses = courseList(data);
    const certificates = (data.certificates || []).filter(
      (row) => rights.hr || row.employeeId === data.currentUserId,
    );
    const needs = (data.trainingNeeds || []).filter(
      (row) => rights.hr || canReview(data, row.employeeId),
    );
    const controls =
      selected === 'courses' && rights.hr
        ? act('courseForm', 'Thêm khóa', 'add', 'btn primary')
        : selected === 'classes' && rights.hr
          ? act('classForm', 'Mở lớp', 'add', 'btn primary')
          : selected === 'competencies' && rights.hr
            ? act('skillForm', 'Thêm năng lực', 'add', 'btn primary')
            : selected === 'needs'
              ? act('needForm', 'Nhu cầu đào tạo mới', 'assignment_add', 'btn primary')
              : selected === 'certificates'
                ? act('certForm', 'Thêm chứng chỉ', 'add', 'btn primary')
                : selected === 'dashboard'
                  ? act('trainingExport', 'Xuất CSV', 'download')
                  : '';
    let body;
    if (selected === 'classes')
      body =
        '<div class="card-grid">' + training.map((row) => classCard(data, row)).join('') + '</div>';
    if (selected === 'courses')
      body =
        '<div class="card-grid">' +
        courses.map((row) => courseCard(data, row, rights)).join('') +
        '</div>';
    if (selected === 'competencies')
      body =
        '<div class="split">' +
        panel(
          '<h2>Thư viện năng lực</h2>' +
            table(
              ['Năng lực', 'Mức yêu cầu', ''],
              skillsList(data).map((row) => [
                h(row.name),
                h(row.required + '/5'),
                rights.hr ? iconBtn('skillForm|' + row.id, 'Sửa năng lực', 'edit') : '',
              ]),
            ),
        ) +
        panel(
          '<h2>Yêu cầu theo chức danh</h2>' +
            [...new Set(data.employees.map((row) => row.jobTitle).filter(Boolean))]
              .map(
                (title) =>
                  '<div class="item-line"><strong>' +
                  h(title) +
                  '</strong>' +
                  (rights.hr
                    ? act(
                        'jobRequirements|' + encodeURIComponent(title),
                        'Cấu hình',
                        'settings',
                        'btn sm',
                      )
                    : '') +
                  '</div>',
              )
              .join(''),
        ) +
        '</div>';
    if (selected === 'matrix')
      body = panel(
        table(
          ['Nhân viên', ...skillsList(data).map((row) => row.name), ''],
          data.employees
            .filter((row) => rights.hr || canReview(data, row.id))
            .map((row) => [
              link('training/people/' + row.id, row.fullName, 'person', 'plain-button'),
              ...skillCells(data, row.id).map(([skill, score]) =>
                chip(
                  score +
                    '/' +
                    (data.jobRequirements?.[row.jobTitle]?.[skill.id] ?? skill.required),
                  score >= skill.required ? 'emerald' : 'amber',
                ),
              ),
              act('skillAssess|' + row.id, 'Đánh giá năng lực', 'edit', 'btn sm'),
            ]),
        ),
      );
    if (selected === 'needs')
      body = panel(
        table(
          ['Nhân viên', 'Khóa đào tạo', 'Hạn', 'Trạng thái', ''],
          needs.map((row) => [
            h(person(data, row.employeeId)?.fullName),
            h(courses.find((course) => course.id === row.courseId)?.title),
            fmtDate(row.due),
            chip(row.status, 'indigo'),
            row.status === 'Chờ xếp lớp'
              ? actionRow(
                  act('needAssign|' + row.id, 'Xếp lớp', 'school', 'btn sm') +
                    iconBtn('needCancel|' + row.id, 'Hủy nhu cầu', 'close'),
                )
              : '',
          ]),
          'Chưa có nhu cầu đào tạo.',
        ),
      );
    if (selected === 'certificates')
      body = panel(
        table(
          ['Người giữ', 'Chứng chỉ', 'Ngày cấp', 'Hết hạn', 'Trạng thái', ''],
          certificates.map((row) => [
            h(person(data, row.employeeId)?.fullName),
            h(row.title),
            fmtDate(row.issued),
            fmtDate(row.expires),
            chip(certificateStatus(row), row.verified ? 'emerald' : 'amber'),
            actionRow(
              row.file ? act('certEvidence|' + row.id, 'Minh chứng', 'description', 'btn sm') : '',
            ) +
              actionRow(
                !row.verified && !row.revoked && rights.hr
                  ? act('certState|' + row.id + '|verify', 'Xác minh', 'verified', 'btn sm')
                  : '',
              ) +
              (row.verified && !row.revoked && rights.hr
                ? act('certState|' + row.id + '|revoke', 'Thu hồi', 'close', 'btn sm danger')
                : '') +
              (!row.verified && !row.revoked && row.employeeId === data.currentUserId
                ? iconBtn('certForm|' + row.id, 'Sửa chứng chỉ', 'edit') +
                  iconBtn('certState|' + row.id + '|delete', 'Xóa chứng chỉ', 'delete')
                : ''),
          ]),
          'Chưa có chứng chỉ.',
        ),
      );
    if (selected === 'dashboard')
      body =
        stats([
          stat('Khóa đào tạo', courses.length, 'school', 'indigo'),
          stat('Lớp học', training.length, 'event', 'indigo'),
          stat(
            'Lượt ghi danh',
            training.reduce((total, row) => total + enrollments(row).length, 0),
            'people',
            'emerald',
          ),
          stat('Chứng chỉ', certificates.length, 'workspace_premium', 'emerald'),
        ]) +
        '<div class="toolbar">' +
        filter('trainingDept', 'Phòng ban', [
          ['', 'Tất cả phòng ban'],
          ...D.options(data.departments),
        ]) +
        '</div>' +
        panel(
          '<h2>Theo phòng ban</h2>' +
            table(
              ['Phòng ban', 'Nhân viên', 'Lượt ghi danh', 'Chứng chỉ'],
              data.departments
                .filter((row) => !state.view.trainingDept || row.id === state.view.trainingDept)
                .map((row) => {
                  const ids = data.employees
                    .filter((employee) => employee.departmentId === row.id)
                    .map((employee) => employee.id);
                  return [
                    h(row.name),
                    String(ids.length),
                    String(
                      training
                        .flatMap(enrollments)
                        .filter((entry) => ids.includes(entry.employeeId)).length,
                    ),
                    String(certificates.filter((cert) => ids.includes(cert.employeeId)).length),
                  ];
                }),
            ),
        );
    if (selected === 'mine') {
      const list = training.filter((row) =>
        enrollments(row).some((entry) => entry.employeeId === data.currentUserId),
      );
      const owned = certificates.filter((row) => row.employeeId === data.currentUserId);
      const myNeeds = (data.trainingNeeds || []).filter(
        (row) => row.employeeId === data.currentUserId,
      );
      const skills = skillCells(data, data.currentUserId);
      body =
        stats([
          stat(
            'Khoảng cách năng lực',
            skills.reduce((sum, [skill, score]) => sum + Math.max(skill.required - score, 0), 0),
            'psychology',
            'rose',
          ),
          stat(
            'Lớp sắp tới',
            list.filter((row) => row.status === 'Open').length,
            'event_available',
            'indigo',
          ),
          stat('Cần học', myNeeds.length, 'assignment', 'amber'),
          stat('Chứng chỉ', owned.length, 'workspace_premium', 'emerald'),
        ]) +
        '<div class="split">' +
        panel(
          '<h2>Năng lực của tôi</h2>' +
            skills
              .map(
                ([skill, score]) =>
                  '<div class="item-line"><strong>' +
                  h(skill.name) +
                  '</strong>' +
                  skillDots(score) +
                  chip(
                    score >= skill.required ? 'Đạt' : 'Còn thiếu ' + (skill.required - score),
                    score >= skill.required ? 'emerald' : 'amber',
                  ) +
                  '</div>',
              )
              .join(''),
        ) +
        panel(
          '<h2>Lớp của tôi</h2>' +
            (list
              .map(
                (row) =>
                  '<p>' +
                  link('training/sessions/' + row.id, row.title, 'school', 'plain-button') +
                  '</p>',
              )
              .join('') || '<p class="muted">Chưa đăng ký lớp học.</p>'),
        ) +
        '</div><h2>Lớp đang nhận đăng ký</h2><div class="card-grid open-classes">' +
        training
          .filter((row) => row.status === 'Open' && row.selfRegister !== false)
          .map((row) => classCard(data, row))
          .join('') +
        '</div>';
    }
    return (
      '<div class="training-manual">' +
      header(raw('training.title'), raw('training.subtitle'), controls) +
      '<div class="toolbar pill-tabs">' +
      tabs('trainingTab', allowedTabs, selected) +
      '</div>' +
      body +
      '</div>'
    );
  }
  function trainingPerson(data, id) {
    const employee = person(data, id);
    if (!employee) return header('Không tìm thấy hồ sơ năng lực', '', link('training', 'Đào tạo'));
    const rights = access(data);
    return (
      crumbs([
        ['training', 'Đào tạo và năng lực'],
        [null, employee.fullName],
      ]) +
      header(
        employee.fullName,
        employee.jobTitle,
        id !== data.currentUserId && (rights.hr || canReview(data, id))
          ? act('skillAssess|' + id, 'Đánh giá năng lực', 'edit', 'btn primary')
          : '',
      ) +
      panel(
        '<h2>Năng lực</h2>' +
          table(
            ['Năng lực', 'Cấp hiện tại', 'Yêu cầu'],
            skillCells(data, id).map(([skill, score]) => [
              h(skill.name),
              skillDots(score),
              String(skill.required),
            ]),
          ),
      ) +
      panel(
        '<h2>Lịch sử đánh giá</h2>' +
          table(
            ['Ngày', 'Người đánh giá', 'Cấp', 'Nhận xét'],
            (data.skillHistory || [])
              .filter((row) => row.employeeId === id)
              .map((row) => [
                fmtDate(row.date),
                h(person(data, row.assessor)?.fullName),
                h(String(row.score)),
                h(row.note),
              ]),
            'Chưa có lần đánh giá.',
          ),
      )
    );
  }
  function trainingSession(data, id) {
    const row = byId(data, 'training', id);
    if (!row) return header('Không tìm thấy lớp học', '', link('training', 'Đào tạo'));
    const course = linkedCourse(data, row);
    const rights = access(data);
    const manager = rights.hr || row.trainerId === data.currentUserId;
    const list = enrollments(row);
    const own = list.find((entry) => entry.employeeId === data.currentUserId);
    const lessons = row.lessons || [
      { id: 'lesson-seed', date: row.date, time: '09:00', end: '11:00' },
    ];
    const top =
      actionRow(
        manager && row.status === 'Draft'
          ? act('classState|' + id + '|Open', 'Mở lớp', 'school', 'btn primary')
          : manager && row.status === 'Open'
            ? act('classState|' + id + '|Ended', 'Kết thúc lớp', 'task_alt', 'btn primary')
            : '',
      ) +
      (manager && ['Draft', 'Open'].includes(row.status)
        ? act('classState|' + id + '|Cancelled', 'Hủy lớp', 'close', 'btn danger')
        : '') +
      (row.status === 'Open' && (own || row.selfRegister !== false)
        ? act('classEnroll|' + id, own ? 'Hủy đăng ký' : 'Đăng ký', 'school')
        : '');
    const info = panel(
      '<h2>Thông tin lớp</h2>' +
        D.definitions([
          ['Khóa', h(course?.title)],
          ['Giảng viên', h(person(data, row.trainerId)?.fullName || row.trainerName || '—')],
          ['Sĩ số', list.length + '/' + (row.seats || 30)],
          ['Trạng thái', chip(classState[row.status], 'indigo')],
          ['Điểm đạt', String(course?.pass || 70)],
          ['Chuyên cần tối thiểu', (course?.attendance || 80) + '%'],
        ]) +
        '<h3>Buổi học</h3>' +
        lessons
          .map(
            (lesson) =>
              '<p>' +
              fmtDate(lesson.date) +
              ' · ' +
              h(lesson.time + '–' + lesson.end) +
              (row.mode === 'teamflow' && (own || manager)
                ? ' ' +
                  act('classRoom|' + id + '|' + lesson.id, 'Vào phòng học', 'videocam', 'btn sm')
                : '') +
              (row.mode === 'external' && /^https?:\/\//i.test(row.externalUrl || '')
                ? ' <a href="' +
                  h(row.externalUrl) +
                  '" target="_blank" rel="noopener">Link ngoài</a>'
                : '') +
              '</p>',
          )
          .join(''),
    );
    const learners = panel(
      '<div class="toolbar"><strong>Học viên (' +
        list.length +
        ')</strong><span class="spacer"></span>' +
        (manager && row.status === 'Open'
          ? act('classAssign|' + id, 'Ghi danh', 'person_add', 'btn sm primary')
          : '') +
        '</div>' +
        table(
          ['Học viên', 'Điểm danh', 'Điểm', 'Kết quả', ''],
          (manager ? list : list.filter((item) => item.employeeId === data.currentUserId)).map(
            (entry) => [
              h(person(data, entry.employeeId)?.fullName),
              String(Object.keys(entry.attendance || {}).length) + '/' + lessons.length,
              h(entry.score ?? '—'),
              chip(entry.result || 'Chưa nhập', entry.result === 'Đạt' ? 'emerald' : 'indigo'),
              manager && row.status === 'Open'
                ? act(
                    'classAttendance|' + id + '|' + entry.employeeId,
                    'Điểm danh / kết quả',
                    'fact_check',
                    'btn sm',
                  )
                : '',
            ],
          ),
          'Chưa có học viên.',
        ),
    );
    return (
      crumbs([
        ['training', 'Đào tạo và năng lực'],
        [null, row.title],
      ]) +
      header(row.title, h(course?.code || ''), top) +
      '<div class="split">' +
      info +
      learners +
      '</div>'
    );
  }
  function classForm() {
    const data = snapshot();
    show(
      'Mở lớp',
      '<div class="field-grid">' +
        field('Khóa đào tạo', 'courseId', courseList(data)[0]?.id, {
          options: courseList(data).map((row) => [row.id, row.title]),
          required: true,
        }) +
        field('Tên lớp', 'title', '', { required: true }) +
        field('Giảng viên', 'trainerId', '', {
          options: [['', 'Giảng viên ngoài'], ...peopleOptions(data)],
        }) +
        field('Tên giảng viên bên ngoài', 'trainerName', '') +
        field('Sĩ số', 'seats', 30, { type: 'number', min: 1, max: 500, required: true }) +
        dateField('Hạn đăng ký', 'deadline', '', false) +
        field('Hình thức phòng', 'mode', 'teamflow', {
          options: [
            ['teamflow', 'Phòng họp TeamFlow'],
            ['external', 'Link ngoài'],
            ['inperson', 'Học trực tiếp'],
          ],
        }) +
        field('Link học ngoài', 'externalUrl', '', { type: 'url' }) +
        '</div>' +
        field('Cho phép tự đăng ký', 'selfRegister', true, { type: 'checkbox' }) +
        '<h3>Các buổi học</h3><div id="class-lessons"></div>' +
        '<button type="button" class="btn sm" id="add-class-lesson">Thêm buổi</button>',
      {
        glyph: 'school',
        wide: true,
        submitLabel: 'Tạo lớp nháp',
        submit: (values, form) => {
          const lessons = [...form.querySelectorAll('[data-lesson]')].map((node, i) => ({
            id: uid('lesson'),
            date: values['date' + i],
            time: values['time' + i],
            end: values['end' + i],
          }));
          ensure(
            lessons.every((row) => row.time < row.end),
            'Giờ kết thúc buổi học phải sau giờ bắt đầu.',
          );
          ensure(
            !lessons.some((a, i) =>
              lessons.some(
                (b, j) => i < j && a.date === b.date && a.time < b.end && a.end > b.time,
              ),
            ),
            'Các buổi học không được trùng giờ.',
          );
          ensure(values.trainerId || values.trainerName.trim(), 'Chọn hoặc nhập tên giảng viên.');
          ensure(
            values.mode !== 'external' || /^https?:\/\//i.test(values.externalUrl),
            'Nhập liên kết HTTP hoặc HTTPS của lớp.',
          );
          const item = commit((data) => {
            ensure(access(data).hr);
            const row = {
              ...values,
              title: clean(values.title, 'Tên lớp'),
              id: uid('training'),
              status: 'Draft',
              seats: Number(values.seats),
              selfRegister: !!values.selfRegister,
              lessons,
              date: lessons[0].date,
              enrollments: [],
            };
            data.training.unshift(row);
            return row;
          });
          go('training/sessions/' + item.id);
          refresh('Đã tạo lớp nháp.');
        },
      },
    );
    const container = D.dialog.querySelector('#class-lessons');
    function add() {
      const index = container.children.length;
      if (index >= 30) return;
      container.insertAdjacentHTML(
        'beforeend',
        '<div data-lesson class="field-grid">' +
          dateField('Ngày học', 'date' + index, shift(today(), index + 1)) +
          field('Bắt đầu', 'time' + index, '09:00', { type: 'time', required: true }) +
          field('Kết thúc', 'end' + index, '11:00', { type: 'time', required: true }) +
          '</div>',
      );
    }
    add();
    D.dialog.querySelector('#add-class-lesson').onclick = add;
  }
  Object.assign(actions, {
    courseForm: (id) => {
      const row = courseList(snapshot()).find((course) => course.id === validId(id));
      show(
        row ? 'Sửa khóa đào tạo' : 'Thêm khóa đào tạo',
        field('Tên khóa', 'title', row?.title, { required: true }) +
          field('Mô tả', 'description', row?.description, { type: 'textarea' }) +
          '<div class="field-grid">' +
          field('Điểm đạt / 100', 'pass', row?.pass ?? 70, {
            type: 'number',
            min: 0,
            max: 100,
            required: true,
          }) +
          field('Chuyên cần tối thiểu (%)', 'attendance', row?.attendance ?? 80, {
            type: 'number',
            min: 0,
            max: 100,
            required: true,
          }) +
          field('Hiệu lực chứng chỉ (tháng)', 'months', row?.months ?? 12, {
            type: 'number',
            min: 0,
            max: 120,
          }) +
          field('Chu kỳ học lại (tháng)', 'repeat', row?.repeat || '', { type: 'number', min: 1 }) +
          '</div>' +
          field('Giới hạn workspace', 'workspaceId', row?.workspaceId, {
            options: [['', 'Toàn công ty'], ...D.options(snapshot().workspaces)],
          }),
        {
          glyph: 'school',
          submit: (values) => {
            commit((data) => {
              ensure(access(data).hr);
              const rows = (data.courses ||= courseList(data));
              const patch = {
                ...values,
                title: clean(values.title, 'Tên khóa'),
                pass: Number(values.pass),
                attendance: Number(values.attendance),
                months: Number(values.months),
              };
              if (row)
                Object.assign(
                  rows.find((item) => item.id === row.id),
                  patch,
                );
              else
                rows.unshift({
                  ...patch,
                  id: uid('course'),
                  code: 'DT-' + String(rows.length + 1).padStart(3, '0'),
                  materials: [],
                });
            });
            refresh('Đã lưu khóa đào tạo.');
          },
        },
      );
    },
    courseDetail: (id) => {
      const data = snapshot();
      const row = courseList(data).find((item) => item.id === id);
      if (!row) return;
      show(
        row.code + ' · ' + row.title,
        '<p>' +
          h(row.description || '') +
          '</p><h3>Tài liệu khóa</h3>' +
          (row.materials || [])
            .map(
              (item) =>
                '<div class="item-line"><a href="' +
                h(item.url) +
                '" target="_blank" rel="noopener">' +
                h(item.title) +
                '</a></div>',
            )
            .join('') +
          (access(data).hr
            ? '<p>' + act('materialForm|' + id, 'Thêm tài liệu', 'add', 'btn sm') + '</p>'
            : ''),
        { drawer: true, glyph: 'school' },
      );
    },
    materialForm: (id) =>
      show(
        'Thêm tài liệu đào tạo',
        field('Tên tài liệu', 'title', '', { required: true }) +
          field('Địa chỉ liên kết', 'url', '', { type: 'url', required: true }),
        {
          glyph: 'link',
          submit: (values) => {
            ensure(/^https?:\/\//i.test(values.url), 'Dùng liên kết HTTP hoặc HTTPS.');
            commit((data) => {
              ensure(access(data).hr);
              const row = (data.courses ||= courseList(data)).find((course) => course.id === id);
              (row.materials ||= []).push({
                title: clean(values.title, 'Tên tài liệu'),
                url: values.url,
              });
            });
            actions.courseDetail(id);
          },
        },
      ),
    classForm,
    classState: (id, next) => {
      const title = { Open: 'Mở lớp', Ended: 'Kết thúc lớp', Cancelled: 'Hủy lớp' }[next];
      confirm(
        title + '?',
        'Thao tác sẽ cập nhật tình trạng lớp học.',
        () => {
          commit((data) => {
            const row = lookup(data, 'training', id);
            ensure(access(data).hr || row.trainerId === data.currentUserId);
            ensure(
              next === 'Open'
                ? row.status === 'Draft'
                : next === 'Ended'
                  ? row.status === 'Open'
                  : ['Open', 'Draft'].includes(row.status),
            );
            if (next === 'Ended')
              ensure(
                enrollments(row).every((entry) => entry.result),
                'Mọi học viên cần có kết quả trước khi kết thúc.',
              );
            row.status = next;
            audit(data, title + ' · ' + row.title, 'Đào tạo');
          });
          refresh('Đã cập nhật lớp học.');
        },
        title,
      );
    },
    classEnroll: (id) => {
      commit((data) => {
        const row = lookup(data, 'training', id);
        ensure(row.status === 'Open' && row.selfRegister !== false, 'Lớp chưa mở cho tự đăng ký.');
        const list = (row.enrollments ||= enrollments(row));
        const at = list.findIndex((entry) => entry.employeeId === data.currentUserId);
        if (at >= 0) {
          ensure(nextClass(row) >= today(), 'Buổi học đã bắt đầu.');
          list.splice(at, 1);
        } else {
          ensure(
            (row.deadline || nextClass(row)) >= today() && list.length < (row.seats || 30),
            'Lớp đã hết hạn đăng ký hoặc đã đủ chỗ.',
          );
          list.push({ employeeId: data.currentUserId, attendance: {}, result: '' });
        }
      });
      refresh('Đã cập nhật đăng ký.');
    },
    classAssign: (id) => {
      const data = snapshot();
      const row = lookup(data, 'training', id);
      const list = peopleOptions(
        data,
        data.employees.filter(
          (employee) => !enrollments(row).some((entry) => entry.employeeId === employee.id),
        ),
      );
      show(
        'Ghi danh học viên',
        field('Nhân viên', 'employeeId', '', {
          options: [['', 'Chọn nhân viên'], ...list],
          required: true,
        }),
        {
          glyph: 'person_add',
          submit: (values) => {
            commit((data) => {
              const row = lookup(data, 'training', id);
              ensure(
                (access(data).hr || row.trainerId === data.currentUserId) && row.status === 'Open',
              );
              const list = (row.enrollments ||= enrollments(row));
              ensure(list.length < (row.seats || 30), 'Lớp đã đủ chỗ.');
              if (!list.some((entry) => entry.employeeId === values.employeeId))
                list.push({ employeeId: values.employeeId, attendance: {}, result: '' });
            });
            refresh('Đã ghi danh học viên.');
          },
        },
      );
    },
    classAttendance: (id, employeeId) => {
      const data = snapshot();
      const row = lookup(data, 'training', id);
      const entry = enrollments(row).find((item) => item.employeeId === employeeId);
      const lessons = row.lessons || [{ id: 'lesson-seed', date: row.date }];
      const choices = [
        ['', 'Chưa điểm danh'],
        ...paired(['Có mặt', 'Đi muộn', 'Vắng', 'Vắng có phép']),
      ];
      show(
        'Điểm danh và kết quả · ' + person(data, employeeId).fullName,
        lessons
          .map((lesson) =>
            field(
              'Buổi ' + fmtDate(lesson.date),
              'lesson-' + lesson.id,
              entry.attendance?.[lesson.id] || '',
              { options: choices },
            ),
          )
          .join('') +
          field('Điểm', 'score', entry.score ?? '', { type: 'number', min: 0, max: 100 }) +
          field('Kết quả', 'result', entry.result || '', {
            options: [['', 'Chưa nhập'], ...paired(['Đạt', 'Không đạt'])],
          }),
        {
          glyph: 'fact_check',
          submit: (values) => {
            commit((data) => {
              const row = lookup(data, 'training', id);
              ensure(
                (access(data).hr || row.trainerId === data.currentUserId) && row.status === 'Open',
              );
              const entry = (row.enrollments ||= enrollments(row)).find(
                (item) => item.employeeId === employeeId,
              );
              ensure(entry, 'Không tìm thấy học viên.');
              const attendance = Object.fromEntries(
                lessons
                  .filter((lesson) => values['lesson-' + lesson.id])
                  .map((lesson) => [lesson.id, values['lesson-' + lesson.id]]),
              );
              const course = linkedCourse(data, row);
              const percent =
                (Object.values(attendance).filter((value) => ['Có mặt', 'Đi muộn'].includes(value))
                  .length *
                  100) /
                lessons.length;
              if (values.result === 'Đạt')
                ensure(
                  values.score !== '' &&
                    Number(values.score) >= (course?.pass || 70) &&
                    percent >= (course?.attendance || 80),
                  'Điểm hoặc chuyên cần chưa đạt mức yêu cầu.',
                );
              Object.assign(entry, {
                attendance,
                score: values.score === '' ? null : Number(values.score),
                result: values.result,
              });
              if (
                values.result === 'Đạt' &&
                course?.months &&
                !(data.certificates || []).some(
                  (item) => item.sessionId === id && item.employeeId === employeeId,
                )
              ) {
                (data.certificates ||= []).push({
                  id: uid('cert'),
                  sessionId: id,
                  employeeId,
                  title: course.code + ' · ' + course.title,
                  issued: today(),
                  expires: shift(today(), course.months * 30),
                  verified: true,
                });
              }
              const need = (data.trainingNeeds || []).find(
                (item) => item.employeeId === employeeId && item.sessionId === id,
              );
              if (need && values.result)
                need.status = values.result === 'Đạt' ? 'Hoàn thành' : 'Chờ xếp lớp';
              if (values.result)
                addNotice(
                  data,
                  employeeId,
                  'Kết quả đào tạo',
                  row.title + ' · ' + values.result,
                  'training/sessions/' + id,
                  '',
                  'school',
                );
            });
            refresh('Đã lưu điểm danh và kết quả.');
          },
        },
      );
    },
    classRoom: (id, lessonId) => {
      const result = commit((data) => {
        const row = lookup(data, 'training', id);
        const lesson = row.lessons?.find((item) => item.id === lessonId);
        ensure(lesson, 'Buổi học chưa được tạo.');
        const roomKey = 'room-' + lesson.id;
        if (!byId(data, 'meetings', roomKey))
          data.meetings.push({
            id: roomKey,
            title: row.title,
            organizerId: row.trainerId || data.currentUserId,
            workspaceId: data.workspaces[0].id,
            startAt: lesson.date + 'T' + lesson.time,
            endAt: lesson.date + 'T' + lesson.end,
            attendeeIds: enrollments(row).map((entry) => entry.employeeId),
            response: 'Accepted',
            description: 'Phòng học TeamFlow mẫu',
          });
        return roomKey;
      });
      go('meetings/' + result + '/room');
    },
    skillForm: (id) => {
      const row = skillsList(snapshot()).find((item) => item.id === validId(id));
      show(
        row ? 'Sửa năng lực' : 'Thêm năng lực',
        field('Tên năng lực', 'name', row?.name, { required: true }) +
          field('Mức yêu cầu mặc định', 'required', row?.required || 3, {
            type: 'number',
            min: 1,
            max: 5,
            required: true,
          }) +
          Array.from({ length: 5 }, (_, i) =>
            field('Mô tả cấp ' + (i + 1), 'level' + i, row?.levels?.[i] || '', { required: true }),
          ).join(''),
        {
          glyph: 'psychology',
          submit: (values) => {
            commit((data) => {
              ensure(access(data).hr);
              const rows = (data.skills ||= skillsList(data));
              const patch = {
                name: clean(values.name, 'Tên năng lực'),
                required: Number(values.required),
                levels: Array.from({ length: 5 }, (_, i) => values['level' + i]),
              };
              if (row)
                Object.assign(
                  rows.find((item) => item.id === row.id),
                  patch,
                );
              else rows.push({ ...patch, id: uid('skill') });
            });
            refresh('Đã lưu năng lực.');
          },
        },
      );
    },
    jobRequirements: (encoded) => {
      const title = decodeURIComponent(encoded);
      const data = snapshot();
      show(
        'Yêu cầu năng lực · ' + title,
        skillsList(data)
          .map((skill) =>
            field(
              skill.name,
              skill.id,
              data.jobRequirements?.[title]?.[skill.id] ?? skill.required,
              {
                type: 'number',
                min: 0,
                max: 5,
                required: true,
              },
            ),
          )
          .join(''),
        {
          glyph: 'badge',
          submit: (values) => {
            commit((data) => {
              ensure(access(data).hr);
              (data.jobRequirements ||= {})[title] = Object.fromEntries(
                Object.entries(values).map(([key, value]) => [key, Number(value)]),
              );
            });
            refresh('Đã cập nhật yêu cầu năng lực.');
          },
        },
      );
    },
    skillAssess: (id) => {
      const data = snapshot();
      const name = person(data, id)?.fullName;
      show(
        'Đánh giá năng lực · ' + name,
        field('Năng lực', 'skillId', '', {
          options: [['', 'Chọn năng lực'], ...D.options(skillsList(data))],
          required: true,
        }) +
          field('Cấp hiện tại', 'score', 3, { type: 'number', min: 1, max: 5, required: true }) +
          field('Nhận xét', 'note', '', { type: 'textarea' }),
        {
          glyph: 'psychology',
          submit: (values) => {
            commit((data) => {
              ensure(
                id !== data.currentUserId && (access(data).hr || canReview(data, id)),
                'Bạn không thể tự đánh giá năng lực của mình.',
              );
              const changed = {
                employeeId: id,
                skillId: values.skillId,
                score: Number(values.score),
                note: values.note,
                assessor: data.currentUserId,
                date: today(),
              };
              const scores = (data.skillScores ||= []);
              const previous = scores.find(
                (row) => row.employeeId === id && row.skillId === values.skillId,
              );
              if (previous) Object.assign(previous, changed);
              else scores.push(changed);
              (data.skillHistory ||= []).unshift(changed);
            });
            refresh('Đã lưu đánh giá năng lực.');
          },
        },
      );
    },
    needForm: () => {
      const data = snapshot();
      show(
        'Nhu cầu đào tạo mới',
        field('Nhân viên', 'employeeId', '', {
          options: [
            ['', 'Chọn nhân viên'],
            ...peopleOptions(
              data,
              data.employees.filter((row) => access(data).hr || canReview(data, row.id)),
            ),
          ],
          required: true,
        }) +
          field('Khóa đào tạo', 'courseId', '', {
            options: [
              ['', 'Chọn khóa'],
              ...courseList(data).map((course) => [course.id, course.title]),
            ],
            required: true,
          }) +
          dateField('Hạn hoàn thành', 'due', shift(today(), 30)) +
          field('Lý do', 'note', '', { type: 'textarea' }),
        {
          glyph: 'assignment_add',
          submit: (values) => {
            commit((data) => {
              ensure(access(data).hr || canReview(data, values.employeeId));
              (data.trainingNeeds ||= []).unshift({
                ...values,
                id: uid('need'),
                status: 'Chờ xếp lớp',
              });
            });
            refresh('Đã tạo nhu cầu đào tạo.');
          },
        },
      );
    },
    needAssign: (id) => {
      const data = snapshot();
      const row = lookup(data, 'trainingNeeds', id);
      const classes = data.training.filter(
        (item) => item.status === 'Open' && linkedCourse(data, item)?.id === row.courseId,
      );
      show(
        'Xếp lớp đào tạo',
        field('Lớp đang mở', 'sessionId', '', {
          options: [['', 'Chọn lớp'], ...D.options(classes)],
          required: true,
        }),
        {
          glyph: 'school',
          submit: (values) => {
            commit((data) => {
              const need = lookup(data, 'trainingNeeds', id);
              const row = lookup(data, 'training', values.sessionId);
              ensure(
                row.status === 'Open' &&
                  need.status === 'Chờ xếp lớp' &&
                  (access(data).hr || canReview(data, need.employeeId)),
              );
              const list = (row.enrollments ||= enrollments(row));
              ensure(list.length < (row.seats || 30), 'Lớp đã đủ chỗ.');
              if (!list.some((item) => item.employeeId === need.employeeId))
                list.push({ employeeId: need.employeeId, attendance: {}, result: '' });
              need.status = 'Đã xếp lớp';
              need.sessionId = row.id;
            });
            refresh('Đã xếp lớp.');
          },
        },
      );
    },
    needCancel: (id) => {
      commit((data) => {
        const row = lookup(data, 'trainingNeeds', id);
        ensure(access(data).hr || canReview(data, row.employeeId));
        row.status = 'Đã hủy';
      });
      refresh('Đã hủy nhu cầu.');
    },
    certForm: (id) => {
      const data = snapshot();
      const rights = access(data);
      const row = (data.certificates || []).find((item) => item.id === validId(id));
      show(
        row ? 'Sửa chứng chỉ' : 'Thêm chứng chỉ',
        (rights.hr
          ? field('Người giữ', 'employeeId', row?.employeeId || data.currentUserId, {
              options: peopleOptions(data),
              required: true,
            })
          : '') +
          field('Tên chứng chỉ', 'title', row?.title, { required: true }) +
          '<div class="field-grid">' +
          dateField('Ngày cấp', 'issued', row?.issued || today()) +
          dateField('Hết hạn', 'expires', row?.expires || '', false) +
          '</div>' +
          field('Tệp minh chứng', 'evidence', '', { type: 'file' }),
        {
          glyph: 'workspace_premium',
          submit: async (values) => {
            ensure(
              !values.expires || values.expires >= values.issued,
              'Ngày hết hạn phải sau ngày cấp.',
            );
            const file = values.evidence;
            ensure(
              !file?.size || file.size <= 2 * 1024 * 1024,
              'Demo lưu tệp minh chứng tối đa 2 MB.',
            );
            const saved = file?.size ? { name: file.name, contents: await file.text() } : row?.file;
            commit((data) => {
              const items = (data.certificates ||= []);
              const content = {
                title: clean(values.title, 'Tên chứng chỉ'),
                issued: values.issued,
                expires: values.expires,
                file: saved,
                employeeId: values.employeeId || data.currentUserId,
                verified: rights.hr,
              };
              if (row) {
                const old = lookup(data, 'certificates', row.id);
                ensure(!old.verified && old.employeeId === data.currentUserId);
                Object.assign(old, content);
              } else items.unshift({ ...content, id: uid('cert') });
            });
            refresh('Đã lưu chứng chỉ.');
          },
        },
      );
    },
    certState: (id, command) => {
      const titles = {
        verify: 'Xác minh chứng chỉ',
        revoke: 'Thu hồi chứng chỉ',
        delete: 'Xóa chứng chỉ',
      };
      const title = titles[command];
      const prepare =
        command === 'revoke'
          ? field('Lý do', 'reason', '', { type: 'textarea', required: true })
          : '<p>Xác nhận thay đổi chứng chỉ trong demo.</p>';
      show(title, prepare, {
        glyph: 'workspace_premium',
        submitLabel: title,
        submit: (values) => {
          commit((data) => {
            const row = lookup(data, 'certificates', id);
            if (command === 'delete') {
              ensure(!row.verified && row.employeeId === data.currentUserId);
              data.certificates = data.certificates.filter((item) => item.id !== id);
            } else {
              ensure(access(data).hr);
              if (command === 'verify') row.verified = true;
              else {
                row.revoked = true;
                row.reason = clean(values.reason, 'Lý do');
              }
            }
          });
          refresh('Đã cập nhật chứng chỉ.');
        },
      });
    },
    certEvidence: (id) => {
      const row = lookup(snapshot(), 'certificates', id);
      if (row.file) D.download(row.file.name, row.file.contents);
    },
    trainingExport: () => {
      const data = snapshot();
      D.csv('TeamFlow-Bao-cao-dao-tao.csv', [
        ['Lớp', 'Trạng thái', 'Lượt ghi danh', 'Đạt'],
        ...data.training.map((row) => [
          row.title,
          classState[row.status],
          enrollments(row).length,
          enrollments(row).filter((item) => item.result === 'Đạt').length,
        ]),
      ]);
    },
  });
  Object.assign(views, { 'admin/users': adminUsers, training, offboarding });
})();

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
    avatar,
    byId,
    person,
    matches,
    chip,
    header,
    panel,
    placeholder,
    searchField,
    field,
    show,
    confirm,
    refresh,
    today,
    uid,
    clean,
    audit,
    lookup,
    actionRow,
  } = D;
  const { snapshot, commit } = MockApi;
  function deptInScope(data, id) {
    if (D.access(data).admin) return true;
    const seen = new Set();
    while (id && !seen.has(id)) {
      seen.add(id);
      const row = byId(data, 'departments', id);
      if (row?.managerId === data.currentUserId) return true;
      id = row?.parentId;
    }
    return false;
  }
  function org(data) {
    const access = D.access(data);
    const directors = data.employees.filter((row) => row.role === 'Admin');
    const emp = (row) =>
      '<span class="org-person">' +
      avatar(row.fullName, 'sm') +
      '<span class="stack">' +
      act('employee|' + row.id, row.fullName, '', 'plain-button') +
      '<small>' +
      h(row.jobTitle || '—') +
      '</small></span>' +
      (access.admin ||
      (access.manager &&
        row.role !== 'Admin' &&
        row.id !== data.currentUserId &&
        deptInScope(data, row.departmentId))
        ? iconBtn('departmentMove|' + row.id, 'Chuyển phòng ban', 'swap_horiz')
        : '') +
      '</span>';
    const draw = (department, visited = new Set()) => {
      if (visited.has(department.id)) return '';
      visited.add(department.id);
      const members = data.employees.filter((row) => row.departmentId === department.id);
      const descendants = data.departments
        .filter((row) => row.parentId === department.id)
        .map((child) => draw(child, new Set(visited)))
        .join('');
      if (
        !descendants &&
        !matches(
          state.view.orgQuery,
          department.name,
          department.description,
          ...members.map((row) => row.fullName),
        )
      )
        return '';
      const canManage = deptInScope(data, department.id);
      return (
        '<div class="org-node">' +
        panel(
          '<div class="toolbar"><span class="org-mark">' +
            icon('account_tree') +
            '</span><span class="stack"><strong>' +
            h(department.name) +
            '</strong><small>' +
            h(department.description || 'Phòng ban') +
            '</small></span>' +
            chip(members.length + ' thành viên') +
            '<span class="spacer"></span>' +
            (canManage
              ? iconBtn('employeeForm', 'Thêm nhân viên', 'person_add') +
                iconBtn('departmentDefaults|' + department.id, 'Workspace mặc định', 'group')
              : '') +
            (access.admin
              ? iconBtn('departmentForm|' + department.id, 'Sửa phòng ban', 'edit') +
                iconBtn('departmentDelete|' + department.id, 'Xóa phòng ban', 'delete')
              : '') +
            '</div><div class="org-members">' +
            members
              .map(
                (row) =>
                  emp(row) + (row.id === department.managerId ? chip('Trưởng phòng', 'amber') : ''),
              )
              .join('') +
            (!members.length ? '<span class="muted">Chưa có nhân viên.</span>' : '') +
            '</div>',
        ) +
        (descendants ? '<div class="org-children">' + descendants + '</div>' : '') +
        '</div>'
      );
    };
    const roots = data.departments.filter(
      (row) => !row.parentId || !byId(data, 'departments', row.parentId),
    );
    return (
      '<div class="org-manual">' +
      header(
        raw('org.title'),
        raw('org.subtitle'),
        (access.admin || access.manager
          ? act('employeeForm', 'Thêm nhân viên', 'person_add')
          : '') +
          (access.admin ? act('departmentForm', 'Thêm phòng ban', 'add', 'btn primary') : ''),
      ) +
      '<div class="toolbar">' +
      searchField('orgQuery', 'Tìm phòng ban, nhân viên…') +
      '</div>' +
      panel(
        '<div class="toolbar"><span class="org-mark director">' +
          icon('stars') +
          '</span><div class="stack"><strong>Ban giám đốc</strong><small>Quản trị hệ thống và duyệt toàn công ty</small></div><span class="spacer"></span>' +
          directors.map(emp).join('') +
          '</div>',
        'org-directors',
      ) +
      (roots.map((row) => draw(row)).join('') || panel(placeholder('Chưa có phòng ban phù hợp.'))) +
      panel(
        '<h2>Chưa xếp phòng</h2><div class="org-members">' +
          (data.employees
            .filter((row) => !row.departmentId)
            .map(emp)
            .join('') || '<span class="muted">Mọi nhân viên đã được xếp phòng.</span>') +
          '</div>',
      ) +
      '</div>'
    );
  }
  views.departments = org;
  Object.assign(actions, {
    departmentForm: (id) => {
      const data = snapshot();
      const row = byId(data, 'departments', typeof id === 'string' ? id : '');
      show(
        row ? 'Sửa phòng ban' : 'Thêm phòng ban',
        field('Tên phòng ban', 'name', row?.name, { required: true }) +
          field('Thuộc phòng', 'parentId', row?.parentId, {
            options: [
              ['', 'Cấp cao nhất'],
              ...D.options(data.departments.filter((dept) => dept.id !== row?.id)),
            ],
          }) +
          field('Quản lý phòng', 'managerId', row?.managerId, {
            options: D.empOptions(data, undefined, 'Chưa chỉ định'),
          }) +
          field('Mô tả', 'description', row?.description, { type: 'textarea' }),
        {
          glyph: 'account_tree',
          submit: (values) => {
            commit((data) => {
              if (!D.access(data).admin) throw Error('Chỉ Admin có quyền chỉnh cơ cấu phòng ban.');
              let parent = values.parentId;
              const seen = new Set();
              while (parent) {
                if (parent === row?.id || seen.has(parent))
                  throw Error('Phòng cha tạo vòng lặp trong sơ đồ.');
                seen.add(parent);
                parent = byId(data, 'departments', parent)?.parentId;
              }
              const attributes = { ...values, name: clean(values.name, 'Tên phòng ban') };
              if (row) Object.assign(lookup(data, 'departments', row.id), attributes);
              else data.departments.push({ ...attributes, id: uid('department') });
              audit(data, 'Đã lưu phòng ban ' + attributes.name, 'Tổ chức');
            });
            refresh('Đã lưu phòng ban.');
          },
        },
      );
    },
    departmentDelete: (id) =>
      confirm(
        'Xóa phòng ban?',
        'Nhân viên trong phòng sẽ chuyển sang Chưa xếp phòng.',
        () => {
          commit((data) => {
            if (!D.access(data).admin) throw Error('Chỉ Admin có quyền xóa phòng ban.');
            if (data.departments.some((row) => row.parentId === id))
              throw Error('Chuyển hoặc xóa phòng con trước.');
            if (data.templates.some((row) => row.departmentId === id))
              throw Error('Phòng ban vẫn có mẫu yêu cầu đang liên kết.');
            data.departments = data.departments.filter((row) => row.id !== id);
            for (const employee of data.employees.filter((row) => row.departmentId === id))
              employee.departmentId = '';
            audit(data, 'Đã xóa phòng ban.', 'Tổ chức');
          });
          refresh('Đã xóa phòng ban.');
        },
        'Xóa',
      ),
    departmentMove: (employeeId) => {
      const data = snapshot(),
        employee = lookup(data, 'employees', employeeId);
      show(
        'Chuyển phòng · ' + employee.fullName,
        field('Phòng ban', 'dept', employee.departmentId, {
          options: [
            ['', 'Chưa xếp phòng'],
            ...D.options(data.departments.filter((row) => deptInScope(data, row.id))),
          ],
        }),
        {
          glyph: 'swap_horiz',
          submit: (values) => {
            commit((data) => {
              const employee = lookup(data, 'employees', employeeId);
              if (
                !D.access(data).admin &&
                (employee.id === data.currentUserId ||
                  employee.role === 'Admin' ||
                  (employee.departmentId && !deptInScope(data, employee.departmentId)) ||
                  (values.dept && !deptInScope(data, values.dept)) ||
                  data.departments.some(
                    (dept) => dept.managerId === employee.id && dept.id === employee.departmentId,
                  ))
              )
                throw Error('Bạn chưa có quyền chuyển nhân viên này.');
              employee.departmentId = values.dept;
              audit(data, 'Đã chuyển phòng cho ' + employee.fullName, 'Tổ chức');
            });
            refresh('Đã chuyển phòng ban.');
          },
        },
      );
    },
    departmentDefaults: (id) => {
      const data = snapshot(),
        dept = lookup(data, 'departments', id);
      show(
        'Workspace mặc định · ' + dept.name,
        data.workspaces
          .filter((row) => D.access(data).admin || row.memberIds.includes(data.currentUserId))
          .map((row) =>
            field(row.name, 'ws-' + row.id, dept.defaultWorkspaces?.includes(row.id), {
              type: 'checkbox',
            }),
          )
          .join(''),
        {
          glyph: 'group',
          submit: (values) => {
            commit((data) => {
              if (!deptInScope(data, id))
                throw Error('Bạn chưa có quyền chỉnh workspace mặc định.');
              lookup(data, 'departments', id).defaultWorkspaces = data.workspaces
                .filter((row) => values['ws-' + row.id])
                .map((row) => row.id);
            });
            refresh('Đã lưu workspace mặc định.');
          },
        },
      );
    },
  });
})();
