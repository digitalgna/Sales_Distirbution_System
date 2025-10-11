const Permission = require("../models/permission");

// CREATE a new permission
exports.createPermission = async (req, res) => {
  const { module, actions } = req.body;

  if (!Array.isArray(actions)) {
    return res.status(400).json({ message: "Actions must be an array" });
  }

  try {
    const newPermission = await Permission.create({ module, actions });
    res.status(201).json(newPermission);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Failed to create permission", error });
  }
};

// GET all permissions
exports.getAllPermissions = async (req, res) => {
  try {
    const permissions = await Permission.findAll();
    const formatted = permissions.map(p => ({
      id: p.id,
      module: p.module,
      actions: Array.isArray(p.actions) ? p.actions : JSON.parse(p.actions),
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
  const { module, actions } = req.body;

  if (actions && !Array.isArray(actions)) {
    return res.status(400).json({ message: "Actions must be an array" });
  }

  try {
    const permission = await Permission.findByPk(id);
    if (!permission) return res.status(404).json({ message: "Permission not found" });

    permission.module = module || permission.module;
    permission.actions = actions || permission.actions;

    await permission.save();

    const formatted = {
      id: permission.id,
      module: permission.module,
      actions: Array.isArray(permission.actions) ? permission.actions : JSON.parse(permission.actions),
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
