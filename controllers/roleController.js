const Role = require("../models/role");
const Permission = require("../models/permission");

// CREATE a new role
exports.createRole = async (req, res) => {
  const { name, permissionId } = req.body;

  if (!name || !permissionId) {
    return res.status(400).json({ message: "Name and permissionId are required" });
  }

  try {
    // Check if the permission exists
    const permission = await Permission.findByPk(permissionId);
    if (!permission) return res.status(404).json({ message: "Permission not found" });

    const newRole = await Role.create({ name, permissionId });
    res.status(201).json(newRole);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Failed to create role", error });
  }
};

// GET all roles
exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({
      include: {
        model: Permission,
        attributes: ["id", "module", "actions"], // only these
      },
      attributes: ["id", "name", "permissionId"], // role attributes you want
    });

    // Format the response
    const formatted = roles.map(r => ({
      id: r.id,
      name: r.name,
      permissionId: r.permissionId,
      permission: r.Permission
        ? {
            id: r.Permission.id,
            module: r.Permission.module,
            actions: Array.isArray(r.Permission.actions) 
                     ? r.Permission.actions 
                     : JSON.parse(r.Permission.actions),
          }
        : null
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error });
  }
};

// GET a role by ID
exports.getRoleById = async (req, res) => {
  const { id } = req.params;
  try {
    const role = await Role.findByPk(id, {
      include: {
        model: Permission,
        attributes: ["id", "module", "actions"],
      },
      attributes: ["id", "name", "permissionId"],
    });

    if (!role) return res.status(404).json({ message: "Role not found" });

    const formatted = {
      id: role.id,
      name: role.name,
      permissionId: role.permissionId,
      permission: role.Permission
        ? {
            id: role.Permission.id,
            module: role.Permission.module,
            actions: Array.isArray(role.Permission.actions) 
                     ? role.Permission.actions 
                     : JSON.parse(role.Permission.actions),
          }
        : null
    };

    res.status(200).json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error });
  }
};


// UPDATE a role by ID
exports.updateRole = async (req, res) => {
  const { id } = req.params;
  const { name, permissionId } = req.body;

  try {
    const role = await Role.findByPk(id, {
      include: {
        model: Permission,
        attributes: ["id", "module", "actions"],
      },
    });
    if (!role) return res.status(404).json({ message: "Role not found" });

    // Update name if provided
    if (name) role.name = name;

    // Update permission if permissionId provided
    if (permissionId) {
      const permission = await Permission.findByPk(permissionId);
      if (!permission) return res.status(404).json({ message: "Permission not found" });
      role.permissionId = permissionId;
      // Reload role to include new permission
      await role.save();
      await role.reload({ include: { model: Permission, attributes: ["id", "module", "actions"] } });
    } else {
      await role.save();
    }

    // Format response
    const formatted = {
      id: role.id,
      name: role.name,
      permissionId: role.permissionId,
      permission: role.Permission
        ? {
            id: role.Permission.id,
            module: role.Permission.module,
            actions: Array.isArray(role.Permission.actions)
              ? role.Permission.actions
              : JSON.parse(role.Permission.actions),
          }
        : null,
    };

    res.status(200).json(formatted);
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Failed to update role", error });
  }
};


// DELETE a role by ID
exports.deleteRole = async (req, res) => {
  const { id } = req.params;
  try {
    const role = await Role.findByPk(id);
    if (!role) return res.status(404).json({ message: "Role not found" });

    await role.destroy();
    res.status(200).json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error });
  }
};
