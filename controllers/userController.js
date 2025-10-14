const User = require("../models/user");
const Role = require("../models/role");
const Warehouse = require("../models/wharehouse");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "secretkey"; // use env in production

// CREATE user
exports.createUser = async (req, res) => {
  try {
    const { fullName, userName, password, phone, roleId, warehouseId } =
      req.body;

    if (!fullName || !userName || !password || !roleId) {
      return res.status(400).json({
        message: "fullName, userName, password and roleId are required",
      });
    }

    // Check if userName exists
    const existingUser = await User.findOne({ where: { userName } });
    if (existingUser)
      return res.status(400).json({ message: "Username already exists" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      userName,
      password: hashedPassword,
      phone,
      roleId,
      warehouseId: warehouseId || null,
    });

    // Exclude password from response
    const { password: _, ...userData } = user.toJSON();
    res.status(201).json(userData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create user", error });
  }
};

// GET all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: [
        "id",
        "fullName",
        "userName",
        "phone",
        "roleId",
        "warehouseId",
      ],
      include: [
        { model: Role, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
      ],
    });
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error });
  }
};

// GET user by ID
exports.getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findByPk(id, {
      attributes: [
        "id",
        "fullName",
        "userName",
        "phone",
        "roleId",
        "warehouseId",
      ],
      include: [
        { model: Role, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
      ],
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error });
  }
};

// UPDATE user
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { fullName, userName, password, phone, roleId, warehouseId } = req.body;

  try {
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (userName && userName !== user.userName) {
      const existingUser = await User.findOne({ where: { userName } });
      if (existingUser)
        return res.status(400).json({ message: "Username already exists" });
      user.userName = userName;
    }

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    user.fullName = fullName || user.fullName;
    user.phone = phone || user.phone;
    user.roleId = roleId || user.roleId;
    user.warehouseId = warehouseId || user.warehouseId;

    await user.save();

    const { password: _, ...userData } = user.toJSON();
    res.status(200).json(userData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update user", error });
  }
};

// DELETE user
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    await user.destroy();
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error });
  }
};

// LOGIN user (role-based)
exports.loginUser = async (req, res) => {
  const { userName, password, roleId } = req.body;

  if (!userName || !password || !roleId) {
    return res
      .status(400)
      .json({ message: "userName, password and roleId are required" });
  }

  try {
    const user = await User.findOne({
      where: { userName, roleId },
      include: [
        { model: Role, attributes: ["id", "name"] },
        { model: Warehouse, attributes: ["id", "name"] },
      ],
    });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found or role mismatch" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ Convert to plain object before extracting associations
    const userData = user.toJSON();

    // ✅ Safely extract role & warehouse info
    const roleIdVal = userData.Role?.id || userData.roleId || null;
    const roleNameVal = userData.Role?.name || null;
    const warehouseIdVal =
      userData.Warehouse?.id || userData.warehouseId || null;
    const warehouseNameVal = userData.Warehouse?.name || null;

    // ✅ Generate JWT with correct data
    const token = jwt.sign(
      {
        id: userData.id,
        fullName: userData.fullName,
        roleId: roleIdVal,
        roleName: roleNameVal,
        warehouseId: warehouseIdVal,
        warehouseName: warehouseNameVal,
      },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    // ✅ Remove password before sending user data
    const { password: _, ...safeUser } = userData;

    res.status(200).json({
      message: "Login successful",
      user: safeUser,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
};
