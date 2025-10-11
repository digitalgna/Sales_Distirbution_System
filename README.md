5. Functional Requirements (FR)
Each FR is numbered FR-*
5.1. Authentication & Authorization
FR-1: System must provide role-based login (Admin, Procurement, Storekeeper, Salesman, Sales Manager, Accountant).
FR-2: Actions constrained to roles (e.g., only storekeeper can issue stock; only procurement can create purchase orders).
5.2. Supplier / customer  mangment
FR-3: CRUD  customers /suppliers  with details 
FR-4: Maintain factory item catalog (item code, name, pack size, cost per unit,  etc).
5.3. Purchasing Module
FR-5: Create Purchase   with: factoryselected, PO number, date, items (item, qty, unit cost), total, opening balances (if any), 
FR-6: If Purchase  total > 20,000 Birr → auto-calc withholding = 3% and mark purchase as withholding-applied. Record bonuses (free items) if factory supplies them.
FR-7: Receive goods against PO into store (GRN / Goods Receipt Note) — supports partial receipts and returns to factory.
FR-8: Track maximum purchase constraints (e.g., max 120 units per item) and warn/deny when violated. And add any remaining items from previous 
FR-9: Record returns to factory (quantity, reason, refund or credit) and update inventory accordingly.
5.4. Inventory / Store Module
FR-10: Storekeepers can register stores/warehouses and assign inventory to store location.
FR-11: Inventory record per item per store with fields: opening balance, received, issued, returned, current stock, lot/PO reference, cost.
CRUD for warhouses each ietm will have warehouses
FR-12: Issue item(s) from store to salesmen (single transaction can issue multiple items and quantities).
FR-13: Receive returned items from salesmen (adjust store inventory).
FR-14: Track material items (e.g., crates) separately from sellable items; support lend & return transactions.
FR-15: Inventory adjustments with reason codes (damage, loss, audit correction).
5.5. Sales Module
FR-16: Salesman can create Sales Transactions: date, items (item, qty, unit price), customer, discount/bonus, returned items, payment method (cash/bank/personal), bank info (if deposit).
FR-17: Support direct sales (factory → customer) recording where item never enters store (track PO/dispatch with customer).
FR-18: Record customer withholding if required and adjust net payable to factory/company.
FR-19: Salesman can record deposit transactions (cash/bank). If bank, record account number, deposit slip number, date, amount. If personal account used to hold funds temporarily, record salesman bank info and reconciliation status.
FR-20: Salesman must be able to view and approve issued items assigned to them (acknowledge receipt).
FR-21: Track lending of materials to customers or salesman and collateral status (CPO). Lendings create due records.

5.6. Returns & Bonuses
FR-23: Sales returns are recorded with reason, condition (resellable/damaged), refund amount if any.
FR-24: Bonuses (free items from factory or given by salesman) recorded with source (factory bonus or salesman bonus). Bonuses do not affect revenue but affect inventory and cost-of-goods-sold reports.
5.7. Reporting & Dashboards
FR-25: Daily sales report per salesman (items sold, value, returns, deposits).
FR-26: Inventory reports: current stock, by store, by item, by PO/lot, by aging (days in stock).
FR-27: Sales reports filterable by (salesman, customer, item, date range, store, factory).
FR-28: Profit & Loss report: revenue, cost of goods sold (COGS), withholding, gross profit, basic expenses (if provided) and net profit.
FR-29: Lending report: outstanding materials lent, collateral held, due dates.
FR-30: Purchase reports: POs, pending receipts, withholding totals per period.



The models in each modules are the following 

User module
User 
User ID
Role ID
Phone NO. 
Permission ID
Full name 
Role 
Role ID
Name 
Permission ID
Permission 
Permmision_ID 
Name 

Office operation module
Expense 
Expense _ID 
Name 
Category
Description 
Date 
Fuel 
Driver 
Car_oprtation
Car_ID
Milliage prvious 
Remaining fuel
New feul 
Current milliage 
Car type 
Service cost 
Description
Sales man ID
Assign date 
Sales man ID 
Customer 
Id 
Phone number 
Address 
Email
Type 
Car info
Car name 
Plate 
Model 
Service date 
Type 
Sales Module

Sales 
Customer ID
Sales man ID
Item ID
Amount 
Total price 
Date 
Recipient ‘sponsor 
Bonus ‘bank type 
Paid price 
Description
Lending 
Customer ID 
Lending ID
Sales man cID
Itme ID
lending amount 
Date 
Wharehouse ID
Purchase and finance module

Purchase 
Supplier ID
Item ID 
Item amount 
Total price 
Unit price 
Ststues 
With holding amount 
Date 
Sponsor 
Bonus 
Car ID 
Charged cost
Unit excise tax
VAT
Whorehouse ID

Inventory Module

Category 
ID
Name 
Description
Item 
ID
Name

