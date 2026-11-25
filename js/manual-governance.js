'use strict';

(() => {
  const D = Demo;
  const {
    state,
    actions,
    views,
    h,
    raw,
    icon,
    link,
    act,
    iconBtn,
    byId,
    person,
    fmtDate,
    money,
    matches,
    chip,
    bar,
    header,
    panel,
    placeholder,
    table,
    tabs,
    filter,
    searchField,
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
  const { snapshot, commit } = MockApi;
  const opts = (values) => values.map((value) => [value, value]);
  const str = (value) => (typeof value === 'string' ? value : '');
  const allow = (test, message = 'Bạn chưa có quyền thực hiện thao tác này.') => {
    if (!test) throw Error(message);
  };
  const cycleKeys = ['Draft', 'Self', 'Manager', 'HR', 'Closed'];
  const cycleLabels = {
    Draft: 'Nháp',
    Self: 'Tự đánh giá',
    Manager: 'Quản lý đánh giá',
    HR: 'HR duyệt',
    Closed: 'Đã kết thúc',
    Open: 'Đang mở',
  };
  const cycleStatus = (status) => cycleLabels[status] || status;
  const defaults = [
    { name: 'Kết quả công việc', weight: 40 },
    { name: 'Phối hợp và giao tiếp', weight: 35 },
    { name: 'Phát triển chuyên môn', weight: 25 },
  ];
  const reviewCycle = (data, review) => byId(data, 'cycles', review.cycleId);
  const templateFor = (data, review) =>
    byId(data, 'reviewTemplates', reviewCycle(data, review)?.templateId) || data.reviewTemplates[0];
  const criteriaFor = (data, review) => templateFor(data, review)?.criteria || defaults;
  const canAccess = (data, row) =>
    D.access(data).hr ||
    row.employeeId === data.currentUserId ||
    row.reviewerId === data.currentUserId;
  const editable = (row) => ['SelfPending', 'ManagerPending', 'Returned'].includes(row.status);
  const cycleCaption = (cycle) =>
    fmtDate(cycle.startDate) + ' – ' + fmtDate(cycle.endDate || cycle.dueDate);
  function computedScore(data, row, scores) {
    const criteria = criteriaFor(data, row);
    if (!criteria.every((item, i) => Number(scores[i]) >= 1 && Number(scores[i]) <= 5)) return null;
    const weight = templateFor(data, row)?.objectiveWeight || 0;
    const objective = (row.objectives || [])
      .flatMap((item) => item.results)
      .map((item) =>
        item.target === item.start
          ? Number(item.current >= item.target)
          : Math.max(0, Math.min(1, (item.current - item.start) / (item.target - item.start))),
      );
    const average = objective.length ? objective.reduce((a, b) => a + b, 0) / objective.length : 0;
    const amount =
      criteria.reduce((sum, item, i) => sum + (Number(scores[i]) * item.weight) / 100, 0) +
      ((1 + 4 * average) * weight) / 100;
    return Math.round(amount * 100) / 100;
  }
  const rating = (score) =>
    score >= 4.5
      ? 'Xuất sắc'
      : score >= 3.75
        ? 'Tốt'
        : score >= 3
          ? 'Đạt'
          : score >= 2
            ? 'Cần cải thiện'
            : 'Không đạt';
  function reviewScreen(data, id) {
    const row = byId(data, 'reviews', id);
    if (!row || !canAccess(data, row))
      return header('Không tìm thấy bản đánh giá', '', link('performance', 'Về Đánh giá'));
    const cycle = reviewCycle(data, row);
    const hr = D.access(data).hr;
    const self = row.employeeId === data.currentUserId;
    const manager = row.reviewerId === data.currentUserId;
    const isPeerEnabled = cycle.peer !== false;
    let controls = '';
    if (row.status === 'SelfPending' && self)
      controls = act('reviewForm|' + id + '|self', 'Tự đánh giá', 'edit', 'btn primary');
    if (['ManagerPending', 'Returned'].includes(row.status) && manager)
      controls = act('reviewForm|' + id + '|manager', 'Quản lý đánh giá', 'edit', 'btn primary');
    if (row.status === 'HrPending' && hr)
      controls =
        act('reviewFinalize|' + id, 'Chốt đánh giá', 'check', 'btn primary') +
        act('reviewReturn|' + id, 'Trả lại quản lý', 'undo');
    const criteria = criteriaFor(data, row);
    const score = row.finalScore ?? row.managerScore;
    const main = panel(
      '<h2>Kết quả đánh giá</h2>' +
        table(
          ['Tiêu chí', 'Trọng số', 'Tự đánh giá', 'Quản lý đánh giá'],
          criteria.map((item, i) => [
            h(item.name),
            h(item.weight + '%'),
            h(row.selfValues?.[i] ?? '—'),
            h(row.managerValues?.[i] ?? '—'),
          ]),
        ) +
        D.definitions([
          ['Tự đánh giá', h(row.self || '—')],
          ['Nhận xét quản lý', h(row.manager || '—')],
          ['Điểm', h(score == null ? '—' : score + '/5 · ' + rating(score))],
          ...(row.returnReason ? [['Ghi chú HR', h(row.returnReason)]] : []),
        ]),
    );
    const objectives = panel(
      '<div class="toolbar"><strong>Mục tiêu & kết quả then chốt</strong><span class="spacer"></span>' +
        (editable(row) ? act('goalForm|' + id, 'Thêm mục tiêu', 'add', 'btn sm') : '') +
        '</div>' +
        ((row.objectives || [])
          .map(
            (goal) =>
              '<div class="item-line"><span class="stack"><strong>' +
              h(goal.title) +
              '</strong><small>' +
              h(goal.note || '') +
              '</small>' +
              goal.results
                .map(
                  (item) =>
                    '<span class="block">' +
                    h(item.name) +
                    ' · ' +
                    h(item.current + '/' + item.target + ' ' + item.unit) +
                    '</span>',
                )
                .join('') +
              '</span>' +
              (editable(row)
                ? iconBtn('goalForm|' + id + '|' + goal.id, 'Cập nhật mục tiêu', 'edit')
                : '') +
              '</div>',
          )
          .join('') || '<p class="muted">Chưa có mục tiêu.</p>'),
    );
    const development = panel(
      '<div class="toolbar"><strong>Kế hoạch phát triển</strong><span class="spacer"></span>' +
        ((manager || hr) && row.status !== 'Finalized'
          ? act('developmentAdd|' + id, 'Thêm hành động', 'add', 'btn sm')
          : '') +
        '</div>' +
        ((row.development || [])
          .map(
            (item) =>
              '<div class="item-line"><span class="stack"><strong>' +
              h(item.title) +
              '</strong><small>Hạn · ' +
              fmtDate(item.due) +
              '</small></span>' +
              chip(item.status, item.status === 'Đã xong' ? 'emerald' : 'indigo') +
              (self
                ? act('developmentNext|' + id + '|' + item.id, 'Cập nhật', 'refresh', 'btn sm')
                : '') +
              '</div>',
          )
          .join('') || '<p class="muted">Chưa có kế hoạch phát triển.</p>'),
    );
    const peer = isPeerEnabled
      ? panel(
          '<div class="toolbar"><strong>Góp ý 360°</strong><span class="spacer"></span>' +
            (editable(row)
              ? act(
                  'peerInvite|' + id,
                  self ? 'Đề xuất người góp ý' : 'Mời góp ý',
                  'person_add',
                  'btn sm',
                )
              : '') +
            '</div>' +
            ((row.peers || []).length
              ? row.peers
                  .map(
                    (item) =>
                      '<div class="item-line"><div class="stack"><strong>' +
                      h(self ? 'Đồng nghiệp' : person(data, item.personId)?.fullName) +
                      '</strong><small>' +
                      h(
                        item.note && (!self || row.status === 'Finalized')
                          ? item.note
                          : item.status,
                      ) +
                      '</small></div>' +
                      (item.status === 'Đề xuất' && (manager || hr)
                        ? act(
                            'peerApprove|' + id + '|' + item.personId,
                            'Duyệt lời mời',
                            'check',
                            'btn sm',
                          )
                        : '') +
                      '</div>',
                  )
                  .join('')
              : '<p class="muted">Chưa có góp ý 360°.</p>'),
        )
      : '';
    return (
      crumbs([
        ['performance', 'Đánh giá'],
        [null, person(data, row.employeeId)?.fullName],
      ]) +
      header(cycle?.name || 'Bản đánh giá', person(data, row.employeeId)?.fullName, controls) +
      '<div class="toolbar">' +
      D.statusTag('performance', row.status) +
      ' ' +
      chip('Người đánh giá · ' + (person(data, row.reviewerId)?.fullName || '—')) +
      '</div>' +
      main +
      objectives +
      development +
      peer
    );
  }
  function cycleScreen(data, id) {
    const cycle = byId(data, 'cycles', id);
    if (!cycle || !D.access(data).hr)
      return header('Không tìm thấy kỳ đánh giá', '', link('performance', 'Về Đánh giá'));
    const rows = data.reviews.filter((row) => row.cycleId === id);
    const active = cycle.status === 'Open' ? 'Self' : cycle.status;
    const next = cycleKeys[cycleKeys.indexOf(active) + 1];
    const controls =
      active !== 'Closed'
        ? act('newCycle|' + id, 'Sửa kỳ', 'edit') +
          (next
            ? act(
                'cycleAdvance|' + id + '|' + next,
                {
                  Self: 'Mở kỳ',
                  Manager: 'Chuyển sang quản lý đánh giá',
                  HR: 'Chuyển HR duyệt',
                  Closed: 'Kết thúc kỳ',
                }[next],
                'arrow_forward',
                'btn primary',
              )
            : '') +
          (active === 'HR' ? act('cycleFinalizeAll|' + id, 'Chốt tất cả', 'done_all') : '')
        : '';
    return (
      crumbs([
        ['performance', 'Đánh giá'],
        [null, cycle.name],
      ]) +
      header(cycle.name, cycleCaption(cycle), controls) +
      '<div class="toolbar">' +
      cycleKeys.map((key) => chip(cycleStatus(key), key === active ? 'indigo' : '')).join('') +
      '</div>' +
      summaryStats(rows) +
      panel(
        table(
          ['Nhân viên', 'Người đánh giá', 'Trạng thái', 'Điểm', ''],
          rows.map((row) => [
            D.accountCell(data, row.employeeId),
            h(person(data, row.reviewerId)?.fullName || '—'),
            D.statusTag('performance', row.status),
            h(row.finalScore ?? row.managerScore ?? '—'),
            actionRow(
              link('performance/reviews/' + row.id, 'Mở', 'open_in_new', 'btn sm') +
                (active !== 'Closed'
                  ? iconBtn('reviewerForm|' + row.id, 'Đổi người đánh giá', 'person')
                  : ''),
            ),
          ]),
          'Mở kỳ để tạo bản đánh giá cho nhân viên.',
        ),
      )
    );
  }
  function summaryStats(rows) {
    const finals = rows.filter((row) => row.status === 'Finalized');
    const avg = finals.length
      ? (
          finals.reduce(
            (total, row) => total + Number(row.finalScore || row.managerScore || 0),
            0,
          ) / finals.length
        ).toFixed(2)
      : '—';
    return stats([
      stat('Nhân viên', rows.length, 'group', 'indigo'),
      stat(
        'Đã tự đánh giá',
        rows.filter((row) => row.status !== 'SelfPending').length,
        'assignment_ind',
        'indigo',
      ),
      stat('Đã chốt', finals.length, 'task_alt', 'emerald'),
      stat('Điểm trung bình', avg, 'insights', 'amber'),
    ]);
  }
  function peerReviews(data) {
    const rows = data.reviews.flatMap((row) =>
      (row.peers || [])
        .filter((item) => item.personId === data.currentUserId && item.status !== 'Đề xuất')
        .map((item) => [row, item]),
    );
    return panel(
      table(
        ['Nhân viên', 'Kỳ đánh giá', 'Trạng thái', ''],
        rows.map(([row, invitation]) => [
          D.accountCell(data, row.employeeId),
          h(reviewCycle(data, row)?.name),
          chip(invitation.status),
          invitation.status !== 'Đã góp ý'
            ? act('peerWrite|' + row.id, 'Viết góp ý', 'edit', 'btn sm')
            : '',
        ]),
        'Chưa có lời mời góp ý 360°.',
      ),
    );
  }
  function dashboardRows(data) {
    const rights = D.access(data);
    return data.reviews.filter(
      (row) =>
        (rights.hr || MockApi.canReview(data, row.employeeId)) &&
        (!state.view.reviewDashCycle || row.cycleId === state.view.reviewDashCycle) &&
        (!state.view.reviewDashDept ||
          person(data, row.employeeId)?.departmentId === state.view.reviewDashDept),
    );
  }
  function performanceDashboard(data) {
    const rows = dashboardRows(data);
    const ratings = ['Xuất sắc', 'Tốt', 'Đạt', 'Cần cải thiện', 'Không đạt'];
    return (
      '<div class="toolbar">' +
      filter('reviewDashCycle', 'Kỳ đánh giá', [['', 'Tất cả kỳ'], ...D.options(data.cycles)]) +
      filter('reviewDashDept', 'Phòng ban', [
        ['', 'Tất cả phòng ban'],
        ...D.options(data.departments),
      ]) +
      act('performanceExport', 'Xuất CSV', 'download') +
      '</div>' +
      summaryStats(rows) +
      '<div class="split">' +
      panel(
        '<h2>Phân bố xếp loại</h2>' +
          ratings
            .map((name) => {
              const count = rows.filter(
                (row) =>
                  row.status === 'Finalized' && rating(row.finalScore ?? row.managerScore) === name,
              ).length;
              return (
                '<div class="item-line"><span class="stack">' +
                h(name) +
                '</span><strong>' +
                count +
                '</strong>' +
                bar(rows.length ? (count * 100) / rows.length : 0) +
                '</div>'
              );
            })
            .join(''),
      ) +
      panel(
        '<h2>Kết quả theo phòng ban</h2>' +
          table(
            ['Phòng ban', 'Người đã chốt'],
            data.departments.map((row) => [
              h(row.name),
              String(
                rows.filter(
                  (item) =>
                    item.status === 'Finalized' &&
                    person(data, item.employeeId)?.departmentId === row.id,
                ).length,
              ),
            ]),
          ),
      ) +
      '</div>'
    );
  }
  function reviewForm(id, stage) {
    const data = snapshot();
    const row = lookup(data, 'reviews', id);
    stage = stage === 'SelfPending' ? 'self' : stage === 'ManagerPending' ? 'manager' : stage;
    if (!['self', 'manager'].includes(stage)) return actions.reviewFinalize(id);
    const criteria = criteriaFor(data, row);
    const draft = row.drafts?.[stage];
    const title = stage === 'self' ? 'Tự đánh giá' : 'Quản lý đánh giá';
    show(
      title,
      '<div class="review-criteria">' +
        criteria
          .map(
            (item, i) =>
              field(
                item.name + ' · ' + item.weight + '%',
                'score' + i,
                draft?.scores?.[i] || row[stage + 'Values']?.[i] || '',
                {
                  options: [
                    ['', 'Chọn điểm 1–5'],
                    ...[1, 2, 3, 4, 5].map((value) => [value, String(value)]),
                  ],
                },
              ) + (item.hint ? '<small class="muted">' + h(item.hint) + '</small>' : ''),
          )
          .join('') +
        '</div>' +
        field('Nhận xét', 'note', draft?.note || row[stage], { type: 'textarea' }) +
        '<p id="review-calculated" class="muted">Chọn điểm cho từng tiêu chí.</p>' +
        '<button type="button" class="btn" id="save-review-draft">' +
        icon('save') +
        'Lưu nháp</button>',
      {
        glyph: 'insights',
        submitLabel: 'Gửi đánh giá',
        submit: (values) => {
          const scores = criteria.map((_, i) => Number(values['score' + i]));
          const score = computedScore(data, row, scores);
          allow(score !== null, 'Chấm đủ tất cả tiêu chí trước khi gửi.');
          clean(values.note, 'Nhận xét', 2000);
          commit((data) => updateReview(data, id, stage, { scores, note: values.note }, score));
          refresh('Đã gửi đánh giá.');
        },
      },
    );
    const form = D.dialog.querySelector('form');
    form.addEventListener('change', () => {
      const values = new FormData(form);
      const score = computedScore(
        data,
        row,
        criteria.map((_, i) => Number(values.get('score' + i))),
      );
      form.querySelector('#review-calculated').textContent =
        score === null ? 'Chọn điểm cho từng tiêu chí.' : 'Điểm tính toán · ' + score + '/5';
    });
    form.querySelector('#save-review-draft').onclick = () => {
      const values = new FormData(form);
      try {
        commit((data) =>
          updateReview(
            data,
            id,
            stage,
            {
              scores: criteria.map((_, i) => Number(values.get('score' + i))),
              note: values.get('note'),
            },
            null,
          ),
        );
        D.close();
        refresh('Đã lưu bản nháp.');
      } catch (error) {
        D.formError(form, error);
      }
    };
  }
  function updateReview(data, id, stage, draft, score) {
    const row = lookup(data, 'reviews', id);
    allow(
      stage === 'self'
        ? row.employeeId === data.currentUserId && row.status === 'SelfPending'
        : row.reviewerId === data.currentUserId &&
            ['ManagerPending', 'Returned'].includes(row.status),
    );
    if (score === null) {
      (row.drafts ||= {})[stage] = draft;
      return;
    }
    row[stage] = draft.note;
    row[stage + 'Values'] = draft.scores;
    row[stage + 'Score'] = score;
    row.status = stage === 'self' ? 'ManagerPending' : 'HrPending';
    if (row.drafts) delete row.drafts[stage];
  }
  function cycleForm(id) {
    const data = snapshot();
    const row = byId(data, 'cycles', str(id));
    const date = (label, name, value) =>
      field(label, name, value, { type: 'date', required: true });
    show(
      row ? 'Sửa kỳ đánh giá' : 'Tạo kỳ đánh giá',
      '<div class="field-grid">' +
        field('Tên kỳ', 'name', row?.name, { required: true }) +
        field('Chu kỳ', 'cadence', row?.cadence || 'Hằng quý', {
          options: opts(['Hằng tháng', 'Hằng quý', 'Hằng năm']),
        }) +
        date('Ngày bắt đầu', 'startDate', row?.startDate || today()) +
        date('Ngày kết thúc', 'endDate', row?.endDate || row?.dueDate || shift(today(), 30)) +
        date('Hạn tự đánh giá', 'dueDate', row?.dueDate || shift(today(), 7)) +
        date('Hạn quản lý đánh giá', 'managerDue', row?.managerDue || shift(today(), 15)) +
        field('Phòng ban áp dụng', 'departmentId', row?.departmentId, {
          options: [['', 'Toàn công ty'], ...D.options(data.departments)],
        }) +
        field(
          'Mẫu đánh giá mặc định',
          'templateId',
          row?.templateId || data.reviewTemplates[0]?.id,
          {
            options: D.options(data.reviewTemplates.filter((row) => row.active !== false)),
            required: true,
          },
        ) +
        '</div>' +
        field('Cho phép góp ý 360°', 'peer', row?.peer !== false, { type: 'checkbox' }),
      {
        glyph: 'insights',
        wide: true,
        submit: (values) => {
          allow(
            values.startDate <= values.dueDate &&
              values.dueDate < values.managerDue &&
              values.managerDue <= values.endDate,
            'Ngày bắt đầu, hạn tự đánh giá, hạn quản lý và ngày kết thúc cần theo thứ tự.',
          );
          const id = commit((data) => {
            allow(D.access(data).hr);
            const current = row && lookup(data, 'cycles', row.id);
            const patch = { ...values, name: clean(values.name, 'Tên kỳ'), peer: !!values.peer };
            if (current) {
              if (current.status !== 'Draft')
                Object.assign(current, {
                  name: patch.name,
                  dueDate: patch.dueDate,
                  managerDue: patch.managerDue,
                  peer: patch.peer,
                });
              else Object.assign(current, patch);
              return current.id;
            }
            const saved = { ...patch, id: uid('cycle'), status: 'Draft' };
            data.cycles.unshift(saved);
            return saved.id;
          });
          go('performance/cycles/' + id);
          refresh('Đã lưu kỳ đánh giá.');
        },
      },
    );
  }
  function templateForm(id) {
    const data = snapshot();
    const saved = byId(data, 'reviewTemplates', str(id));
    const initial = saved?.criteria || defaults;
    let count = initial.length;
    show(
      saved ? 'Sửa mẫu đánh giá' : 'Tạo mẫu đánh giá',
      field('Tên mẫu', 'name', saved?.name, { required: true }) +
        field('Mô tả', 'description', saved?.description, { type: 'textarea' }) +
        field('Trọng số mục tiêu (%)', 'objectiveWeight', saved?.objectiveWeight || 0, {
          type: 'number',
          min: 0,
          max: 100,
          required: true,
        }) +
        field('Đang sử dụng', 'active', saved?.active !== false, { type: 'checkbox' }) +
        '<div id="criteria-list"></div><button type="button" class="btn sm" id="add-criterion">Thêm tiêu chí</button>',
      {
        glyph: 'assignment',
        wide: true,
        submit: (values) => {
          const criteria = Array.from({ length: count }, (_, i) => ({
            name: clean(values['name' + i], 'Tên tiêu chí'),
            weight: Number(values['weight' + i]),
            hint: values['hint' + i],
          }));
          allow(
            criteria.reduce((sum, row) => sum + row.weight, 0) + Number(values.objectiveWeight) ===
              100,
            'Tổng trọng số tiêu chí và mục tiêu phải bằng 100%.',
          );
          commit((data) => {
            allow(D.access(data).hr);
            const row = {
              name: clean(values.name, 'Tên mẫu'),
              description: values.description,
              objectiveWeight: Number(values.objectiveWeight),
              criteria,
              active: !!values.active,
            };
            if (saved) Object.assign(lookup(data, 'reviewTemplates', saved.id), row);
            else data.reviewTemplates.unshift({ ...row, id: uid('review-template') });
          });
          refresh('Đã lưu mẫu đánh giá.');
        },
      },
    );
    const list = D.dialog.querySelector('#criteria-list');
    const draw = (item, i) =>
      '<fieldset><legend>Tiêu chí ' +
      (i + 1) +
      '</legend><div class="field-grid">' +
      field('Tên tiêu chí', 'name' + i, item?.name, { required: true }) +
      field('Trọng số (%)', 'weight' + i, item?.weight ?? 0, {
        type: 'number',
        min: 0,
        max: 100,
        required: true,
      }) +
      '</div>' +
      field('Hướng dẫn chấm', 'hint' + i, item?.hint) +
      '</fieldset>';
    list.innerHTML = initial.map(draw).join('');
    D.dialog.querySelector('#add-criterion').onclick = () => {
      if (count < 15) list.insertAdjacentHTML('beforeend', draw(null, count++));
    };
  }
  function goalForm(id, goalId) {
    const row = lookup(snapshot(), 'reviews', id);
    const goal = row.objectives?.find((item) => item.id === goalId);
    let count = 0;
    show(
      goal ? 'Sửa mục tiêu' : 'Thêm mục tiêu',
      field('Mục tiêu', 'title', goal?.title, { required: true }) +
        field('Mô tả', 'note', goal?.note, { type: 'textarea' }) +
        '<h3>Kết quả then chốt</h3><div id="goal-results"></div><button id="add-result" class="btn sm" type="button">Thêm kết quả</button>',
      {
        glyph: 'flag',
        wide: true,
        submit: (values) => {
          const results = Array.from({ length: count }, (_, i) => ({
            name: clean(values['kr' + i], 'Tên kết quả'),
            start: Number(values['start' + i]),
            target: Number(values['target' + i]),
            current: Number(values['current' + i]),
            unit: values['unit' + i],
          }));
          commit((data) => {
            const row = lookup(data, 'reviews', id);
            allow(canAccess(data, row) && editable(row));
            const valuesList = (row.objectives ||= []);
            const saved = { title: clean(values.title, 'Mục tiêu'), note: values.note, results };
            if (goal)
              Object.assign(
                valuesList.find((item) => item.id === goal.id),
                saved,
              );
            else {
              allow(valuesList.length < 10, 'Tối đa 10 mục tiêu trong một bản đánh giá.');
              valuesList.push({ ...saved, id: uid('goal') });
            }
          });
          refresh('Đã lưu mục tiêu.');
        },
      },
    );
    const list = D.dialog.querySelector('#goal-results');
    const add = (source) => {
      if (count >= 8) return;
      const i = count++;
      list.insertAdjacentHTML(
        'beforeend',
        '<fieldset><legend>KR ' +
          (i + 1) +
          '</legend>' +
          field('Kết quả then chốt', 'kr' + i, source?.name, { required: true }) +
          '<div class="field-grid">' +
          field('Bắt đầu', 'start' + i, source?.start ?? 0, {
            type: 'number',
            step: 'any',
            required: true,
          }) +
          field('Mục tiêu', 'target' + i, source?.target ?? 100, {
            type: 'number',
            step: 'any',
            required: true,
          }) +
          field('Hiện tại', 'current' + i, source?.current ?? 0, {
            type: 'number',
            step: 'any',
            required: true,
          }) +
          field('Đơn vị', 'unit' + i, source?.unit || '%') +
          '</div></fieldset>',
      );
    };
    for (const item of goal?.results || [{}]) add(item);
    D.dialog.querySelector('#add-result').onclick = () => add();
  }

  const auditResults = ['Có mặt, đúng', 'Không thấy', 'Sai người giữ', 'Sai tình trạng'];
  function auditScreen(data, id) {
    const row = byId(data, 'audits', id);
    if (!row) return header('Không tìm thấy đợt kiểm kê', '', link('assets', 'Tài sản'));
    const records = row.records || {};
    return (
      crumbs([
        ['assets', 'Tài sản'],
        [null, row.name],
      ]) +
      header(
        row.name,
        row.closed ? 'Đã kết thúc' : 'Đang mở',
        row.closed
          ? ''
          : act('auditFind|' + id, 'Nhập mã / QR', 'qr_code_2') +
              act('auditFinish|' + id, 'Kết thúc đợt', 'task_alt', 'btn primary'),
      ) +
      stats([
        stat('Tài sản', data.assets.length, 'inventory_2', 'indigo'),
        stat('Đã kiểm', Object.keys(records).length, 'fact_check', 'emerald'),
        stat(
          'Không thấy',
          Object.values(records).filter((row) => row.result === 'Không thấy').length,
          'warning',
          'rose',
        ),
      ]) +
      panel(
        table(
          ['Mã', 'Tài sản', 'Người giữ', 'Kết quả kiểm kê', ''],
          data.assets
            .filter((asset) => asset.status !== 'Disposed')
            .map((asset) => [
              link('assets/' + asset.id, asset.code, '', 'plain-button'),
              h(asset.name),
              h(person(data, asset.holderId)?.fullName || '—'),
              chip(
                records[asset.id]?.result || 'Chưa kiểm',
                records[asset.id]?.result === 'Có mặt, đúng' ? 'emerald' : 'indigo',
              ),
              row.closed
                ? ''
                : act('auditEdit|' + id + '|' + asset.id, 'Ghi kết quả', 'edit', 'btn sm'),
            ]),
        ),
      )
    );
  }
  function editAudit(id, assetId) {
    const data = snapshot();
    const row = lookup(data, 'audits', id);
    const asset = lookup(data, 'assets', assetId);
    const saved = row.records?.[assetId];
    show(
      'Kiểm kê ' + asset.code,
      '<p>' +
        h(asset.name) +
        '</p>' +
        field('Kết quả', 'result', saved?.result || auditResults[0], {
          options: opts(auditResults),
        }) +
        D.assetCondition(saved?.condition || asset.condition) +
        field('Ghi chú', 'note', saved?.note, { type: 'textarea' }),
      {
        glyph: 'fact_check',
        submit: (values) => {
          commit((data) => {
            const row = lookup(data, 'audits', id);
            allow(!row.closed, 'Đợt kiểm kê đã kết thúc.');
            (row.records ||= {})[assetId] = values;
            if (!row.checked.includes(assetId)) row.checked.push(assetId);
          });
          refresh('Đã lưu kết quả kiểm kê.');
        },
      },
    );
  }
  function auditLookup(id, input) {
    const value = input.trim();
    const code = /^(?:ts-?)?0*(\d+)$/i.exec(value);
    const target = /#\/assets\/([^/?#]+)/.exec(value)?.[1];
    const asset = snapshot().assets.find(
      (row) => row.id === target || (code && Number(row.code.slice(3)) === Number(code[1])),
    );
    allow(asset, 'Không tìm thấy mã tài sản.');
    editAudit(id, asset.id);
  }
  async function auditScan(id) {
    if (!navigator.mediaDevices?.getUserMedia || typeof globalThis.BarcodeDetector !== 'function') {
      D.showToast('Trình duyệt này chưa hỗ trợ quét QR bằng camera. Hãy nhập mã tài sản.', true);
      return;
    }
    try {
      show(
        'Quét mã QR',
        '<video class="audit-camera" playsinline muted autoplay></video><p class="muted" id="scan-status">Đưa mã QR vào khung hình.</p>' +
          act('auditFind|' + id, 'Nhập mã bằng tay', 'edit'),
        { glyph: 'qr_code_2' },
      );
      const video = D.dialog.querySelector('video');
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      });
      const stop = () => stream.getTracks().forEach((track) => track.stop());
      D.dialog.addEventListener('close', stop, { once: true });
      if (!video.isConnected) return stop();
      video.srcObject = stream;
      const step = async () => {
        if (!video.isConnected || !D.dialog.open) return stop();
        try {
          const codes = video.readyState >= 2 ? await detector.detect(video) : [];
          if (codes[0]?.rawValue) {
            auditLookup(id, codes[0].rawValue);
            stop();
            return;
          }
        } catch (error) {
          const status = D.dialog.querySelector('#scan-status');
          if (status) status.textContent = error.message;
        }
        setTimeout(step, 200);
      };
      step();
    } catch {
      D.showToast('Camera chưa sẵn sàng. Bạn có thể nhập mã bằng tay.', true);
    }
  }
  function budgetReports(data, project) {
    const tasks = data.tasks.filter((row) => row.projectId === project.id);
    const logs = data.worklogs.filter(
      (row) => row.status === 'Approved' && tasks.some((task) => task.id === row.taskId),
    );
    const costs = logs.map((log) => ({
      ...log,
      cost: Math.round((log.minutes * (log.rate || 0)) / 60),
    }));
    const expenses = data.expenses.filter((row) => row.projectId === project.id);
    const months = [
      ...new Set([
        ...logs.map((log) => log.workDate.slice(0, 7)),
        ...expenses.map((expense) => expense.date.slice(0, 7)),
      ]),
    ].sort();
    const total = (entries) => entries.reduce((sum, row) => sum + (row.cost || row.amount || 0), 0);
    const max = Math.max(
      1,
      ...months.map(
        (month) =>
          total(costs.filter((row) => row.workDate.startsWith(month))) +
          total(expenses.filter((row) => row.date.startsWith(month))),
      ),
    );
    const top = data.tasks
      .filter((row) => row.projectId === project.id)
      .map((task) => [task, total(costs.filter((log) => log.taskId === task.id))])
      .filter(([, amount]) => amount > 0)
      .sort((a, b) => b[1] - a[1]);
    return (
      panel(
        '<h2>Chi phí theo tháng</h2>' +
          (months
            .map((month) => {
              const spent =
                total(costs.filter((row) => row.workDate.startsWith(month))) +
                total(expenses.filter((row) => row.date.startsWith(month)));
              return (
                '<div class="item-line"><span class="stack">' +
                h(month) +
                '</span><strong>' +
                h(money(spent)) +
                '</strong>' +
                bar((spent / max) * 100) +
                '</div>'
              );
            })
            .join('') || '<p class="muted">Chưa phát sinh chi phí.</p>'),
      ) +
      panel(
        '<h2>Công việc tốn chi phí</h2>' +
          table(
            ['Công việc', 'Chi phí nhân công'],
            top.map(([task, value]) => [
              act('task|' + task.id, task.code + ' · ' + task.title, '', 'plain-button'),
              h(money(value)),
            ]),
          ),
      ) +
      (D.access(data).admin
        ? panel(
            '<h2>Theo người</h2>' +
              table(
                ['Nhân viên', 'Chi phí nhân công'],
                data.employees
                  .map((row) => [row, total(costs.filter((log) => log.userId === row.id))])
                  .filter(([, amount]) => amount > 0)
                  .map(([row, value]) => [D.accountCell(data, row.id), h(money(value))]),
              ),
          )
        : '')
    );
  }

  Object.assign(D, {
    reviewScreen,
    cycleScreen,
    cycleStatus,
    peerReviews,
    performanceDashboard,
    auditScreen,
    budgetReports,
  });
  Object.assign(actions, {
    newCycle: cycleForm,
    newReviewTemplate: templateForm,
    reviewForm,
    goalForm,
    cycleAdvance: (id, next) =>
      confirm(
        cycleStatus(next) + '?',
        'Thay đổi giai đoạn áp dụng cho kỳ đánh giá này.',
        () => {
          commit((data) => {
            allow(D.access(data).hr);
            const row = lookup(data, 'cycles', id);
            const current = row.status === 'Open' ? 'Self' : row.status;
            allow(
              cycleKeys[cycleKeys.indexOf(current) + 1] === next,
              'Kỳ đánh giá đang ở giai đoạn khác.',
            );
            const entries = data.reviews.filter((row) => row.cycleId === id);
            if (next === 'Closed')
              allow(
                entries.every((row) => row.status === 'Finalized'),
                'Cần chốt tất cả các bản đánh giá.',
              );
            if (next === 'Self')
              for (const worker of data.employees.filter(
                (worker) =>
                  !worker.locked && (!row.departmentId || worker.departmentId === row.departmentId),
              )) {
                const manager = byId(data, 'departments', worker.departmentId)?.managerId;
                const reviewer =
                  manager && manager !== worker.id
                    ? manager
                    : data.employees.find((row) => row.role === 'Admin' && row.id !== worker.id)
                        ?.id ||
                      manager ||
                      data.currentUserId;
                if (!entries.some((row) => row.employeeId === worker.id))
                  data.reviews.push({
                    id: uid('review'),
                    cycleId: id,
                    employeeId: worker.id,
                    reviewerId: reviewer,
                    status: 'SelfPending',
                  });
              }
            row.status = next;
            audit(data, cycleStatus(next) + ' · ' + row.name, 'Đánh giá');
          });
          refresh('Đã cập nhật giai đoạn.');
        },
        cycleStatus(next),
      ),
    reviewerForm: (id) => {
      const data = snapshot();
      const row = lookup(data, 'reviews', id);
      show(
        'Đổi người đánh giá',
        field('Người đánh giá', 'reviewerId', row.reviewerId, {
          options: data.employees
            .filter((item) => item.id !== row.employeeId)
            .map((item) => [item.id, item.fullName]),
          required: true,
        }),
        {
          glyph: 'person',
          submit: (values) => {
            commit((data) => {
              allow(D.access(data).hr);
              lookup(data, 'reviews', id).reviewerId = values.reviewerId;
            });
            refresh('Đã đổi người đánh giá.');
          },
        },
      );
    },
    reviewFinalize: (id) => {
      const row = lookup(snapshot(), 'reviews', id);
      show(
        'Chốt đánh giá',
        field('Điểm cuối (1–5)', 'score', row.managerScore, {
          type: 'number',
          step: 0.01,
          min: 1,
          max: 5,
          required: true,
        }) + field('Lý do điều chỉnh điểm', 'reason', '', { type: 'textarea' }),
        {
          glyph: 'verified',
          submitLabel: 'Chốt',
          submit: (values) => {
            commit((data) => {
              allow(D.access(data).hr);
              const row = lookup(data, 'reviews', id);
              allow(row.status === 'HrPending');
              const score = Number(values.score);
              if (score !== row.managerScore) clean(values.reason, 'Lý do điều chỉnh');
              Object.assign(row, {
                status: 'Finalized',
                finalScore: score,
                finalReason: values.reason,
              });
              audit(data, 'Đã chốt điểm đánh giá.', 'Đánh giá');
            });
            refresh('Đã chốt đánh giá.');
          },
        },
      );
    },
    reviewReturn: (id) =>
      show(
        'Trả lại quản lý',
        field('Ghi chú', 'reason', '', { required: true, type: 'textarea' }),
        {
          submit: (values) => {
            commit((data) => {
              allow(D.access(data).hr);
              const row = lookup(data, 'reviews', id);
              allow(row.status === 'HrPending');
              row.status = 'Returned';
              row.returnReason = clean(values.reason, 'Ghi chú');
            });
            refresh('Đã trả lại bản đánh giá.');
          },
        },
      ),
    cycleFinalizeAll: (id) =>
      confirm(
        'Chốt các bản chờ HR?',
        'Dùng điểm tính toán của quản lý.',
        () => {
          commit((data) => {
            allow(D.access(data).hr);
            for (const row of data.reviews.filter(
              (row) => row.cycleId === id && row.status === 'HrPending' && row.managerScore != null,
            ))
              Object.assign(row, { status: 'Finalized', finalScore: row.managerScore });
            audit(data, 'Đã chốt hàng loạt bản đánh giá.', 'Đánh giá');
          });
          refresh('Đã chốt các bản chờ.');
        },
        'Chốt tất cả',
      ),
    developmentAdd: (id) =>
      show(
        'Thêm hành động phát triển',
        field('Hành động', 'title', '', { required: true }) +
          field('Hạn hoàn thành', 'due', shift(today(), 30), { type: 'date' }),
        {
          submit: (values) => {
            commit((data) => {
              const row = lookup(data, 'reviews', id);
              allow(
                (D.access(data).hr || row.reviewerId === data.currentUserId) &&
                  row.status !== 'Finalized',
              );
              (row.development ||= []).push({
                id: uid('development'),
                title: clean(values.title, 'Hành động'),
                due: values.due,
                status: 'Cần làm',
              });
            });
            refresh('Đã thêm hành động.');
          },
        },
      ),
    developmentNext: (id, entry) => {
      commit((data) => {
        const row = lookup(data, 'reviews', id);
        allow(data.currentUserId === row.employeeId);
        const item = row.development.find((item) => item.id === entry);
        const steps = ['Cần làm', 'Đang làm', 'Đã xong'];
        item.status = steps[(steps.indexOf(item.status) + 1) % steps.length];
      });
      refresh();
    },
    peerInvite: (id) => {
      const data = snapshot();
      const row = lookup(data, 'reviews', id);
      show(
        'Góp ý 360°',
        field('Đồng nghiệp', 'personId', '', {
          options: [
            ['', 'Chọn người'],
            ...data.employees
              .filter(
                (item) =>
                  item.id !== row.employeeId &&
                  !row.peers?.some((peer) => peer.personId === item.id),
              )
              .map((item) => [item.id, item.fullName]),
          ],
          required: true,
        }),
        {
          submit: (values) => {
            commit((data) => {
              const row = lookup(data, 'reviews', id);
              allow(canAccess(data, row) && editable(row));
              const list = (row.peers ||= []);
              allow(
                list.length < 8 && !list.some((item) => item.personId === values.personId),
                'Tối đa 8 đồng nghiệp và mỗi người chỉ mời một lần.',
              );
              list.push({
                personId: values.personId,
                status: row.employeeId === data.currentUserId ? 'Đề xuất' : 'Đã mời',
              });
            });
            refresh('Đã cập nhật lời mời.');
          },
        },
      );
    },
    peerApprove: (id, userId) => {
      commit((data) => {
        const row = lookup(data, 'reviews', id);
        allow(D.access(data).hr || row.reviewerId === data.currentUserId);
        row.peers.find((item) => item.personId === userId).status = 'Đã mời';
      });
      refresh('Đã duyệt lời mời.');
    },
    peerWrite: (id) =>
      show(
        'Viết góp ý 360°',
        field('Nội dung góp ý', 'note', '', { type: 'textarea', required: true }),
        {
          submitLabel: 'Gửi góp ý',
          submit: (values) => {
            commit((data) => {
              const row = lookup(data, 'reviews', id);
              const entry = row.peers.find((item) => item.personId === data.currentUserId);
              allow(entry?.status === 'Đã mời');
              entry.note = clean(values.note, 'Góp ý', 2000);
              entry.status = 'Đã góp ý';
            });
            refresh('Đã gửi góp ý.');
          },
        },
      ),
    performanceExport: () => {
      const data = snapshot();
      D.csv('TeamFlow-Danh-gia.csv', [
        ['Nhân viên', 'Kỳ', 'Trạng thái', 'Điểm'],
        ...dashboardRows(data).map((row) => [
          person(data, row.employeeId)?.fullName,
          reviewCycle(data, row)?.name,
          raw('performance.status.' + row.status),
          row.finalScore ?? row.managerScore ?? '',
        ]),
      ]);
    },
    startAudit: () => {
      const existing = snapshot().audits.find((row) => !row.closed);
      if (existing) return go('assets/audits/' + existing.id);
      show(
        'Bắt đầu đợt kiểm kê',
        field('Tên đợt kiểm kê', 'name', 'Kiểm kê ' + today(), { required: true }),
        {
          glyph: 'fact_check',
          submit: (values) => {
            const item = commit((data) => {
              allow(!data.audits.some((row) => !row.closed), 'Chỉ có một đợt kiểm kê đang mở.');
              const row = {
                name: clean(values.name, 'Tên đợt'),
                id: uid('audit'),
                date: today(),
                checked: [],
                records: {},
                closed: false,
              };
              data.audits.unshift(row);
              return row;
            });
            go('assets/audits/' + item.id);
            refresh('Đã tạo đợt kiểm kê.');
          },
        },
      );
    },
    auditEdit: editAudit,
    auditFind: (id) =>
      show(
        'Nhập mã tài sản hoặc liên kết QR',
        field('Mã / liên kết', 'code', '', {
          required: true,
          placeholder: 'TS-0012, ts12 hoặc 12',
        }) + act('auditScan|' + id, 'Quét camera', 'qr_code_scanner', 'btn sm'),
        {
          glyph: 'qr_code_2',
          submitLabel: 'Tìm',
          submit: (values) => auditLookup(id, values.code),
        },
      ),
    auditScan: (id) => {
      auditScan(id);
    },
    auditFinish: (id) =>
      show(
        'Kết thúc kiểm kê',
        field('Cách kết thúc', 'mode', 'record', {
          options: [
            ['record', 'Chỉ kết thúc'],
            ['apply', 'Áp dụng kết quả và kết thúc'],
          ],
        }),
        {
          glyph: 'task_alt',
          submitLabel: 'Kết thúc đợt',
          submit: (values) => {
            commit((data) => {
              const row = lookup(data, 'audits', id);
              allow(!row.closed, 'Đợt kiểm kê đã kết thúc.');
              if (values.mode === 'apply')
                for (const [id, result] of Object.entries(row.records || {})) {
                  const asset = byId(data, 'assets', id);
                  if (!asset || asset.status === 'Disposed') continue;
                  if (result.result === 'Không thấy')
                    Object.assign(asset, { status: 'Lost', holderId: '', confirmed: false });
                  if (result.result === 'Sai tình trạng') asset.condition = result.condition;
                  if (result.result !== 'Có mặt, đúng')
                    asset.history.push({
                      date: today(),
                      text: 'Kiểm kê · ' + result.result + (result.note ? ' · ' + result.note : ''),
                    });
                }
              row.closed = true;
              row.closedAt = today();
              audit(data, 'Đã kết thúc đợt kiểm kê ' + row.name, 'Tài sản');
            });
            refresh('Đã kết thúc kiểm kê.');
          },
        },
      ),
  });
})();

