import 'dotenv/config';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';

async function run() {
  await connectDB();
  const admins = await User.find({ role: 'admin' });
  console.log('Admins in DB:', admins.map(a => ({ id: a._id, email: a.email, empId: a.employeeId, name: a.name, role: a.role })));
  const supers = await User.find({ role: 'superuser' });
  console.log('Superusers in DB:', supers.map(s => ({ id: s._id, email: s.email, empId: s.employeeId, name: s.name, dept: s.department })));
  process.exit(0);
}
run();
