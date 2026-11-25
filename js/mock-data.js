'use strict';

window.DemoDates = (() => {
  const key = (date) =>
    [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  const from = (value) => new Date(value.slice(0, 10) + 'T12:00:00');
  const shift = (value, days) => {
    const date = from(value);
    date.setDate(date.getDate() + days);
    return key(date);
  };
  return { key, from, shift, today: () => key(new Date()) };
})();

window.createDemoData = function createDemoData() {
  const today = DemoDates.today();
  const day = (offset) => DemoDates.shift(today, offset);
  const createdAt = day(-42);
  const employees = [
    {
      id: 'lan',
      fullName: 'Nguyễn Minh Lan',
      email: 'lan@example.test',
      departmentId: 'product',
      jobTitle: 'Quản lý sản phẩm',
      role: 'Admin',
      rate: 260000,
    },
    {
      id: 'an',
      fullName: 'Trần Gia An',
      email: 'an@example.test',
      departmentId: 'engineering',
      jobTitle: 'Kỹ sư phần mềm',
      role: 'Member',
      rate: 210000,
    },
    {
      id: 'vy',
      fullName: 'Lê Thảo Vy',
      email: 'vy@example.test',
      departmentId: 'product',
      jobTitle: 'Thiết kế sản phẩm',
      role: 'Member',
      rate: 195000,
    },
    {
      id: 'minh',
      fullName: 'Phạm Nhật Minh',
      email: 'minh@example.test',
      departmentId: 'ops',
      jobTitle: 'Quản lý vận hành',
      role: 'Member',
      rate: 205000,
    },
    {
      id: 'linh',
      fullName: 'Vũ Khánh Linh',
      email: 'linh@example.test',
      departmentId: 'ops',
      jobTitle: 'Chuyên viên nhân sự',
      role: 'Member',
      rate: 175000,
    },
    {
      id: 'bao',
      fullName: 'Đỗ Hoàng Bảo',
      email: 'bao@example.test',
      departmentId: 'engineering',
      jobTitle: 'Kiểm thử phần mềm',
      role: 'Member',
      rate: 175000,
    },
  ];
  const workspaces = [
    {
      id: 'product',
      name: 'Sản phẩm & Kỹ thuật',
      description: 'Không gian chung của nhóm sản phẩm, thiết kế và kỹ thuật.',
      memberIds: ['lan', 'an', 'vy', 'bao'],
      ownerId: 'lan',
      createdAt,
    },
    {
      id: 'operations',
      name: 'Vận hành nội bộ',
      description: 'Quản lý công việc vận hành, tài sản và quy trình nhân sự.',
      memberIds: ['lan', 'minh', 'linh'],
      ownerId: 'lan',
      createdAt,
    },
    {
      id: 'experience',
      name: 'Trải nghiệm khách hàng',
      description: 'Phối hợp cải thiện trải nghiệm và thu thập phản hồi.',
      memberIds: ['lan', 'vy', 'linh'],
      ownerId: 'lan',
      createdAt,
    },
  ];
  const projects = [
    {
      id: 'portal',
      workspaceId: 'product',
      name: 'Cổng thông tin nội bộ',
      key: 'PORTAL',
      color: '#6366f1',
      description: 'Tập trung thông tin, biểu mẫu và tài nguyên nội bộ.',
      budget: 18000000,
      createdAt,
    },
    {
      id: 'mobile',
      workspaceId: 'product',
      name: 'Trải nghiệm di động',
      key: 'MOB',
      color: '#0891b2',
      description: 'Cải thiện khả năng sử dụng trên điện thoại.',
      budget: 12000000,
      createdAt,
    },
    {
      id: 'equip',
      workspaceId: 'operations',
      name: 'Chuẩn hóa tài sản',
      key: 'ASSET',
      color: '#059669',
      description: 'Chuẩn hóa quy trình kiểm kê và bàn giao thiết bị.',
      budget: 7500000,
      createdAt,
    },
    {
      id: 'feedback',
      workspaceId: 'experience',
      name: 'Khảo sát trải nghiệm',
      key: 'CX',
      color: '#db2777',
      description: 'Tổng hợp góp ý và theo dõi cải tiến.',
      budget: 0,
      createdAt,
    },
  ];
  const taskRows = [
    ['portal', 'Hoàn thiện luồng duyệt yêu cầu', 'lan', 'InProgress', 'High', -5, -1, 65],
    ['portal', 'Rà soát giao diện tổng quan', 'lan', 'InProgress', 'High', -3, 0, 75],
    ['portal', 'Chuẩn bị checklist phát hành', 'lan', 'Todo', 'Medium', 0, 3, 0],
    ['portal', 'Thiết kế mẫu yêu cầu nội bộ', 'vy', 'Done', 'Medium', -8, -3, 100],
    ['portal', 'Tối ưu tìm kiếm toàn cục', 'an', 'InProgress', 'Medium', -2, 4, 45],
    ['portal', 'Kiểm tra các trạng thái trống', 'bao', 'Todo', 'Low', 1, 6, 0],
    ['portal', 'Rà soát phân quyền workspace', 'an', 'Done', 'High', -10, -4, 100],
    ['portal', 'Cập nhật tài liệu hướng dẫn', 'vy', 'Todo', 'Low', 2, 8, 0],
    ['mobile', 'Kiểm tra sidebar trên màn hình nhỏ', 'lan', 'InProgress', 'Medium', -2, 2, 50],
    ['mobile', 'Chuẩn hóa form trên điện thoại', 'vy', 'Todo', 'Medium', 1, 5, 0],
    ['mobile', 'Kiểm tra giao diện tối', 'bao', 'Done', 'Low', -9, -3, 100],
    ['equip', 'Đối soát danh sách thiết bị', 'minh', 'InProgress', 'High', -2, 4, 50],
    ['equip', 'Chuẩn bị mẫu biên bản bàn giao', 'linh', 'Todo', 'Medium', 0, 6, 0],
    ['equip', 'Lập danh mục thiết bị', 'lan', 'Done', 'Medium', -8, -4, 100],
    ['feedback', 'Chuẩn bị câu hỏi khảo sát', 'lan', 'Todo', 'Low', 2, 9, 0],
  ];
  const sequence = {};
  const tasks = taskRows.map(
    ([projectId, title, assigneeId, status, priority, start, due, progress], index) => {
      sequence[projectId] = (sequence[projectId] || 0) + 1;
      const project = projects.find((item) => item.id === projectId);
      return {
        id: 'task-' + (index + 1),
        code: project.key + '-' + sequence[projectId],
        projectId,
        title,
        assigneeId,
        status,
        priority,
        startDate: day(start),
        dueDate: day(due),
        progress,
        description:
          index === 0
            ? 'Rà soát các bước tiếp nhận, phân công và hoàn thành yêu cầu. Kiểm tra thư mục biểu mẫu trước khi bàn giao.'
            : '',
        checklist:
          index === 0
            ? [
                { id: 'check-1', title: 'Kiểm tra màn hình tiếp nhận', done: true },
                { id: 'check-2', title: 'Xác nhận luồng bàn giao', done: false },
              ]
            : [],
        comments: [],
      };
    },
  );
  const meetings = [
    {
      id: 'sync',
      title: 'Đồng bộ tiến độ sản phẩm',
      organizerId: 'vy',
      workspaceId: 'product',
      projectId: 'portal',
      startAt: day(0) + 'T09:30',
      endAt: day(0) + 'T10:00',
      attendeeIds: ['lan', 'an'],
      response: 'Pending',
      description: 'Cập nhật tiến độ, trở ngại và việc cần phối hợp.',
    },
    {
      id: 'design',
      title: 'Rà soát thiết kế cổng thông tin',
      organizerId: 'lan',
      workspaceId: 'product',
      projectId: 'portal',
      startAt: day(1) + 'T14:00',
      endAt: day(1) + 'T15:00',
      attendeeIds: ['vy', 'an'],
      response: 'Accepted',
      description: '',
    },
    {
      id: 'ops',
      title: 'Bàn giao thiết bị tháng này',
      organizerId: 'minh',
      workspaceId: 'operations',
      projectId: 'equip',
      startAt: day(2) + 'T10:00',
      endAt: day(2) + 'T10:45',
      attendeeIds: ['lan', 'linh'],
      response: 'Accepted',
      description: '',
    },
  ];
  const worklogs = [
    {
      id: 'log-1',
      taskId: 'task-2',
      userId: 'lan',
      workDate: day(-1),
      minutes: 150,
      note: 'Rà soát các trạng thái của trang.',
      status: 'Approved',
      rate: 260000,
    },
    {
      id: 'log-2',
      taskId: 'task-1',
      userId: 'lan',
      workDate: day(0),
      minutes: 120,
      note: 'Kiểm tra quy tắc phân công.',
      status: 'Pending',
    },
    {
      id: 'log-3',
      taskId: 'task-5',
      userId: 'an',
      workDate: day(0),
      minutes: 180,
      note: 'Tối ưu truy vấn tìm kiếm.',
      status: 'Pending',
    },
    {
      id: 'log-4',
      taskId: 'task-4',
      userId: 'vy',
      workDate: day(0),
      minutes: 240,
      note: 'Hoàn thiện bản thiết kế.',
      status: 'Approved',
      rate: 195000,
    },
    {
      id: 'log-5',
      taskId: 'task-12',
      userId: 'minh',
      workDate: day(0),
      minutes: 90,
      note: 'Kiểm tra mã và serial.',
      status: 'Pending',
    },
  ];
  const departments = [
    {
      id: 'product',
      name: 'Sản phẩm',
      managerId: 'lan',
      description: 'Định hướng và thiết kế trải nghiệm sản phẩm.',
    },
    {
      id: 'engineering',
      name: 'Kỹ thuật',
      managerId: 'an',
      description: 'Phát triển và kiểm thử ứng dụng.',
    },
    { id: 'ops', name: 'Vận hành', managerId: 'minh', description: 'Hỗ trợ vận hành và nhân sự.' },
  ];
  const categories = [
    { id: 'laptop', name: 'Laptop' },
    { id: 'display', name: 'Màn hình' },
    { id: 'phone', name: 'Điện thoại' },
    { id: 'other', name: 'Thiết bị khác' },
  ];
  const assetRows = [
    ['Laptop Dell Latitude 5440', 'laptop', 'Assigned', 'an', 23500000, 'TF-DL-1042'],
    ['Màn hình LG UltraFine 27"', 'display', 'Available', '', 5700000, 'TF-LG-1043'],
    ['Laptop Lenovo ThinkPad E14', 'laptop', 'Available', '', 18400000, 'TF-LN-1044'],
    ['Điện thoại Samsung Galaxy A55', 'phone', 'Assigned', 'lan', 9200000, 'TF-SS-1045'],
    ['Màn hình Dell P2422H', 'display', 'InRepair', '', 4400000, 'TF-DL-1046'],
    ['Bàn phím Logitech K380', 'other', 'Available', '', 690000, 'TF-LG-1047'],
    ['Laptop HP ProBook 440', 'laptop', 'Available', '', 19200000, 'TF-HP-1048'],
  ];
  const assets = assetRows.map(([name, categoryId, status, holderId, price, serial], i) => ({
    id: 'asset-' + (i + 1),
    code: 'TS-' + String(i + 1).padStart(4, '0'),
    name,
    categoryId,
    status,
    holderId,
    price,
    serial,
    location: 'Văn phòng chính',
    purchasedOn: day(-65),
    assignedOn: holderId ? day(-5) : '',
    confirmed: i === 0,
    history: holderId ? [{ date: day(-5), text: 'Đã bàn giao thiết bị.' }] : [],
  }));
  const templates = [
    {
      id: 'equipment',
      name: 'Cấp thiết bị làm việc',
      departmentId: 'ops',
      active: true,
      fields: [
        { label: 'Thiết bị cần cấp', type: 'text', required: true },
        { label: 'Lý do sử dụng', type: 'textarea', required: true },
      ],
    },
    {
      id: 'support',
      name: 'Hỗ trợ kỹ thuật',
      departmentId: 'engineering',
      active: true,
      fields: [
        { label: 'Mô tả sự cố', type: 'textarea', required: true },
        { label: 'Ngày cần xử lý', type: 'date', required: false },
      ],
    },
  ];
  const requests = [
    {
      id: 'req-1',
      code: 'YC-1',
      templateId: 'equipment',
      title: 'Cấp thêm màn hình làm việc',
      departmentId: 'ops',
      requesterId: 'an',
      assigneeId: 'minh',
      status: 'Pending',
      createdAt: day(0),
      answers: [
        { label: 'Thiết bị cần cấp', value: 'Màn hình 27 inch' },
        { label: 'Lý do sử dụng', value: 'Kiểm thử giao diện song song trên hai độ phân giải.' },
      ],
      history: [{ date: day(0), text: 'Đã gửi yêu cầu.' }],
    },
    {
      id: 'req-2',
      code: 'YC-2',
      templateId: 'support',
      title: 'Cập nhật quyền truy cập kho tài liệu',
      departmentId: 'engineering',
      requesterId: 'lan',
      assigneeId: 'an',
      status: 'Approved',
      createdAt: day(-1),
      answers: [{ label: 'Mô tả sự cố', value: 'Cần quyền xem tài liệu của dự án.' }],
      history: [{ date: day(-1), text: 'Đã tiếp nhận.' }],
    },
  ];
  return {
    currentUserId: 'lan',
    employees,
    workspaces,
    projects,
    tasks,
    taskSequence: sequence,
    meetings,
    worklogs,
    departments,
    categories,
    assets,
    templates,
    requests,
    leave: [
      {
        id: 'leave-1',
        userId: 'vy',
        type: 'Nghỉ phép năm',
        startDate: day(2),
        endDate: day(3),
        reason: 'Việc cá nhân',
        status: 'Pending',
      },
    ],
    expenses: [
      {
        id: 'expense-1',
        projectId: 'portal',
        title: 'Bản quyền thiết kế giao diện',
        amount: 3200000,
        date: day(-3),
      },
      {
        id: 'expense-2',
        projectId: 'equip',
        title: 'Tem kiểm kê tài sản',
        amount: 500000,
        date: day(-2),
      },
    ],
    cycles: [
      {
        id: 'cycle-1',
        name: 'Đánh giá hiệu suất quý này',
        startDate: day(-9),
        dueDate: day(8),
        status: 'Open',
      },
    ],
    reviewTemplates: [
      {
        id: 'review-template-1',
        name: 'Đánh giá hiệu suất định kỳ',
        description: 'Mức độ hoàn thành công việc và phối hợp.',
      },
    ],
    reviews: [
      {
        id: 'review-1',
        cycleId: 'cycle-1',
        employeeId: 'lan',
        reviewerId: 'minh',
        status: 'SelfPending',
      },
      {
        id: 'review-2',
        cycleId: 'cycle-1',
        employeeId: 'an',
        reviewerId: 'lan',
        status: 'ManagerPending',
        self: 'Đã hoàn thành các mục tiêu sprint.',
        selfScore: 4,
      },
    ],
    notifications: [
      {
        id: 'notice-1',
        title: 'Bạn có lời mời họp',
        text: meetings[0].title,
        icon: 'event',
        date: day(0),
        read: false,
        route: 'calendar',
        target: 'meeting:sync',
      },
      {
        id: 'notice-2',
        title: 'Có giờ làm chờ duyệt',
        text: 'Trần Gia An đã gửi Log work.',
        icon: 'schedule',
        date: day(0),
        read: false,
        route: 'approvals',
      },
      {
        id: 'notice-3',
        title: 'Có yêu cầu mới',
        text: requests[0].title,
        icon: 'move_to_inbox',
        date: day(-1),
        read: true,
        route: 'requests/req-1',
      },
    ],
    chats: [
      {
        id: 'general',
        name: 'Sản phẩm & Kỹ thuật',
        messages: [
          {
            sender: 'vy',
            text: 'Mình đã gửi bản thiết kế để mọi người xem trước buổi họp.',
            date: day(0),
          },
          { sender: 'an', text: 'Mình sẽ rà soát luồng tìm kiếm trong hôm nay.', date: day(0) },
        ],
      },
    ],
    posts: [
      {
        id: 'post-1',
        authorId: 'vy',
        title: 'Cập nhật tài liệu sản phẩm',
        text: 'Tài liệu hướng dẫn đã được cập nhật. Mọi người có thể gửi góp ý tại đây.',
        date: day(-1),
        likes: 2,
        liked: false,
        comments: [],
      },
    ],
    training: [
      {
        id: 'training-1',
        title: 'Quy trình bảo mật thông tin',
        date: day(5),
        trainerId: 'linh',
        status: 'Open',
        enrolled: false,
      },
    ],
    offboarding: [
      {
        id: 'off-1',
        code: 'OFF-0001',
        employeeId: 'bao',
        status: 'Chờ duyệt',
        date: day(12),
        checks: [
          { title: 'Bàn giao công việc', done: false },
          { title: 'Thu hồi tài sản', done: false },
        ],
      },
    ],
    audits: [],
    security: [{ date: day(0), text: 'Tài khoản quản trị mẫu mở phiên demo.' }],
    files: [
      {
        id: 'file-1',
        projectId: 'portal',
        name: 'Ghi chú phát hành.txt',
        content: 'TeamFlow Demo\nKiểm thử luồng yêu cầu và công việc trước khi phát hành.',
      },
    ],
    counters: { asset: assets.length, request: requests.length },
  };
};