(() => {
  const D = Demo;
  const {
    state,
    views,
    actions,
    h,
    icon,
    link,
    act,
    iconBtn,
    byId,
    person,
    fmtDate,
    money,
    hours,
    matches,
    chip,
    bar,
    header,
    panel,
    table,
    tabs,
    filter,
    searchField,
    stats,
    stat,
    field,
    show,
    confirm,
    refresh,
    render,
    today,
    shift,
    uid,
    clean,
    audit,
    lookup,
    actionRow,
  } = D;
  const { snapshot, commit } = MockApi;
  const levels = ['Thực tập', 'Thử việc', 'Chính thức'];
  const rateRows = (data) => data.rates || [];
  const effectiveRows = (data, date) =>
    rateRows(data)
      .filter((row) => row.start <= date && (!row.end || date <= row.end))
      .sort((a, b) => b.start.localeCompare(a.start));
  function rateAt(data, userId, date) {
    const user = person(data, userId);
    const effective = effectiveRows(data, date);
    const row =
      effective.find((item) => item.kind === 'person' && item.ref === userId) ||
      effective.find((item) => item.kind === 'level' && item.ref === (user?.level || 'Chính thức'));
    return row?.amount ?? user?.rate ?? 0;
  }
  function ratesScreen(data) {
    const kind = state.view.rateKind || 'person';
    const rows = rateRows(data).filter((row) => row.kind === kind);
    const config =
      kind === 'person'
        ? data.employees
            .filter((row) => matches(state.view.rateQuery, row.fullName, row.email))
            .map((row) => [row.id, row.fullName, rateAt(data, row.id, today())])
        : levels.map((value) => [
            value,
            value,
            effectiveRows(data, today()).find((row) => row.kind === 'level' && row.ref === value)
              ?.amount || 0,
          ]);
    const current = rows.filter((row) => row.start <= today() && (!row.end || row.end >= today()));
    return (
      header(
        'Đơn giá nhân sự',
        'Đơn giá theo người hoặc theo cấp bậc, có hiệu lực theo ngày làm việc.',
        act('rateRecalculate', 'Tính lại', 'calculate') +
          act('setRate', 'Thêm đơn giá', 'add', 'btn primary'),
      ) +
      stats([
        stat(
          'Theo cấp bậc',
          rateRows(data).filter((row) => row.kind === 'level').length,
          'badge',
          'indigo',
        ),
        stat(
          'Theo người',
          rateRows(data).filter((row) => row.kind === 'person').length,
          'person',
          'emerald',
        ),
        stat('Hiệu lực hôm nay', current.length, 'event_available', 'indigo'),
      ]) +
      '<div class="toolbar">' +
      tabs(
        'rateKind',
        [
          ['person', 'Theo người', 'person'],
          ['level', 'Theo cấp bậc', 'badge'],
        ],
        kind,
      ) +
      (kind === 'person' ? searchField('rateQuery', 'Tìm theo tên hoặc email…') : '') +
      '</div>' +
      panel(
        table(
          [kind === 'person' ? 'Nhân viên' : 'Cấp bậc', 'Đơn giá / giờ', 'Đơn giá theo ngày', ''],
          config.map(([id, name, rate]) => [
            h(name),
            h(money(rate)),
            rows
              .filter((row) => row.ref === id)
              .map(
                (row) =>
                  '<span class="block">' +
                  fmtDate(row.start) +
                  ' · ' +
                  h(money(row.amount)) +
                  (row.end ? ' – ' + fmtDate(row.end) : '') +
                  iconBtn('rateEdit|' + row.id, 'Sửa đơn giá', 'edit') +
                  '</span>',
              )
              .join('') || '—',
            act('setRate|' + id, 'Đặt đơn giá', 'price_change', 'btn sm'),
          ]),
        ),
      )
    );
  }
  function rateForm(id, rowId) {
    const data = snapshot();
    const old = byId({ rates: rateRows(data) }, 'rates', rowId);
    const kind =
      old?.kind ||
      (levels.includes(id) ? 'level' : str(id) ? 'person' : state.view.rateKind || 'person');
    show(
      old ? 'Sửa đơn giá' : 'Thêm đơn giá',
      field('Áp dụng cho', 'kind', kind, {
        options: [
          ['person', 'Nhân viên'],
          ['level', 'Cấp bậc'],
        ],
      }) +
        '<div id="rate-ref"></div><div class="field-grid">' +
        field('Đơn giá / giờ (VNĐ)', 'amount', old?.amount ?? 0, {
          type: 'number',
          min: 0,
          max: 100000000,
          required: true,
        }) +
        field('Có hiệu lực từ', 'start', old?.start || today(), { type: 'date', required: true }) +
        field('Có hiệu lực đến', 'end', old?.end || '', { type: 'date' }) +
        '</div>' +
        field('Ghi chú', 'note', old?.note || '', { type: 'textarea' }),
      {
        glyph: 'price_change',
        submit: (values) => {
          if (values.end && values.end < values.start)
            throw Error('Ngày kết thúc cần từ ngày hiệu lực trở đi.');
          commit((data) => {
            if (!D.access(data).admin) throw Error('Chỉ Admin có quyền chỉnh đơn giá.');
            const items = (data.rates ||= []);
            if (
              items.some(
                (row) =>
                  row.kind === values.kind &&
                  row.ref === values.ref &&
                  row.start === values.start &&
                  row.id !== rowId,
              )
            )
              throw Error('Đã có đơn giá bắt đầu vào ngày này.');
            const patch = { ...values, amount: Number(values.amount) };
            if (old)
              Object.assign(
                items.find((row) => row.id === old.id),
                patch,
              );
            else items.push({ ...patch, id: uid('rate') });
            audit(data, 'Đã lưu đơn giá nhân sự.', 'Tài chính');
          });
          refresh('Đã lưu đơn giá.');
        },
      },
    );
    const ref = D.dialog.querySelector('#rate-ref');
    function update(kind) {
      const options =
        kind === 'level'
          ? levels.map((value) => [value, value])
          : data.employees.map((row) => [row.id, row.fullName]);
      ref.innerHTML = field(
        kind === 'level' ? 'Cấp bậc' : 'Nhân viên',
        'ref',
        old?.ref || str(id),
        { options: [['', 'Chọn…'], ...options], required: true },
      );
    }
    D.dialog.querySelector('[name=kind]').onchange = (event) => update(event.target.value);
    update(kind);
  }
  function workload(data) {
    const from = D.monday(state.view.loadWeek || today());
    const to = shift(from, 6);
    const rights = D.access(data);
    const people = data.employees.filter(
      (row) =>
        (rights.admin || row.id === data.currentUserId || MockApi.canReview(data, row.id)) &&
        (!state.view.loadDepartment || row.departmentId === state.view.loadDepartment) &&
        matches(state.view.loadQuery, row.fullName),
    );
    const rows = people.map((row) => {
      const open = data.tasks.filter(
        (task) => task.assigneeId === row.id && task.status !== 'Done',
      );
      const overdue = open.filter((task) => task.dueDate && task.dueDate < today());
      const planned = open.filter((task) => task.dueDate >= from && task.dueDate <= to);
      const remaining = planned.reduce(
        (total, task) => total + ((task.estimateHours || 0) * (100 - task.progress)) / 100,
        0,
      );
      const daysOff = data.leave
        .filter(
          (leave) =>
            leave.userId === row.id &&
            leave.status === 'Approved' &&
            leave.startDate <= to &&
            leave.endDate >= from,
        )
        .reduce(
          (total, leave) =>
            total +
            MockApi.leaveDays({
              ...leave,
              startDate: leave.startDate < from ? from : leave.startDate,
              endDate: leave.endDate > to ? to : leave.endDate,
            }),
          0,
        );
      const available = Math.max(0, 40 - daysOff * 8);
      const logged = data.worklogs
        .filter(
          (log) =>
            log.userId === row.id &&
            log.workDate >= from &&
            log.workDate <= to &&
            log.status !== 'Rejected',
        )
        .reduce((total, log) => total + log.minutes, 0);
      const capacity =
        data.capacity?.[from]?.[row.id] ||
        (remaining > available || overdue.length >= 3
          ? 'Overloaded'
          : planned.length >= 3 || remaining >= available * 0.6
            ? 'Balanced'
            : 'Free');
      const weekly = D.weeklyRows(data).filter(
        (item) => item.userId === row.id && item.date >= from && item.date <= to,
      ).length;
      return { row, open, overdue, planned, remaining, available, logged, capacity, weekly };
    });
    const badges = D.capacity.map(([id, name, tone]) =>
      stat(
        name,
        rows.filter((item) => item.capacity === id).length,
        id === 'Overloaded' ? 'warning' : 'check_circle',
        tone,
        'loadLevel|' + id,
        state.view.loadCapacity === id,
      ),
    );
    return (
      header(
        'Workload',
        'Mức tải công việc theo tuần, dựa trên kế hoạch, công việc và giờ khả dụng.',
      ) +
      '<div class="toolbar">' +
      iconBtn('loadWeek|-1', 'Tuần trước', 'chevron_left') +
      '<strong>' +
      fmtDate(from) +
      ' – ' +
      fmtDate(to) +
      '</strong>' +
      iconBtn('loadWeek|1', 'Tuần sau', 'chevron_right') +
      act('view|loadWeek|' + today(), 'Tuần này', '', 'btn sm') +
      filter('loadDepartment', 'Phòng ban', [
        ['', 'Tất cả phòng ban'],
        ...D.options(data.departments),
      ]) +
      searchField('loadQuery', 'Tìm theo tên…') +
      '</div>' +
      stats(badges) +
      panel(
        table(
          [
            'Thành viên',
            'Mức tải',
            'Việc mở',
            'Quá hạn',
            'Đến hạn tuần này',
            'Giờ còn lại',
            'Giờ đã log / khả dụng',
            'Việc tuần',
          ],
          rows
            .filter((item) => !state.view.loadCapacity || item.capacity === state.view.loadCapacity)
            .map((item) => {
              const [, label, tone] = D.capacity.find(([id]) => id === item.capacity);
              return [
                D.accountCell(data, item.row.id),
                chip(label, tone),
                String(item.open.length),
                h(item.overdue.length),
                h(item.planned.length),
                h(Math.round(item.remaining * 10) / 10 + 'h'),
                h(hours(item.logged) + ' / ' + item.available + 'h') +
                  bar(item.available ? (item.logged / 60 / item.available) * 100 : 0),
                h(item.weekly),
              ];
            }),
        ),
      )
    );
  }
  D.rateAt = rateAt;
  views['admin/cost-rates'] = ratesScreen;
  views.workload = workload;
  Object.assign(actions, {
    setRate: (id) => rateForm(id),
    rateEdit: (rowId) => rateForm('', rowId),
    rateRecalculate: () =>
      show(
        'Tính lại chi phí nhân công',
        '<p>Chỉ tính lại các giờ đã duyệt trong khoảng được chọn.</p><div class="field-grid">' +
          field('Từ ngày', 'start', shift(today(), -30), { type: 'date', required: true }) +
          field('Đến ngày', 'end', today(), { type: 'date', required: true }) +
          '</div>',
        {
          glyph: 'calculate',
          submitLabel: 'Tính lại',
          submit: (values) => {
            if (values.end < values.start || values.end > shift(values.start, 366))
              throw Error('Chọn khoảng từ 1 ngày đến 1 năm.');
            const count = commit((data) => {
              if (!D.access(data).admin) throw Error('Chỉ Admin có quyền tính lại chi phí.');
              const logs = data.worklogs.filter(
                (row) =>
                  row.status === 'Approved' &&
                  row.workDate >= values.start &&
                  row.workDate <= values.end,
              );
              for (const log of logs) log.rate = rateAt(data, log.userId, log.workDate);
              audit(
                data,
                'Đã tính lại ' + logs.length + ' bản ghi chi phí nhân công.',
                'Tài chính',
              );
              return logs.length;
            });
            refresh('Đã tính lại ' + count + ' bản ghi.');
          },
        },
      ),
    loadLevel: (id) => {
      state.view.loadCapacity = state.view.loadCapacity === id ? '' : id;
      render();
    },
    loadWeek: (delta) => {
      state.view.loadWeek = shift(state.view.loadWeek || today(), Number(delta) * 7);
      render();
    },
  });
})();
