/**
 * Shared guest sandbox — one tenant + one guest user + demo projects/tasks.
 * Safe for production (unlike seedMarketingSaasDemo which refuses prod DB names).
 */
const { getRandomAvatar } = require('../utils/avatarGenerator');
const { formatProjectName } = require('../utils/formatProjectName');
const { PRESET_PAGES } = require('../utils/pagePermissions');
const { seedDepartmentsForTenant } = require('./departmentService');
const { bootstrapTenant } = require('./tenantBootstrapService');
const { runWithContext } = require('../utils/tenantContext');

const BYPASS = { bypassTenant: true };

const GUEST_SLUG = 'guest';
const GUEST_ORG_NAME = 'Guest Sandbox';
const GUEST_EMAIL = 'guest@guest.coreknot.local';
const GUEST_NAME = 'Guest Explorer';

const PROJECT_SPECS = [
  {
    name: 'Welcome to CoreKnot',
    description: 'Explore projects, tasks, and team workflows in this sample workspace.',
    color: '#126d5e',
    outletId: 'guest-demo',
    tasks: [
      { title: 'Tour the dashboard', status: 'done', progress: 100 },
      { title: 'Open this project board', status: 'in-progress', progress: 40 },
      { title: 'Create your first real account', status: 'todo', progress: 0 },
    ],
  },
  {
    name: 'Sample Campaign Sprint',
    description: 'Dummy campaign work so you can click around without empty screens.',
    color: '#08525f',
    outletId: 'guest-campaign',
    tasks: [
      { title: 'Draft campaign brief', status: 'in-progress', progress: 55 },
      { title: 'Review creative assets', status: 'todo', progress: 0 },
      { title: 'Schedule kickoff call', status: 'in-review', progress: 80 },
    ],
  },
];

let ensurePromise = null;

async function upsertGuestUser(User, { departmentId, tenantId }) {
  let user = await User.findOne({ email: GUEST_EMAIL }).setOptions(BYPASS);
  if (!user) {
    user = await User.create({
      name: GUEST_NAME,
      email: GUEST_EMAIL,
      gender: 'other',
      avatar: getRandomAvatar('other'),
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      departmentId,
      tenantId,
      pagePermissions: [...PRESET_PAGES.standard],
    });
    return user;
  }
  let dirty = false;
  if (departmentId && String(user.departmentId || '') !== String(departmentId)) {
    user.departmentId = departmentId;
    dirty = true;
  }
  if (tenantId && String(user.tenantId || '') !== String(tenantId)) {
    user.tenantId = tenantId;
    dirty = true;
  }
  if (!user.pagePermissions?.length) {
    user.pagePermissions = [...PRESET_PAGES.standard];
    dirty = true;
  }
  if (user.mustChangePassword) {
    user.mustChangePassword = false;
    dirty = true;
  }
  if (dirty) await user.save();
  return user;
}

async function ensureDemoProjects({ Project, Task, TaskAssignment, tenantId, userId }) {
  for (const spec of PROJECT_SPECS) {
    const formatted = formatProjectName(spec.name);
    let project = await Project.findOne({
      outletId: spec.outletId,
      tenantId,
    }).setOptions(BYPASS);

    const payload = {
      name: formatted,
      description: spec.description,
      outletId: spec.outletId,
      owner: userId,
      members: [userId],
      memberRoles: [{ user: userId, role: 'admin' }],
      status: 'active',
      color: spec.color,
      workspace: 'MAIN',
      progress: 35,
      totalTasksCount: spec.tasks.length,
      completedTasksCount: spec.tasks.filter((t) => t.status === 'done').length,
      tenantId,
    };

    if (project) {
      Object.assign(project, payload);
      await project.save();
    } else {
      project = await Project.create(payload);
    }

    for (const t of spec.tasks) {
      const title = `[GUEST] ${t.title}`;
      let task = await Task.findOne({ title, projectId: project._id }).setOptions(BYPASS);
      if (!task) {
        task = await Task.create({
          title,
          description: 'Guest sandbox sample — safe to explore',
          status: t.status,
          priority: 'medium',
          type: 'general',
          scheduleSlot: 'FULL',
          scheduleDate: new Date(),
          dueDate: new Date(Date.now() + 5 * 86400000),
          projectId: project._id,
          workspace: 'MAIN',
          progress: t.progress,
          createdBy: userId,
          tenantId,
        });
        await TaskAssignment.create({
          taskId: task._id,
          userId,
          assignedBy: userId,
          tenantId,
        });
      }
    }
  }
}

/**
 * Idempotent: create/update guest tenant, user, membership, demo data.
 * @returns {{ user: import('mongoose').Document, tenantId: string, tenantSlug: string }}
 */
async function ensureGuestSandbox() {
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    const Tenant = require('../models/Tenant');
    const User = require('../models/User');
    const Department = require('../models/Department');
    const TenantMembership = require('../models/TenantMembership');
    const Project = require('../models/Project');
    const Task = require('../models/Task');
    const TaskAssignment = require('../models/TaskAssignment');

    let tenant = await Tenant.findOne({ slug: GUEST_SLUG }).setOptions(BYPASS);
    if (!tenant) {
      tenant = await Tenant.create({
        name: GUEST_ORG_NAME,
        slug: GUEST_SLUG,
        contactEmail: GUEST_EMAIL,
        status: 'active',
        plan: 'free',
        industry: 'Demo',
        teamSize: '1-10',
        featureUnlocks: {
          finance: false,
          artistOs: false,
          opsHub: false,
          integrations: false,
          dataHub: false,
        },
        branding: { accentColor: '#126d5e' },
      });
    } else if (tenant.status !== 'active') {
      tenant.status = 'active';
      await tenant.save();
    }

    return runWithContext({ tenantId: String(tenant._id) }, async () => {
      await bootstrapTenant(tenant._id);
      await seedDepartmentsForTenant(tenant._id);

      const creativeDept = await Department.findOne({ slug: 'creative', tenantId: tenant._id }).setOptions(BYPASS)
        || await Department.findOne({ slug: 'creative' }).setOptions(BYPASS)
        || await Department.findOne({ slug: 'ops', tenantId: tenant._id }).setOptions(BYPASS);

      const user = await upsertGuestUser(User, {
        departmentId: creativeDept?._id,
        tenantId: tenant._id,
      });

      tenant.ownerId = user._id;
      await tenant.save();

      await TenantMembership.findOneAndUpdate(
        { tenantId: tenant._id, userId: user._id },
        { $set: { role: 'owner', status: 'active', joinedAt: new Date() } },
        { upsert: true, returnDocument: 'after' },
      );

      await ensureDemoProjects({
        Project,
        Task,
        TaskAssignment,
        tenantId: tenant._id,
        userId: user._id,
      });

      const populated = await User.findById(user._id)
        .populate('departmentId', 'name slug signupAllowed permissionPreset pagePermissions')
        .setOptions(BYPASS);

      return {
        user: populated,
        tenantId: String(tenant._id),
        tenantSlug: GUEST_SLUG,
      };
    });
  })().finally(() => {
    ensurePromise = null;
  });

  return ensurePromise;
}

module.exports = {
  ensureGuestSandbox,
  GUEST_SLUG,
  GUEST_EMAIL,
  GUEST_ORG_NAME,
};
