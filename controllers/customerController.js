const Customer = require("../models/customer");

// CREATE a new customer
exports.createCustomer = async (req, res) => {
  try {
    let { name, tinNumber, type, phoneNumber, address } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (!type || !['supplier', 'customer'].includes(type)) {
      return res.status(400).json({ message: "Type must be 'supplier' or 'customer'" });
    }

    // 🔒 Ensure tinNumber is stored as string (preserves leading zeros)
    if (tinNumber !== undefined && tinNumber !== null) {
      tinNumber = tinNumber.toString().trim();
    }

    const customer = await Customer.create({
      name,
      tinNumber,
      type,
      phoneNumber,
      address
    });

    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({
      message: "Failed to create customer",
      error: error.message,
    });
  }
};


// GET all customers
exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await Customer.findAll();
    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch customers", error: error.message });
  }
};

// GET customer by ID
exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByPk(id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.status(200).json(customer);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch customer", error: error.message });
  }
};

// UPDATE customer by ID
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByPk(id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const { name, tinNumber, type, phoneNumber, address } = req.body;

    if (type && !['supplier','customer'].includes(type)) 
      return res.status(400).json({ message: "Type must be 'supplier' or 'customer'" });

    await customer.update({ name, tinNumber, type, phoneNumber, address });
    res.status(200).json(customer);
  } catch (error) {
    res.status(500).json({ message: "Failed to update customer", error: error.message });
  }
};

// DELETE customer by ID
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByPk(id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    await customer.destroy();
    res.status(200).json({ message: "Customer deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete customer", error: error.message });
  }
};
