const Permission = require("../models/permission");
const Role = require("../models/role");


exports.createPermission = async (req, res) => {
  const { module, actions, roleId } = req.body;

  if (!module || !actions || !roleId) {
    return res.status(400).json({ message: "Module, actions, and role are required" });
  }

  if (!Array.isArray(actions)) {
    return res.status(400).json({ message: "Actions must be an array" });
  }

  try {
    const role = await Role.findByPk(roleId);
    if (!role) return res.status(404).json({ message: "Role not found" });

    const existingPermission = await Permission.findOne({
      where: { module, roleId },
    });

    if (existingPermission) {
      // safely parse any stringified array
      const existingActions = Array.isArray(existingPermission.actions)
        ? existingPermission.actions
        : JSON.parse(existingPermission.actions || "[]");

      const duplicateActions = actions.filter(action =>
        existingActions.includes(action)
      );

      if (duplicateActions.length > 0) {
        return res.status(400).json({
          message: `Duplicate actions for this module and role: ${duplicateActions.join(", ")}`,
        });
      }

      const updatedActions = [...new Set([...existingActions, ...actions])];
      existingPermission.actions = updatedActions;
      await existingPermission.save();

      return res.status(200).json({
        message: "Permission updated",
        permission: existingPermission,
      });
    }

    const newPermission = await Permission.create({ module, actions, roleId });
    res.status(201).json(newPermission);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create permission", error: error.message });
  }
};

// GET all permissions
exports.getAllPermissions = async (req, res) => {
  try {
    const permissions = await Permission.findAll({           
      include: [
        { model: Role, attributes: ["id", "name"] },
      ],}
    );
    const formatted = permissions.map(p => ({
      id: p.id,
      module: p.module,
      actions: Array.isArray(p.actions) ? p.actions : JSON.parse(p.actions),
      role: p.Role ? { id: p.Role.id, name: p.Role.name } : null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));
    res.status(200).json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error });
  }
};

// GET a permission by ID
exports.getPermissionById = async (req, res) => {
  const { id } = req.params;
  try {
    const p = await Permission.findByPk(id);
    if (!p) return res.status(404).json({ message: "Permission not found" });

    const formatted = {
      id: p.id,
      module: p.module,
      actions: Array.isArray(p.actions) ? p.actions : JSON.parse(p.actions),
      roleId: p.roleId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    };

    res.status(200).json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error });
  }
};

// UPDATE a permission by ID
exports.updatePermission = async (req, res) => {
  const { id } = req.params;
  const { module, actions, roleId } = req.body;

  if (actions && !Array.isArray(actions)) {
    return res.status(400).json({ message: "Actions must be an array" });
  }
  if (roleId) {
    const role = await Role.findByPk(roleId);
    if (!role) return res.status(404).json({ message: "Role not found" });
  }

  try {
    const permission = await Permission.findByPk(id);
    if (!permission) return res.status(404).json({ message: "Permission not found" });

    permission.module = module || permission.module;
    permission.actions = actions || permission.actions;
    permission.roleId = roleId || permission.roleId;

    await permission.save();

    const formatted = {
      id: permission.id,
      module: permission.module,
      actions: Array.isArray(permission.actions) ? permission.actions : JSON.parse(permission.actions),
      roleId: permission.roleId,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt
    };

    res.status(200).json(formatted);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Failed to update permission", error });
  }
};

// DELETE a permission by ID
exports.deletePermission = async (req, res) => {
  const { id } = req.params;
  try {
    const permission = await Permission.findByPk(id);
    if (!permission) return res.status(404).json({ message: "Permission not found" });

    await permission.destroy();
    res.status(200).json({ message: "Permission deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error });
  }
};

exports.getPermissionsByRole = async (req, res) => {
  try {
    const { roleId } = req.params;

    if (!roleId) {
      return res.status(400).json({ message: "roleId is required" });
    }

    const permissions = await Permission.findAll({
      where: { roleId },
      attributes: ["id", "module", "actions", "roleId"],
    });

    // Format actions as array
    const formatted = permissions.map(p => ({
      id: p.id,
      module: p.module,
      actions: Array.isArray(p.actions) ? p.actions : JSON.parse(p.actions),
      roleId: p.roleId
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
