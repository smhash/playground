export type Transaction = {
  id: number;
  date: string;
  description: string;
  amount: number;
  category: string;
  payee: string;
  confidence: number;
  status: 'FOR REVIEW' | 'SAVED' | 'COMPLETED' | 'EXCLUDED';
};

const forReviewDescriptions = [
  'Office Supplies Purchase', 'Team Lunch', 'Taxi to Client Meeting', 'Flight to Conference', 'Hotel Accommodation',
  'Client Gift', 'Monthly Rent Payment', 'Internet Service Bill', 'Coffee for Team', 'Parking Fee',
  'Printer Ink Refill', 'Business Cards Order', 'Team Building Event', 'Conference Registration', 'Dinner with Client',
  'Office Cleaning Service', 'Water Delivery', 'Snacks for Office', 'Team Outing', 'Office Chair Purchase',
  'Software Subscription', 'Mobile Phone Bill', 'Courier Service', 'Office Decor', 'Team Breakfast',
];
const forReviewCategories = ['Office', 'Meals', 'Transport', 'Travel', 'Events'];
const forReviewPayees = ['Staples', 'Panera Bread', 'Uber', 'Amazon', 'Hilton'];

const savedDescriptions = [
  'Printer Paper', 'Coffee Supplies', 'Team Event', 'Business Book Purchase', 'Office Maintenance',
  'Client Dinner', 'Travel Insurance', 'Office Utilities', 'Team Snacks', 'Parking Ticket',
  'Office Move Expense', 'Holiday Party', 'Team Training', 'Office Security Service', 'Client Lunch',
  'Team Coffee', 'Office Plants', 'Taxi to Office', 'Team Workshop', 'Office Supplies Restock',
  'Team Retreat', 'Office Repairs', 'Team Conference Call', 'Office Furniture', 'Team Breakfast',
];
const savedCategories = ['Office', 'Events', 'Meals', 'Transport', 'Utilities'];
const savedPayees = ['Office Depot', 'TechConf', 'Starbucks', 'City Parking', 'Chipotle'];

const completedDescriptions = [
  'Software License Renewal', 'Team Building Lunch', 'Airport Shuttle', 'Conference Hotel', 'Client Gift Basket',
  'Monthly Lease Payment', 'Cloud Service Bill', 'Team Espresso', 'Garage Parking', 'Ink Cartridge',
  'Business Flyers', 'Escape Room Event', 'Expo Registration', 'Client Dinner Meeting', 'Janitorial Service',
  'Bottled Water', 'Healthy Snacks', 'Bowling Night', 'Ergonomic Chair', 'CRM Subscription',
  'Phone Plan', 'FedEx Delivery', 'Wall Art', 'Breakfast Meeting', 'Taxi from Hotel',
];
const completedCategories = ['Software', 'Meals', 'Transport', 'Travel', 'Office'];
const completedPayees = ['Adobe', 'WeWork', 'Uber', 'FedEx', 'Marriott'];

const excludedDescriptions = [
  'Rejected Expense', 'Duplicate Entry', 'Personal Purchase', 'Non-Business Meal', 'Declined Transaction',
  'Unapproved Gift', 'Late Fee', 'Non-Work Travel', 'Personal Subscription', 'Non-Work Event',
  'Unmatched Invoice', 'Spam Charge', 'Erroneous Payment', 'Non-Work Taxi', 'Personal Hotel',
  'Non-Work Supplies', 'Declined Card', 'Unapproved Vendor', 'Non-Work Utility', 'Personal Coffee',
  'Non-Work Parking', 'Personal Book', 'Non-Work Maintenance', 'Personal Repair', 'Non-Work Furniture',
];
const excludedCategories = ['Rejected', 'Personal', 'Error', 'Declined', 'Spam'];
const excludedPayees = ['Unknown', 'Personal', 'SpamVendor', 'DeclinedCo', 'ErrorCorp'];

function makeTransactions(
  count: number,
  status: Transaction['status'],
  descriptions: string[],
  categories: string[],
  payees: string[],
  idStart: number
): Transaction[] {
  return Array.from({ length: count }, (_, i) => ({
    id: idStart + i,
    date: `2022-04-${String(((i + 1) % 30) + 1).padStart(2, '0')}`,
    description: descriptions[i % descriptions.length],
    amount: ((i * 73 + idStart) % 1000) + 10 + (i % 100) / 100,
    category: categories[i % categories.length],
    payee: payees[i % payees.length],
    confidence: 50 + (i % 50),
    status,
  }));
}

export const transactions: Transaction[] = [
  ...makeTransactions(22, 'FOR REVIEW', forReviewDescriptions, forReviewCategories, forReviewPayees, 1),
  ...makeTransactions(14, 'SAVED', savedDescriptions, savedCategories, savedPayees, 23),
  ...makeTransactions(134, 'COMPLETED', completedDescriptions, completedCategories, completedPayees, 37),
  ...makeTransactions(7, 'EXCLUDED', excludedDescriptions, excludedCategories, excludedPayees, 171),
]; 